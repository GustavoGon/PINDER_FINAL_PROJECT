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

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [isLoading, setIsLoading] = useState(false); 
  
  const router = useRouter();
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000';

  const handleRegister = async () => {
    // Validação básica antes de enviar para o servidor
    if (password.length < 6) {
      setErrorMessage('A password tem de ter pelo menos 6 caracteres.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({ 
          username: username.trim(), 
          email: email.trim().toLowerCase(), 
          password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Conta criada com sucesso! A redirecionar...');
        
        
        setTimeout(() => {
          router.replace('/'); 
        }, 2000);
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
      <View style={styles.loginBox}>
        <Text style={styles.logo}>Pinder</Text>
        <Text style={styles.subtitle}>Junta-te a nós e encontra amigos para o teu pet!</Text>
        
        <View style={styles.form}>
          <TextInput 
            style={styles.inputField} 
            placeholder="Nome de Utilizador" 
            value={username}
            onChangeText={setUsername}
            autoCapitalize="words" // Capitaliza a primeira letra do nome
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
            secureTextEntry={true} // Oculta a password
          />
          
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
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2EB',
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
    backgroundColor: '#a89d93', // Cor mais clara quando está a carregar
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