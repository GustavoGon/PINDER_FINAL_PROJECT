import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Image, StyleSheet, 
  Platform, ActivityIndicator, Alert 
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useActiveProfile } from '../src/contexts/ActiveProfileContext';
import BottomNav from '../src/components/BottomNav';

export default function Matches() {
  const router = useRouter();
  const { activeProfile } = useActiveProfile();
  
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';


  useFocusEffect(
    React.useCallback(() => {
      if (activeProfile?.type === 'tutor') {
        router.replace('/feedSwipe');
      }
    }, [activeProfile?.type, router])
  );

  useEffect(() => {
    if (!activeProfile?.id || activeProfile?.type === 'tutor') {
      setIsLoading(false);
      return;
    }
    
    fetchMatches();
  }, [activeProfile?.id, activeProfile?.type]);

  const fetchMatches = async () => {
    try {
      setIsLoading(true);
      
      // Procurar todos os matches para os pets do utilizador
      const userStr = await AsyncStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : {};
      const myUserId = currentUser.user_id || currentUser.id;

      // Procurar os pets do utilizador
      const userPetsResponse = await fetch(`${API_URL}/pets/user/${myUserId}`);
      if (!userPetsResponse.ok) throw new Error('Erro ao carregar pets');
      
      const userPets = await userPetsResponse.json();
      
      if (!userPets.length) {
        setMatches([]);
        return;
      }

      // Para cada pet, procurar os matches
      const allMatches: any[] = [];
      
      for (const pet of userPets) {
        const matchesResponse = await fetch(`${API_URL}/matches?petId=${pet.pet_id}`);
        if (matchesResponse.ok) {
          const petMatches = await matchesResponse.json();
          allMatches.push(...petMatches);
        }
      }

      setMatches(allMatches);
    } catch (error) {
      console.error('Erro ao carregar matches:', error);
      Alert.alert('Erro', 'Não foi possível carregar os matches');
    } finally {
      setIsLoading(false);
    }
  };

const handleMatchPress = async (match: any) => {
  const userStr = await AsyncStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
  const userId = currentUser.user_id || currentUser.id;

  router.push({
    pathname: '/chat',
    params: { 
      matchId: match.match_id,
      userId
    }
  });
};

  const handleUnmatch = (matchId: string) => {
    Alert.alert(
      'Desligar Match',
      'Tens a certeza que queres desligar este match?',
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Desligar',
          onPress: () => unmatchPet(matchId),
          style: 'destructive'
        }
      ]
    );
  };

  const unmatchPet = async (matchId: string) => {
    try {
      const response = await fetch(`${API_URL}/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unmatched: true })
      });

      if (response.ok) {
        // Atualizar a lista localmente
        setMatches(matches.filter(m => m.match_id !== matchId));
        Alert.alert('Sucesso', 'Match desligado');
      }
    } catch (error) {
      console.error('Erro ao desligar match:', error);
      Alert.alert('Erro', 'Não foi possível desligar o match');
    }
  };

  const renderMatchCard = ({ item }: { item: any }) => {
    // Determinar qual pet é o "outro" - comparar pet_id, não user_id!
    const otherPet = item.pet1?.pet_id !== activeProfile?.id ? item.pet1 : item.pet2;
    const otherUser = otherPet?.owner;

    return (
      <TouchableOpacity 
        style={styles.matchCard}
        onPress={() => handleMatchPress(item)}
      >
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: otherPet?.main_photo || 'https://placehold.co/100x100' }}
            style={styles.petPhoto}
          />
          <View style={styles.userBadge}>
            <Image
              source={{ uri: otherUser?.photo || 'https://placehold.co/40x40' }}
              style={styles.userPhoto}
            />
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.petName}>{otherPet?.name}</Text>
          <Text style={styles.userName}>{otherUser?.username}</Text>
          <Text style={styles.location}>📍 {otherUser?.location || 'Localização não definida'}</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.chatBtn]}
              onPress={() => handleMatchPress(item)}
            >
              <FontAwesome5 name="comments" size={14} color="white" />
              <Text style={styles.actionBtnText}>Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.unmatchBtn]}
              onPress={() => handleUnmatch(item.match_id)}
            >
              <FontAwesome5 name="times" size={14} color="#FF6B9D" />
              <Text style={[styles.actionBtnText, { color: '#FF6B9D' }]}>Desligar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (activeProfile?.type === 'tutor') {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Matches</Text>
        </View>
        <View style={[styles.content, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#5C4A3D" />
        </View>
        <BottomNav activePage="matches" />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Matches</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="heart" size={40} color="#D6CEC3" solid />
          </View>
          <Text style={styles.emptyTitle}>Sem Matches Ainda</Text>
          <Text style={styles.emptySubtitle}>
            Vai ao Feed e faz uns swipes! Quando houver um match mútuo, aparecerá aqui.
          </Text>
        </View>
        <BottomNav activePage="matches" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FontAwesome5 name="heart" size={24} color="#FF6B9D" solid style={{ marginRight: 10 }} />
        <Text style={styles.headerTitle}>Matches</Text>
      </View>

      <FlatList
        data={matches}
        renderItem={renderMatchCard}
        keyExtractor={(item) => item.match_id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
      />

      <BottomNav activePage="matches" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2EB',
  },
  header: {
    flexDirection: 'row',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DF',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5C4A3D',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0E8DF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5C4A3D',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 100,
    paddingHorizontal: 15,
  },
  matchCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  photoContainer: {
    position: 'relative',
    width: 100,
    height: 120,
  },
  petPhoto: {
    width: '100%',
    height: '100%',
  },
  userBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'hidden',
  },
  userPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  infoContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5C4A3D',
  },
  userName: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  location: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  chatBtn: {
    backgroundColor: '#FF6B9D',
  },
  unmatchBtn: {
    backgroundColor: '#F0E8DF',
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  actionBtnText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
});
