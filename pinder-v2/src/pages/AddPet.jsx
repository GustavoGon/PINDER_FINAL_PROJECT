import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaw, FaCamera, FaChevronDown, FaArrowLeft } from 'react-icons/fa';
import './css/DashboardTutor.css'; // Reutilizamos o teu CSS!
import BottomNav from '../components/BottomNav';

export default function AddPet() {
  const navigate = useNavigate();

  // Estados para guardar os dados do formulário
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('Macho');
  const [size, setSize] = useState('');
  const [energy, setEnergy] = useState(3);
  const [description, setDescription] = useState('');
  const [isAdoptable, setIsAdoptable] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');

  // Função para enviar os dados para o backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Vai buscar o ID do utilizador logado
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user.user_id) {
      setErrorMessage('Sessão inválida. Faz login novamente.');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/pets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          user_id: user.user_id,
          // NOTA: O teu backend atualmente pede species_id e breed_id. 
          // Estou a enviar valores fixos (1) para não dar erro, mas depois tens de ajustar com o teu colega!
          species_id: 1, 
          breed_id: 1,   
          // Podes adicionar os outros campos aqui quando o backend estiver pronto para os receber:
          // dob, gender, size, energy, description, isAdoptable
        }),
      });

      if (response.ok) {
        // Se correu bem, volta para o ecrã anterior (perfil ou feed)
        navigate(-1); 
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Erro ao adicionar o pet.');
      }
    } catch (error) {
      console.error('Erro:', error);
      setErrorMessage('Não foi possível ligar ao servidor.');
    }
  };

  return (
    <div className="profile-container">
      <header className="profile-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {/* Botão de Voltar */}
          <button 
            onClick={() => navigate(-1)} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#666', padding: '5px' }}
          >
            <FaArrowLeft />
          </button>

          <h1 className="logo-title" style={{ margin: 0 }}>
            <FaPaw className="logo-icon" /> Pinder
          </h1>
          
          {/* Espaço vazio para manter o logo centrado com o flexbox */}
          <div style={{ width: '24px' }}></div> 
        </div>
        <h2 className="page-subtitle">Adicionar Novo Pet</h2>
      </header>

      <main className="profile-content">
        <form onSubmit={handleSubmit}>
          
          {/* Foto de Perfil - Dummy Image */}
          <div className="avatar-section">
            <div className="avatar-wrapper">
              <img 
                src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" 
                alt="Novo Pet" 
                className="avatar-image"
              />
              <button type="button" className="btn-icon btn-camera">
                <FaCamera />
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label>Nome do Pet</label>
              <div className="input-with-icon">
                <input 
                  type="text" 
                  placeholder="Ex: Buddy" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>
            </div>
            
            <div className="input-group">
              <label>Idade / Data nascimento</label>
              <div className="input-with-icon">
                <input 
                  type="text" 
                  placeholder="Ex: 3 anos" 
                  value={dob} 
                  onChange={(e) => setDob(e.target.value)} 
                />
              </div>
            </div>

            <div className="input-group">
              <label>Raça</label>
              <div className="input-with-icon">
                <input 
                  type="text" 
                  placeholder="Ex: Golden Retriever" 
                  value={breed} 
                  onChange={(e) => setBreed(e.target.value)} 
                />
              </div>
            </div>

            <div className="input-group">
              <label>Gênero</label>
              <div className="input-with-icon">
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="Macho">Macho</option>
                  <option value="Fêmea">Fêmea</option>
                </select>
                <FaChevronDown className="edit-icon dropdown-icon" />
              </div>
            </div>

            <div className="input-group">
              <label>Tamanho (cm)</label>
              <div className="input-with-icon">
                <input 
                  type="text" 
                  placeholder="Ex: Médio" 
                  value={size} 
                  onChange={(e) => setSize(e.target.value)} 
                />
              </div>
            </div>

            <div className="input-group">
              <label>Nível de Energia</label>
              <div className="slider-container">
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={energy} 
                  onChange={(e) => setEnergy(e.target.value)} 
                  className="energy-slider" 
                />
              </div>
            </div>
          </div>

          <div className="input-group description-group">
            <label>Descrição</label>
            <div className="input-with-icon">
              <textarea 
                rows="4" 
                placeholder="Conta-nos um pouco sobre o teu pet..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="adoption-toggle-container">
            <div className="adoption-info">
              <label>Disponível para Adoção</label>
              <p>Ative esta opção se procura uma nova família para este pet.</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={isAdoptable} 
                onChange={(e) => setIsAdoptable(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          {errorMessage && (
            <div style={{ color: '#ff4d4d', textAlign: 'center', margin: '10px 0', fontSize: '14px' }}>
              {errorMessage}
            </div>
          )}

          <div className="profile-actions">
            {/* O type="submit" faz com que o botão ative a função handleSubmit do form */}
            <button type="submit" className="btn-save">Adicionar Pet</button>
          </div>

        </form>
      </main>

      <BottomNav activePage="perfil" />
    </div>
  );
}