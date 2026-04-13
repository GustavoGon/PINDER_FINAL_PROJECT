import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import PetSelectionPopup from './PetSelectionPopup';

interface BottomNavProps {
  activePage: 'home' | 'groups' | 'chat' | 'profile';
}

export default function BottomNav({ activePage }: BottomNavProps) {
  const router = useRouter();
  
  // 2. O estado que controla se o popup está aberto ou fechado
  const [showPopup, setShowPopup] = useState(false);

  const navigateTo = (route: string) => {
    router.replace(route as any);
  };

  return (
    <>
      <View style={styles.navContainer}>
        
      
        <TouchableOpacity 
          style={styles.navItem} 
  
          onPress={() => navigateTo('/feedSwipe')} 
        >
          <FontAwesome5 name="home" size={24} color={activePage === 'home' ? '#5C4A3D' : '#B0A8A0'} />
          <Text style={[styles.navText, activePage === 'home' && styles.activeText]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('/grupos')}>
          <FontAwesome5 name="users" size={24} color={activePage === 'groups' ? '#5C4A3D' : '#B0A8A0'} />
          <Text style={[styles.navText, activePage === 'groups' && styles.activeText]}>Em Grupo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('/chat')}>
          <FontAwesome5 name="comments" size={24} color={activePage === 'chat' ? '#5C4A3D' : '#B0A8A0'} solid={activePage === 'chat'} />
          <Text style={[styles.navText, activePage === 'chat' && styles.activeText]}>Chat</Text>
        </TouchableOpacity>

        {/* 3. BOTÃO PERFIL ATUALIZADO */}
        <TouchableOpacity 
          style={styles.navItem} 
          // O onPress normal (um clique rápido) vai para a página do Dashboard
          onPress={() => navigateTo('/dashboard')}
      // O onLongPress (segurar o dedo por 500ms) vai abrir o popup de seleção de pets
          onLongPress={() => setShowPopup(true)}
         // O delayLongPress define quanto tempo o utilizador tem de segurar para ativar o onLongPress
          delayLongPress={500} 
        >
          <FontAwesome5 
            name="user" 
            size={24} 
            color={activePage === 'profile' ? '#5C4A3D' : '#B0A8A0'} 
            solid={activePage === 'profile'}
          />
          <Text style={[styles.navText, activePage === 'profile' && styles.activeText]}>
            Perfil
          </Text>
        </TouchableOpacity>

      </View>

      {/* Popup para seleção de pets */}
      <PetSelectionPopup 
        visible={showPopup} 
        onClose={() => setShowPopup(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAE6DF',
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 10,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 10,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navText: { fontSize: 12, marginTop: 4, color: '#B0A8A0', fontWeight: '500' },
  activeText: { color: '#5C4A3D', fontWeight: 'bold' }
});