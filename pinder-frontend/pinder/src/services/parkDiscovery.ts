export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type ParkSpot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
  source: 'google' | 'overpass';
  hasName: boolean;
};

const GOOGLE_PLACES_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const MAX_RADIUS_METERS = 50000;

const GOOGLE_SEARCHES = [
  { keyword: 'park', type: 'park' },
  { keyword: 'garden', type: 'park' },
  { keyword: 'parque', type: 'park' },
  { keyword: 'jardim', type: 'park' },
];

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const buildOverpassQuery = (location: Coordinates, radiusMeters: number) => `[out:json][timeout:15];(
  node["leisure"~"^(park|garden|recreation_ground|dog_park|common|village_green|playground)$"](around:${radiusMeters},${location.latitude},${location.longitude});
  way["leisure"~"^(park|garden|recreation_ground|dog_park|common|village_green|playground)$"](around:${radiusMeters},${location.latitude},${location.longitude});
  relation["leisure"~"^(park|garden|recreation_ground|dog_park|common|village_green|playground)$"](around:${radiusMeters},${location.latitude},${location.longitude});
  node["landuse"="forest"](around:${radiusMeters},${location.latitude},${location.longitude});
  way["landuse"="forest"](around:${radiusMeters},${location.latitude},${location.longitude});
  relation["landuse"="forest"](around:${radiusMeters},${location.latitude},${location.longitude});
  node["natural"~"^(wood|tree_row)$"](around:${radiusMeters},${location.latitude},${location.longitude});
  way["natural"~"^(wood|tree_row)$"](around:${radiusMeters},${location.latitude},${location.longitude});
  relation["natural"~"^(wood|tree_row)$"](around:${radiusMeters},${location.latitude},${location.longitude});
);out center 20;`;

const normaliseName = (name: unknown, fallback: string) => {
  if (typeof name !== 'string') {
    return fallback;
  }

  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const sortParks = (spots: ParkSpot[]) =>
  spots.sort((left, right) => {
    if (left.hasName !== right.hasName) {
      return left.hasName ? -1 : 1;
    }

    if (left.distance !== right.distance) {
      return left.distance - right.distance;
    }

    return left.name.localeCompare(right.name, 'pt-PT');
  });

const mergeById = (spots: ParkSpot[]) => {
  const deduped = new Map<string, ParkSpot>();

  for (const spot of spots) {
    const existing = deduped.get(spot.id);

    if (!existing) {
      deduped.set(spot.id, spot);
      continue;
    }

    const preferCurrent = spot.hasName && !existing.hasName;
    const closer = spot.distance < existing.distance;

    if (preferCurrent || closer) {
      deduped.set(spot.id, {
        ...existing,
        ...spot,
        hasName: existing.hasName || spot.hasName,
      });
    }
  }

  return Array.from(deduped.values());
};

const fetchGoogleParks = async (location: Coordinates, radiusMeters: number) => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return [] as ParkSpot[];
  }

  const responses = await Promise.all(
    GOOGLE_SEARCHES.map(async ({ keyword, type }) => {
      const params = new URLSearchParams({
        location: `${location.latitude},${location.longitude}`,
        radius: String(radiusMeters),
        keyword,
        type,
        language: 'pt-PT',
        key: apiKey,
      });

      const response = await fetch(`${GOOGLE_PLACES_ENDPOINT}?${params.toString()}`);
      if (!response.ok) {
        return [] as any[];
      }

      const payload = await response.json();
      return Array.isArray(payload?.results) ? payload.results : [];
    }),
  );

  const seen = new Map<string, ParkSpot>();

  for (const result of responses.flat()) {
    const latitude = result?.geometry?.location?.lat;
    const longitude = result?.geometry?.location?.lng;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      continue;
    }

    const id = typeof result.place_id === 'string' ? result.place_id : `${latitude}-${longitude}`;
    const distance = calculateDistance(location.latitude, location.longitude, latitude, longitude);
    const spot: ParkSpot = {
      id: `google-${id}`,
      name: normaliseName(result.name, 'Parque próximo'),
      latitude,
      longitude,
      distance,
      source: 'google',
      hasName: true,
    };

    const existing = seen.get(spot.id);
    if (!existing || spot.distance < existing.distance) {
      seen.set(spot.id, spot);
    }
  }

  return Array.from(seen.values());
};

const fetchOverpassParks = async (location: Coordinates, radiusMeters: number) => {
  const query = buildOverpassQuery(location, radiusMeters);

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    return [] as ParkSpot[];
  }

  const payload = await response.json();
  const results = Array.isArray(payload?.elements) ? payload.elements : [];

  return results
    .map((element: any) => {
      const latitude = element.lat ?? element.center?.lat;
      const longitude = element.lon ?? element.center?.lon;

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return null;
      }

      const distance = calculateDistance(location.latitude, location.longitude, latitude, longitude);
      const name = normaliseName(
        element.tags?.name ||
          element.tags?.['name:pt'] ||
          element.tags?.short_name ||
          element.tags?.official_name ||
          element.tags?.operator ||
          element.tags?.['name:en'],
        'Parque próximo',
      );

      return {
        id: `overpass-${element.type}-${element.id}`,
        name,
        latitude,
        longitude,
        distance,
        source: 'overpass' as const,
        hasName: name !== 'Parque próximo',
      } as ParkSpot;
    })
    .filter((spot: ParkSpot | null): spot is ParkSpot => spot !== null);
};

export const getNearbyParks = async (location: Coordinates, radiusKm: number) => {
  const radiusMeters = Math.min(Math.max(Math.round(radiusKm * 1000), 1000), MAX_RADIUS_METERS);

  const results = await Promise.allSettled([
    fetchGoogleParks(location, radiusMeters),
    fetchOverpassParks(location, radiusMeters),
  ]);

  const parks = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

  return sortParks(mergeById(parks)).slice(0, 20);
};