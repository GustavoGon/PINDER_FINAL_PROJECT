import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const router = useRouter(); 

  // Vai buscar a variável global, ou usa um valor de segurança caso o .env falhe
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  const handleLogin = async () => {
    setErrorMessage('');

    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Login com sucesso!', data.user);
        
        const { photo, ...userWithoutPhoto } = data.user;
        
        // Guarda o utilizador usando a memória do telemóvel
        await AsyncStorage.setItem('user', JSON.stringify(userWithoutPhoto));

        // Redireciona para a página principal
        router.push('/feedSwipe'); 
      } else {
        setErrorMessage(data.error || 'Erro ao iniciar sessão.');
      }
    } catch (error) {
      console.error('Erro de ligação:', error);
      setErrorMessage(`Não foi possível ligar ao servidor (${API_URL}). Verifica se o backend está a correr e se o IP está correto.`);
    }
  };

  return (  
    // O KeyboardAvoidingView garante que o ecrã sobe quando o teclado abre
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.loginBox}>
        <Text style={styles.logo}>Pinder</Text>
        <Text style={styles.subtitle}>Encontre o amigo perfeito para o seu pet.</Text>
        
        <View style={styles.form}>
          <TextInput 
            style={styles.inputField} 
            placeholder="Email" 
            value={email}
            onChangeText={setEmail} 
            keyboardType="email-address" // Abre o teclado com o "@" e o ".com" mais acessíveis
            autoCapitalize="none" // Impede que o telemóvel ponha a primeira letra maiúscula
          />
          <TextInput 
            style={styles.inputField} 
            placeholder="Password" 
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true} // Esconde as letras como password (substitui o type="password")
          />
          
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

        
          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin}>
            <Text style={styles.btnPrimaryText}>Entrar</Text>
          </TouchableOpacity>
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Ainda não tens conta? </Text>

            <Link href="/register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Regista-te</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2EB', // Fundo principal da tua app
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
  },
  form: {
    width: '100%',
    maxWidth: 400, // Previne que fique gigante num iPad/Tablet
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
  errorText: {
    color: '#ff4b4b',
    fontSize: 14,
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
  btnPrimaryText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  registerText: {
    color: '#666',
    fontSize: 15,
  },
  registerLink: {
    color: '#ff4b4b',
    fontSize: 15,
    fontWeight: 'bold',
  }
});