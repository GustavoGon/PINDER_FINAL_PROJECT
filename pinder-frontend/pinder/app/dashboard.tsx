import React, { useEffect, useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  Image, Modal, Switch, StyleSheet, Platform, KeyboardAvoidingView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';


import { useActiveProfile } from '../src/contexts/ActiveProfileContext';
import BottomNav from '../src/components/BottomNav';

const distritosPortugal = [
  "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra", "Évora", 
  "Faro", "Guarda", "Leiria", "Lisboa", "Portalegre", "Porto", "Santarém", 
  "Setúbal", "Viana do Castelo", "Vila Real", "Viseu", 
  "Região Autónoma dos Açores", "Região Autónoma da Madeira"
];

export default function DashboardTutor() {
  const router = useRouter();
  const { activeProfile, setActiveProfile } = useActiveProfile();
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [newExtraPhotos, setNewExtraPhotos] = useState<string[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<number[]>([]); 
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null); 
  const [newAvatarPhoto, setNewAvatarPhoto] = useState<string | null>(null);

  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [breedsList, setBreedsList] = useState<any[]>([]);
  const [speciesId, setSpeciesId] = useState('');
  const [breedId, setBreedId] = useState('');
  
  const [showBreedList, setShowBreedList] = useState(false);
  const [breedSearch, setBreedSearch] = useState('');
  const [showLocationList, setShowLocationList] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [showSpeciesList, setShowSpeciesList] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);

// Função para lidar com a escolha da data
const onDateChange = (event: any, selectedDate?: Date) => {
  if (Platform.OS === 'android') {
    setShowDatePicker(false);
  }
  
  if (selectedDate) {
    // Guarda a data no mesmo formato adequado para o backend
    handleChangeText('dob', selectedDate.toISOString());
  }
};

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  const filteredDistritos = distritosPortugal.filter(distrito => 
    distrito.toLowerCase().includes(locationSearch.toLowerCase())
  );
  const filteredBreeds = breedsList.filter(breed => 
    breed.name.toLowerCase().includes(breedSearch.toLowerCase())
  );
  const selectedBreedName = breedsList.find(b => b.breed_id === breedId)?.name || '';
  const selectedSpeciesName = speciesList.find(s => s.species_id === speciesId)?.name || '';

  useEffect(() => {
    const fetchProfile = async () => {

      if (!activeProfile?.id) {
        setIsLoading(false);
        setProfileData(null);
        return;
      }

      setIsLoading(true);
      setProfileData(null);
      setSpeciesId('');
      setBreedId('');
      setSpeciesSearch('');
      setBreedSearch('');
      setLocationSearch('');
      
      setSaveMessage('');
      setNewExtraPhotos([]); 
      setPhotosToDelete([]); 
      setSelectedPhoto(null);
      setNewAvatarPhoto(null); 

      try {
        const resSpecies = await fetch(`${API_URL}/species`);
        if (resSpecies.ok) {
          const dataSpecies = await resSpecies.json();
          setSpeciesList(dataSpecies);
        }

        if (activeProfile.type === 'tutor') {
          const userStr = await AsyncStorage.getItem('user');
          const userFromStorage = userStr ? JSON.parse(userStr) : {};
          const correctUserId = userFromStorage.user_id || userFromStorage.id;
          
          const userIdToFetch = activeProfile.id === correctUserId ? activeProfile.id : correctUserId;
          
          const response = await fetch(`${API_URL}/users/${userIdToFetch}`);
          if (response.ok) {
            const data = await response.json();
            setProfileData({ ...data, name: data.username });
          } else {
            setProfileData({ ...userFromStorage, name: userFromStorage.username }); 
          }
        } else if (activeProfile.type === 'pet' && activeProfile.id) {
          const response = await fetch(`${API_URL}/pets/${activeProfile.id}`);
          if (response.ok) {
            const data = await response.json();
            setProfileData(data);
            setSpeciesId(data.species_id || '');
            setBreedId(data.breed_id || '');
          }
        }
      } catch (error) {
        console.error("❌ Erro ao carregar perfil:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [activeProfile?.id, activeProfile?.type, refreshTrigger]);

  useEffect(() => {
    if (speciesId) {
      const fetchBreeds = async () => {
        try {
          const response = await fetch(`${API_URL}/breeds/species/${speciesId}`);
          if (response.ok) setBreedsList(await response.json());
        } catch (error) {
          console.error("Erro ao carregar raças:", error);
        }
      };
      fetchBreeds();
    } else {
      setBreedsList([]);
    }
  }, [speciesId]);

  const handleLogout = async () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await AsyncStorage.removeItem('user');
    setActiveProfile({ type: 'tutor', id: null });
    router.replace('/'); 
  };

  const handleChangeText = (name: string, value: string) => {
    setProfileData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name: string, value: boolean) => {
    setProfileData((prev: any) => ({ ...prev, [name]: value }));
  };

  // --- LÓGICA DE FOTOS ---
  const pickAvatarImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Permite cortar a foto num quadrado perfeito
      aspect: [1, 1],
      quality: 0.5, // Reduz o peso da imagem para o backend
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setNewAvatarPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const pickExtraPhoto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setNewExtraPhotos(prev => [...prev, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };
  // ------------------------------------

  const handleRemoveNewPhoto = (indexToRemove: number) => setNewExtraPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
  
  const handleRemoveExistingPhoto = (photoId: number) => {
    if (!photoId) return; 
    setPhotosToDelete(prev => [...prev, photoId]);
    setProfileData((prev: any) => ({ ...prev, photos: prev.photos.filter((p: any) => (p.id || p.photo_id || p.pet_photo_id) !== photoId) }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      if (activeProfile.type === 'tutor') {
        const payload = {
          username: profileData.name, 
          dob: profileData.dob ? new Date(profileData.dob).toISOString() : null,
          location: profileData.location, 
          photo: newAvatarPhoto || profileData.photo 
        };

        const response = await fetch(`${API_URL}/users/${activeProfile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const updatedUser = await response.json();
          setSaveMessage('Perfil atualizado com sucesso!');
          setNewAvatarPhoto(null);
          
          const userStr = await AsyncStorage.getItem('user');
          const localUser = userStr ? JSON.parse(userStr) : {};
          await AsyncStorage.setItem('user', JSON.stringify({ ...localUser, username: updatedUser.user.username }));
          setRefreshTrigger(prev => prev + 1);
        } else {
          setSaveMessage('Erro ao atualizar perfil.');
        }

      } else {
        const payload = {
          name: profileData.name,
          dob: profileData.dob ? new Date(profileData.dob).toISOString() : null,
          gender: profileData.gender,
          size: profileData.size,
          energy: parseInt(profileData.energy),
          description: profileData.description,
          forAdoption: profileData.forAdoption,
          species_id: speciesId, 
          breed_id: breedId,     
          main_photo: newAvatarPhoto || profileData.main_photo, 
          new_gallery_photos: newExtraPhotos, 
          deleted_photo_ids: photosToDelete 
        };

        const response = await fetch(`${API_URL}/pets/${activeProfile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          setSaveMessage('Pet atualizado com sucesso!');
          setNewAvatarPhoto(null);
          setNewExtraPhotos([]); 
          setPhotosToDelete([]);
          setRefreshTrigger(prev => prev + 1); 
        } else {
          setSaveMessage('Erro ao atualizar o pet.');
        }
      }
    } catch (error) {
      setSaveMessage('Erro de ligação ao servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeletePet = async () => {
    setShowDeleteModal(false);
    setIsSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch(`${API_URL}/pets/${activeProfile.id}`, {
        method: 'DELETE', 
      });

      if (response.ok) {
        const userStr = await AsyncStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : {};
        setActiveProfile({ type: 'tutor', id: user.user_id || user.id });
        router.replace('/feedSwipe');
      } else {
        setSaveMessage('Erro ao apagar o pet.');
      }
    } catch (error) {
      setSaveMessage('Erro de ligação ao servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split('T')[0];
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F2EB', position: 'relative' }}>
        <View style={styles.loadingCenter}><Text>A carregar perfil... 🐾</Text></View>
        <BottomNav activePage="profile" />
      </View>
    );
  }
  if (!profileData) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F2EB', position: 'relative' }}>
        <View style={styles.loadingCenter}><Text>Nenhum perfil encontrado.</Text></View>
        <BottomNav activePage="profile" />
      </View>
    );
  }

  

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#F5F2EB' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Modal visible={showLogoutModal} transparent={true} animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.iconCircleError}>
              <FontAwesome5 name="sign-out-alt" size={24} color="#ff4d4d" />
            </View>
            <Text style={styles.modalTitle}>Terminar sessão?</Text>
            <Text style={styles.modalText}>
              Tens a certeza que queres sair da conta?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnDelete} onPress={confirmLogout}>
                <Text style={styles.btnDeleteText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* MODAL DE APAGAR PET */}
        <Modal visible={showDeleteModal} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.iconCircleError}>
                <FontAwesome5 name="times" size={24} color="#ff4d4d" />
              </View>
              <Text style={styles.modalTitle}>Apagar Pet?</Text>
              <Text style={styles.modalText}>
                Tens a certeza que queres apagar este pet? Todas as fotos e dados serão perdidos. Esta ação não pode ser desfeita!
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setShowDeleteModal(false)}>
                  <Text style={styles.btnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDelete} onPress={confirmDeletePet}>
                  <Text style={styles.btnDeleteText}>Sim, Apagar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL DE VER FOTO */}
        <Modal visible={!!selectedPhoto} transparent={true} animationType="fade">
          <View style={styles.modalOverlayDark}>
            <TouchableOpacity style={styles.btnClosePhoto} onPress={() => setSelectedPhoto(null)}>
              <FontAwesome5 name="times" size={20} color="white" />
            </TouchableOpacity>
            {selectedPhoto && <Image source={{ uri: selectedPhoto }} style={styles.fullScreenImage} />}
          </View>
        </Modal>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ width: 34 }} /> 
            <View style={styles.logoContainer}>
              <FontAwesome5 name="paw" size={20} color="#5C4A3D" />
              <Text style={styles.logoText}>Pinder</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={{ padding: 5 }}>
              <FontAwesome5 name="sign-out-alt" size={22} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.pageSubtitle}>
            {activeProfile.type === 'tutor' ? 'Editar Perfil Tutor' : 'Editar Perfil do Pet'}
          </Text>
        </View>

        {/* CONTEÚDO PRINCIPAL */}
        <View style={styles.content}>
          
          {/* FOTO PRINCIPAL */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={pickAvatarImage}>
              <Image 
                source={{ uri: newAvatarPhoto || profileData.main_photo || profileData.photo || "https://placehold.co/400x400/eeeeee/999999?text=Sem+Foto" }} 
                style={styles.avatarImage}
              />
              <View style={styles.cameraIcon}>
                <FontAwesome5 name="camera" size={14} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          {/* GALERIA (SÓ PARA PETS) */}
          {activeProfile.type === 'pet' && (
            <View style={styles.gallerySection}>
              <Text style={styles.label}>Galeria de Fotos do Pet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                
                {profileData.photos && profileData.photos.map((p: any, index: number) => {
                  const currentId = p.id || p.photo_id || p.pet_photo_id; 
                  const isMain = newAvatarPhoto ? newAvatarPhoto === p.url : profileData.main_photo === p.url;
                  return (
                    <View key={currentId || `old-${index}`} style={[styles.galleryItem, isMain && styles.galleryItemMain]}>
                      <TouchableOpacity onPress={() => setSelectedPhoto(p.url)}>
                        <Image source={{ uri: p.url }} style={styles.galleryImage} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveExistingPhoto(currentId)} style={styles.btnRemovePhoto}>
                        <FontAwesome5 name="times" size={10} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setNewAvatarPhoto(p.url)} style={[styles.btnStarPhoto, isMain && { backgroundColor: '#5C4A3D' }]}>
                        <FontAwesome5 name="star" size={10} color="white" solid={isMain} />
                      </TouchableOpacity>
                    </View>
                  )
                })}

                {newExtraPhotos.map((photo, index) => {
                   const isMain = newAvatarPhoto === photo;
                   return (
                    <View key={`new-${index}`} style={[styles.galleryItem, isMain && styles.galleryItemMain]}>
                      <TouchableOpacity onPress={() => setSelectedPhoto(photo)}>
                        <Image source={{ uri: photo }} style={styles.galleryImage} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveNewPhoto(index)} style={styles.btnRemovePhoto}>
                        <FontAwesome5 name="times" size={10} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setNewAvatarPhoto(photo)} style={[styles.btnStarPhoto, isMain && { backgroundColor: '#5C4A3D' }]}>
                        <FontAwesome5 name="star" size={10} color="white" solid={isMain} />
                      </TouchableOpacity>
                    </View>
                   )
                })}

                <TouchableOpacity style={styles.btnAddPhoto} onPress={pickExtraPhoto}>
                  <FontAwesome5 name="plus" size={20} color="#5C4A3D" />
                </TouchableOpacity>

              </ScrollView>
            </View>
          )}

          {/* FORMULÁRIO */}
          <View style={styles.formGrid}>
            
            <View style={styles.inputGroupFull}>
              <Text style={styles.label}>Nome do {activeProfile.type === 'pet' ? 'Pet' : 'Tutor'}</Text>
              <TextInput style={styles.input} value={profileData.name || ''} onChangeText={(text) => handleChangeText('name', text)} placeholder="Ex: Buddy" />
            </View>

            <View style={styles.inputGroupFull}>
  <Text style={styles.label}>Data de Nascimento</Text>
  
  <TouchableOpacity 
    style={styles.inputWrapper} 
    onPress={() => setShowDatePicker(true)}
  >
    <Text style={[styles.innerInput, { color: profileData.dob ? '#333' : '#999' }]}>
      {profileData.dob ? formatDate(profileData.dob) : "Selecionar Data..."}
    </Text>
    <FontAwesome5 name="calendar-alt" size={16} color="#999" />
  </TouchableOpacity>

  {/* O Calendário Nativo em si */}
  {showDatePicker && (
    <DateTimePicker
      value={profileData.dob ? new Date(profileData.dob) : new Date()}
      mode="date"
      display="default" // Usa o design padrão do iOS ou do Android automaticamente
      maximumDate={new Date()} // Impede que o utilizador escolha uma data no futuro
      onChange={onDateChange}
    />
  )}
