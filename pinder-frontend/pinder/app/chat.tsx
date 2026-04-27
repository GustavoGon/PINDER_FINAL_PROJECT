import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, Platform, FlatList, TextInput, TouchableOpacity 
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import socket from '../src/services/socket';

export default function Chat() {

  const { matchId, userId } = useLocalSearchParams();
  
  const matchIdStr = String(matchId);
  const userIdStr = String(userId);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  // 🔹 Load messages from DB
  useEffect(() => {
    fetch(`${API_URL}/messages/${matchIdStr}`)
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(err => console.log(err));
  }, [matchId]);

  // 🔹 Socket connection
  useEffect(() => {
    socket.connect();

    socket.emit("join_chat", { matchIdStr });

     const handleMessage = (msg: any) => {
    setMessages(prev => [...prev, msg]);
  };

  socket.on("receive_message", handleMessage);

    return () => {
      socket.emit("leave_chat", { matchIdStr });
      socket.off("receive_message");
      socket.disconnect();
    };
  }, [matchIdStr]);

  const sendMessage = () => {
  if (!input) return;

  const tempMessage = {
    content: input,
    sender_id: userIdStr
  };

  setMessages(prev => [...prev, tempMessage]);

  socket.emit("send_message", {
    matchId: matchIdStr,
    senderId: userIdStr,
    content: input
  });

  setInput("");
};

  return (
    <View style={styles.container}>
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ padding: 10 }}
        renderItem={({ item }) => (
          <View style={[
            styles.messageBubble,
            item.sender_id === userId ? styles.myMessage : styles.otherMessage
          ]}>
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
        />

        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <FontAwesome5 name="paper-plane" size={16} color="white" />
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F2EB' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: 'white',
    alignItems: 'center'
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5C4A3D'
  },

  messageBubble: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    maxWidth: '70%'
  },

  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF6B9D'
  },

  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAE6DF'
  },

  messageText: {
    color: '#000'
  },

  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd'
  },

  input: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 10
  },

  sendBtn: {
    marginLeft: 10,
    backgroundColor: '#FF6B9D',
    padding: 10,
    borderRadius: 10,
    justifyContent: 'center'
  }
});