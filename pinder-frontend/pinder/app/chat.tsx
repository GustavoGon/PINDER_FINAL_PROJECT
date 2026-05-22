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
  Alert,
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
  otherUserName?: string;
  otherUserPhoto?: string;
  otherUserLocation?: string;
  isInterested?: boolean;
  conversationType?: 'match' | 'adoption';
  adoptionView?: 'match' | 'received' | 'sent';
  category: 'matches' | 'adoptions_received' | 'adoptions_sent';
  lastMessageSenderId?: string | null;
};

export default function Chat() {
  const router = useRouter();
  const { activeProfile } = useActiveProfile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningConversation, setIsOpeningConversation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [selectedTab, setSelectedTab] = useState<'matches' | 'adoptions_received' | 'adoptions_sent'>('matches');
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [myPets, setMyPets] = useState<any[]>([]);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  useEffect(() => {
    setSelectedTab(activeProfile?.type === 'tutor' ? 'adoptions_received' : 'matches');
  }, [activeProfile?.type]);

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

      // Carregar os pets do utilizador para identificar se é o Dono ou Adotante em cada conversa
      try {
        const petsRes = await fetch(`${API_URL}/pets/user/${myUserId}`);
        if (petsRes.ok) {
          const petsData = await petsRes.json();
          setMyPets(petsData);
        }
      } catch (error) {
        console.error('Erro ao carregar pets do user:', error);
      }

      const response = await fetch(`${API_URL}/messages/conversations/${myUserId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar conversas');
      }

      const data = await response.json();
      const uniqueConversations = Array.from(
        new Map(
          data.map((conversation: any) => [conversation.matchId || conversation.id, conversation])
        ).values()
      );

      setConversations(
        uniqueConversations.map((conversation: any) => ({
          ...conversation,
          time: conversation.time ? formatTime(new Date(conversation.time)) : 'Agora',
          unread: conversation.unread || 0,
          category: conversation.conversationType === 'adoption'
            ? (conversation.adoptionView === 'sent' ? 'adoptions_sent' : 'adoptions_received')
            : 'matches',
          lastMessageSenderId: conversation.lastMessageSenderId || null,
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getChatDisplayInfo = (chat: Conversation) => {
    // Verifica se o pet na conversa pertence ao utilizador atual
    const isMyPet = myPets.some(
      (p) =>
        (chat.otherPetId && p.pet_id === chat.otherPetId) ||
        (p.name === chat.name)
    );

    if (chat.conversationType === 'adoption') {
      if (chat.adoptionView === 'received' || isMyPet) {
        return {
          avatar: chat.otherUserPhoto || 'https://placehold.co/60x60/eeeeee/999999?text=Avatar',
          title: chat.otherUserName || 'Adotante',
          subtitle: `Interesse em ${chat.name}`,
          subtitleIcon: 'heart' as const,
        };
      }

      return {
        avatar: chat.img || 'https://placehold.co/60x60/eeeeee/999999?text=Pet',
        title: chat.name,
        subtitle: `Com ${chat.otherUserName || 'Tutor'}`,
        subtitleIcon: 'paw' as const,
      };
    } else {
      // MATCHES (Amizade) -> Vê sempre os dados do outro Pet
      return {
        avatar: chat.img || 'https://placehold.co/60x60/eeeeee/999999?text=Pet',
        title: chat.name,
        subtitle: chat.otherUserName || 'Tutor',
        subtitleIcon: 'paw' as const
      };
    }
  };

  const openConversation = (chat: Conversation) => {
    if (isOpeningConversation) {
      return;
    }

    const displayInfo = getChatDisplayInfo(chat);

    setIsOpeningConversation(true);
    router.push({
      pathname: '/chatDetail',
      params: {
        matchId: chat.matchId,
        userId: chat.otherUserId || '',
        senderUserId: currentUserId,
        petName: displayInfo.title,
        petPhoto: displayInfo.avatar,
        conversationType: chat.conversationType || 'match',
        adoptionView: chat.adoptionView || 'match',
      },
    });
  };

  const openConversationOrAction = (chat: Conversation) => {
    openConversation(chat);
  };

  const handleLongPress = (chat: Conversation) => {
    setSelectedConversation(chat);
    setIsActionModalVisible(true);
  };

  const openSelectedProfile = () => {
    if (!selectedConversation?.otherPetId) {
      return;
    }

    setIsActionModalVisible(false);
    router.push({ pathname: '/petProfile', params: { petId: selectedConversation.otherPetId } });
  };

  const openCancelConfirmation = () => {
    setIsActionModalVisible(false);
    setIsConfirmModalVisible(true);
  };

  const cancelMatch = async () => {
    if (!selectedConversation) {
      return;
    }

    try {
      const resp = await fetch(`${API_URL}/matches/${selectedConversation.matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unmatched_by: currentUserId }),
      });

      if (!resp.ok) {
        throw new Error('Erro ao cancelar match');
      }

      // remover da lista localmente
      setConversations((prev) => prev.filter((c) => c.id !== selectedConversation.id));
      setIsConfirmModalVisible(false);
      setSelectedConversation(null);

      Alert.alert('Feito', 'Match cancelado com sucesso');
    } catch (err) {
      console.error('cancelMatch error', err);
      Alert.alert('Erro', 'Não foi possível cancelar o match');
    }
  };

  useEffect(() => {
    if (!isOpeningConversation) {
      return;
    }

    const timer = setTimeout(() => {
      setIsOpeningConversation(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isOpeningConversation]);

  const matchesCount = conversations.filter((chat) => chat.category === 'matches').length;
  const adoptionsReceivedCount = conversations.filter((chat) => chat.category === 'adoptions_received').length;
  const adoptionsSentCount = conversations.filter((chat) => chat.category === 'adoptions_sent').length;
  const showAdoptionsTab = activeProfile?.type === 'tutor';
  const showMatchesTab = activeProfile?.type !== 'tutor';

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

  const hasUnreadFromOtherUser = (chat: Conversation) => {
    return chat.unread > 0 && !isLastMessageMine(chat);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>

      <View style={styles.tabContainer}>
        {showMatchesTab && (
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'matches' && styles.tabButtonActive]}
            onPress={() => setSelectedTab('matches')}
          >
            <Text style={[styles.tabText, selectedTab === 'matches' && styles.tabTextActive]}>Matches</Text>
            <View style={[styles.tabCount, selectedTab === 'matches' && styles.tabCountActive]}>
              <Text style={[styles.tabCountText, selectedTab === 'matches' && styles.tabCountTextActive]}>{matchesCount}</Text>
            </View>
          </TouchableOpacity>
        )}

        {showAdoptionsTab && (
          <>
            <TouchableOpacity
              style={[styles.tabButton, selectedTab === 'adoptions_received' && styles.tabButtonActive]}
              onPress={() => setSelectedTab('adoptions_received')}
            >
              <Text style={[styles.tabText, selectedTab === 'adoptions_received' && styles.tabTextActive]}>Recebidas</Text>
              <View style={[styles.tabCount, selectedTab === 'adoptions_received' && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, selectedTab === 'adoptions_received' && styles.tabCountTextActive]}>{adoptionsReceivedCount}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, selectedTab === 'adoptions_sent' && styles.tabButtonActive]}
              onPress={() => setSelectedTab('adoptions_sent')}
            >
              <Text style={[styles.tabText, selectedTab === 'adoptions_sent' && styles.tabTextActive]}>Enviadas</Text>
              <View style={[styles.tabCount, selectedTab === 'adoptions_sent' && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, selectedTab === 'adoptions_sent' && styles.tabCountTextActive]}>{adoptionsSentCount}</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
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
          renderItem={({ item }) => {
            const displayInfo = getChatDisplayInfo(item);
            return (
            <TouchableOpacity
              style={[
                styles.chatItem,
                isLastMessageMine(item) ? styles.chatItemMine : styles.chatItemOther,
              ]}
              onPress={() => openConversationOrAction(item)}
              onLongPress={() => handleLongPress(item)}
            >
              <Image
                source={{ uri: displayInfo.avatar }}
                style={styles.ownerAvatar}
              />

              <View style={styles.chatMiddle}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.ownerName}>{displayInfo.title}</Text>
                  <Text style={styles.chatTime}>{item.time}</Text>
                </View>

                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <FontAwesome5 name={displayInfo.subtitleIcon} size={16} color="#A39A90" />
                  <Text style={styles.petNameSmall}>{displayInfo.subtitle}</Text>
                </View>

                {!hasUnreadFromOtherUser(item) && (
                  <Text style={styles.chatMessageSmall} numberOfLines={1}>
                    {item.msg}
                  </Text>
                )}
              </View>

              <View style={styles.rightSection}>
                {isLastMessageMine(item) ? (
                  <FontAwesome5 name="check-double" size={13} color="#4CAF50" />
                ) : hasUnreadFromOtherUser(item) ? (
                  <View style={styles.unreadBadge} />
                ) : null}
              </View>
            </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal
        visible={isActionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsActionModalVisible(false);
          setSelectedConversation(null);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setIsActionModalVisible(false);
            setSelectedConversation(null);
          }}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedConversation?.otherUserName || 'Opcoes'}</Text>
            <Text style={styles.modalSubtitle}>Escolha uma acao para esta conversa</Text>

            <TouchableOpacity style={styles.modalActionButton} onPress={openSelectedProfile}>
              <FontAwesome5 name="user" size={14} color="#5C4A3D" />
              <Text style={styles.modalActionText}>Ver perfil do utilizador</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalActionButton, styles.modalActionDanger]}
              onPress={openCancelConfirmation}
            >
              <FontAwesome5 name="times-circle" size={14} color="#C0392B" />
              <Text style={styles.modalActionDangerText}>Cancelar match</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={() => {
                setIsActionModalVisible(false);
                setSelectedConversation(null);
              }}
            >
              <Text style={styles.modalBackText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={isConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsConfirmModalVisible(false);
          setSelectedConversation(null);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setIsConfirmModalVisible(false);
            setSelectedConversation(null);
          }}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancelar match?</Text>
            <Text style={styles.modalSubtitle}>
              Esta acao remove o match e ele nao voltara a aparecer para este pet.
            </Text>

            <TouchableOpacity
              style={[styles.modalActionButton, styles.modalActionDanger]}
              onPress={cancelMatch}
            >
              <FontAwesome5 name="trash" size={14} color="#C0392B" />
              <Text style={styles.modalActionDangerText}>Confirmar cancelamento</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={() => {
                setIsConfirmModalVisible(false);
                setSelectedConversation(null);
              }}
            >
              <Text style={styles.modalBackText}>Voltar</Text>
            </TouchableOpacity>
          </View>
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
  openingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 242, 235, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  openingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  openingText: {
    color: '#5C4A3D',
    fontSize: 14,
    fontWeight: '600',
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
    /* New styles for improved chat card */
    ownerAvatar: {
      width: 50,
      height: 50,
      borderRadius: 14,
      backgroundColor: '#eee',
      marginRight: 10,
    },
    chatMiddle: {
      flex: 1,
      justifyContent: 'center',
    },
    ownerInfo: {
      marginBottom: 4,
    },
    ownerName: {
      fontSize: 15,
      fontWeight: '700',
      color: '#2F2A24',
      marginBottom: 2,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ownerLocation: {
      fontSize: 11,
      color: '#A39A90',
    },
    petInfoSmall: {
      marginBottom: 4,
    },
    petNameSmall: {
      fontSize: 13,
      fontWeight: '600',
      color: '#5C4A3D',
    },
    petBreedSmall: {
      fontSize: 11,
      color: '#8D8379',
      marginTop: 1,
    },
    chatMessageSmall: {
      fontSize: 12,
      color: '#7D736A',
      marginTop: 2,
    },
    rightSection: {
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
      minWidth: 28,
    },
    petAvatarSmall: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#eee',
      marginBottom: 4,
    },
    statusIndicator: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    unreadBadge: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#4CAF50',
    },
    unreadBubble: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#4CAF50',
    },
    unreadBubbleText: {
      color: 'white',
      fontSize: 11,
      fontWeight: '700',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      backgroundColor: 'white',
      borderRadius: 18,
      padding: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 14,
      elevation: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#2F2A24',
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: 13,
      color: '#7D736A',
      marginBottom: 14,
    },
    modalActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: '#E8E2D8',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 10,
      backgroundColor: '#FDFBF8',
    },
    modalActionText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#5C4A3D',
    },
    modalActionDanger: {
      borderColor: '#F3D4D0',
      backgroundColor: '#FFF6F5',
    },
    modalActionDangerText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#C0392B',
    },
    modalBackButton: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      paddingVertical: 11,
      backgroundColor: '#EFE9DF',
      marginTop: 4,
    },
    modalBackText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#5C4A3D',
    },
});
