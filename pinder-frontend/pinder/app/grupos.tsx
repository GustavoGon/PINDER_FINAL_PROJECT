import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, ActivityIndicator, FlatList, Image, TouchableOpacity, RefreshControl, TextInput, Modal, KeyboardAvoidingView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import BottomNav from '../src/components/BottomNav';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function GruposEventos() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(10); // 10km
  const [searchTerm, setSearchTerm] = useState('');
  const [subscribedGroups, setSubscribedGroups] = useState(new Set());
  const [userId, setUserId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: new Date(),
    time: new Date(),
    maxAttendees: '',
  });

  useEffect(() => {
    // Simular user_id (em produção viria de auth)
    setUserId('user-123');

    // Pegar localização
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setUserLocation({ latitude: 40.283, longitude: -7.5 });
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (err) {
        console.error('Erro ao pegar localização:', err);
        setUserLocation({ latitude: 40.283, longitude: -7.5 });
      }
    };

    getLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchEvents();
    }
  }, [userLocation, radius]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius,
      });

      const response = await fetch(`${API_URL}/groups?${params}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar eventos');
      }

      const data = await response.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
      console.error('Erro:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (userLocation) {
      fetchEvents();
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSubscribe = async (groupId) => {
    if (!userId) {
      alert('Por favor, faça login');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, pet_id: null }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao inscrever');
      }

      setSubscribedGroups(prev => new Set([...prev, groupId]));
      alert('Inscrito com sucesso!');
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  };

  const handleCreateEvent = async () => {
    if (!formData.title.trim()) {
      alert('Por favor, insira um título');
      return;
    }

    if (!formData.location.trim()) {
      alert('Por favor, insira a localização');
      return;
    }

    if (!userLocation) {
      alert('Localização não disponível');
      return;
    }

    try {
      setCreatingEvent(true);

      // Combinar data e hora
      const eventDateTime = new Date(formData.date);
      eventDateTime.setHours(formData.time.getHours(), formData.time.getMinutes());

      const payload = {
        title: formData.title,
        description: formData.description || null,
        date: eventDateTime.toISOString(),
        time: `${String(formData.time.getHours()).padStart(2, '0')}:${String(formData.time.getMinutes()).padStart(2, '0')}`,
        location: formData.location,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        max_attendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        image: null,
        created_by: userId
      };

      const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar evento');
      }

      const newEvent = await response.json();
      alert('Evento criado com sucesso!');

      // Resetar formulário
      setFormData({
        title: '',
        description: '',
        location: '',
        date: new Date(),
        time: new Date(),
        maxAttendees: '',
      });

      setShowCreateModal(false);
      fetchEvents();
    } catch (err) {
      alert('Erro: ' + err.message);
      console.error('Erro:', err);
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate
      }));
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedTime) {
      setFormData(prev => ({
        ...prev,
        time: selectedTime
      }));
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  const formatTime = (date) => {
    if (!date) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderEventCard = ({ item }) => {
    const isSubscribed = subscribedGroups.has(item.group_id);
    const distance = userLocation ?
      calculateDistance(userLocation.latitude, userLocation.longitude, item.latitude, item.longitude)
      : 0;

    const eventDate = new Date(item.date);
    const formattedDate = `${eventDate.toLocaleDateString('pt-PT', { weekday: 'short' })}, ${eventDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;

    return (
      <View style={styles.eventCard}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.eventImg} />
        ) : (
          <View style={styles.eventImgPlaceholder}>
            <FontAwesome5 name="paw" size={24} color="#E87A4D" />
          </View>
        )}

        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.eventDescription}>{item.description}</Text>
          )}
          <View style={styles.eventRow}>
            <FontAwesome5 name="calendar-alt" size={12} color="#57B2A1" />
            <Text style={styles.eventMeta}>{formattedDate}</Text>
          </View>
          <View style={styles.eventRow}>
            <FontAwesome5 name="map-marker-alt" size={12} color="#57B2A1" />
            <Text style={styles.eventMeta}>{item.location}</Text>
          </View>
          <View style={styles.eventRow}>
            <FontAwesome5 name="ruler" size={12} color="#57B2A1" />
            <Text style={styles.eventMeta}>{distance.toFixed(1)} km</Text>
          </View>

          <View style={styles.eventBottom}>
            <Text style={styles.attendeeCount}>
              {item._count?.attendees || 0} inscritos
              {item.max_attendees && ` / ${item.max_attendees}`}
            </Text>
            <TouchableOpacity
              style={[
                styles.btnSubscribe,
                isSubscribed && styles.btnSubscribed,
              ]}
              onPress={() => handleSubscribe(item.group_id)}
              disabled={isSubscribed}
            >
              <Text style={styles.btnSubscribeText}>
                {isSubscribed ? '✓ Inscrito' : 'Inscrever'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Eventos em Grupo</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#57B2A1" />
          <Text style={styles.loadingText}>A carregar eventos...</Text>
        </View>
        <BottomNav activePage="groups" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Eventos em Grupo</Text>
        </View>
        <View style={styles.errorContainer}>
          <FontAwesome5 name="exclamation-circle" size={40} color="#E87A4D" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
            <Text style={styles.retryBtnText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
        <BottomNav activePage="groups" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Eventos em Grupo</Text>
          <TouchableOpacity 
            style={styles.btnCreateEvent}
            onPress={() => setShowCreateModal(true)}
          >
            <FontAwesome5 name="plus" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <FontAwesome5 name="search" size={16} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar eventos..."
          placeholderTextColor="#A9A096"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Radius Filter */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Raio:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.radiusScroll}>
          {[5, 10, 25, 50].map(r => (
            <TouchableOpacity
              key={r}
              style={[
                styles.radiusBtn,
                radius === r && styles.radiusBtnActive,
              ]}
              onPress={() => setRadius(r)}
            >
              <Text style={[
                styles.radiusBtnText,
                radius === r && styles.radiusBtnTextActive,
              ]}>
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Events List */}
      {filteredEvents.length > 0 ? (
        <FlatList
          data={filteredEvents}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.group_id}
          contentContainerStyle={styles.eventsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="calendar-times" size={40} color="#D6CEC3" />
          <Text style={styles.emptyText}>Nenhum evento próximo</Text>
        </View>
      )}

      {/* Modal Criar Evento */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <FontAwesome5 name="arrow-left" size={24} color="#5C4A3D" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Criar Evento</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.formLabel}>Título do Evento *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ex: Passeio de Cães"
              placeholderTextColor="#A9A096"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />

            <Text style={styles.formLabel}>Descrição</Text>
            <TextInput
              style={[styles.textInput, { height: 80 }]}
              placeholder="Descreva o evento..."
              placeholderTextColor="#A9A096"
              multiline
              numberOfLines={4}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
            />

            <Text style={styles.formLabel}>Localização *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ex: Parque do Avião"
              placeholderTextColor="#A9A096"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
            />

            <Text style={styles.formLabel}>Data do Evento *</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <FontAwesome5 name="calendar-alt" size={18} color="#57B2A1" />
              <Text style={styles.datePickerText}>{formatDate(formData.date)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formData.date}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}

            <Text style={styles.formLabel}>Hora do Evento</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => setShowTimePicker(true)}
            >
              <FontAwesome5 name="clock" size={18} color="#57B2A1" />
              <Text style={styles.datePickerText}>{formatTime(formData.time)}</Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={formData.time}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}

            <Text style={styles.formLabel}>Máximo de Participantes</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ex: 20"
              placeholderTextColor="#A9A096"
              keyboardType="numeric"
              value={formData.maxAttendees}
              onChangeText={(text) => setFormData({ ...formData, maxAttendees: text })}
            />

            <TouchableOpacity
              style={styles.btnCreateSubmit}
              onPress={handleCreateEvent}
              disabled={creatingEvent}
            >
              {creatingEvent ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.btnCreateSubmitText}>Criar Evento</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DF',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5C4A3D',
    flex: 1,
    textAlign: 'center',
  },
  btnCreateEvent: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E87A4D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    margin: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#5C4A3D',
    fontSize: 14,
  },
  filterRow: {
    marginHorizontal: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    color: '#5C4A3D',
    fontWeight: 'bold',
    marginRight: 10,
  },
  radiusScroll: {
    flex: 1,
  },
  radiusBtn: {
    marginRight: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D6CEC3',
  },
  radiusBtnActive: {
    backgroundColor: '#57B2A1',
    borderColor: '#57B2A1',
  },
  radiusBtnText: {
    color: '#5C4A3D',
    fontWeight: '600',
    fontSize: 12,
  },
  radiusBtnTextActive: {
    color: 'white',
  },
  eventsList: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  eventImgPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#E8DCCF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5C4A3D',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  eventMeta: {
    fontSize: 11,
    color: '#888',
  },
  eventBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EAE6DF',
  },
  attendeeCount: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
  },
  btnSubscribe: {
    backgroundColor: '#E87A4D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  btnSubscribed: {
    backgroundColor: '#57B2A1',
  },
  btnSubscribeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  loadingText: {
    color: '#5C4A3D',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    paddingHorizontal: 30,
  },
  errorText: {
    color: '#E87A4D',
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#E87A4D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F2EB',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5C4A3D',
  },
  modalContent: {
    padding: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C4A3D',
    marginTop: 15,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#5C4A3D',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#D6CEC3',
  },
  btnCreateSubmit: {
    backgroundColor: '#E87A4D',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  btnCreateSubmitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D6CEC3',
    marginBottom: 15,
    gap: 10,
  },
  datePickerText: {
    fontSize: 14,
    color: '#5C4A3D',
    fontWeight: '500',
  },
});