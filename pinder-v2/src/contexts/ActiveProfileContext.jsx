import React, { createContext, useState, useContext, useEffect } from 'react';

const ActiveProfileContext = createContext();

export function ActiveProfileProvider({ children }) {
  // O estado guarda o tipo ('tutor' ou 'pet') e o ID respetivo
  const [activeProfile, setActiveProfile] = useState({
    type: 'tutor', // Começa sempre como tutor por defeito
    id: null
  });

  // Ao iniciar a app, definimos o ID do tutor como ativo
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.user_id) {
      setActiveProfile({ type: 'tutor', id: user.user_id });
    }
  }, []);

  return (
    <ActiveProfileContext.Provider value={{ activeProfile, setActiveProfile }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export const useActiveProfile = () => useContext(ActiveProfileContext);