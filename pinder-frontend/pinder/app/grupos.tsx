import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  FlatList,
  Image,
  ImageBackground,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import BottomNav from '../src/components/BottomNav';
import { useActiveProfile } from '../src/contexts/ActiveProfileContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type EventStatus = 'UPCOMING' | 'ONGOING' | 'FINISHED' | 'CANCELLED';
type StatusFilter = 'ALL' | 'UPCOMING' | 'ONGOING';

type PetFilter = 'ALL' | string;

interface EventAttendee {
  event_attendee_id?: string;
  event_id: string;
  user_id: string;
  pet_id: string | null;
  joined_at: string;
  user?: { username?: string | null };
  pet?: { name?: string | null; main_photo?: string | null };
}

interface EventItem {
  event_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string;
  latitude: number;
  longitude: number;
  image: string | null;
  max_attendees: number | null;
  attendee_count: number;
  status?: EventStatus;
  distance?: number;
  attendees?: EventAttendee[];
}

interface PetItem {
  pet_id: string;
  name: string;
  main_photo: string | null;
  species?: { name?: string | null } | null;
  breed?: { name?: string | null } | null;
}

interface ParkSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const RADIUS_OPTIONS = [5, 10, 25, 50];

const getMapRegionFromRadius = (latitude: number, longitude: number, radiusKm: number): Region => {
  const span = Math.max(radiusKm * 0.035, 0.03);

  return {
    latitude,
    longitude,
    latitudeDelta: span,
    longitudeDelta: span,
  };
};

