import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView 
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useActiveProfile } from "../contexts/ActiveProfileContext";

interface PetSelectionPopupProps {
  visible: boolean;
  onClose: () => void;
}

export default function PetSelectionPopup({ visible, onClose }: PetSelectionPopupProps) {
  const [pets, setPets] = useState<any[]>([]);
  const [tutorData, setTutorData] = useState<any>(null);
  const [user, setUser] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { activeProfile, setActiveProfile } = useActiveProfile();

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  useEffect(() => {
    // Só fazemos o fetch se o popup estiver aberto!
    if (!visible) return;

    const fetchDados = async () => {
      // 🧹 A MAGIA ESTÁ AQUI: Limpar os dados antigos antes de começar!
      setIsLoading(true);
      setError(null);
      setTutorData(null);
      setPets([]);
      setUser({});

      try {
        // 1. Vai buscar o utilizador à memória do telemóvel primeiro
        const userStr = await AsyncStorage.getItem("user");
        if (!userStr) {
          setError("Sessão inválida. Por favor, faz login novamente.");
          setIsLoading(false);
          return;
        }
        
        const currentUser = JSON.parse(userStr);
        setUser(currentUser);
        const userId = currentUser.user_id || currentUser.id;

        // 2. Vai buscar os pets
        const petsResponse = await fetch(`${API_URL}/pets/user/${userId}`);
        if (!petsResponse.ok) throw new Error("Falha ao procurar os pets.");
        const petsData = await petsResponse.json();
        setPets(petsData);

        // 3. Vai buscar a foto atualizada do Tutor
        const userResponse = await fetch(`${API_URL}/users/${userId}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setTutorData(userData);
        }

      } catch (err) {
        setError("Não foi possível carregar os perfis.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDados();
  }, [visible]); // Reage sempre que a visibilidade muda

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose} // Para o botão de "Voltar" do Android fechar o popup
    >
      {/* O overlay escuro que fecha o popup se clicarmos fora */}
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
    
        <TouchableOpacity style={styles.popupContent} activeOpacity={1}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Os Seus Animais{"\n"}de Estimação</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <FontAwesome5 name="times" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            
            {/* PERFIL DO TUTOR */}
            <TouchableOpacity
              style={[
                styles.petItem, 
                styles.tutorItem,
                activeProfile.type === "tutor" && styles.petActive
              ]}
              onPress={() => {
                const tutorId = user.user_id || user.id;
                console.log(`🔀 [PetSelectionPopup] Selecionando tutor: user_id=${user.user_id}, id=${user.id}, final_id=${tutorId}`);
                setActiveProfile({ type: 'tutor', id: tutorId });
                onClose();
              }}
            >
              <Image
                source={{ uri: tutorData?.photo || "https://placehold.co/400x400/eeeeee/999999?text=Sem+Foto" }}
                style={styles.avatar}
              />
              <View style={styles.info}>
                <Text style={styles.name}>{tutorData?.username || user.username || "Tutor"}</Text>
                <Text style={styles.breed}>O meu perfil</Text>
              </View>
              {activeProfile.type === "tutor" && (
                <View style={styles.badge}><Text style={styles.badgeText}>Ativo</Text></View>
              )}
            </TouchableOpacity>

            {/* LISTA DE PETS */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#5C4A3D" />
                <Text style={styles.loadingText}>A carregar patas... 🐾</Text>
              </View>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : pets.length === 0 ? (
              <Text style={styles.emptyText}>Ainda não adicionaste nenhum pet.</Text>
            ) : (
              pets.map((pet) => {
                const isActive = activeProfile.type === "pet" && activeProfile.id === pet.pet_id;
                
                return (
                  <TouchableOpacity
                    key={pet.pet_id}
                    style={[styles.petItem, isActive && styles.petActive]}
                    onPress={() => {
                      setActiveProfile({ type: 'pet', id: pet.pet_id });
                      onClose();
                    }}
                  >
                    <Image
                      source={{ uri: pet.main_photo || "https://placehold.co/400x400/eeeeee/999999?text=Sem+Foto" }}
                      style={styles.avatar}
                    />
                    <View style={styles.info}>
                      <Text style={styles.name}>{pet.name}</Text>
                      <Text style={styles.breed}>{pet.breed?.name || "Raça não definida"}</Text>
                    </View>
                    {isActive && (
                      <View style={styles.badge}><Text style={styles.badgeText}>Ativo</Text></View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* BOTÃO ADICIONAR NOVO PET */}
          <TouchableOpacity 
            style={styles.btnAdd} 
            onPress={() => {
              onClose();
              router.push("/addPet"); 
            }}
          >
            <Text style={styles.btnAddText}>Adicionar Novo Pet</Text>
            <FontAwesome5 name="plus" size={14} color="#5C4A3D" />
          </TouchableOpacity>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  popupContent: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5C4A3D',
    lineHeight: 28,
  },
  closeButton: {
    padding: 5,
    backgroundColor: '#F5F2EB',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    maxHeight: 300, 
  },
  petItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  tutorItem: {
    borderBottomWidth: 2,
    borderBottomColor: '#F5F2EB',
    borderStyle: 'dashed',
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    marginBottom: 15,
    paddingBottom: 15,
  },
  petActive: {
    backgroundColor: '#F5F2EB',
    borderColor: '#D6CEC3',
    borderWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: '#eee',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  breed: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#5C4A3D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: '#ff4d4d',
    textAlign: 'center',
    padding: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  btnAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F2EB',
    padding: 15,
    borderRadius: 20,
    marginTop: 15,
    gap: 8,
  },
  btnAddText: {
    color: '#5C4A3D',
    fontWeight: 'bold',
    fontSize: 15,
  }
});