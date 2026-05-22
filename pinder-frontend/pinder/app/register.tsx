import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  Image
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useActiveProfile } from '../src/contexts/ActiveProfileContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [district, setDistrict] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [dob, setDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [districts, setDistricts] = useState<any[]>([]);
  
  const router = useRouter();
  const { setActiveProfile } = useActiveProfile();
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  // Carregar distritos ao abrir
  useEffect(() => {
    fetchDistricts();
  }, []);

  const fetchDistricts = async () => {
    try {
      const response = await fetch(`${API_URL}/districts`);
      if (response.ok) {
        const data = await response.json();
        setDistricts(data);
      }
    } catch (error) {
      console.error('Erro ao carregar distritos:', error);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Mantém a foto quadrada (tipo perfil)
      quality: 0.5, // Reduz o tamanho da imagem para não sobrecarregar o servidor
      base64: true, // Permite enviar a imagem diretamente via JSON
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setDob(selectedDate);
    }
  };

  const handleRegister = async () => {
    // Validação básica antes de enviar para o servidor
    if (password.length < 6) {
      setErrorMessage('A password tem de ter pelo menos 6 caracteres.');
      return;
    }

    if (!district) {
      setErrorMessage('Por favor seleciona um distrito.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      console.log(`A enviar registo para: ${API_URL}/users`);
      
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({ 
          username: username.trim(), 
          email: email.trim().toLowerCase(),
          password,
          district: district,
          dob: dob ? dob.toISOString() : null,
          photo: photo
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Conta criada com sucesso! A redirecionar...');

        const { password: _password, ...userWithoutPassword } = data;
        await AsyncStorage.setItem('user', JSON.stringify(userWithoutPassword));

        const userId = data.user_id || data.id;
        setActiveProfile({ type: 'tutor', id: userId });
        router.replace('/feedSwipe');
      } else {
        if (data.error === "User already exists") {
          setErrorMessage('Este email ou nome de utilizador já está em uso.');
        } else {
          setErrorMessage(data.error || 'Erro ao criar conta.');
        }
      }
    } catch (error) {
      console.error('Erro de ligação:', error);
      setErrorMessage('Não foi possível ligar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (  
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.loginBox}>
          <Text style={styles.logo}>Pinder</Text>
          <Text style={styles.subtitle}>Junta-te a nós e encontra amigos para o teu pet!</Text>
          
          <View style={styles.form}>
            {/* Selector de Foto de Perfil */}
            <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <FontAwesome5 name="camera" size={30} color="#ff9950" />
                  <Text style={styles.photoText}>Foto</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput 
              style={styles.inputField} 
              placeholder="Nome de Utilizador" 
              value={username}
              onChangeText={setUsername}
              autoCapitalize="words"
            />
            <TextInput 
              style={styles.inputField} 
              placeholder="Email" 
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput 
              style={styles.inputField} 
              placeholder="Password" 
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
            />

            {/* Selector de Data de Nascimento */}
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <FontAwesome5 name="calendar-alt" size={16} color="#ff9950" />
              <Text style={[styles.dateButtonText, !dob && { color: '#999' }]}>
                {dob ? dob.toLocaleDateString('pt-PT') : 'Data de Nascimento (Opcional)'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dob || new Date()}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={onChangeDate}
              />
            )}

            {/* Selector de Distrito */}
            <TouchableOpacity 
              style={styles.districtButton}
              onPress={() => setShowDistrictPicker(true)}
            >
              <FontAwesome5 name="map-marker-alt" size={16} color="#ff9950" />
              <Text style={[styles.districtButtonText, !district && { color: '#999' }]}>
                {district || 'Seleciona um distrito'}
              </Text>
              <FontAwesome5 name="chevron-down" size={14} color="#999" />
            </TouchableOpacity>

            {/* Modal do Picker de Distritos */}
            <Modal
              visible={showDistrictPicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowDistrictPicker(false)}
            >
              <View style={styles.pickerContainer}>
                {/* Fundo escuro que fecha o modal */}
                <TouchableOpacity 
                  style={StyleSheet.absoluteFill} 
                  activeOpacity={1} 
                  onPress={() => setShowDistrictPicker(false)}
                />
                
                <View style={styles.pickerContent}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowDistrictPicker(false)}>
                      <Text style={styles.pickerHeaderText}>Fechar</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Seleciona um Distrito</Text>
                    <View style={{ width: 50 }} />
                  </View>
                  
                  {/* Se a lista estiver vazia, mostramos o carregamento */}
                  {districts.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="large" color="#ff9950" />
                      <Text style={{ marginTop: 10, color: '#666' }}>A carregar distritos...</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={districts}
                      keyExtractor={(item, index) => index.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          style={[
                            styles.districtOption,
                            district === item.name && styles.districtOptionSelected
                          ]}
                          onPress={() => {
                            setDistrict(item.name);
                            setShowDistrictPicker(false);
                          }}
                        >
                          <Text style={[
                            styles.districtOptionText,
                            district === item.name && styles.districtOptionTextSelected
                          ]}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>
              </View>
            </Modal>
            
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
            
            {successMessage ? (
              <Text style={styles.successText}>{successMessage}</Text>
            ) : null}

            <TouchableOpacity 
              style={[styles.btnPrimary, isLoading && styles.btnDisabled]} 
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.btnPrimaryText}>
                {isLoading ? 'Aguarde...' : 'Criar Conta'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Já tens uma conta? </Text>
              <Link href="/" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Entrar aqui</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2EB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginBox: {
    width: '100%',
    alignItems: 'center',
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ff9950',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  inputField: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D6CEC3',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 25,
  },
  photoPreview: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#ff9950',
  },
  photoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D6CEC3',
    borderStyle: 'dashed',
  },
  photoText: {
    color: '#ff9950',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D6CEC3',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  districtButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D6CEC3',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  districtButtonText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '50%',
    width: '100%',
  },
  pickerHeader: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  pickerHeaderText: {
    color: '#ff9950',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  districtOption: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  districtOptionSelected: {
    backgroundColor: '#FFF3E0',
  },
  districtOptionText: {
    fontSize: 16,
    color: '#333',
  },
  districtOptionTextSelected: {
    color: '#ff9950',
    fontWeight: '600',
  },
  errorText: {
    color: '#ff4d4d',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  btnPrimary: {
    backgroundColor: '#ff9950',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: {
    backgroundColor: '#a89d93',
  },
  btnPrimaryText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  footerText: {
    color: '#666',
    fontSize: 15,
  },
  footerLink: {
    color: '#ff4b4b',
    fontSize: 15,
    fontWeight: 'bold',
  }
});