const getZoomFromRadius = (radiusKm: number) => {
  if (radiusKm <= 5) return 14;
  if (radiusKm <= 10) return 13;
  if (radiusKm <= 25) return 12;
  return 11;
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

export default function GruposEventos() {
  const { activeProfile } = useActiveProfile();
  const router = useRouter();
  const isTutor = activeProfile?.type === 'tutor';

  const [events, setEvents] = useState<EventItem[]>([]);
  const [parks, setParks] = useState<ParkSpot[]>([]);
  const [pets, setPets] = useState<PetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petsError, setPetsError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [radius, setRadius] = useState(10);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [petSearchTerm, setPetSearchTerm] = useState('');
  const [petFilter, setPetFilter] = useState<PetFilter>('ALL');

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState('');
  const [eventAttendees, setEventAttendees] = useState<EventAttendee[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedEventForJoin, setSelectedEventForJoin] = useState<EventItem | null>(null);
  const [joinModalLoading, setJoinModalLoading] = useState(false);
  const [joiningPetId, setJoiningPetId] = useState<string | null>(null);
  const [joinedPetIds, setJoinedPetIds] = useState<Set<string>>(new Set());
  const radiusRef = useRef(radius);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    targetLatitude: null as number | null,
    targetLongitude: null as number | null,
    maxAttendees: '',
    startsDate: new Date(),
    startsTime: new Date(),
    hasEndAt: false,
    endsDate: new Date(),
    endsTime: new Date(),
  });

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

  const loadPets = useCallback(async () => {
    if (!currentUserId) {
      return;
    }

    try {
      setPetsLoading(true);
      setPetsError(null);

      const response = await fetch(`${API_URL}/pets/user/${currentUserId}`);

      if (!response.ok) {
        throw new Error('Nao foi possivel carregar os teus pets');
      }

      const petsData: PetItem[] = await response.json();
      setPets(petsData);
    } catch (petsFetchError) {
      const message = petsFetchError instanceof Error ? petsFetchError.message : 'Erro ao carregar pets';
      setPetsError(message);
      setPets([]);
    } finally {
      setPetsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void loadPets();
  }, [loadPets]);

  useEffect(() => {
    radiusRef.current = radius;
  }, [radius]);

  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          const fallback = { latitude: 40.283, longitude: -7.5 };
          setUserLocation(fallback);
          setMapRegion(getMapRegionFromRadius(fallback.latitude, fallback.longitude, radiusRef.current));
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const nextLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setUserLocation(nextLocation);
        setMapRegion(getMapRegionFromRadius(nextLocation.latitude, nextLocation.longitude, radiusRef.current));
      } catch (locationError) {
        console.error('Erro ao obter localizacao:', locationError);
        const fallback = { latitude: 40.283, longitude: -7.5 };
        setUserLocation(fallback);
        setMapRegion(getMapRegionFromRadius(fallback.latitude, fallback.longitude, radiusRef.current));
      }
    };

    getLocation();
  }, []);

  useEffect(() => {
    if (!userLocation) {
      return;
    }

    setMapRegion(getMapRegionFromRadius(userLocation.latitude, userLocation.longitude, radius));
  }, [radius, userLocation]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const buildPreviewPoint = (latitude: number, longitude: number): { left: `${number}%`; top: `${number}%` } => {
    if (!mapRegion) {
      return { left: '50%', top: '50%' };
    }

    const latSpan = Math.max(mapRegion.latitudeDelta, 0.01);
    const lonSpan = Math.max(mapRegion.longitudeDelta, 0.01);

    const xRatio = (longitude - mapRegion.longitude) / lonSpan;
    const yRatio = (mapRegion.latitude - latitude) / latSpan;

    return {
      left: `${Math.max(6, Math.min(94, 50 + xRatio * 62))}%`,
      top: `${Math.max(8, Math.min(90, 50 + yRatio * 62))}%`,
    };
  };

  const fetchEvents = useCallback(async (fromPullToRefresh: boolean) => {
    if (!userLocation) {
      return;
    }

    try {
      console.info('[Events] A carregar eventos', {
        refresh: fromPullToRefresh,
        radiusKm: radius,
      });

      if (!fromPullToRefresh) {
        setLoading(true);
      }
      setError(null);

      const params = new URLSearchParams({
        latitude: String(userLocation.latitude),
        longitude: String(userLocation.longitude),
      });

      const response = await fetch(`${API_URL}/events/recommendations?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Erro ao procurar eventos');
      }

      const data: EventItem[] = await response.json();
      const enriched = data
        .map((event) => ({
          ...event,
          distance:
            typeof event.distance === 'number'
              ? event.distance
              : calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  event.latitude,
                  event.longitude,
                ),
        }))
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

      setEvents(enriched);
      console.info('[Events] Eventos carregados', {
        count: enriched.length,
        radiusKm: radius,
      });
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Erro ao procurar eventos';
      setError(message);
      console.error(fetchError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userLocation, radius]);

  const fetchNearbyParks = useCallback(async () => {
    if (!userLocation) {
      return;
    }

    try {
      const radiusMeters = Math.min(radius * 1000, 50000);
      console.info('[Events] A carregar parques proximos', {
        radiusKm: radius,
        radiusMeters,
      });

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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        console.warn(`Overpass indisponivel (status ${response.status}). A continuar sem parques.`);
        setParks([]);
        return;
      }

      const payload = await response.json();
      const mapped: ParkSpot[] = (payload.elements || [])
        .map((element: any) => {
          const latitude = element.lat ?? element.center?.lat;
          const longitude = element.lon ?? element.center?.lon;
          const name = element.tags?.name || 'Parque';

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
      console.info('[Events] Parques carregados', {
        count: mapped.length,
        radiusKm: radius,
      });
    } catch {
      console.warn('Nao foi possivel carregar parques nesta tentativa.');
      setParks([]);
    }
  }, [userLocation, radius]);

  useEffect(() => {
    if (!userLocation) {
      return;
    }

    void Promise.all([fetchEvents(false), fetchNearbyParks()]);
  }, [userLocation, fetchEvents, fetchNearbyParks]);

  const handleRefresh = () => {
    setRefreshing(true);
    void Promise.all([fetchEvents(true), fetchNearbyParks()]);
  };

  const filteredEvents = useMemo(() => {
    const now = new Date();

    return events.filter((event) => {
      const titleMatch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
      const locationMatch = event.location.toLowerCase().includes(searchTerm.toLowerCase());

      const effectiveDistance =
        typeof event.distance === 'number'
          ? event.distance
          : userLocation
            ? calculateDistance(userLocation.latitude, userLocation.longitude, event.latitude, event.longitude)
            : Number.MAX_SAFE_INTEGER;

      const inRadius = effectiveDistance <= radius;

      let statusMatch = true;
      if (statusFilter === 'UPCOMING') {
        statusMatch = new Date(event.starts_at) > now;
      } else if (statusFilter === 'ONGOING') {
        const startsAt = new Date(event.starts_at);
        const endsAt = event.ends_at ? new Date(event.ends_at) : null;
        statusMatch = startsAt <= now && (!endsAt || endsAt >= now);
      }

      return (titleMatch || locationMatch) && inRadius && statusMatch && event.status !== 'CANCELLED';
    });
  }, [events, searchTerm, radius, statusFilter, userLocation]);

  const futureEvents = useMemo(() => {
    const now = new Date();
    return filteredEvents
      .filter((event) => new Date(event.starts_at).getTime() >= now.getTime() - 60 * 1000)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [filteredEvents]);

  const recommendedParks = useMemo(() => parks.slice(0, 4), [parks]);

  const staticMapUrl = useMemo(() => {
    const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!mapRegion || !googleMapsApiKey) {
      return null;
    }

    const center = `${mapRegion.latitude},${mapRegion.longitude}`;
    const radiusCircle = buildCirclePath(mapRegion.latitude, mapRegion.longitude, radius);
    const markers = [
      userLocation ? `markers=color:0x2E8B7A|label:U|${userLocation.latitude},${userLocation.longitude}` : null,
      ...filteredEvents.slice(0, 6).map(
        (event) => `markers=color:0xE87A4D|label:E|${event.latitude},${event.longitude}`,
      ),
      ...parks.slice(0, 8).map((park) => `markers=color:0x57B2A1|label:P|${park.latitude},${park.longitude}`),
    ].filter((marker): marker is string => Boolean(marker));

    const style = [
      'feature:poi.park|element:geometry|color:0xd6ead8',
      'feature:landscape|element:geometry|color:0xf4f1ea',
      'feature:water|element:geometry|color:0xd9edf5',
      'feature:road|element:geometry|color:0xffffff',
    ];

    return `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(center)}&zoom=${getZoomFromRadius(radius)}&size=900x260&scale=2&maptype=roadmap${
      style.map((item) => `&style=${encodeURIComponent(item)}`).join('')
    }&path=${encodeURIComponent(`fillcolor:0x2E8B7A22|color:0x2E8B7A88|weight:2|${radiusCircle}`)}${
      markers.length > 0 ? `&${markers.map((marker) => encodeURIComponent(marker)).join('&')}` : ''
    }&key=${encodeURIComponent(googleMapsApiKey)}`;
  }, [filteredEvents, mapRegion, parks, radius, userLocation]);

  const availablePetFilters = useMemo(() => {
    const uniqueSpecies = Array.from(
      new Set(
        pets
          .map((pet) => pet.species?.name?.trim())
          .filter((speciesName): speciesName is string => Boolean(speciesName)),
      ),
    ).sort((left, right) => left.localeCompare(right, 'pt-PT'));

    return ['ALL', ...uniqueSpecies] as const;
  }, [pets]);

  const filteredPets = useMemo(() => {
    const normalizedSearch = petSearchTerm.trim().toLowerCase();

    return pets
      .filter((pet) => {
        const textToSearch = [pet.name, pet.species?.name, pet.breed?.name]
          .filter((value): value is string => Boolean(value))
          .join(' ')
          .toLowerCase();

        const matchesSearch = !normalizedSearch || textToSearch.includes(normalizedSearch);
        const matchesFilter = petFilter === 'ALL' || pet.species?.name === petFilter;

        return matchesSearch && matchesFilter;
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-PT'));
  }, [pets, petFilter, petSearchTerm]);

  const selectedEventIsFull =
    typeof selectedEventForJoin?.max_attendees === 'number' &&
    selectedEventForJoin.max_attendees > 0 &&
    selectedEventForJoin.attendee_count >= selectedEventForJoin.max_attendees;

  const refreshSelectedEvent = useCallback(async (eventId: string) => {
    const response = await fetch(`${API_URL}/events/${eventId}`);

    if (!response.ok) {
      throw new Error('Nao foi possivel carregar o evento');
    }

    const eventDetail: EventItem = await response.json();
    setSelectedEventForJoin(eventDetail);
    setJoinedPetIds(
      new Set(
        eventDetail.attendees
          ?.map((attendee) => attendee.pet_id)
          .filter((petId): petId is string => Boolean(petId)) ?? [],
      ),
    );
  }, []);

  const handleOpenJoinModal = async (eventItem: EventItem) => {
    if (!currentUserId) {
      Alert.alert('Sessao', 'Faz login para te inscreveres num evento.');
      return;
    }

    setSelectedEventForJoin(eventItem);
    setJoinedPetIds(
      new Set(
        eventItem.attendees
          ?.map((attendee) => attendee.pet_id)
          .filter((petId): petId is string => Boolean(petId)) ?? [],
      ),
    );
    setPetSearchTerm('');
    setPetFilter('ALL');
    setShowJoinModal(true);
    setJoinModalLoading(true);

    try {
      await refreshSelectedEvent(eventItem.event_id);
    } catch (joinModalError) {
      const message = joinModalError instanceof Error ? joinModalError.message : 'Erro ao abrir o modal';
      Alert.alert('Erro', message);
    } finally {
      setJoinModalLoading(false);
    }
  };

  const handleJoinPet = async (pet: PetItem) => {
    if (!selectedEventForJoin || !currentUserId) {
      return;
    }

    if (joinedPetIds.has(pet.pet_id)) {
      return;
    }

    try {
      setJoiningPetId(pet.pet_id);
      console.info('[Events] A inscrever pet', {
        eventId: selectedEventForJoin.event_id,
        petId: pet.pet_id,
      });

      const response = await fetch(`${API_URL}/events/${selectedEventForJoin.event_id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          pet_id: pet.pet_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nao foi possivel inscrever o pet');
      }

      setJoinedPetIds((prev) => new Set([...prev, pet.pet_id]));
      await Promise.all([fetchEvents(false), refreshSelectedEvent(selectedEventForJoin.event_id)]);
      console.info('[Events] Pet inscrito com sucesso', {
        eventId: selectedEventForJoin.event_id,
        petId: pet.pet_id,
      });
    } catch (joinError) {
      const message = joinError instanceof Error ? joinError.message : 'Erro ao inscrever pet';
      Alert.alert('Erro', message);
    } finally {
      setJoiningPetId(null);
    }
  };

  const handleLeavePet = async (pet: PetItem) => {
    if (!selectedEventForJoin || !currentUserId) {
      return;
    }

    try {
      setJoiningPetId(pet.pet_id);
      console.info('[Events] A remover pet do evento', {
        eventId: selectedEventForJoin.event_id,
        petId: pet.pet_id,
      });

      const response = await fetch(`${API_URL}/events/${selectedEventForJoin.event_id}/leave`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          pet_id: pet.pet_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nao foi possivel remover o pet do evento');
      }

      setJoinedPetIds((prev) => {
        const next = new Set(prev);
        next.delete(pet.pet_id);
        return next;
      });

      await Promise.all([fetchEvents(false), refreshSelectedEvent(selectedEventForJoin.event_id)]);
      console.info('[Events] Pet removido do evento', {
        eventId: selectedEventForJoin.event_id,
        petId: pet.pet_id,
      });
    } catch (leaveError) {
      const message = leaveError instanceof Error ? leaveError.message : 'Erro ao remover pet do evento';
      Alert.alert('Erro', message);
    } finally {
      setJoiningPetId(null);
    }
  };

  const formatEventDate = (dateIso: string) => {
    const date = new Date(dateIso);
    return `${date.toLocaleDateString('pt-PT', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    })} ${date.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const handleOpenAttendees = async (eventId: string, title: string) => {
    try {
      console.info('[Events] A abrir lista de inscritos', { eventId, title });
      setShowAttendeesModal(true);
      setAttendeesLoading(true);
      setSelectedEventTitle(title);

      const response = await fetch(`${API_URL}/events/${eventId}`);
      if (!response.ok) {
        throw new Error('Nao foi possivel carregar participantes');
      }

      const eventDetail: EventItem = await response.json();
      setEventAttendees(eventDetail.attendees || []);
      console.info('[Events] Lista de inscritos carregada', {
        eventId,
        attendeeCount: eventDetail.attendees?.length || 0,
      });
    } catch (attendeesError) {
      const message = attendeesError instanceof Error ? attendeesError.message : 'Erro ao carregar participantes';
      Alert.alert('Erro', message);
      setEventAttendees([]);
    } finally {
      setAttendeesLoading(false);
    }
  };

  const handleCreateEvent = async () => {
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

    if (!userLocation) {
      Alert.alert('Localizacao', 'Nao foi possivel obter localizacao atual.');
      return;
    }

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
      console.info('[Events] A criar evento', {
        title: formData.title.trim(),
        location: formData.location.trim(),
      });

      const eventLatitude = formData.targetLatitude ?? userLocation.latitude;
      const eventLongitude = formData.targetLongitude ?? userLocation.longitude;

      const payload = {
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
      };

      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar evento');
      }

      const createdEvent = await response.json();
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        createdEvent.latitude,
        createdEvent.longitude,
      );

      const optimisticEvent: EventItem = {
        ...createdEvent,
        distance,
        attendee_count: createdEvent.attendee_count ?? 0,
        attendees: createdEvent.attendees ?? [],
      };

      setEvents((prev) => {
        const filtered = prev.filter((event) => event.event_id !== optimisticEvent.event_id);
        return [optimisticEvent, ...filtered].sort(
          (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
        );
      });

      setFormData({
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
      setShowCreateModal(false);

      Alert.alert('Sucesso', 'Evento criado com sucesso.');
      console.info('[Events] Evento criado com sucesso', {
        eventId: createdEvent.event_id,
      });
      await fetchEvents(false);
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Erro ao criar evento';
      Alert.alert('Erro', message);
    } finally {
      setCreatingEvent(false);
    }
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

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#57B2A1" />
          <Text style={styles.loadingText}>A carregar eventos e parques...</Text>
        </View>
        <BottomNav activePage="groups" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.sectionOne}>
          <View style={styles.headerRow}>
            <Text style={styles.screenTitle}>Eventos</Text>
            {isTutor && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push({ pathname: '/create-event', params: { radius: String(radius) } })}
              >
                <FontAwesome5 name="plus" size={14} color="white" />
                <Text style={styles.createButtonText}>Criar</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.searchWrapper}>
            <FontAwesome5 name="search" size={14} color="#8B837A" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar eventos ou local"
              placeholderTextColor="#A9A096"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          <Text style={styles.filterTitle}>Raio</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {RADIUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.chip, radius === option && styles.chipActive]}
                onPress={() => setRadius(option)}
              >
                <Text style={[styles.chipText, radius === option && styles.chipTextActive]}>{option} km</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterTitle}>Estado</Text>
          <View style={styles.statusRow}>
            {[
              { key: 'ALL', label: 'Todos' },
              { key: 'UPCOMING', label: 'Futuros' },
              { key: 'ONGOING', label: 'A decorrer' },
            ].map((statusOption) => (
              <TouchableOpacity
                key={statusOption.key}
                style={[
                  styles.statusButton,
                  statusFilter === statusOption.key && styles.statusButtonActive,
                ]}
                onPress={() => setStatusFilter(statusOption.key as StatusFilter)}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    statusFilter === statusOption.key && styles.statusButtonTextActive,
                  ]}
                >
                  {statusOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionTwo}>
          <Text style={styles.sectionTitle}>Mapa de eventos e parques proximos</Text>
          {staticMapUrl ? (
            <ImageBackground
              source={{ uri: staticMapUrl }}
              style={styles.mapPreview}
              imageStyle={styles.mapPreviewImage}
            >
              <View style={styles.mapPreviewOverlay} />

              {userLocation && (
                <View style={[styles.previewMarker, styles.previewUserMarker, buildPreviewPoint(userLocation.latitude, userLocation.longitude)]}>
                  <FontAwesome5 name="map-marker-alt" size={18} color="#2E8B7A" />
                </View>
              )}

              {filteredEvents.slice(0, 4).map((event) => (
                <View
                  key={event.event_id}
                  style={[
                    styles.previewMarker,
                    styles.previewEventMarker,
                    buildPreviewPoint(event.latitude, event.longitude),
                  ]}
                >
                  <FontAwesome5 name="paw" size={12} color="#FFFFFF" />
                </View>
              ))}

              {parks.slice(0, 8).map((park) => (
                <View
                  key={park.id}
                  style={[
                    styles.previewMarker,
                    styles.previewParkMarker,
                    buildPreviewPoint(park.latitude, park.longitude),
                  ]}
                >
                  <FontAwesome5 name="tree" size={12} color="#FFFFFF" />
                </View>
              ))}

              <View style={styles.mapPreviewFooter}>
                <Text style={styles.mapPreviewTitle}>Preview do mapa</Text>
                <Text style={styles.mapPreviewText}>Os parques proximos aparecem a verde e os eventos a laranja.</Text>
              </View>
            </ImageBackground>
          ) : (
            <View style={styles.mapPreview}>
              <View style={styles.mapPreviewGlowOne} />
              <View style={styles.mapPreviewGlowTwo} />

              <View style={styles.mapGrid} />

              {userLocation && (
                <View style={[styles.previewMarker, styles.previewUserMarker, buildPreviewPoint(userLocation.latitude, userLocation.longitude)]}>
                  <FontAwesome5 name="map-marker-alt" size={18} color="#2E8B7A" />
                </View>
              )}

              {filteredEvents.slice(0, 6).map((event) => (
                <View
                  key={event.event_id}
                  style={[
                    styles.previewMarker,
                    styles.previewEventMarker,
                    buildPreviewPoint(event.latitude, event.longitude),
                  ]}
                >
                  <FontAwesome5 name="paw" size={12} color="#FFFFFF" />
                </View>
              ))}

              {parks.slice(0, 6).map((park) => (
                <View
                  key={park.id}
                  style={[
                    styles.previewMarker,
                    styles.previewParkMarker,
                    buildPreviewPoint(park.latitude, park.longitude),
                  ]}
                >
                  <FontAwesome5 name="tree" size={12} color="#FFFFFF" />
                </View>
              ))}

              <View style={styles.mapPreviewFooter}>
                <Text style={styles.mapPreviewTitle}>Pré-visualização do mapa</Text>
                <Text style={styles.mapPreviewText}>Eventos a laranja, parques a verde e a tua posição ao centro.</Text>
              </View>
            </View>
          )}

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E87A4D' }]} />
              <Text style={styles.legendText}>Eventos</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#57B2A1' }]} />
              <Text style={styles.legendText}>Parques</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionThree}>
          <Text style={styles.sectionTitle}>Eventos futuros</Text>

          {error ? (
            <View style={styles.errorContainer}>
              <FontAwesome5 name="exclamation-circle" size={20} color="#E87A4D" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : futureEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="calendar-times" size={24} color="#C7BFB5" />
              <Text style={styles.emptyText}>Sem eventos futuros com estes filtros.</Text>
            </View>
          ) : (
            <FlatList
              horizontal
              data={futureEvents}
              keyExtractor={(item) => item.event_id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsList}
              renderItem={({ item }) => {
                const distance =
                  typeof item.distance === 'number'
                    ? item.distance
                    : userLocation
                      ? calculateDistance(
                          userLocation.latitude,
                          userLocation.longitude,
                          item.latitude,
                          item.longitude,
                        )
                      : 0;

                const isFull =
                  typeof item.max_attendees === 'number' &&
                  item.max_attendees > 0 &&
                  item.attendee_count >= item.max_attendees;

                return (
                  <View style={styles.eventCard}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.eventImage} />
                    ) : (
                      <View style={styles.eventImageFallback}>
                        <FontAwesome5 name="paw" size={20} color="#E87A4D" />
                      </View>
                    )}

                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventMeta}>{formatEventDate(item.starts_at)}</Text>
                    <Text style={styles.eventMeta}>{item.location}</Text>
                    <Text style={styles.eventMeta}>
                      Ponto: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                    </Text>
                    <Text style={styles.eventMeta}>{distance.toFixed(1)} km</Text>

                    <Text style={styles.attendeesText}>
                      {item.attendee_count} inscritos
                      {item.max_attendees ? ` / ${item.max_attendees}` : ''}
                    </Text>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[
                          styles.joinButton,
                          isFull && styles.joinButtonDisabled,
                        ]}
                        onPress={() => handleOpenJoinModal(item)}
                        disabled={isFull}
                      >
                        <Text style={styles.joinButtonText}>
                          {isFull ? 'Cheio' : 'Inscrever pet'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.petsButton}
                        onPress={() => handleOpenAttendees(item.event_id, item.title)}
                      >
                        <Text style={styles.petsButtonText}>Inscritos</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <FontAwesome5 name="arrow-left" size={20} color="#5C4A3D" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Criar evento</Text>
            <View style={{ width: 20 }} />
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 24 }}>
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
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  location: value,
                  targetLatitude: null,
                  targetLongitude: null,
                }))
              }
              placeholder="Ex: Parque do Aviao"
              placeholderTextColor="#A9A096"
            />

            <View style={styles.mapPickerBlock}>
              <Text style={styles.mapPickerTitle}>Ponto de encontro</Text>
              <Text style={styles.mapPickerSubtitle}>
                Escolhe um local recomendado no mapa para guardar as coordenadas do evento.
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapPickerRow}>
                <TouchableOpacity
                  style={styles.mapPickerCard}
                  onPress={() =>
                    userLocation &&
                    setFormData((prev) => ({
                      ...prev,
                      location: 'Local atual',
                      targetLatitude: userLocation.latitude,
                      targetLongitude: userLocation.longitude,
                    }))
                  }
                >
                  <View style={[styles.mapPickerIcon, styles.mapPickerIconCurrent]}>
                    <FontAwesome5 name="location-arrow" size={13} color="#2E8B7A" />
                  </View>
                  <Text style={styles.mapPickerName}>Local atual</Text>
                  <Text style={styles.mapPickerMeta}>Usar a tua posição atual</Text>
                  <Text style={styles.mapPickerAction}>Selecionar</Text>
                </TouchableOpacity>

                {recommendedParks.map((park) => {
                  const distance = userLocation
                    ? calculateDistance(userLocation.latitude, userLocation.longitude, park.latitude, park.longitude)
                    : null;

                  return (
                    <TouchableOpacity
                      key={park.id}
                      style={styles.mapPickerCard}
                      onPress={() =>
                        setFormData((prev) => ({
                          ...prev,
                          location: park.name,
                          targetLatitude: park.latitude,
                          targetLongitude: park.longitude,
                        }))
                      }
                    >
                      <View style={styles.mapPickerIcon}>
                        <FontAwesome5 name="tree" size={13} color="#57B2A1" />
                      </View>
                      <Text style={styles.mapPickerName}>{park.name}</Text>
                      <Text style={styles.mapPickerMeta}>{distance ? `${distance.toFixed(1)} km` : 'Parque recomendado'}</Text>
                      <Text style={styles.mapPickerAction}>Selecionar</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {formData.targetLatitude !== null && formData.targetLongitude !== null && (
              <View style={styles.mapSelectionBanner}>
                <FontAwesome5 name="map-marker-alt" size={14} color="#2E8B7A" />
                <Text style={styles.mapSelectionText}>
                  Evento baseado no mapa: {formData.location}
                </Text>
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

            <View style={styles.inlineActionRow}>
              <Text style={styles.labelInline}>Adicionar fim do evento</Text>
              <TouchableOpacity
                style={[styles.toggleButton, formData.hasEndAt && styles.toggleButtonActive]}
                onPress={() => setFormData((prev) => ({ ...prev, hasEndAt: !prev.hasEndAt }))}
              >
                <Text style={[styles.toggleButtonText, formData.hasEndAt && styles.toggleButtonTextActive]}>
                  {formData.hasEndAt ? 'Sim' : 'Nao'}
                </Text>
              </TouchableOpacity>
            </View>

            {formData.hasEndAt && (
              <View>
                <Text style={styles.label}>Data e hora de fim</Text>
                <View style={styles.datetimeRow}>
                  <TouchableOpacity style={styles.datetimeButton} onPress={() => setShowEndDatePicker(true)}>
                    <FontAwesome5 name="calendar-alt" size={14} color="#57B2A1" />
                    <Text style={styles.datetimeText}>{formData.endsDate.toLocaleDateString('pt-PT')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.datetimeButton} onPress={() => setShowEndTimePicker(true)}>
                    <FontAwesome5 name="clock" size={14} color="#57B2A1" />
                    <Text style={styles.datetimeText}>
                      {formData.endsTime.toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
              {creatingEvent ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Criar evento</Text>
              )}
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
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showJoinModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowJoinModal(false);
          setSelectedEventForJoin(null);
        }}
      >
        <View style={styles.joinOverlay}>
          <KeyboardAvoidingView
            style={styles.joinModalCard}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.joinModalHeader}>
              <View>
                <Text style={styles.joinModalTitle}>Inscrever pets</Text>
                <Text style={styles.joinModalSubtitle}>Escolhe um ou mais pets para este evento</Text>
              </View>
              <TouchableOpacity
                style={styles.joinCloseButton}
                onPress={() => {
                  setShowJoinModal(false);
                  setSelectedEventForJoin(null);
                }}
              >
                <FontAwesome5 name="times" size={18} color="#8B837A" />
              </TouchableOpacity>
            </View>

            {selectedEventForJoin && (
              <View style={styles.joinEventCard}>
                <Text style={styles.joinEventName}>{selectedEventForJoin.title}</Text>
                <Text style={styles.joinEventMeta}>{formatEventDate(selectedEventForJoin.starts_at)}</Text>
                <Text style={styles.joinEventMeta}>{selectedEventForJoin.location}</Text>
                <Text style={styles.joinEventMeta}>
                  {selectedEventForJoin.attendee_count} inscritos
                  {selectedEventForJoin.max_attendees ? ` / ${selectedEventForJoin.max_attendees}` : ''}
                </Text>
                <Text style={styles.joinEventMeta}>
                  Coordenadas: {selectedEventForJoin.latitude.toFixed(5)}, {selectedEventForJoin.longitude.toFixed(5)}
                </Text>
                <Text style={styles.joinEventNote}>Podes inscrever cada pet separadamente no mesmo evento.</Text>
              </View>
            )}

            <View style={styles.joinSearchWrapper}>
              <FontAwesome5 name="search" size={14} color="#8B837A" style={styles.searchIcon} />
              <TextInput
                style={styles.joinSearchInput}
                placeholder="Pesquisar pets"
                placeholderTextColor="#A9A096"
                value={petSearchTerm}
                onChangeText={setPetSearchTerm}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.joinChipsRow}>
              {availablePetFilters.map((speciesName) => (
                <TouchableOpacity
                  key={speciesName}
                  style={[styles.joinChip, petFilter === speciesName && styles.joinChipActive]}
                  onPress={() => setPetFilter(speciesName)}
                >
                  <Text style={[styles.joinChipText, petFilter === speciesName && styles.joinChipTextActive]}>
                    {speciesName === 'ALL' ? 'Todos' : speciesName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {joinModalLoading || petsLoading ? (
              <View style={styles.joinLoadingContainer}>
                <ActivityIndicator size="small" color="#57B2A1" />
                <Text style={styles.joinLoadingText}>A preparar a lista dos teus pets...</Text>
              </View>
            ) : petsError ? (
              <View style={styles.joinErrorContainer}>
                <FontAwesome5 name="exclamation-circle" size={16} color="#E87A4D" />
                <Text style={styles.joinErrorText}>{petsError}</Text>
              </View>
            ) : pets.length === 0 ? (
              <View style={styles.joinEmptyContainer}>
                <FontAwesome5 name="paw" size={22} color="#C7BFB5" />
                <Text style={styles.joinEmptyTitle}>Ainda não tens pets registados.</Text>
                <Text style={styles.joinEmptyText}>Adiciona um pet ao teu perfil para o poderes inscrever em eventos.</Text>
              </View>
            ) : filteredPets.length === 0 ? (
              <View style={styles.joinEmptyContainer}>
                <FontAwesome5 name="search" size={22} color="#C7BFB5" />
                <Text style={styles.joinEmptyTitle}>Sem resultados</Text>
                <Text style={styles.joinEmptyText}>Tenta outro nome ou limpa o filtro.</Text>
              </View>
            ) : (
              <ScrollView style={styles.joinPetsList} contentContainerStyle={{ paddingBottom: 10 }}>
                {filteredPets.map((pet) => {
                  const alreadyJoined = joinedPetIds.has(pet.pet_id);
                  const isJoiningThisPet = joiningPetId === pet.pet_id;

                  return (
                    <View key={pet.pet_id} style={styles.joinPetRow}>
                      {pet.main_photo ? (
                        <Image source={{ uri: pet.main_photo }} style={styles.joinPetAvatar} />
                      ) : (
                        <View style={styles.joinPetAvatarFallback}>
                          <FontAwesome5 name="paw" size={13} color="#E87A4D" />
                        </View>
                      )}

                      <View style={styles.joinPetInfo}>
                        <Text style={styles.joinPetName}>{pet.name}</Text>
                        <Text style={styles.joinPetBreed}>
                          {pet.breed?.name || pet.species?.name || 'Sem espécie definida'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.joinPetButton,
                          alreadyJoined && styles.joinPetButtonActive,
                          !alreadyJoined && selectedEventIsFull && styles.joinPetButtonDisabled,
                          isJoiningThisPet && styles.joinPetButtonDisabled,
                        ]}
                        onPress={() => (alreadyJoined ? handleLeavePet(pet) : handleJoinPet(pet))}
                        disabled={isJoiningThisPet || (!alreadyJoined && selectedEventIsFull)}
                      >
                        {isJoiningThisPet ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.joinPetButtonText}>
                            {alreadyJoined ? 'Desinscrever' : selectedEventIsFull ? 'Cheio' : 'Inscrever'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={showAttendeesModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAttendeesModal(false)}
      >
        <View style={styles.attendeesOverlay}>
          <View style={styles.attendeesCard}>
            <View style={styles.attendeesHeader}>
              <Text style={styles.attendeesTitle}>Pets no evento</Text>
              <TouchableOpacity onPress={() => setShowAttendeesModal(false)}>
                <FontAwesome5 name="times" size={18} color="#8B837A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.attendeesSubtitle}>{selectedEventTitle}</Text>

            {attendeesLoading ? (
              <View style={styles.attendeesLoading}>
                <ActivityIndicator size="small" color="#57B2A1" />
                <Text style={styles.attendeesLoadingText}>A carregar lista...</Text>
              </View>
            ) : eventAttendees.length === 0 ? (
              <View style={styles.attendeesEmpty}>
                <Text style={styles.attendeesEmptyText}>Ainda sem participantes.</Text>
              </View>
            ) : (
              <FlatList
                data={eventAttendees}
                keyExtractor={(item, index) =>
                  item.event_attendee_id || `${item.event_id}-${item.user_id}-${item.pet_id || 'no-pet'}-${index}`
                }
                renderItem={({ item }) => (
                  <View style={styles.attendeeRow}>
                    {item.pet?.main_photo ? (
                      <Image source={{ uri: item.pet.main_photo }} style={styles.attendeeAvatar} />
                    ) : (
                      <View style={styles.attendeeAvatarFallback}>
                        <FontAwesome5 name="paw" size={12} color="#E87A4D" />
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <Text style={styles.attendeePetName}>{item.pet?.name || 'Tutor sem pet associado'}</Text>
                      <Text style={styles.attendeeOwnerName}>{item.user?.username || 'Participante'}</Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <BottomNav activePage="groups" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2EB',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingBottom: 130,
  },
  sectionOne: {
    backgroundColor: 'white',
    marginHorizontal: 14,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#5C4A3D',
  },
  createButton: {
    backgroundColor: '#E87A4D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F2EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#5C4A3D',
    fontSize: 14,
  },
  filterTitle: {
    fontSize: 12,
    color: '#8B837A',
    fontWeight: '700',
    marginBottom: 8,
  },
  chipsRow: {
    paddingBottom: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D6CEC3',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: '#57B2A1',
    borderColor: '#57B2A1',
  },
  chipText: {
    color: '#5C4A3D',
    fontWeight: '700',
    fontSize: 12,
  },
  chipTextActive: {
    color: 'white',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D6CEC3',
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusButtonActive: {
    borderColor: '#E87A4D',
    backgroundColor: '#FFF2EC',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B837A',
  },
  statusButtonTextActive: {
    color: '#E87A4D',
  },
  sectionTwo: {
    backgroundColor: 'white',
    marginHorizontal: 14,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  sectionThree: {
    marginHorizontal: 14,
  },
  sectionTitle: {
    color: '#5C4A3D',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  map: {
    width: '100%',
    height: 260,
    borderRadius: 14,
  },
  mapPreview: {
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#DDE9E0',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#C7D8CB',
  },
  mapPreviewImage: {
    borderRadius: 14,
  },
  mapPreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 32, 28, 0.08)',
  },
  mapPreviewGlowOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.35)',
    top: -40,
    left: -30,
  },
  mapPreviewGlowTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.18)',
    bottom: -20,
    right: -40,
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    opacity: 0.25,
    borderRadius: 14,
    borderStyle: 'dashed',
  },
  previewMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -14,
    marginTop: -14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  previewUserMarker: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 2,
    borderColor: '#2E8B7A',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  previewEventMarker: {
    backgroundColor: '#E87A4D',
  },
  previewParkMarker: {
    backgroundColor: '#57B2A1',
  },
  mapPreviewFooter: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mapPreviewTitle: {
    color: '#5C4A3D',
    fontWeight: '800',
    fontSize: 13,
  },
  mapPreviewText: {
    color: '#6D665E',
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
  },
  mapPlaceholderText: {
    color: '#8B837A',
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#8B837A',
    fontWeight: '600',
    fontSize: 12,
  },
  mapHighlightsBlock: {
    marginTop: 14,
    gap: 12,
  },
  mapHighlightsHeader: {
    gap: 2,
  },
  mapHighlightsTitle: {
    color: '#5C4A3D',
    fontWeight: '800',
    fontSize: 14,
  },
  mapHighlightsSubtitle: {
    color: '#8B837A',
    fontSize: 11,
    lineHeight: 15,
  },
  mapHighlightsRow: {
    gap: 10,
    paddingBottom: 4,
  },
  mapHighlightCard: {
    width: 168,
    backgroundColor: '#FBF8F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1D8CA',
    padding: 12,
    gap: 6,
  },
  mapHighlightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E3F2EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHighlightIconEvent: {
    backgroundColor: '#E87A4D',
  },
  mapHighlightName: {
    color: '#5C4A3D',
    fontWeight: '800',
    fontSize: 13,
  },
  mapHighlightMeta: {
    color: '#7E776F',
    fontSize: 11,
  },
  mapHighlightAction: {
    color: '#2E8B7A',
    fontWeight: '800',
    fontSize: 11,
    marginTop: 2,
  },
  mapHighlightEmpty: {
    width: 168,
    minHeight: 104,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D6CEC3',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  mapHighlightEmptyText: {
    color: '#8B837A',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  mapSelectionBanner: {
    marginTop: 10,
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
  mapSelectionText: {
    flex: 1,
    color: '#2E8B7A',
    fontWeight: '700',
    fontSize: 12,
  },
  mapPickerBlock: {
    marginTop: 12,
    gap: 8,
  },
  mapPickerTitle: {
    color: '#5C4A3D',
    fontWeight: '800',
    fontSize: 14,
  },
  mapPickerSubtitle: {
    color: '#8B837A',
    fontSize: 11,
    lineHeight: 15,
  },
  mapPickerRow: {
    gap: 10,
    paddingBottom: 4,
  },
  mapPickerCard: {
    width: 164,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1D8CA',
    backgroundColor: '#FBF8F2',
    padding: 12,
    gap: 6,
  },
  mapPickerCardActive: {
    borderColor: '#57B2A1',
    backgroundColor: '#F0FBF7',
  },
  mapPickerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2EC',
  },
  mapPickerIconCurrent: {
    backgroundColor: '#EAF6F3',
  },
  mapPickerName: {
    color: '#5C4A3D',
    fontWeight: '800',
    fontSize: 13,
  },
  mapPickerMeta: {
    color: '#7E776F',
    fontSize: 11,
  },
  mapPickerAction: {
    color: '#2E8B7A',
    fontWeight: '800',
    fontSize: 11,
    marginTop: 2,
  },
  cardsList: {
    paddingBottom: 10,
    gap: 12,
  },
  eventCard: {
    width: 252,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  eventImage: {
    width: '100%',
    height: 110,
    borderRadius: 12,
    marginBottom: 10,
  },
  eventImageFallback: {
    width: '100%',
    height: 110,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#E8DCCF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: {
    color: '#5C4A3D',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  eventMeta: {
    color: '#8B837A',
    fontSize: 12,
    marginBottom: 2,
  },
  attendeesText: {
    marginTop: 8,
    color: '#5C4A3D',
    fontSize: 12,
    fontWeight: '700',
  },
  cardActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#E87A4D',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#BDB4A9',
  },
  joinButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  petsButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#57B2A1',
    paddingVertical: 9,
    alignItems: 'center',
  },
  petsButtonText: {
    color: '#57B2A1',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#5C4A3D',
    fontWeight: '700',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3EE',
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    flex: 1,
    color: '#E87A4D',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyContainer: {
    backgroundColor: '#EFEAE2',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: '#8B837A',
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F2EB',
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
  },
  modalHeader: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#5C4A3D',
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    padding: 16,
  },
  label: {
    color: '#5C4A3D',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D6CEC3',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#5C4A3D',
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  datetimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  datetimeButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D6CEC3',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  datetimeText: {
    color: '#5C4A3D',
    fontWeight: '600',
    fontSize: 12,
  },
  inlineActionRow: {
    marginTop: 14,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelInline: {
    color: '#5C4A3D',
    fontWeight: '700',
    fontSize: 13,
  },
  toggleButton: {
    borderWidth: 1,
    borderColor: '#D6CEC3',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  toggleButtonActive: {
    borderColor: '#57B2A1',
    backgroundColor: '#EAF7F3',
  },
  toggleButtonText: {
    color: '#8B837A',
    fontWeight: '700',
    fontSize: 12,
  },
  toggleButtonTextActive: {
    color: '#57B2A1',
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: '#E87A4D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 15,
  },
  attendeesOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  attendeesCard: {
    maxHeight: '72%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
  },
  attendeesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendeesTitle: {
    color: '#5C4A3D',
    fontWeight: '800',
    fontSize: 18,
  },
  attendeesSubtitle: {
    color: '#8B837A',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 10,
  },
  attendeesLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 22,
  },
  attendeesLoadingText: {
    color: '#8B837A',
    fontWeight: '600',
  },
  attendeesEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  attendeesEmptyText: {
    color: '#8B837A',
    fontWeight: '700',
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE5',
  },
  attendeeAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  attendeeAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F2EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeePetName: {
    color: '#5C4A3D',
    fontWeight: '700',
    fontSize: 13,
  },
  attendeeOwnerName: {
    color: '#8B837A',
    fontSize: 12,
    marginTop: 1,
  },
  joinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  joinModalCard: {
    maxHeight: '84%',
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  joinModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  joinModalTitle: {
    color: '#5C4A3D',
    fontWeight: '800',
    fontSize: 18,
  },
  joinModalSubtitle: {
    color: '#8B837A',
    marginTop: 4,
    fontSize: 12,
  },
  joinCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F2EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinEventCard: {
    marginTop: 14,
    backgroundColor: '#F7FAF8',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D9E8E1',
  },
  joinEventName: {
    color: '#5C4A3D',
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4,
  },
  joinEventMeta: {
    color: '#6D665E',
    fontSize: 12,
    marginTop: 2,
  },
  joinEventNote: {
    marginTop: 8,
    color: '#2E8B7A',
    fontSize: 12,
    fontWeight: '700',
  },
  joinSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F2EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  joinSearchInput: {
    flex: 1,
    color: '#5C4A3D',
    fontSize: 14,
  },
  joinChipsRow: {
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  joinChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D6CEC3',
    backgroundColor: '#FFFFFF',
  },
  joinChipActive: {
    backgroundColor: '#57B2A1',
    borderColor: '#57B2A1',
  },
  joinChipText: {
    color: '#5C4A3D',
    fontWeight: '700',
    fontSize: 12,
  },
  joinChipTextActive: {
    color: 'white',
  },
  joinLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  joinLoadingText: {
    color: '#8B837A',
    fontWeight: '600',
  },
  joinErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3EE',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  joinErrorText: {
    flex: 1,
    color: '#E87A4D',
    fontWeight: '600',
    fontSize: 12,
  },
  joinEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
    paddingHorizontal: 10,
  },
  joinEmptyTitle: {
    color: '#5C4A3D',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
  joinEmptyText: {
    color: '#8B837A',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  joinPetsList: {
    marginTop: 8,
  },
  joinPetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE5',
  },
  joinPetAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  joinPetAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F2EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinPetInfo: {
    flex: 1,
  },
  joinPetName: {
    color: '#5C4A3D',
    fontWeight: '800',
    fontSize: 14,
  },
  joinPetBreed: {
    color: '#8B837A',
    fontSize: 12,
    marginTop: 2,
  },
  joinPetButton: {
    minWidth: 92,
    borderRadius: 12,
    backgroundColor: '#E87A4D',
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinPetButtonActive: {
    backgroundColor: '#57B2A1',
  },
  joinPetButtonDisabled: {
    backgroundColor: '#BDB4A9',
  },
  joinPetButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 12,
  },
});
