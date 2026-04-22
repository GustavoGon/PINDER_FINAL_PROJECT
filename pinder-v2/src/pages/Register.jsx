import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './css/Login.css';
import { useLoading } from '../contexts/LoadingContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { isLoading, setIsLoading } = useLoading();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      // Fazemos o pedido POST para a rota de criação do backend
      const response = await fetch('http://localhost:3000/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Conta criada com sucesso! A redirecionar...');
        
        // Aguarda 2 segundos para o utilizador ler a mensagem e envia-o para o Login
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        // Trata erros específicos, como o "User already exists"
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
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-logo">Pinder</h1>
        <p className="login-subtitle">Junta-te a nós e encontra amigos para o teu pet!</p>
        
        <form className="login-form" onSubmit={handleRegister}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Nome de Utilizador" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required 
          />
          <input 
            type="email" 
            className="input-field" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          <input 
            type="password" 
            className="input-field" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            minLength="6"
          />
          
          {/* Feedback de Erro ou Sucesso */}
          {errorMessage && (
            <div style={{ color: '#ff4d4d', marginBottom: '10px', fontSize: '14px', textAlign: 'center' }}>
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div style={{ color: '#4CAF50', marginBottom: '10px', fontSize: '14px', textAlign: 'center', fontWeight: 'bold' }}>
              {successMessage}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={isLoading}>
      {isLoading ? 'Aguarde...' : 'Criar Conta'}
    </button>
        </form>

        {/* Link para voltar ao Login */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
          <span style={{ color: '#666' }}>Já tens uma conta? </span>
          <Link to="/" style={{ color: '#ff4b4b', textDecoration: 'none', fontWeight: 'bold' }}>
            Entrar aqui
          </Link>
        </div>
      </div>
    </div>
  );
}