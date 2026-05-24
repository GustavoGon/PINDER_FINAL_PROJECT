import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { useActiveProfile } from '../src/contexts/ActiveProfileContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type FormState = {
  title: string;
  description: string;
  location: string;
  targetLatitude: number | null;
  targetLongitude: number | null;
  maxAttendees: string;
  startsDate: Date;
  startsTime: Date;
  hasEndAt: boolean;
  endsDate: Date;
  endsTime: Date;
};

type ParkSpot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

type LocationSuggestion = {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
};

const RADIUS_OPTIONS = [1, 3, 5, 8];
const USER_MAP_ICON_URL = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
const PARK_MAP_ICON_URL = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';

const getZoomFromRadius = (radiusKm: number) => {
  if (radiusKm <= 1) return 16;
  if (radiusKm <= 3) return 15;
  if (radiusKm <= 5) return 14;
  if (radiusKm <= 8) return 13;
  return 12;
};

const getZoomFromBounds = (latitudeDelta: number, longitudeDelta: number) => {
  const span = Math.max(latitudeDelta, longitudeDelta);

  if (span <= 0.01) return 15;
  if (span <= 0.03) return 14;
  if (span <= 0.06) return 13;
  if (span <= 0.12) return 12;
  if (span <= 0.25) return 11;
  if (span <= 0.5) return 10;
  return 9;
};

const buildMarker = ({
  latitude,
  longitude,
  iconUrl,
  color,
  label,
  size = 'mid',
}: {
  latitude: number;
  longitude: number;
  iconUrl?: string;
  color?: string;
  label?: string;
  size?: 'tiny' | 'mid' | 'small';
}) => {
  const markerParts: string[] = [];

  if (iconUrl) {
    markerParts.push(`icon:${iconUrl}`, 'anchor:center');
  } else {
    markerParts.push(`size:${size}`);
    if (color) {
      markerParts.push(`color:${color}`);
    }
    if (label) {
      markerParts.push(`label:${label}`);
    }
  }

  markerParts.push(`${latitude},${longitude}`);

  return markerParts.join('|');
};

const buildCirclePath = (latitude: number, longitude: number, radiusKm: number) => {
  const points: string[] = [];
  const earthRadiusKm = 6371;
  const angularDistance = radiusKm / earthRadiusKm;

  for (let index = 0; index <= 24; index += 1) {
    const bearing = (index / 24) * Math.PI * 2;
    const lat1 = (latitude * Math.PI) / 180;
    const lon1 = (longitude * Math.PI) / 180;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
        Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
        Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
      );

    points.push(`${(lat2 * 180) / Math.PI},${((lon2 * 180) / Math.PI + 540) % 360 - 180}`);
  }

  return points.join('|');
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

