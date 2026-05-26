import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ActiveProfileType = {
  type: 'tutor' | 'pet';
  id: string | null;
};

type SessionStatus = 'loading' | 'ready' | 'banned' | 'guest';

const ActiveProfileContext = createContext<any>(null);

export function ActiveProfileProvider({ children }: { children: React.ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<ActiveProfileType>({
    type: 'tutor', 
    id: null
  });
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');
  const [sessionMessage, setSessionMessage] = useState('');

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  const clearSession = useCallback(async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('activeProfile');
    setActiveProfile({ type: 'tutor', id: null });
    setSessionStatus('guest');
  }, []);

  const refreshStoredUser = useCallback(async () => {
    try {
      setSessionStatus('loading');

      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user) {
        setSessionStatus('guest');
        // restore any stored activeProfile (if exists) or default to tutor
        const storedProfileStr = await AsyncStorage.getItem('activeProfile');
        if (storedProfileStr) {
          try {
            const stored = JSON.parse(storedProfileStr);
            setActiveProfile(stored);
          } catch (err) {
            setActiveProfile({ type: 'tutor', id: null });
          }
        } else {
          setActiveProfile({ type: 'tutor', id: null });
        }
        return;
      }

      const currentId = user.user_id || user.id;

      if (!currentId) {
        await clearSession();
        return;
      }

      const response = await fetch(`${API_URL}/users/${currentId}`);

      if (response.ok) {
        const liveUser = await response.json();

        if (liveUser.isBanned) {
          setSessionMessage('A tua conta foi banida. Contacta o suporte para mais informações.');
          await clearSession();
          setSessionStatus('banned');
          return;
        }

        // Prefer a previously selected active profile if present
        const storedProfileStr = await AsyncStorage.getItem('activeProfile');
        if (storedProfileStr) {
          try {
            const stored = JSON.parse(storedProfileStr);
            // if stored profile is a pet or tutor, restore it; otherwise default
            if (stored && (stored.type === 'tutor' || stored.type === 'pet')) {
              // ensure tutor id defaults to current user when missing
              if (stored.type === 'tutor' && !stored.id) stored.id = currentId;
              setActiveProfile(stored);
            } else {
              setActiveProfile({ type: 'tutor', id: currentId });
            }
          } catch (err) {
            setActiveProfile({ type: 'tutor', id: currentId });
          }
        } else {
          setActiveProfile({ type: 'tutor', id: currentId });
        }
        setSessionStatus('ready');
        return;
      }

      setActiveProfile({ type: 'tutor', id: currentId });
      setSessionStatus('ready');
    } catch (error) {
      console.error("Erro ao carregar o utilizador da memória:", error);
      setSessionStatus('ready');
    }
  }, [API_URL, clearSession]);

  // Persist activeProfile changes to storage
  const persistSetActiveProfile = useCallback((profile: ActiveProfileType) => {
    setActiveProfile(profile);
    try {
      AsyncStorage.setItem('activeProfile', JSON.stringify(profile));
    } catch (err) {
      console.error('Erro ao guardar activeProfile:', err);
    }
  }, []);

  // Ao iniciar a app, vai à memória do telemóvel procurar o utilizador
  useEffect(() => {
    refreshStoredUser();
  }, [refreshStoredUser]);

  return (
    <ActiveProfileContext.Provider value={{ activeProfile, setActiveProfile: persistSetActiveProfile, sessionStatus, sessionMessage, refreshStoredUser, clearSession }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export const useActiveProfile = () => useContext(ActiveProfileContext);