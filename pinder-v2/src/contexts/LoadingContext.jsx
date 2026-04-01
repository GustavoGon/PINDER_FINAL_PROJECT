import React, { createContext, useState, useContext } from 'react';
import './css/Loading.css'; // CSS para o ecrã de carregamento global

// Cria o contexto
const LoadingContext = createContext();

// Hook personalizado para ser fácil de usar nos outros ficheiros
export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
      
      {/* Se isLoading for true, mostra este ecrã de carregamento por cima de tudo */}
      {isLoading && (
        <div className="global-loading-overlay">
          <div className="spinner"></div>
          <p className="loading-text">A processar...</p>
        </div>
      )}
    </LoadingContext.Provider>
  );
};