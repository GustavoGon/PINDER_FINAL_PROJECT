import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import BottomNav from '../src/components/BottomNav';

interface Adoption {
  adoption_id: string;
  tutor_id: string;
  pet_id: string;
  like_dislike: boolean;
  timestamp: string;
  pet: {
    pet_id: string;
    name: string;
    main_photo: string;
    breed: { name: string };
    owner: { username: string; user_id: string };
  };
}

export default function Adoptions() {
  const [adoptions, setAdoptions] = useState<Adoption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<Adoption | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  
  const router = useRouter();
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  useEffect(() => {
    fetchAdoptions();
  }, []);

  const fetchAdoptions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userStr = await AsyncStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : {};
      const tutorId = currentUser.user_id || currentUser.id;

      if (!tutorId) {
        setError('Utilizador não autenticado');
        return;
      }

      const response = await fetch(`${API_URL}/pets/adoptions/user/${tutorId}`);

      if (!response.ok) {
        throw new Error('Erro ao carregar adoções');
      }

      const data = await response.json();
      setAdoptions(data);
    } catch (err) {
      console.error('Erro ao buscar adoções:', err);
      setError('Erro ao carregar adoções');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAge = (dobString: string) => {
    if (!dobString) return 'Idade desconhecida';
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age === 0) return 'Menos de 1 ano';
    return age === 1 ? '1 ano' : `${age} anos`;
  };

  const handlePetPress = (adoption: Adoption) => {
    setSelectedPet(adoption);
    setShowActionModal(true);
  };

  const handleViewProfile = () => {
    // Navegar para o perfil do pet (se existir rota)
    setShowActionModal(false);
    if (selectedPet?.pet.pet_id) {
      router.push({
        pathname: '/petProfile',
        params: { petId: selectedPet.pet.pet_id }
      });
    }
  };

  const handleSendMessage = async () => {
    setShowActionModal(false);
    if (selectedPet?.pet.owner.user_id) {
      const userStr = await AsyncStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : {};
      const currentUserId = currentUser.user_id || currentUser.id;

      // Navegar para o chat com o dono do pet
      router.push({
        pathname: '/chatDetail',
        params: { 
          userId: selectedPet.pet.owner.user_id,
          senderUserId: currentUserId || '',
          userName: selectedPet.pet.owner.username,
          petId: selectedPet.pet.pet_id,
          petName: selectedPet.pet.name,
          petPhoto: selectedPet.pet.main_photo || '',
        }
      });
    }
  };

  const renderAdoptionItem = ({ item }: { item: Adoption }) => (
    <TouchableOpacity 
      style={styles.adoptionCard}
      onPress={() => handlePetPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Foto */}
        <Image
          source={{ uri: item.pet.main_photo || 'https://placehold.co/100x100/eeeeee/999999?text=Sem+Foto' }}
          style={styles.petImage}
        />

        {/* Info */}
        <View style={styles.petInfo}>
          <Text style={styles.petName}>{item.pet.name}</Text>
          <Text style={styles.breed}>{item.pet.breed?.name || 'Raça não definida'}</Text>
          <Text style={styles.tutor}>
            <FontAwesome5 name="user" size={12} color="#999" /> {item.pet.owner?.username}
          </Text>

          {/* Timestamp */}
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleDateString('pt-PT')}
          </Text>
        </View>

        {/* Badge de interesse */}
        <View style={styles.statusBadge}>
          <FontAwesome5 name="heart" size={20} color="#4CAF50" />
          <Text style={styles.badgeText}>Interesse</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Minhas Adoções</Text>
        </View>
        <View style={[styles.mainArea, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#5C4A3D" />
        </View>
        <BottomNav activePage="adoptions" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Minhas Adoções</Text>
        </View>
        <View style={[styles.mainArea, { justifyContent: 'center', alignItems: 'center' }]}>
          <FontAwesome5 name="exclamation-circle" size={50} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
        <BottomNav activePage="adoptions" />
      </View>
    );
  }

  if (adoptions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Minhas Adoções</Text>
        </View>
        <View style={[styles.mainArea, { justifyContent: 'center', alignItems: 'center' }]}>
          <FontAwesome5 name="heart-broken" size={60} color="#D6CEC3" />
          <Text style={styles.emptyTitle}>Ainda não expressaste interesse</Text>
          <Text style={styles.emptyText}>
            Quando fazeres swipe right em um pet para adoção, aparecerá aqui!
          </Text>
        </View>
        <BottomNav activePage="adoptions" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FontAwesome5 name="heart" size={24} color="#4CAF50" />
        <Text style={styles.title}>Minhas Adoções</Text>
      </View>

      <View style={styles.mainArea}>
        <FlatList
          data={adoptions}
          renderItem={renderAdoptionItem}
          keyExtractor={(item) => item.adoption_id}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* ACTION MODAL */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowActionModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedPet && (
              <>
                {/* Pet Info */}
                <View style={styles.modalHeader}>
                  <Image
                    source={{ uri: selectedPet.pet.main_photo || 'https://placehold.co/100x100/eeeeee/999999?text=Sem+Foto' }}
                    style={styles.modalPetImage}
                  />
                  <View style={styles.modalPetInfo}>
                    <Text style={styles.modalPetName}>{selectedPet.pet.name}</Text>
                    <Text style={styles.modalBreed}>{selectedPet.pet.breed?.name || 'Raça não definida'}</Text>
                    <Text style={styles.modalOwner}>
                      <FontAwesome5 name="user" size={12} color="#5C4A3D" /> {selectedPet.pet.owner?.username}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.viewProfileBtn]}
                    onPress={handleViewProfile}
                  >
                    <FontAwesome5 name="eye" size={18} color="white" />
                    <Text style={styles.actionButtonText}>Ver Perfil</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.messageBtn]}
                    onPress={handleSendMessage}
                  >
                    <FontAwesome5 name="comment" size={18} color="white" />
                    <Text style={styles.actionButtonText}>Mandar Mensagem</Text>
                  </TouchableOpacity>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowActionModal(false)}
                >
                  <Text style={styles.closeButtonText}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <BottomNav activePage="adoptions" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2EB',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5C4A3D',
  },
  mainArea: {
    flex: 1,
    paddingHorizontal: 15,
    paddingBottom: 100,
  },
  adoptionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  petImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  petInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  breed: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  tutor: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 11,
    color: '#bbb',
    fontStyle: 'italic',
  },
  statusBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 8,
  },
  badgeText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    marginTop: 15,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5C4A3D',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 15,
  },
  modalPetImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  modalPetInfo: {
    flex: 1,
  },
  modalPetName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modalBreed: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  modalOwner: {
    fontSize: 12,
    color: '#999',
  },
  modalActions: {
    gap: 12,
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  viewProfileBtn: {
    backgroundColor: '#5C4A3D',
  },
  messageBtn: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  closeButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
});
