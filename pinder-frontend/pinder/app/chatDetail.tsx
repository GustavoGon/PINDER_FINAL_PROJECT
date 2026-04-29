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
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import socket from '../src/services/socket';

export default function ChatDetail() {
  const router = useRouter();
  const { matchId, userId, petName, petPhoto } = useLocalSearchParams();

  const matchIdStr = String(matchId || '');
  const userIdStr = String(userId || '');
  const petNameStr = String(petName || 'Chat');
  const petPhotoStr = String(petPhoto || 'https://placehold.co/120x120/eeeeee/999999?text=Sem+Foto');

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  useEffect(() => {
    if (!matchIdStr) {
      return;
    }

    fetch(`${API_URL}/messages/${matchIdStr}`)
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch((err) => console.log(err));

    fetch(`${API_URL}/messages/${matchIdStr}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userIdStr }),
    }).catch((err) => console.log(err));
  }, [matchIdStr]);

  useEffect(() => {
    if (!matchIdStr) {
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join_chat', { matchId: matchIdStr });

    const handleMessage = (msg: any) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('receive_message', handleMessage);

    return () => {
      socket.emit('leave_chat', { matchId: matchIdStr });
      socket.off('receive_message', handleMessage);
      socket.disconnect();
    };
  }, [matchIdStr]);

  const sendMessage = () => {
    if (!input.trim() || !matchIdStr) {
      return;
    }

    socket.emit('send_message', {
      matchId: matchIdStr,
      senderId: userIdStr,
      content: input.trim(),
    });

    setInput('');
  };

  return (
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
              item.sender_id === userIdStr ? styles.myMessage : styles.otherMessage,
            ]}
          >
            <Text style={styles.messageText}>{item.content}</Text>
          </View>
        )}
      />

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
  );
}

const styles = StyleSheet.create({
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
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
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