</View>

            {/* TUTOR - DISTRITO */}
            {activeProfile.type === 'tutor' && (
              <View style={styles.inputGroupFull}>
                <Text style={styles.label}>Localização (Distrito)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput 
                    style={styles.innerInput}
                    placeholder="Pesquisar distrito..."
                    value={showLocationList ? locationSearch : (profileData.location || '')}
                    onChangeText={(text) => { setLocationSearch(text); setShowLocationList(true); }}
                    onFocus={() => { setShowLocationList(true); setLocationSearch(''); }}
                  />
                  <FontAwesome5 name="search" size={14} color="#999" />
                </View>
                {showLocationList && (
                  <View style={styles.inlineList}>
                    {filteredDistritos.map(distrito => (
                      <TouchableOpacity key={distrito} style={styles.listItem} onPress={() => { setProfileData((prev:any) => ({ ...prev, location: distrito })); setLocationSearch(''); setShowLocationList(false); }}>
                        <Text>{distrito}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* PET - ESPECIE E RAÇA */}
            {activeProfile.type === 'pet' && (
              <>
                <View style={styles.inputGroupFull}>
                  <Text style={styles.label}>Espécie</Text>
                  <View style={styles.inputWrapper}>
                     <TextInput 
                      style={styles.innerInput}
                      placeholder="Escolher espécie..."
                      value={showSpeciesList ? '' : selectedSpeciesName}
                      onFocus={() => setShowSpeciesList(true)}
                    />
                    <FontAwesome5 name="chevron-down" size={14} color="#999" />
                  </View>
                  {showSpeciesList && (
                    <View style={styles.inlineList}>
                      {speciesList.map((species) => (
                        <TouchableOpacity key={species.species_id} style={styles.listItem} onPress={() => { setSpeciesId(species.species_id); setBreedId(''); setShowSpeciesList(false); }}>
                          <Text>{species.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.inputGroupFull}>
                  <Text style={styles.label}>Raça</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput 
                      style={styles.innerInput}
                      placeholder={!speciesId ? 'Escolha a espécie...' : 'Pesquisar raça...'}
                      editable={!!speciesId}
                      value={showBreedList ? breedSearch : selectedBreedName}
                      onChangeText={(text) => { setBreedSearch(text); setShowBreedList(true); setBreedId(''); }}
                      onFocus={() => setShowBreedList(true)}
                    />
                    <FontAwesome5 name="search" size={14} color="#999" />
                  </View>
                  {showBreedList && speciesId && (
                    <View style={styles.inlineList}>
                      {filteredBreeds.map((breed) => (
                        <TouchableOpacity key={breed.breed_id} style={styles.listItem} onPress={() => { setBreedId(breed.breed_id); setBreedSearch(''); setShowBreedList(false); }}>
                          <Text>{breed.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* GÉNERO E TAMANHO (LADO A LADO) */}
                <View style={styles.rowGrid}>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Gênero</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput 
                        style={styles.innerInput} 
                        value={profileData.gender || "Macho"} 
                        onChangeText={(text) => handleChangeText('gender', text)} 
                        placeholder="Macho/Fêmea" 
                      />
                    </View>
                  </View>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Tamanho</Text>
                    <TextInput style={styles.input} value={profileData.size || ''} onChangeText={(text) => handleChangeText('size', text)} placeholder="Ex: Grande" />
                  </View>
                </View>

                {/* ENERGIA */}
                <View style={styles.inputGroupFull}>
                  <Text style={styles.label}>Nível de Energia (1 a 5)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={String(profileData.energy || 3)} 
                    onChangeText={(text) => handleChangeText('energy', text)} 
                    keyboardType="numeric"
                    maxLength={1}
                  />
                </View>

                {/* DESCRIÇÃO */}
                <View style={styles.inputGroupFull}>
                  <Text style={styles.label}>Descrição</Text>
                  <TextInput 
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
                    value={profileData.description || ''} 
                    onChangeText={(text) => handleChangeText('description', text)} 
                    placeholder="Conta-nos um pouco sobre o teu pet..."
                    multiline
                  />
                </View>

                {/* SWITCH DE ADOÇÃO NATIVO */}
                <View style={styles.switchContainer}>
                  <View style={{ flex: 1, paddingRight: 15 }}>
                    <Text style={styles.switchTitle}>Disponível para Adoção</Text>
                    <Text style={styles.switchSubtitle}>Ative esta opção se procura uma nova família para este pet.</Text>
                  </View>
                  <Switch 
                    trackColor={{ false: "#ccc", true: "#5C4A3D" }}
                    thumbColor="white"
                    onValueChange={(val) => handleToggle('forAdoption', val)}
                    value={profileData.forAdoption || false}
                  />
                </View>
              </>
            )}

            {/* MENSAGEM DE ERRO/SUCESSO */}
            {saveMessage ? (
              <Text style={[styles.messageText, { color: saveMessage.includes('Erro') ? '#ff4d4d' : '#4CAF50' }]}>
                {saveMessage}
              </Text>
            ) : null}

            {/* BOTÕES FINAIS */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={isSaving}>
                <Text style={styles.btnSaveText}>{isSaving ? 'A guardar...' : 'Salvar Alterações'}</Text>
              </TouchableOpacity>

              {activeProfile.type === 'pet' && (
                <TouchableOpacity style={styles.btnDeleteOutline} onPress={() => setShowDeleteModal(true)} disabled={isSaving}>
                  <Text style={styles.btnDeleteOutlineText}>Apagar Pet</Text>
                </TouchableOpacity>
              )}
            </View>

          </View>
        </View>
      </ScrollView>

      {/* BOTTOM NAV */}
      <BottomNav activePage="profile" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F2EB' },
  header: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 20, fontWeight: 'bold', color: '#5C4A3D' },
  pageSubtitle: { color: '#5C4A3D', fontSize: 18, marginTop: 15, fontWeight: 'bold', textAlign: 'center' },
  content: { paddingHorizontal: 20 },
  
  // Avatar
  avatarSection: { alignItems: 'center', marginVertical: 20 },
  avatarWrapper: { width: 130, height: 130, borderRadius: 65, borderWidth: 4, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 65 },
  cameraIcon: { position: 'absolute', bottom: 5, left: 15, backgroundColor: '#5C4A3D', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  
  // Galeria
  gallerySection: { marginBottom: 20 },
  galleryScroll: { paddingBottom: 10, gap: 12 },
  galleryItem: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#D6CEC3' },
  galleryItemMain: { borderWidth: 2, borderColor: '#5C4A3D' },
  galleryImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  btnRemovePhoto: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  btnStarPhoto: { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  btnAddPhoto: { width: 64, height: 64, borderRadius: 12, borderWidth: 1, borderColor: '#D6CEC3', alignItems: 'center', justifyContent: 'center' },
  
  // Inputs
  formGrid: { width: '100%' },
  rowGrid: { flexDirection: 'row', gap: 15, width: '100%', marginBottom: 15 },
  colHalf: { flex: 1 },
  inputGroupFull: { width: '100%', marginBottom: 15 },
  label: { fontSize: 13, color: '#5C4A3D', marginBottom: 6, fontWeight: '500' },
  input: { width: '100%', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#D6CEC3', backgroundColor: 'white', fontSize: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D6CEC3', borderRadius: 12, backgroundColor: 'white', paddingRight: 15 },
  innerInput: { flex: 1, padding: 15, fontSize: 16 },
  
  // Listas suspensas (Dropdown simulado)
  inlineList: { backgroundColor: 'white', borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginTop: 4, maxHeight: 150 },
  listItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  
  // Switch
  switchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 16, marginTop: 5, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  switchTitle: { fontSize: 16, fontWeight: 'bold', color: '#5C4A3D', marginBottom: 4 },
  switchSubtitle: { fontSize: 12, color: '#888', lineHeight: 16 },
  
  // Botoes
  actionsContainer: { marginTop: 25, gap: 12 },
  messageText: { textAlign: 'center', marginVertical: 10, fontWeight: 'bold', fontSize: 16 },
  btnSave: { width: '100%', padding: 16, borderRadius: 30, backgroundColor: '#5C4A3D', alignItems: 'center' },
  btnSaveText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  btnDeleteOutline: { width: '100%', padding: 16, borderRadius: 30, borderWidth: 2, borderColor: '#ff4d4d', alignItems: 'center' },
  btnDeleteOutlineText: { color: '#ff4d4d', fontSize: 16, fontWeight: 'bold' },
  
  // Modais
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '100%', maxWidth: 340, alignItems: 'center' },
  iconCircleError: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ffe6e6', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  modalText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 25, lineHeight: 20 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  btnCancel: { flex: 1, padding: 14, borderRadius: 30, backgroundColor: '#f0f0f0', alignItems: 'center' },
  btnCancelText: { color: '#333', fontWeight: 'bold' },
  btnDelete: { flex: 1, padding: 14, borderRadius: 30, backgroundColor: '#ff4d4d', alignItems: 'center' },
  btnDeleteText: { color: 'white', fontWeight: 'bold' },
  
  modalOverlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  btnClosePhoto: { position: 'absolute', top: 40, right: 20, backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 20 },
  fullScreenImage: { width: '90%', height: '80%', resizeMode: 'contain' }
});