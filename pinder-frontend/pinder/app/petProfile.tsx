import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BottomNav from '../src/components/BottomNav';

export default function PetProfile() {
  const router = useRouter();
  const { petId } = useLocalSearchParams();
  const petIdStr = String(petId || '');

  const [pet, setPet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  useEffect(() => {
    const fetchPet = async () => {
      try {
        setIsLoading(true);

        if (!petIdStr) {
          return;
        }

        const response = await fetch(`${API_URL}/pets/${petIdStr}`);
        if (response.ok) {
          const data = await response.json();
          setPet(data);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPet();
  }, [petIdStr]);

  if (isLoading) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5C4A3D" />
        </View>
        <BottomNav activePage="profile" />
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Não foi possível carregar o pet.</Text>
        </View>
        <BottomNav activePage="profile" />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome5 name="chevron-left" size={16} color="#5C4A3D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil do Pet</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: pet.main_photo || 'https://placehold.co/600x400/eeeeee/999999?text=Sem+Foto' }}
          style={styles.photo}
        />

        <Text style={styles.name}>{pet.name}</Text>
        <Text style={styles.breed}>{pet.breed?.name || 'Raça não definida'}</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Tutor</Text>
          <Text style={styles.infoValue}>{pet.owner?.username || 'Desconhecido'}</Text>

          <Text style={styles.infoLabel}>Descrição</Text>
          <Text style={styles.description}>{pet.description || 'Sem descrição disponível.'}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Sexo</Text>
            <Text style={styles.statValue}>{pet.gender || 'N/D'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Tamanho</Text>
            <Text style={styles.statValue}>{pet.size || 'N/D'}</Text>
          </View>
        </View>
      </ScrollView>
      </View>

      <BottomNav activePage="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { 
    flex: 1, 
    backgroundColor: '#F5F2EB',
    position: 'relative',
  },
  container: { flex: 1, backgroundColor: '#F5F2EB' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F2EB',
  },
  errorText: {
    color: '#5C4A3D',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DF',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F2EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5C4A3D',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  photo: {
    width: '100%',
    height: 280,
    borderRadius: 24,
    backgroundColor: '#eee',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2F2A24',
    marginTop: 18,
  },
  breed: {
    fontSize: 16,
    color: '#7D736A',
    marginTop: 4,
  },
  infoCard: {
    marginTop: 18,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#A39A90',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#2F2A24',
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5C4A3D',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 14,
  },
  statLabel: {
    fontSize: 12,
    color: '#A39A90',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 15,
    color: '#2F2A24',
    fontWeight: '600',
  },
});