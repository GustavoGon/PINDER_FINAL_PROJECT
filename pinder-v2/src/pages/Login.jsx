import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    navigate('/swipe');
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
          <button type="submit" className="btn-primary">Entrar</button>
        </form>
      </div>
    </div>
  );
}