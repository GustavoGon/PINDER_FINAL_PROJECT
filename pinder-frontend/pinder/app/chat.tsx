import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useActiveProfile } from '../src/contexts/ActiveProfileContext';
import BottomNav from '../src/components/BottomNav';

export default function Chat() {
  const router = useRouter();
  const { activeProfile } = useActiveProfile();
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  useEffect(() => {
    fetchConversations();
  }, [activeProfile?.id, activeProfile?.type]);

  useFocusEffect(
    React.useCallback(() => {
      fetchConversations();
    }, [activeProfile?.id, activeProfile?.type])
  );

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      setConversations([]);

      if (!activeProfile?.id) {
        return;
      }

      const userStr = await AsyncStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : {};
      const myUserId = currentUser.user_id || currentUser.id;

      if (!myUserId) {
        return;
      }

      const conversationsResponse = await fetch(`${API_URL}/messages/conversations/${myUserId}`);
      if (!conversationsResponse.ok) {
        throw new Error('Erro ao carregar conversas');
      }

      const conversationsData = await conversationsResponse.json();
      setConversations(
        conversationsData.map((conversation: any) => ({
          ...conversation,
          time: conversation.time ? formatTime(new Date(conversation.time)) : 'Agora',
          unread: conversation.unread || 0,
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }

    return date.toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' });
  };

  const openConversation = async (chat: any) => {
    const userStr = await AsyncStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const currentUserId = user.user_id || user.id || '';

    router.push({
      pathname: '/chatDetail',
      params: {
        matchId: chat.matchId,
        userId: chat.otherUserId || '',
        senderUserId: currentUserId,
        petName: chat.name,
        petPhoto: chat.img,
      },
    });
  };

  const filteredConversations = conversations.filter((chat) =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.breed.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>

      <View style={styles.searchContainer}>
        <FontAwesome5 name="search" size={14} color="#999" />
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Pesquisar conversas..."
          style={styles.searchInput}
          placeholderTextColor="#A9A096"
        />
      </View>

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#5C4A3D" />
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome5 name="comments" size={42} color="#D6CEC3" solid />
          <Text style={styles.emptyTitle}>Sem conversas abertas</Text>
          <Text style={styles.emptyText}>
            Quando houver mensagens ou matches, eles aparecem aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatItem} onPress={() => openConversation(item)}>
              <Image source={{ uri: item.img }} style={styles.avatar} />
              <View style={styles.chatContent}>
                <View style={styles.chatRowTop}>
                  <View style={styles.chatTitleRow}>
                    <Text style={styles.chatName}>{item.name}</Text>
                    {item.isInterested && (
                      <View style={styles.interestedBadge}>
                        <Text style={styles.interestedBadgeText}>Interessado</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.chatTime}>{item.time}</Text>
                </View>
                <Text style={styles.chatBreed}>{item.breed}</Text>
                <View style={styles.chatRowBottom}>
                  <Text style={styles.chatMsg} numberOfLines={1}>{item.msg}</Text>
                  {item.unread > 0 && <Text style={styles.unreadBadge}>{item.unread}</Text>}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <BottomNav activePage="chat" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F2EB' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 18,
    backgroundColor: 'white',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5C4A3D',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#5C4A3D',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#eee',
  },
  chatContent: {
    flex: 1,
    marginLeft: 12,
  },
  chatRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    paddingRight: 12,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2F2A24',
  },
  chatTime: {
    fontSize: 12,
    color: '#9A9188',
  },
  chatBreed: {
    fontSize: 13,
    color: '#7D736A',
    marginTop: 2,
    marginBottom: 8,
  },
  chatRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  chatMsg: {
    flex: 1,
    fontSize: 14,
    color: '#5C4A3D',
  },
  interestedBadge: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#BFE4C2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  interestedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  unreadBadge: {
    backgroundColor: '#4CAF50',
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5C4A3D',
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8D8379',
    textAlign: 'center',
    lineHeight: 20,
  },
});