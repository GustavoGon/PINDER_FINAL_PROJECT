import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socket from '../src/services/socket';
import BottomNav from '../src/components/BottomNav';

export default function ChatDetail() {
  const router = useRouter();
  const { matchId, userId, petName, petPhoto, petId, senderPetId, senderUserId } = useLocalSearchParams();

  const matchIdStr = String(matchId || '');
  const routeUserIdStr = String(userId || '');
  const petNameStr = String(petName || 'Chat');
  const petPhotoStr = String(petPhoto || 'https://placehold.co/120x120/eeeeee/999999?text=Sem+Foto');
  const petIdStr = String(petId || '');
  const senderPetIdStr = String(senderPetId || '');
  const senderUserIdStr = String(senderUserId || '');

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [resolvedMatchId, setResolvedMatchId] = useState(matchIdStr);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isPreparingChat, setIsPreparingChat] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  useEffect(() => {
    const prepareChat = async () => {
      try {
        setIsPreparingChat(true);
        setStatusMessage('');

        const userStr = await AsyncStorage.getItem('user');
        const currentUser = userStr ? JSON.parse(userStr) : {};
        const realUserId = senderUserIdStr || currentUser.user_id || currentUser.id;
        setCurrentUserId(realUserId);

        let finalMatchId = matchIdStr;
        let finalSenderPetId = senderPetIdStr;

        if (!finalSenderPetId && realUserId) {
          const userPetsResponse = await fetch(`${API_URL}/pets/user/${realUserId}`);
          if (userPetsResponse.ok) {
            const userPets = await userPetsResponse.json();
            finalSenderPetId = userPets?.find((pet: any) => pet.forAdoption)?.pet_id || userPets?.[0]?.pet_id || '';
          }
        }

        if (!finalMatchId && petIdStr) {

          const directMatchResponse = await fetch(`${API_URL}/messages/direct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender_pet_id: finalSenderPetId || undefined,
              target_pet_id: petIdStr,
            }),
          });

          if (directMatchResponse.ok) {
            const directMatch = await directMatchResponse.json();
            finalMatchId = directMatch.match_id;
          }
        }

        if (!finalMatchId) {
          if (!realUserId) {
            setStatusMessage('Sessão inválida. Volta a iniciar sessão.');
          } else {
            setStatusMessage('Não foi possível preparar a conversa.');
          }
          return;
        }

        setResolvedMatchId(finalMatchId);

        const messagesResponse = await fetch(`${API_URL}/messages/${finalMatchId}?userId=${encodeURIComponent(realUserId)}`);
        if (messagesResponse.ok) {
          const data = await messagesResponse.json();
          setMessages(data);
        }

        await fetch(`${API_URL}/messages/${finalMatchId}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: realUserId }),
        });
      } catch (err) {
        console.log(err);
      } finally {
        setIsPreparingChat(false);
      }
    };

    prepareChat();
  }, [matchIdStr, petIdStr, routeUserIdStr]);

  useEffect(() => {
    if (!resolvedMatchId) {
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join_chat', { matchId: resolvedMatchId });

    const handleMessage = (msg: any) => {
      setMessages((prev) =>
        prev.some((existing) => existing.message_id === msg.message_id)
          ? prev
          : [...prev, msg]
      );
    };

    socket.on('receive_message', handleMessage);

    return () => {
      socket.emit('leave_chat', { matchId: resolvedMatchId });
      socket.off('receive_message', handleMessage);
      socket.disconnect();
    };
  }, [resolvedMatchId]);

  const sendMessage = () => {
    if (!input.trim() || !resolvedMatchId || !currentUserId) {
      Alert.alert(
        'Conversa indisponível',
        'A conversa ainda não está pronta ou não foi possível identificar a sessão do utilizador.'
      );
      return;
    }

    const messageText = input.trim();
    setInput('');

    fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: resolvedMatchId,
        sender_id: currentUserId,
        content: messageText,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Falha ao enviar mensagem');
        }
        return res.json();
      })
      .then((message) => {
        setMessages((prev) =>
          prev.some((existing) => existing.message_id === message.message_id)
            ? prev
            : [...prev, message]
        );
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <View style={styles.mainContainer}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome5 name="chevron-left" size={16} color="#5C4A3D" />
        </TouchableOpacity>

        <Image source={{ uri: petPhotoStr }} style={styles.petAvatar} />

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{petNameStr}</Text>
          <Text style={styles.headerSubtitle}>Chat aberto</Text>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.message_id || `${item.timestamp}-${item.content}`}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.sender_id === currentUserId ? styles.myMessage : styles.otherMessage,
            ]}
          >
            <Text style={styles.messageText}>{item.content}</Text>
          </View>
        )}
      />

      {isPreparingChat && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#5C4A3D" />
            <Text style={styles.loadingText}>A carregar mensagens...</Text>
          </View>
        </View>
      )}

      {!!statusMessage && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Escreve uma mensagem..."
          style={styles.input}
          placeholderTextColor="#A9A096"
          multiline
        />

        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <FontAwesome5 name="paper-plane" size={16} color="white" />
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      <BottomNav activePage="chat" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 18,
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
  petAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#eee',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5C4A3D',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8D8379',
    marginTop: 2,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
    maxWidth: '78%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF6B9D',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAE6DF',
  },
  messageText: {
    color: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 242, 235, 0.9)',
    paddingHorizontal: 24,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF7E9',
    borderWidth: 1,
    borderColor: '#E8D7B8',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  loadingText: {
    color: '#5C4A3D',
    fontSize: 13,
    fontWeight: '600',
  },
  statusBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF3E0',
    borderTopWidth: 1,
    borderTopColor: '#E8D7B8',
  },
  statusText: {
    color: '#8A5A2B',
    fontSize: 13,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 80 : 70,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    maxHeight: 110,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sendBtn: {
    marginLeft: 10,
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 44,
  },
});