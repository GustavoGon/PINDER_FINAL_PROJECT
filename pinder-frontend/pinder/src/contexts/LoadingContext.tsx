import React, { createContext, useState, useContext } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal } from 'react-native';

const LoadingContext = createContext<any>(null);

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
      
      {/* O Modal garante que este ecrã fica por cima de TUDO na app */}
      <Modal transparent={true} visible={isLoading} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.loadingBox}>
  
            <ActivityIndicator size="large" color="#5C4A3D" />
            <Text style={styles.text}>A processar...</Text>
          </View>
        </View>
      </Modal>
    </LoadingContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    marginTop: 15,
    fontSize: 16,
    color: '#5C4A3D',
    fontWeight: 'bold',
  }
});