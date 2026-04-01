import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './css/Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // Estado para guardar erros do backend
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage(''); // Limpa os erros anteriores ao tentar novamente

    try {
      // Fazemos o pedido POST para o nosso backend
      const response = await fetch('http://localhost:3000/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      // Se a resposta for 200
      if (response.ok) {
        console.log('Login com sucesso!', data.user);
        
        // Guarda o utilizador no localStorage para manter a sessão
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redireciona para a página principal
        navigate('/swipe');
      } else {
        // Se falhar, mostramos o erro que vem do backend
        setErrorMessage(data.error || 'Erro ao iniciar sessão.');
      }
    } catch (error) {
      console.error('Erro de ligação:', error);
      setErrorMessage('Não foi possível ligar ao servidor. Verifica se o backend está a correr.');
    }
  };

  return (  
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-logo">Pinder</h1>
        <p className="login-subtitle">Encontre o amigo perfeito para o seu pet.</p>
        
        <form className="login-form" onSubmit={handleLogin}>
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
          />
          
          {errorMessage && (
            <div style={{ color: 'red', marginBottom: '10px', fontSize: '14px', textAlign: 'center' }}>
              {errorMessage}
            </div>
          )}

          <button type="submit" className="btn-primary">Entrar</button>
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
  <span style={{ color: '#666' }}>Ainda não tens conta? </span>
  <Link to="/register" style={{ color: '#ff4b4b', textDecoration: 'none', fontWeight: 'bold' }}>
    Regista-te
  </Link>
</div>
          
        </form>
      </div>
    </div>
  );
}