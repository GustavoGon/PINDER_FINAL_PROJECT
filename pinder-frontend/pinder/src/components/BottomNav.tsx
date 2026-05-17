import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PetSelectionPopup from './PetSelectionPopup';
import { useActiveProfile } from '../contexts/ActiveProfileContext';

interface BottomNavProps {
  activePage: 'home' | 'groups' | 'chat' | 'matches' | 'adoptions' | 'profile';
}

export default function BottomNav({ activePage }: BottomNavProps) {
  const router = useRouter();
  const { activeProfile } = useActiveProfile();
  const insets = useSafeAreaInsets();
  const [showPopup, setShowPopup] = useState(false);

  const isTutor = activeProfile?.type === 'tutor';
  const isPetUser = !isTutor;

  const navigateTo = (route: string) => {
    router.replace(route as any);
  };

  return (
    <>
      <View style={[styles.navContainer, { bottom: insets.bottom, paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 10) }]}>
        
      
        <TouchableOpacity 
          style={styles.navItem} 
  
          onPress={() => navigateTo('/feedSwipe')} 
        >
          <FontAwesome5 name="home" size={24} color={activePage === 'home' ? '#5C4A3D' : '#B0A8A0'} />
          <Text style={[styles.navText, activePage === 'home' && styles.activeText]}>Home</Text>
        </TouchableOpacity>

        {isTutor && (
          <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('/grupos')}>
            <FontAwesome5 name="users" size={24} color={activePage === 'groups' ? '#5C4A3D' : '#B0A8A0'} />
            <Text style={[styles.navText, activePage === 'groups' && styles.activeText]}>Eventos</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('/chat')}>
          <FontAwesome5 name="comments" size={24} color={activePage === 'chat' ? '#5C4A3D' : '#B0A8A0'} solid={activePage === 'chat'} />
          <Text style={[styles.navText, activePage === 'chat' && styles.activeText]}>Chat</Text>
        </TouchableOpacity>

        {isPetUser && (
          <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('/matches')}>
            <FontAwesome5 name="heart" size={24} color={activePage === 'matches' ? '#5C4A3D' : '#B0A8A0'} solid={activePage === 'matches'} />
            <Text style={[styles.navText, activePage === 'matches' && styles.activeText]}>Matches</Text>
          </TouchableOpacity>
        )}

        {!isPetUser && (
          <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('/adoptions')}>
            <FontAwesome5 name="paw" size={24} color={activePage === 'adoptions' ? '#4CAF50' : '#B0A8A0'} />
            <Text style={[styles.navText, activePage === 'adoptions' && styles.activeText, activePage === 'adoptions' && { color: '#4CAF50' }]}>Adoções</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigateTo('/dashboard')}
          onLongPress={() => setShowPopup(true)}
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
    paddingTop: 10,
    position: 'absolute',
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