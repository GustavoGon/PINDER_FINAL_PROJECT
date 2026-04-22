import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ActiveProfileContext = createContext<any>(null);

export function ActiveProfileProvider({ children }: { children: React.ReactNode }) {
  const [activeProfile, setActiveProfile] = useState({
    type: 'tutor', 
    id: null
  });

  // Ao iniciar a app, vai à memória do telemóvel procurar o utilizador
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : {};
        
        // Usa o user_id 
        const currentId = user.user_id || user.id;
        
        console.log(`🔄 [Context] Carregando user: user_id=${user.user_id}, id=${user.id}, final_id=${currentId}`);
        
        if (currentId) {
          setActiveProfile({ type: 'tutor', id: currentId });
          console.log(`✅ [Context] activeProfile atualizado: { type: 'tutor', id: ${currentId} }`);
        } else {
          console.warn(`⚠️ [Context] Nenhum user_id encontrado`);
        }
      } catch (error) {
        console.error("❌ [Context] Erro ao carregar o utilizador da memória:", error);
      }
    };

    loadUser();
  }, []);

  return (
    <ActiveProfileContext.Provider value={{ activeProfile, setActiveProfile }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export const useActiveProfile = () => useContext(ActiveProfileContext);