export default function CreateEventScreen() {
  const router = useRouter();
  const { activeProfile } = useActiveProfile();
  const isTutor = activeProfile?.type === 'tutor';
  const params = useLocalSearchParams<{ radius?: string | string[] }>();

  const parsedRouteRadius = Array.isArray(params.radius) ? Number(params.radius[0]) : Number(params.radius);
  const initialRadius = Number.isFinite(parsedRouteRadius) && parsedRouteRadius > 0 ? parsedRouteRadius : 10;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [radius, setRadius] = useState(initialRadius);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [parks, setParks] = useState<ParkSpot[]>([]);
  const [loadingParks, setLoadingParks] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [loadingLocationSuggestions, setLoadingLocationSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [useManualCoordinates, setUseManualCoordinates] = useState(false);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');
  const [selectedParkId, setSelectedParkId] = useState<string | null>(null);
  const [mapPreviewLoading, setMapPreviewLoading] = useState(true);
  const locationSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = useState<FormState>({
    title: '',
    description: '',
    location: '',
    targetLatitude: null,
    targetLongitude: null,
    maxAttendees: '',
    startsDate: new Date(),
    startsTime: new Date(),
    hasEndAt: false,
    endsDate: new Date(),
    endsTime: new Date(),
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.user_id || user?.id || null;
        setCurrentUserId(userId);
      } catch (storageError) {
        console.error('Erro ao carregar utilizador:', storageError);
      }
    };

    loadCurrentUser();
  }, []);

  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          const fallback = { latitude: 40.283, longitude: -7.5 };
          setUserLocation(fallback);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const nextLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setUserLocation(nextLocation);
      } catch (locationError) {
        console.error('Erro ao obter localizacao:', locationError);
        const fallback = { latitude: 40.283, longitude: -7.5 };
        setUserLocation(fallback);
      }
    };

    getLocation();
  }, []);

  const fetchNearbyParks = useCallback(async () => {
    if (!userLocation) {
      return;
    }

    try {
      setLoadingParks(true);
      const radiusMeters = Math.min(radius * 1000, 50000);
      const query = `[out:json][timeout:15];(
        node["leisure"~"^(park|garden|recreation_ground|dog_park)$"](around:${radiusMeters},${userLocation.latitude},${userLocation.longitude});
        way["leisure"~"^(park|garden|recreation_ground|dog_park)$"](around:${radiusMeters},${userLocation.latitude},${userLocation.longitude});
        relation["leisure"~"^(park|garden|recreation_ground|dog_park)$"](around:${radiusMeters},${userLocation.latitude},${userLocation.longitude});
        node["landuse"="forest"](around:${radiusMeters},${userLocation.latitude},${userLocation.longitude});
        way["landuse"="forest"](around:${radiusMeters},${userLocation.latitude},${userLocation.longitude});
        relation["landuse"="forest"](around:${radiusMeters},${userLocation.latitude},${userLocation.longitude});
        node["natural"~"^(wood|tree_row)$"](around:${radiusMeters},${userLocation.latitude},${userLocation.longitude});
        way["natural"~"^(wood|tree_row)$"](around:${radiusMeters},${userLocation.latitude},${userLocation.longitude});
        relation["natural"~"^(wood|tree_row)$"](around:${radiusMeters},${userLocation.latitude},${userLocation.longitude});
      );out center 20;`;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Overpass prefers a descriptive User-Agent/contact so add one to reduce chance of being blocked
          'User-Agent': 'PinderApp/1.0 (+https://pinder.app)',
          Accept: 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      // Debugging: log status for diagnosis when no parks are found during QA
      console.debug('[fetchNearbyParks] Overpass status', response.status, 'ok?', response.ok);

      if (!response.ok) {
        setParks([]);
        return;
      }

      const payload = await response.json();
      console.debug('[fetchNearbyParks] elements found', Array.isArray(payload?.elements) ? payload.elements.length : 0);
      const mapped: ParkSpot[] = (payload.elements || [])
        .map((element: any) => {
          const latitude = element.lat ?? element.center?.lat;
          const longitude = element.lon ?? element.center?.lon;
          const name =
            element.tags?.name ||
            element.tags?.['name:pt'] ||
            element.tags?.short_name ||
            element.tags?.official_name ||
            element.tags?.operator ||
            element.tags?.['name:en'] ||
            'Parque sem nome';

          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return null;
          }

          return {
            id: `park-${element.type}-${element.id}`,
            name,
            latitude,
            longitude,
          } as ParkSpot;
        })
        .filter((park: ParkSpot | null): park is ParkSpot => park !== null)
        .slice(0, 20);

      setParks(mapped);
    } catch (parksError) {
      console.warn('Nao foi possivel carregar parques nesta tentativa.', parksError);
      setParks([]);
    } finally {
      setLoadingParks(false);
    }
  }, [radius, userLocation]);

  useEffect(() => {
    void fetchNearbyParks();
  }, [fetchNearbyParks]);

  const selectedPark = useMemo(
    () => parks.find((park) => park.id === selectedParkId) || null,
    [parks, selectedParkId],
  );

  const selectedMapPoint = useMemo(() => {
    if (selectedPark) {
      return selectedPark;
    }

    if (formData.targetLatitude !== null && formData.targetLongitude !== null) {
      return {
        id: 'selected-form-point',
        name: formData.location.trim() || 'Local selecionado',
        latitude: formData.targetLatitude,
        longitude: formData.targetLongitude,
      };
    }

    return null;
  }, [formData.location, formData.targetLatitude, formData.targetLongitude, selectedPark]);

  const mapPreviewFit = useMemo(() => {
    const mapPoints = [userLocation, selectedMapPoint].filter(
      (point): point is { latitude: number; longitude: number } => Boolean(point),
    );

    if (mapPoints.length > 0) {
      const latitudes = mapPoints.map((point) => point.latitude);
      const longitudes = mapPoints.map((point) => point.longitude);
      const centerLatitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
      const centerLongitude = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
      const latitudeDelta = Math.max(...latitudes) - Math.min(...latitudes);
      const longitudeDelta = Math.max(...longitudes) - Math.min(...longitudes);

      const padding = Math.max(latitudeDelta, longitudeDelta);

      return {
        center: {
          latitude: centerLatitude,
          longitude: centerLongitude,
        },
        zoom:
          mapPoints.length === 1
            ? getZoomFromRadius(radius)
            : getZoomFromBounds(latitudeDelta, longitudeDelta),
        visiblePoints: mapPoints.map((point) => `${point.latitude},${point.longitude}`),
        padding,
      };
    }

    return null;
  }, [radius, selectedMapPoint, userLocation]);

  const mapPreviewUrl = useMemo(() => {
    const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!googleMapsApiKey || !mapPreviewFit) {
      return null;
    }

    const center = `${mapPreviewFit.center.latitude},${mapPreviewFit.center.longitude}`;
    const markerParams = [
      userLocation
        ? buildMarker({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            iconUrl: USER_MAP_ICON_URL,
          })
        : null,
      selectedMapPoint
        ? buildMarker({
            latitude: selectedMapPoint.latitude,
            longitude: selectedMapPoint.longitude,
            iconUrl: PARK_MAP_ICON_URL,
          })
        : null,
    ].filter((marker): marker is string => Boolean(marker));

    const style = [
      'feature:poi|visibility:off',
      'feature:transit|visibility:off',
      'feature:landscape|element:geometry|color:0xf4f1ea',
      'feature:water|element:geometry|color:0xd9edf5',
      'feature:road|element:geometry|color:0xffffff',
    ];

    const radiusCircle = buildCirclePath(mapPreviewFit.center.latitude, mapPreviewFit.center.longitude, Math.max(radius, 2));
    const visiblePoints = mapPreviewFit.visiblePoints;

    return `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(center)}&zoom=${mapPreviewFit.zoom}&size=900x220&scale=2&maptype=roadmap${
      style.map((item) => `&style=${encodeURIComponent(item)}`).join('')
    }&path=${encodeURIComponent(`fillcolor:0x1B8F5A22|color:0x1B8F5A88|weight:2|${radiusCircle}`)}${
      markerParams.length > 0 ? `&${markerParams.map((marker) => `markers=${encodeURIComponent(marker)}`).join('&')}` : ''
    }${visiblePoints.map((point) => `&visible=${encodeURIComponent(point)}`).join('')}` +
      `&key=${encodeURIComponent(googleMapsApiKey)}`;
  }, [mapPreviewFit, radius, selectedMapPoint, userLocation]);
  
  const handleOpenMap = useCallback(async () => {
    const destination = selectedMapPoint ?? userLocation;

    if (!destination) {
      return;
    }

    const destinationQuery = `${destination.latitude},${destination.longitude}`;
    const url =
      userLocation && selectedMapPoint
        ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
            `${userLocation.latitude},${userLocation.longitude}`,
          )}&destination=${encodeURIComponent(destinationQuery)}&travelmode=walking`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationQuery)}`;

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Mapa', 'Nao foi possivel abrir o mapa externo neste dispositivo.');
      return;
    }

    await Linking.openURL(url);
  }, [selectedMapPoint, userLocation]);

  useEffect(() => {
    setMapPreviewLoading(true);
  }, [mapPreviewUrl]);

  const nearbyParksSorted = useMemo(() => {
    if (!userLocation) return parks.slice(0, 8);
    return parks
      .map((p) => ({
        ...p,
        distance:
          typeof p.latitude === 'number' && typeof p.longitude === 'number'
            ? calculateDistance(userLocation.latitude, userLocation.longitude, p.latitude, p.longitude)
            : Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [parks, userLocation]);

  const displayParks = loadingParks
    ? Array.from({ length: 6 }, (_, index) => ({ id: `loading-park-${index}`, isLoading: true as const }))
    : nearbyParksSorted.slice(0, 8);

  const selectMeetingPoint = (name: string, latitude: number, longitude: number, parkId?: string) => {
    setFormData((prev) => ({
      ...prev,
      location: name,
      targetLatitude: latitude,
      targetLongitude: longitude,
    }));
    setManualLatitude(latitude.toFixed(6));
    setManualLongitude(longitude.toFixed(6));
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    setSelectedParkId(parkId ?? null);
  };

  const fetchLocationSuggestions = useCallback(async (query: string) => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) {
      setLocationSuggestions([]);
      setLoadingLocationSuggestions(false);
      return;
    }

    try {
      setLoadingLocationSuggestions(true);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&countrycodes=pt&q=${encodeURIComponent(normalizedQuery)}`,
        {
          headers: {
            'Accept-Language': 'pt-PT,pt;q=0.9',
          },
        },
      );

      if (!response.ok) {
        setLocationSuggestions([]);
        return;
      }

      const results = await response.json();
      if (!Array.isArray(results)) {
        setLocationSuggestions([]);
        return;
      }

      const mappedSuggestions: LocationSuggestion[] = results
        .map((item: any) => {
          const latitude = Number.parseFloat(item.lat);
          const longitude = Number.parseFloat(item.lon);
          if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
            return null;
          }

          const displayName = typeof item.display_name === 'string' ? item.display_name : normalizedQuery;
          const name = displayName.split(',')[0] || normalizedQuery;

          return {
            id: `${item.place_id ?? displayName}-${latitude}-${longitude}`,
            name,
            displayName,
            latitude,
            longitude,
          };
        })
        .filter((item: LocationSuggestion | null): item is LocationSuggestion => item !== null)
        .slice(0, 6);

      setLocationSuggestions(mappedSuggestions);
      setShowLocationSuggestions(true);
    } catch (error) {
      console.warn('Nao foi possivel obter sugestoes de localizacao.', error);
      setLocationSuggestions([]);
    } finally {
      setLoadingLocationSuggestions(false);
    }
  }, []);

  const handleLocationNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      location: value,
      targetLatitude: null,
      targetLongitude: null,
    }));
    setSelectedParkId(null);

    if (locationSearchDebounceRef.current) {
      clearTimeout(locationSearchDebounceRef.current);
    }

    if (value.trim().length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      setLoadingLocationSuggestions(false);
      return;
    }

    setShowLocationSuggestions(true);
    locationSearchDebounceRef.current = setTimeout(() => {
      void fetchLocationSuggestions(value);
    }, 350);
  };

  const handleSelectLocationSuggestion = (suggestion: LocationSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      location: suggestion.name,
      targetLatitude: suggestion.latitude,
      targetLongitude: suggestion.longitude,
    }));
    setManualLatitude(suggestion.latitude.toFixed(6));
    setManualLongitude(suggestion.longitude.toFixed(6));
    setSelectedParkId(null);
    setShowLocationSuggestions(false);
  };

  useEffect(() => {
    return () => {
      if (locationSearchDebounceRef.current) {
        clearTimeout(locationSearchDebounceRef.current);
      }
    };
  }, []);

  const applyManualCoordinates = () => {
    const latitude = Number.parseFloat(manualLatitude);
    const longitude = Number.parseFloat(manualLongitude);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      Alert.alert('Coordenadas', 'Introduz latitude e longitude válidas.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      targetLatitude: latitude,
      targetLongitude: longitude,
    }));
  };

  const onDateChange = (
    pickerEvent: DateTimePickerEvent,
    selectedDate: Date | undefined,
    key: 'startsDate' | 'endsDate',
    closePicker: () => void,
  ) => {
    if (Platform.OS === 'android') {
      closePicker();
    }
    if (pickerEvent.type === 'set' && selectedDate) {
      setFormData((prev) => ({ ...prev, [key]: selectedDate }));
    }
  };

  const onTimeChange = (
    pickerEvent: DateTimePickerEvent,
    selectedDate: Date | undefined,
    key: 'startsTime' | 'endsTime',
    closePicker: () => void,
  ) => {
    if (Platform.OS === 'android') {
      closePicker();
    }
    if (pickerEvent.type === 'set' && selectedDate) {
      setFormData((prev) => ({ ...prev, [key]: selectedDate }));
    }
  };

  const handleCreateEvent = async () => {
    if (!isTutor) {
      Alert.alert('Sessao', 'So os tutores podem criar eventos.');
      return;
    }

    if (!currentUserId) {
      Alert.alert('Sessao', 'Faz login para criar eventos.');
      return;
    }

    if (!formData.title.trim()) {
      Alert.alert('Validacao', 'Indica um titulo para o evento.');
      return;
    }

    if (!formData.location.trim()) {
      Alert.alert('Validacao', 'Indica a localizacao do evento.');
      return;
    }

    const fallbackLocation = userLocation || { latitude: 40.283, longitude: -7.5 };
    const eventLatitude = formData.targetLatitude ?? fallbackLocation.latitude;
    const eventLongitude = formData.targetLongitude ?? fallbackLocation.longitude;

    const startsAt = new Date(formData.startsDate);
    startsAt.setHours(formData.startsTime.getHours(), formData.startsTime.getMinutes(), 0, 0);

    let endsAt: Date | null = null;
    if (formData.hasEndAt) {
      endsAt = new Date(formData.endsDate);
      endsAt.setHours(formData.endsTime.getHours(), formData.endsTime.getMinutes(), 0, 0);
      if (endsAt <= startsAt) {
        Alert.alert('Validacao', 'A hora final deve ser depois da hora inicial.');
        return;
      }
    }

    try {
      setCreatingEvent(true);

      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt ? endsAt.toISOString() : null,
          location: formData.location.trim(),
          latitude: eventLatitude,
          longitude: eventLongitude,
          image: null,
          max_attendees: formData.maxAttendees ? parseInt(formData.maxAttendees, 10) : null,
          created_by: currentUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar evento');
      }

      Alert.alert('Sucesso', 'Evento criado com sucesso.', [
        {
          text: 'Voltar aos eventos',
          onPress: () => router.replace('/grupos'),
        },
      ]);
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Erro ao criar evento';
      Alert.alert('Erro', message);
    } finally {
      setCreatingEvent(false);
    }
  };

  if (!isTutor) {
    return (
      <View style={styles.screen}>
        <View style={styles.blockedCard}>
          <FontAwesome5 name="lock" size={24} color="#E87A4D" />
          <Text style={styles.blockedTitle}>Criacao de eventos</Text>
          <Text style={styles.blockedText}>Esta area está reservada a tutores.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
              <FontAwesome5 name="arrow-left" size={18} color="#5C4A3D" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Criar evento</Text>
              <Text style={styles.subtitle}>Pesquisa a localizacao por nome, define o ponto de encontro e publica o passeio.</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Raio de pesquisa de parques</Text>
            <View style={styles.radiusRow}>
              {RADIUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.radiusChip, radius === option && styles.radiusChipActive]}
                  onPress={() => setRadius(option)}
                >
                  <Text style={[styles.radiusChipText, radius === option && styles.radiusChipTextActive]}>
                    {option} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pontos recomendados</Text>
            <Text style={styles.sectionSubtitle}>Seleciona um parque ou um ponto manual para guardar as coordenadas do evento.</Text>
            <Text style={styles.parksDisclaimer}>Os parques sem nome podem ter uma localização menos precisa e menos segura. Confirma sempre o ponto antes de publicar.</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
              <TouchableOpacity
                style={[styles.pointCard, !selectedParkId && { borderColor: '#2E8B7A', backgroundColor: '#EAF6F3' }]}
                onPress={() => {
                  if (!userLocation) {
                    return;
                  }
                  selectMeetingPoint('Local atual', userLocation.latitude, userLocation.longitude, undefined);
                }}
              >
                <View style={[styles.pointIcon, styles.pointIconCurrent]}>
                  <FontAwesome5 name="location-arrow" size={13} color="#2E8B7A" />
                </View>
                <Text style={styles.pointTitle}>Local atual</Text>
                <Text style={styles.pointMeta}>Usar a tua posição atual</Text>
                <Text style={styles.pointAction}>Selecionar</Text>
              </TouchableOpacity>

              {displayParks.length === 0 ? (
                <View style={styles.emptyPointCard}>
                  <Text style={styles.emptyPointText}>Sem parques próximos para este raio.</Text>
                </View>
              ) : (
                displayParks.map((park) => {
                  const realPark = 'isLoading' in park ? null : park;
                  const distance = realPark && userLocation
                    ? calculateDistance(userLocation.latitude, userLocation.longitude, realPark.latitude, realPark.longitude)
                    : null;

                  const isSelected = realPark ? selectedParkId === realPark.id : false;

                  return (
                    <TouchableOpacity
                      key={park.id}
                      style={[
                        styles.pointCard,
                        isSelected && { borderColor: '#2E8B7A', backgroundColor: '#EAF6F3' },
                        loadingParks && styles.pointCardLoading,
                      ]}
                      disabled={loadingParks || !realPark}
                      onPress={() => {
                        if (!realPark) {
                          return;
                        }
                        selectMeetingPoint(realPark.name, realPark.latitude, realPark.longitude, realPark.id);
                      }}
                    >
                      {loadingParks ? (
                        <>
                          <View style={styles.pointIcon}>
                            <ActivityIndicator size="small" color="#2E8B7A" />
                          </View>
                          <Text style={styles.pointTitle}>A carregar...</Text>
                          <Text style={styles.pointMeta}>A atualizar resultados</Text>
                        </>
                      ) : (
                        <>
                          <View style={styles.pointIcon}>
                            <FontAwesome5 name="tree" size={13} color="#57B2A1" />
                          </View>
                          <Text style={styles.pointTitle}>{realPark?.name}</Text>
                          <Text style={styles.pointMeta}>{distance ? `${distance.toFixed(1)} km` : 'Parque recomendado'}</Text>
                          <Text style={styles.pointAction}>{isSelected ? 'Selecionado' : 'Selecionar'}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.mapPreviewCard}>
              <View style={styles.mapPreviewHeaderRow}>
                <View>
                  <Text style={styles.mapPreviewTitle}>Mapa dos parques</Text>
                  <Text style={styles.mapPreviewSubtitle}>
                    {selectedPark
                      ? `Centrado em ${selectedPark.name}`
                      : userLocation
                        ? 'Centrado na tua localização atual'
                        : 'A localizar a tua posição'}
                  </Text>
                </View>
                {(loadingParks || mapPreviewLoading) && (
                  <View style={styles.mapLoadingBadge}>
                    <ActivityIndicator size="small" color="#2E8B7A" />
                    <Text style={styles.mapLoadingBadgeText}>{mapPreviewLoading ? 'A carregar mapa' : 'A carregar novos mapas'}</Text>
                  </View>
                )}
              </View>
              
              <TouchableOpacity
                style={[
                  styles.openMapButton,
                  !selectedMapPoint && !userLocation && styles.openMapButtonDisabled,
                ]}
                onPress={handleOpenMap}
                disabled={!selectedMapPoint && !userLocation}
              >
                <View style={styles.openMapIconWrap}>
                  <FontAwesome5 name="route" size={11} color="#2E8B7A" />
                </View>
                <Text style={styles.openMapButtonText}>Ver direções</Text>
              </TouchableOpacity>

              <View style={styles.mapLegendRow}>
                <View style={styles.mapLegendItem}>
                  <View style={[styles.mapLegendDot, styles.mapLegendDotUser]} />
                  <Text style={styles.mapLegendText}>Tu</Text>
                </View>
                <View style={styles.mapLegendItem}>
                  <View style={[styles.mapLegendDot, styles.mapLegendDotPark]} />
                  <Text style={styles.mapLegendText}>Ponto do evento</Text>
                </View>
              </View>

              {mapPreviewUrl ? (
                <View style={styles.mapPreviewImageWrap}>
                  <Image
                    source={{ uri: mapPreviewUrl }}
                    style={styles.mapPreviewImage}
                    resizeMode="cover"
                    onLoadStart={() => setMapPreviewLoading(true)}
                    onLoadEnd={() => setMapPreviewLoading(false)}
                    onError={() => setMapPreviewLoading(false)}
                  />
                  {(loadingParks || mapPreviewLoading) && <View style={styles.mapPreviewOverlay} />}
                </View>
              ) : (
                <View style={styles.mapPreviewFallback}>
                  {(loadingParks || mapPreviewLoading) ? (
                    <>
                      <ActivityIndicator size="small" color="#2E8B7A" />
                      <Text style={[styles.mapPreviewFallbackText, { marginTop: 10 }]}>A carregar mapa</Text>
                    </>
                  ) : (
                    <Text style={styles.mapPreviewFallbackText}>Define a chave do Google Maps para ver o mapa.</Text>
                  )}
                </View>
              )}

              {selectedPark && (
                <Text style={styles.mapPreviewSelectedText}>Parque selecionado: {selectedPark.name}</Text>
              )}
            </View>

          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalhes do evento</Text>

            <Text style={styles.label}>Titulo*</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Passeio canino de sabado"
              placeholderTextColor="#A9A096"
              value={formData.title}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, title: value }))}
            />

            <Text style={styles.label}>Descricao</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              value={formData.description}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, description: value }))}
              placeholder="Conta o que vai acontecer no evento"
              placeholderTextColor="#A9A096"
            />

            <Text style={styles.label}>Localizacao*</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.innerInput}
                value={formData.location}
                onChangeText={handleLocationNameChange}
                onFocus={() => setShowLocationSuggestions(formData.location.trim().length >= 3)}
                placeholder="Ex: Parque do Aviao"
                placeholderTextColor="#A9A096"
              />
              {loadingLocationSuggestions ? (
                <ActivityIndicator size="small" color="#2E8B7A" />
              ) : (
                <FontAwesome5 name="search" size={13} color="#8B837A" />
              )}
            </View>

            {showLocationSuggestions && formData.location.trim().length >= 3 && (
              <View style={styles.inlineList}>
                {locationSuggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    style={styles.listItem}
                    onPress={() => handleSelectLocationSuggestion(suggestion)}
                  >
                    <Text style={styles.listItemTitle}>{suggestion.name}</Text>
                    <Text style={styles.listItemSubtitle} numberOfLines={1}>
                      {suggestion.displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
                {locationSuggestions.length === 0 && !loadingLocationSuggestions && (
                  <Text style={styles.emptyText}>Sem resultados. Tenta um nome mais especifico.</Text>
                )}
              </View>
            )}

            <View style={styles.locationActionsRow}>
              <TouchableOpacity
                style={[styles.locationToggleButton, useManualCoordinates && styles.locationToggleButtonActive]}
                onPress={() => setUseManualCoordinates((prev) => !prev)}
              >
                <Text style={[styles.locationToggleButtonText, useManualCoordinates && styles.locationToggleButtonTextActive]}>
                  {useManualCoordinates ? 'Ocultar coordenadas' : 'Coordenadas manuais'}
                </Text>
              </TouchableOpacity>
            </View>

            {formData.targetLatitude !== null && formData.targetLongitude !== null && (
              <View style={styles.selectionBanner}>
                <FontAwesome5 name="map-marker-alt" size={14} color="#2E8B7A" />
                <Text style={styles.selectionText}>
                  Ponto selecionado: {formData.location} ({formData.targetLatitude.toFixed(5)}, {formData.targetLongitude.toFixed(5)})
                </Text>
              </View>
            )}

            {useManualCoordinates && (
              <View>
                <Text style={styles.sectionSubtitle}>Introduz manualmente se quiseres um ponto exacto fora da validação do nome.</Text>
                <View style={styles.coordinateRow}>
                  <TextInput
                    style={styles.coordinateInput}
                    placeholder="Latitude"
                    placeholderTextColor="#A9A096"
                    keyboardType="decimal-pad"
                    value={manualLatitude}
                    onChangeText={setManualLatitude}
                  />
                  <TextInput
                    style={styles.coordinateInput}
                    placeholder="Longitude"
                    placeholderTextColor="#A9A096"
                    keyboardType="decimal-pad"
                    value={manualLongitude}
                    onChangeText={setManualLongitude}
                  />
                </View>
                <TouchableOpacity style={styles.manualButton} onPress={applyManualCoordinates}>
                  <Text style={styles.manualButtonText}>Usar coordenadas</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>Data e hora de inicio*</Text>
            <View style={styles.datetimeRow}>
              <TouchableOpacity style={styles.datetimeButton} onPress={() => setShowStartDatePicker(true)}>
                <FontAwesome5 name="calendar-alt" size={14} color="#57B2A1" />
                <Text style={styles.datetimeText}>{formData.startsDate.toLocaleDateString('pt-PT')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.datetimeButton} onPress={() => setShowStartTimePicker(true)}>
                <FontAwesome5 name="clock" size={14} color="#57B2A1" />
                <Text style={styles.datetimeText}>
                  {formData.startsTime.toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Maximo de participantes</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={formData.maxAttendees}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, maxAttendees: value }))}
              placeholder="Ex: 20"
              placeholderTextColor="#A9A096"
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleCreateEvent} disabled={creatingEvent}>
              {creatingEvent ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.submitButtonText}>Criar evento</Text>}
            </TouchableOpacity>

            {showStartDatePicker && (
              <DateTimePicker
                value={formData.startsDate}
                mode="date"
                minimumDate={new Date()}
                onChange={(event, selectedDate) =>
                  onDateChange(event, selectedDate, 'startsDate', () => setShowStartDatePicker(false))
                }
              />
            )}

            {showStartTimePicker && (
              <DateTimePicker
                value={formData.startsTime}
                mode="time"
                onChange={(event, selectedDate) =>
                  onTimeChange(event, selectedDate, 'startsTime', () => setShowStartTimePicker(false))
                }
              />
            )}

            {showEndDatePicker && (
              <DateTimePicker
                value={formData.endsDate}
                mode="date"
                minimumDate={formData.startsDate}
                onChange={(event, selectedDate) =>
                  onDateChange(event, selectedDate, 'endsDate', () => setShowEndDatePicker(false))
                }
              />
            )}

            {showEndTimePicker && (
              <DateTimePicker
                value={formData.endsTime}
                mode="time"
                onChange={(event, selectedDate) =>
                  onTimeChange(event, selectedDate, 'endsTime', () => setShowEndTimePicker(false))
                }
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F2EB',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingHorizontal: 14,
    paddingBottom: 120,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#5C4A3D',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: '#7E776F',
    fontSize: 12,
    lineHeight: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    color: '#5C4A3D',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#8B837A',
    fontSize: 11,
    lineHeight: 15,
    marginTop: -4,
  },
  parksDisclaimer: {
    color: '#9A6B2F',
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: '#FFF6E7',
    borderWidth: 1,
    borderColor: '#F0D7A8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  radiusChip: {
    borderWidth: 1,
    borderColor: '#D6CEC3',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  radiusChipActive: {
    borderColor: '#57B2A1',
    backgroundColor: '#EAF6F3',
  },
  radiusChipText: {
    color: '#5C4A3D',
    fontWeight: '700',
    fontSize: 12,
  },
  radiusChipTextActive: {
    color: '#2E8B7A',
  },
  cardsRow: {
    gap: 10,
    paddingBottom: 4,
  },
  pointCard: {
    width: 164,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1D8CA',
    backgroundColor: '#FBF8F2',
    padding: 12,
    gap: 6,
  },
  pointCardLoading: {
    opacity: 0.82,
    backgroundColor: '#F4F0E7',
  },
  pointIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2EC',
  },
  pointIconCurrent: {
    backgroundColor: '#EAF6F3',
  },
  pointTitle: {
    color: '#5C4A3D',
    fontWeight: '800',
    fontSize: 13,
  },
  pointMeta: {
    color: '#7E776F',
    fontSize: 11,
  },
  pointAction: {
    color: '#2E8B7A',
    fontWeight: '800',
    fontSize: 11,
    marginTop: 2,
  },
  locationActionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  locationToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FBF8F2',
    borderWidth: 1,
    borderColor: '#E1D8CA',
  },
  locationToggleButtonActive: {
    backgroundColor: '#EAF6F3',
    borderColor: '#CBE7E0',
  },
  locationToggleButtonText: {
    color: '#5C4A3D',
    fontWeight: '800',
    fontSize: 12,
  },
  locationToggleButtonTextActive: {
    color: '#2E8B7A',
  },
  emptyPointCard: {
    width: 164,
    minHeight: 104,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D6CEC3',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  emptyPointText: {
    color: '#8B837A',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  mapPreviewCard: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D6CEC3',
    backgroundColor: '#FBF8F2',
    padding: 12,
    gap: 8,
  },
  mapPreviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  mapPreviewTitle: {
    color: '#5C4A3D',
    fontSize: 14,
    fontWeight: '800',
  },
  mapPreviewSubtitle: {
    color: '#7E776F',
    fontSize: 11,
    marginTop: -4,
  },
  mapPreviewImage: {
    width: '100%',
    height: 170,
    borderRadius: 14,
    backgroundColor: '#EDE6D9',
  },
  mapPreviewImageWrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  mapPreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  mapLoadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EAF6F3',
    borderWidth: 1,
    borderColor: '#CBE7E0',
  },
  mapLoadingBadgeText: {
    color: '#2E8B7A',
    fontSize: 11,
    fontWeight: '700',
  },
  mapPreviewSelectedText: {
    color: '#2E8B7A',
    fontSize: 11,
    fontWeight: '700',
  },
  openMapButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBE7E0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openMapButtonDisabled: {
    opacity: 0.52,
  },
  openMapIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF6F3',
  },
  openMapButtonText: {
    color: '#2E8B7A',
    fontSize: 12,
    fontWeight: '800',
  },
  mapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 2,
    marginBottom: 2,
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mapLegendDotUser: {
    backgroundColor: '#3B82F6',
  },
  mapLegendDotPark: {
    backgroundColor: '#22A55A',
  },
  mapLegendText: {
    color: '#7E776F',
    fontSize: 11,
    fontWeight: '700',
  },
  mapPreviewFallback: {
    width: '100%',
    minHeight: 170,
    borderRadius: 14,
    backgroundColor: '#F2ECE0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  mapPreviewFallbackText: {
    color: '#8B837A',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  inputWrapper: {
    backgroundColor: '#F5F2EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  innerInput: {
    flex: 1,
    color: '#5C4A3D',
    fontSize: 14,
  },
  inlineList: {
    borderWidth: 1,
    borderColor: '#E1D8CA',
    borderRadius: 12,
    backgroundColor: '#FFFDF8',
    overflow: 'hidden',
  },
  listItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E9DE',
    gap: 2,
  },
  listItemTitle: {
    color: '#5C4A3D',
    fontWeight: '700',
    fontSize: 13,
  },
  listItemSubtitle: {
    color: '#8B837A',
    fontSize: 11,
  },
  emptyText: {
    color: '#8B837A',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  coordinateInput: {
    flex: 1,
    backgroundColor: '#F5F2EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#5C4A3D',
    fontSize: 14,
  },
  manualButton: {
    backgroundColor: '#EAF6F3',
    borderWidth: 1,
    borderColor: '#CBE7E0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#2E8B7A',
    fontWeight: '800',
    fontSize: 13,
  },
  label: {
    fontSize: 12,
    color: '#8B837A',
    fontWeight: '700',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#F5F2EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#5C4A3D',
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  inlineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  labelInline: {
    fontSize: 12,
    color: '#8B837A',
    fontWeight: '700',
  },
  toggleButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D6CEC3',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  toggleButtonActive: {
    borderColor: '#57B2A1',
    backgroundColor: '#EAF6F3',
  },
  toggleButtonText: {
    color: '#5C4A3D',
    fontWeight: '700',
    fontSize: 12,
  },
  toggleButtonTextActive: {
    color: '#2E8B7A',
  },
  datetimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  datetimeButton: {
    flex: 1,
    backgroundColor: '#F5F2EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datetimeText: {
    color: '#5C4A3D',
    fontSize: 13,
    fontWeight: '600',
  },
  selectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EAF6F3',
    borderWidth: 1,
    borderColor: '#CBE7E0',
  },
  selectionText: {
    flex: 1,
    color: '#2E8B7A',
    fontWeight: '700',
    fontSize: 12,
  },
  submitButton: {
    marginTop: 6,
    backgroundColor: '#E87A4D',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 14,
  },
  blockedCard: {
    margin: 20,
    marginTop: 80,
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  blockedTitle: {
    color: '#5C4A3D',
    fontWeight: '800',
    fontSize: 18,
  },
  blockedText: {
    color: '#7E776F',
    fontSize: 13,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 4,
    backgroundColor: '#EAF6F3',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#2E8B7A',
    fontWeight: '800',
  },
});
