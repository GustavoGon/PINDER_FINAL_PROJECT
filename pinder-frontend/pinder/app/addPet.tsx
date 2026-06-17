import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  Image, Switch, StyleSheet, Platform, KeyboardAvoidingView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import BottomNav from '../src/components/BottomNav';
import { useLoading } from '../src/contexts/LoadingContext';

export default function AddPet() {
  const router = useRouter();
  const { isLoading, setIsLoading } = useLoading();

  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [breedsList, setBreedsList] = useState<any[]>([]);

  const [speciesSearch, setSpeciesSearch] = useState('');
  const [showSpeciesList, setShowSpeciesList] = useState(false);

  const [breedSearch, setBreedSearch] = useState('');
  const [showBreedList, setShowBreedList] = useState(false);
  
  const [showGenderList, setShowGenderList] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [speciesId, setSpeciesId] = useState(''); 
  const [breedId, setBreedId] = useState('');     
  const [gender, setGender] = useState('Macho');
  const [size, setSize] = useState('');
  const [energy, setEnergy] = useState('3');
  const [description, setDescription] = useState('');
  const [forAdoption, setForAdoption] = useState(false);
  
  const [photoPreview, setPhotoPreview] = useState("https://images.unsplash.com/photo-1543466835-00a7907e9de1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80");
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  useEffect(() => {
    const fetchSpecies = async () => {
      try {
        const response = await fetch(`${API_URL}/species`);
        if (response.ok) setSpeciesList(await response.json());
      } catch (error) {
        console.error('Erro ao carregar espécies:', error);
      }
    };
    fetchSpecies();
  }, []);

  useEffect(() => {
    const fetchBreeds = async () => {
      if (!speciesId) {
        setBreedsList([]);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/breeds/species/${speciesId}`);
        if (response.ok) setBreedsList(await response.json());
      } catch (error) {
        console.error('Erro ao carregar raças:', error);
      }
    };
    fetchBreeds();
  }, [speciesId]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotoPreview(base64Img);
      setPhotoData(base64Img);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDob(selectedDate.toISOString());
  };

  const filteredSpecies = speciesList
    .filter(s => s.name.toLowerCase().includes(speciesSearch.toLowerCase()))
    .slice(0, 10);
  const selectedSpeciesName = speciesList.find(s => s.species_id === speciesId)?.name || '';

  const filteredBreeds = breedsList
    .filter(b => b.name.toLowerCase().includes(breedSearch.toLowerCase()))
    .slice(0, 10);
  const selectedBreedName = breedsList.find(b => b.breed_id === breedId)?.name || '';

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    if (!speciesId || !breedId) {
      setErrorMessage('Por favor, seleciona a Espécie e a Raça do teu pet.');
      return;
    }

    setIsLoading(true);

    try {
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};

      if (!user.user_id && !user.id) {
        setErrorMessage('Sessão inválida. Faz login novamente.');
        setIsLoading(false);
        return;
      }

      const userId = user.user_id || user.id;

      const response = await fetch(`${API_URL}/pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, user_id: userId, species_id: speciesId, breed_id: breedId,
          dob, gender, size, energy: parseInt(energy), description, forAdoption, photoData 
        }),
      });

      if (response.ok) {
        router.back(); 
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Erro ao adicionar o pet.');
      }
    } catch (error) {
      setErrorMessage('Não foi possível ligar ao servidor.');
      console.log('Erro ao adicionar pet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F5F2EB' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
              <FontAwesome5 name="arrow-left" size={20} color="#666" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <FontAwesome5 name="paw" size={20} color="#5C4A3D" />
              <Text style={styles.logoText}>Pinder</Text>
            </View>
            <View style={{ width: 30 }} /> 
          </View>
          <Text style={styles.pageSubtitle}>Adicionar Novo Pet</Text>
        </View>

        <View style={styles.content}>
          
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage}>
              <Image source={{ uri: photoPreview }} style={styles.avatarImage} />
              <View style={styles.cameraIcon}>
                <FontAwesome5 name="camera" size={14} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.formGrid}>
            
            <View style={styles.inputGroupFull}>
              <Text style={styles.label}>Nome do Pet</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Buddy" />
            </View>

            <View style={styles.inputGroupFull}>
              <Text style={styles.label}>Data de Nascimento</Text>
              <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowDatePicker(true)}>
                <Text style={[styles.innerInput, { color: dob ? '#333' : '#999' }]}>
                  {dob ? formatDate(dob) : "Selecionar Data..."}
                </Text>
                <FontAwesome5 name="calendar-alt" size={16} color="#999" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dob ? new Date(dob) : new Date()}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={onDateChange}
                />
              )}
            </View>

            <View style={styles.inputGroupFull}>
              <Text style={styles.label}>Espécie</Text>
              <View style={styles.inputWrapper}>
                <TextInput 
                  style={styles.innerInput}
                  placeholder="Pesquisar espécie..."
                  value={showSpeciesList ? speciesSearch : selectedSpeciesName}
                  onChangeText={(text) => {
                    setSpeciesSearch(text);
                    setShowSpeciesList(true);
                    setSpeciesId(''); setBreedId(''); setBreedSearch('');
                  }}
                  onFocus={() => { setShowSpeciesList(true); setShowBreedList(false); }}
                />
                <FontAwesome5 name="search" size={14} color="#999" />
              </View>
              {showSpeciesList && (
                <View style={styles.inlineList}>
                  {filteredSpecies.map((species) => (
                    <TouchableOpacity key={species.species_id} style={styles.listItem} onPress={() => { setSpeciesId(species.species_id); setSpeciesSearch(''); setShowSpeciesList(false); setBreedId(''); setBreedSearch(''); }}>
                      <Text>{species.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {filteredSpecies.length === 0 && <Text style={styles.emptyText}>Nenhuma espécie encontrada</Text>}
                </View>
              )}
            </View>

            <View style={styles.inputGroupFull}>
              <Text style={styles.label}>Raça</Text>
              <View style={styles.inputWrapper}>
                <TextInput 
                  style={styles.innerInput}
                  placeholder={!speciesId ? 'Primeiro escolhe a espécie' : 'Pesquisar raça...'}
                  editable={!!speciesId}
                  value={showBreedList ? breedSearch : selectedBreedName}
                  onChangeText={(text) => { setBreedSearch(text); setShowBreedList(true); setBreedId(''); }}
                  onFocus={() => { setShowBreedList(true); setShowSpeciesList(false); }}
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
                  {filteredBreeds.length === 0 && <Text style={styles.emptyText}>Nenhuma raça encontrada</Text>}
                </View>
              )}
            </View>

            <View style={styles.rowGrid}>
              <View style={styles.colHalf}>
                <Text style={styles.label}>Gênero</Text>
                <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowGenderList(!showGenderList)}>
                  <Text style={styles.innerInput}>{gender}</Text>
                  <FontAwesome5 name="chevron-down" size={12} color="#999" />
                </TouchableOpacity>
                {showGenderList && (
                  <View style={[styles.inlineList, { position: 'absolute', top: 75, width: '100%', zIndex: 10 }]}>
                    <TouchableOpacity style={styles.listItem} onPress={() => { setGender('Macho'); setShowGenderList(false); }}><Text>Macho</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.listItem} onPress={() => { setGender('Fêmea'); setShowGenderList(false); }}><Text>Fêmea</Text></TouchableOpacity>
                  </View>
                )}
              </View>
              <View style={styles.colHalf}>
                <Text style={styles.label}>Tamanho</Text>
                <TextInput style={styles.input} value={size} onChangeText={setSize} placeholder="Ex: Médio" />
              </View>
            </View>

            <View style={styles.inputGroupFull}>
              <Text style={styles.label}>Nível de Energia (1 a 5)</Text>
              <TextInput 
                style={styles.input} value={energy} onChangeText={setEnergy} 
                keyboardType="numeric" maxLength={1} placeholder="Ex: 3" 
              />
            </View>

            <View style={styles.inputGroupFull}>
              <Text style={styles.label}>Descrição</Text>
              <TextInput 
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
                value={description} onChangeText={setDescription} 
                placeholder="Conta-nos um pouco sobre o teu pet..." multiline
              />
            </View>

            <View style={styles.switchContainer}>
              <View style={{ flex: 1, paddingRight: 15 }}>
                <Text style={styles.switchTitle}>Disponível para Adoção</Text>
                <Text style={styles.switchSubtitle}>Ative esta opção se procura uma nova família para este pet.</Text>
              </View>
              <Switch trackColor={{ false: "#ccc", true: "#5C4A3D" }} thumbColor="white" onValueChange={setForAdoption} value={forAdoption} />
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.btnSave} onPress={handleSubmit} disabled={isLoading}>
                <Text style={styles.btnSaveText}>{isLoading ? 'A Guardar...' : 'Adicionar Pet'}</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </ScrollView>

      <BottomNav activePage="profile" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btnBack: { padding: 5 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 20, fontWeight: 'bold', color: '#5C4A3D' },
  pageSubtitle: { color: '#5C4A3D', fontSize: 18, marginTop: 15, fontWeight: 'bold', textAlign: 'center' },
  content: { paddingHorizontal: 20 },
  
  avatarSection: { alignItems: 'center', marginVertical: 20 },
  avatarWrapper: { width: 130, height: 130, borderRadius: 65, borderWidth: 4, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 65 },
  cameraIcon: { position: 'absolute', bottom: 5, left: 15, backgroundColor: '#5C4A3D', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  
  formGrid: { width: '100%', zIndex: 1 },
  rowGrid: { flexDirection: 'row', gap: 15, width: '100%', marginBottom: 15, zIndex: 2 },
  colHalf: { flex: 1, zIndex: 3 },
  inputGroupFull: { width: '100%', marginBottom: 15, zIndex: 1 },
  label: { fontSize: 13, color: '#5C4A3D', marginBottom: 6, fontWeight: '500' },
  input: { width: '100%', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#D6CEC3', backgroundColor: 'white', fontSize: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D6CEC3', borderRadius: 12, backgroundColor: 'white', paddingRight: 15 },
  innerInput: { flex: 1, padding: 15, fontSize: 16 },
  
  inlineList: { backgroundColor: 'white', borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginTop: 4, maxHeight: 150 },
  listItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  emptyText: { padding: 12, color: '#999', fontStyle: 'italic' },
  
  switchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 16, marginTop: 5, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  switchTitle: { fontSize: 16, fontWeight: 'bold', color: '#5C4A3D', marginBottom: 4 },
  switchSubtitle: { fontSize: 12, color: '#888', lineHeight: 16 },
  
  actionsContainer: { marginTop: 25, marginBottom: 20 },
  errorText: { color: '#ff4d4d', textAlign: 'center', marginVertical: 10, fontSize: 14, fontWeight: 'bold' },
  btnSave: { width: '100%', padding: 16, borderRadius: 30, backgroundColor: '#5C4A3D', alignItems: 'center' },
  btnSaveText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});