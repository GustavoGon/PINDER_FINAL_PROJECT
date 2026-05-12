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
  Modal,
  Pressable,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useActiveProfile } from '../src/contexts/ActiveProfileContext';
import BottomNav from '../src/components/BottomNav';

type Conversation = {
  id: string;
  name: string;
  breed: string;
  msg: string;
  time: string;
  unread: number;
  img: string;
  matchId: string;
  otherPetId?: string;
  otherUserId?: string;
  isInterested?: boolean;
  category: 'matches' | 'adoptions';
  lastMessageSenderId?: string | null;
};

export default function Chat() {
  const router = useRouter();
  const { activeProfile } = useActiveProfile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [selectedTab, setSelectedTab] = useState<'matches' | 'adoptions'>('matches');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  useEffect(() => {
    setSelectedTab(activeProfile?.type === 'tutor' ? 'adoptions' : 'matches');
  }, [activeProfile?.type]);

  useEffect(() => {
    fetchConversations();
  }, [activeProfile?.id, activeProfile?.type]);

  useFocusEffect(
    React.useCallback(() => {
      fetchConversations();
    }, [activeProfile?.id, activeProfile?.type])
  );

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

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      setConversations([]);

      if (!activeProfile?.id) {
        return;
      }

      const userStr = await AsyncStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : {};
      const myUserId = currentUser.user_id || currentUser.id || '';
      setCurrentUserId(myUserId);

      if (!myUserId) {
        return;
      }

      const response = await fetch(`${API_URL}/messages/conversations/${myUserId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar conversas');
      }

      const data = await response.json();
      setConversations(
        data.map((conversation: any) => ({
          ...conversation,
          time: conversation.time ? formatTime(new Date(conversation.time)) : 'Agora',
          unread: conversation.unread || 0,
          category: conversation.isInterested ? 'adoptions' : 'matches',
          lastMessageSenderId: conversation.lastMessageSenderId || null,
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openConversation = (chat: Conversation) => {
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

  const openConversationOrAction = (chat: Conversation) => {
    if (selectedTab === 'adoptions' && chat.isInterested && activeProfile?.type === 'tutor') {
      setSelectedConversation(chat);
      setShowActionModal(true);
      return;
    }

    openConversation(chat);
  };

  const matchesCount = conversations.filter((chat) => chat.category === 'matches').length;
  const adoptionsCount = conversations.filter((chat) => chat.category === 'adoptions').length;

  const filteredConversations = conversations
    .filter((chat) => chat.category === selectedTab)
    .filter((chat) =>
      chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.breed.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const isLastMessageMine = (chat: Conversation) => {
    if (!currentUserId || !chat.lastMessageSenderId) {
      return false;
    }

    return String(chat.lastMessageSenderId) === String(currentUserId);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedConversation(null);
  };

  const goToPetProfile = () => {
    if (!selectedConversation?.otherPetId) return;

    setShowActionModal(false);
    router.push({
      pathname: '/petProfile',
      params: { petId: selectedConversation.otherPetId },
    });
  };

  const continueToChat = () => {
    if (!selectedConversation) return;

    setShowActionModal(false);
    openConversation(selectedConversation);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'matches' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('matches')}
        >
          <Text style={[styles.tabText, selectedTab === 'matches' && styles.tabTextActive]}>Matches</Text>
          <View style={[styles.tabCount, selectedTab === 'matches' && styles.tabCountActive]}>
            <Text style={[styles.tabCountText, selectedTab === 'matches' && styles.tabCountTextActive]}>{matchesCount}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'adoptions' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('adoptions')}
        >
          <Text style={[styles.tabText, selectedTab === 'adoptions' && styles.tabTextActive]}>Adoções</Text>
          <View style={[styles.tabCount, selectedTab === 'adoptions' && styles.tabCountActive]}>
            <Text style={[styles.tabCountText, selectedTab === 'adoptions' && styles.tabCountTextActive]}>{adoptionsCount}</Text>
          </View>
        </TouchableOpacity>
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
          <Text style={styles.emptyText}>Quando houver mensagens ou matches, eles aparecem aqui.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.chatItem,
                isLastMessageMine(item) ? styles.chatItemMine : styles.chatItemOther,
              ]}
              onPress={() => openConversationOrAction(item)}
            >
              <Image source={{ uri: item.img }} style={styles.avatar} />

              <View style={styles.chatContent}>
                <View style={styles.chatRowTop}>
                  <View style={styles.chatTitleRow}>
                    <Text style={styles.chatName}>{item.name}</Text>
                    {item.isInterested && activeProfile?.type === 'tutor' && (
                      <View style={styles.interestedBadge}>
                        <Text style={styles.interestedBadgeText}>Interessado</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.chatTime}>{item.time}</Text>
                </View>

                <Text style={styles.chatBreed}>{item.breed}</Text>

                <View style={styles.chatRowBottom}>
                  <View style={styles.messagePreviewContainer}>
                    <Text style={styles.chatMsg} numberOfLines={1}>{item.msg}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statusIndicatorRight}>
                {isLastMessageMine(item) ? (
                  <FontAwesome5 name="check-double" size={14} color="#4CAF50" />
                ) : item.unread > 0 ? (
                  <View style={styles.unreadDot} />
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={showActionModal} transparent animationType="fade" onRequestClose={closeActionModal}>
        <Pressable style={styles.modalOverlay} onPress={closeActionModal}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Image
              source={{ uri: selectedConversation?.img || 'https://placehold.co/160x160/eeeeee/999999?text=Sem+Foto' }}
              style={styles.modalAvatar}
            />
            <Text style={styles.modalTitle}>{selectedConversation?.name || 'Adoção'}</Text>
            <Text style={styles.modalSubtitle}>O interesse foi registado. Podes abrir o perfil ou continuar para o chat.</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalSecondaryButton]} onPress={goToPetProfile}>
                <Text style={styles.modalSecondaryButtonText}>Ver Perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalPrimaryButton]} onPress={continueToChat}>
                <Text style={styles.modalPrimaryButtonText}>Mandar Mensagem</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#EDE6DC',
    borderRadius: 18,
    padding: 5,
    gap: 5,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 14,
  },
  tabButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8D8379',
  },
  tabTextActive: {
    color: '#5C4A3D',
  },
  tabCount: {
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#D9D0C5',
    alignItems: 'center',
  },
  tabCountActive: {
    backgroundColor: '#FF6B9D',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6E645A',
  },
  tabCountTextActive: {
    color: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
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
    borderLeftWidth: 4,
    borderLeftColor: '#D9D0C5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  chatItemMine: {
    borderLeftColor: '#FF6B9D',
    backgroundColor: '#FFF9FC',
  },
  chatItemOther: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#FAFFFB',
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
    paddingRight: 28,
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
  messagePreviewContainer: {
    flex: 1,
    minWidth: 0,
  },
  chatMsg: {
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
  statusIndicatorRight: {
    position: 'absolute',
    right: 14,
    bottom: 16,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  unreadDot: {
    width: 11,
    height: 11,
    borderRadius: 999,
    backgroundColor: '#4CAF50',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
  },
  modalAvatar: {
    width: 110,
    height: 110,
    borderRadius: 28,
    marginBottom: 14,
    backgroundColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2F2A24',
    textAlign: 'center',
  },
  modalSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#7D736A',
    textAlign: 'center',
  },
  modalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalPrimaryButton: {
    backgroundColor: '#FF6B9D',
  },
  modalSecondaryButton: {
    backgroundColor: '#F1E8DC',
  },
  modalPrimaryButtonText: {
    color: 'white',
    fontWeight: '800',
  },
  modalSecondaryButtonText: {
    color: '#5C4A3D',
    fontWeight: '800',
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
