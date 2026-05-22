import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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

const RADIUS_OPTIONS = [5, 10, 25, 50];

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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
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

  const recommendedParks = useMemo(() => parks.slice(0, 6), [parks]);

  const selectMeetingPoint = (name: string, latitude: number, longitude: number) => {
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
              <TouchableOpacity
                style={styles.pointCard}
                onPress={() => {
                  if (!userLocation) {
                    return;
                  }
                  selectMeetingPoint('Local atual', userLocation.latitude, userLocation.longitude);
                }}
              >
                <View style={[styles.pointIcon, styles.pointIconCurrent]}>
                  <FontAwesome5 name="location-arrow" size={13} color="#2E8B7A" />
                </View>
                <Text style={styles.pointTitle}>Local atual</Text>
                <Text style={styles.pointMeta}>Usar a tua posição atual</Text>
                <Text style={styles.pointAction}>Selecionar</Text>
              </TouchableOpacity>

              {recommendedParks.length === 0 ? (
                <View style={styles.emptyPointCard}>
                  <Text style={styles.emptyPointText}>{loadingParks ? 'A carregar parques...' : 'Sem parques próximos para este raio.'}</Text>
                </View>
              ) : (
                recommendedParks.map((park) => {
                  const distance = userLocation
                    ? calculateDistance(userLocation.latitude, userLocation.longitude, park.latitude, park.longitude)
                    : null;

                  return (
                    <TouchableOpacity
                      key={park.id}
                      style={styles.pointCard}
                      onPress={() => selectMeetingPoint(park.name, park.latitude, park.longitude)}
                    >
                      <View style={styles.pointIcon}>
                        <FontAwesome5 name="tree" size={13} color="#57B2A1" />
                      </View>
                      <Text style={styles.pointTitle}>{park.name}</Text>
                      <Text style={styles.pointMeta}>{distance ? `${distance.toFixed(1)} km` : 'Parque recomendado'}</Text>
                      <Text style={styles.pointAction}>Selecionar</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
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
