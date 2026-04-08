import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaw, FaCamera, FaChevronDown, FaArrowLeft } from 'react-icons/fa';
import './css/DashboardTutor.css';
import BottomNav from '../components/BottomNav';
import { useLoading } from '../contexts/LoadingContext'; // O teu loading global!

export default function AddPet() {
  const navigate = useNavigate();
  const { isLoading, setIsLoading } = useLoading();
  const fileInputRef = useRef(null); // Referência para o input de ficheiro invisível

  // Estados do formulário
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [breed, setBreed] = useState(''); // O ideal no futuro seria um <select> com as raças da BD
  const [gender, setGender] = useState('Macho');
  const [size, setSize] = useState('');
  const [energy, setEnergy] = useState(3);
  const [description, setDescription] = useState('');
  const [isAdoptable, setIsAdoptable] = useState(false);
  
  // Estados para a foto
  const [photoPreview, setPhotoPreview] = useState("https://images.unsplash.com/photo-1543466835-00a7907e9de1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80");
  const [photoData, setPhotoData] = useState(null); // Vai guardar o código da imagem
  
  const [errorMessage, setErrorMessage] = useState('');

  // Função para abrir a galeria quando se clica no botão da câmara
  const handleCameraClick = () => {
    fileInputRef.current.click();
  };

  // Função que lê a imagem escolhida pelo telemóvel
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result); // Atualiza a imagem no ecrã
        setPhotoData(reader.result);    // Guarda o texto Base64 para enviar ao backend
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user.user_id) {
      setErrorMessage('Sessão inválida. Faz login novamente.');
      return;
    }

    setIsLoading(true); // Ativa o loading global!

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/pets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          user_id: user.user_id,
          species_id: "CAO", // ID provisório (Ex: 1 = Cão)
          breed_id: 1,   // ID provisório (Precisarás de ir buscar as raças à BD depois)
          dob: dob,
          gender: gender,
          size: size,
          energy: energy,
          description: description,
          isAdoptable: isAdoptable,
          photoData: photoData // Envia a foto!
        }),
      });

      if (response.ok) {
        navigate(-1); // Volta atrás com sucesso
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Erro ao adicionar o pet.');
      }
    } catch (error) {
      console.error('Erro:', error);
      setErrorMessage('Não foi possível ligar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <header className="profile-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#666', padding: '5px' }}>
            <FaArrowLeft />
          </button>
          <h1 className="logo-title" style={{ margin: 0 }}>
            <FaPaw className="logo-icon" /> Pinder
          </h1>
          <div style={{ width: '24px' }}></div> 
        </div>
        <h2 className="page-subtitle">Adicionar Novo Pet</h2>
      </header>

      <main className="profile-content">
        <form onSubmit={handleSubmit}>
          
          {/* Avatar com Input de Ficheiro Invisível */}
          <div className="avatar-section">
            <div className="avatar-wrapper">
              <img src={photoPreview} alt="Novo Pet" className="avatar-image" style={{ objectFit: 'cover' }} />
              
              {/* O verdadeiro input de ficheiros (escondido) */}
              <input 
                type="file" 
                accept="image/*" // Aceita apenas imagens
                ref={fileInputRef} 
                onChange={handleImageChange} 
                style={{ display: 'none' }} 
              />
              
              {/* O botão bonito que aciona o input invisível */}
              <button type="button" className="btn-icon btn-camera" onClick={handleCameraClick}>
                <FaCamera />
              </button>
            </div>

          </div>

          <div className="form-grid">
            <div className="input-group">
              <label>Nome do Pet</label>
              <div className="input-with-icon">
                <input type="text" placeholder="Ex: Buddy" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            </div>
            
            <div className="input-group">
              <label>Idade / Data nascimento</label>
              <div className="input-with-icon">
                <input type="text" placeholder="Ex: 3 anos" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
            </div>

            {/* NOTA: Para um projeto perfeito, isto no futuro deveria ser um <select> que vai buscar as raças à BD */}
            <div className="input-group">
              <label>Raça (ID Temporário)</label>
              <div className="input-with-icon">
                <input type="text" placeholder="Ex: Golden Retriever" value={breed} onChange={(e) => setBreed(e.target.value)} />
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
                <input type="text" placeholder="Ex: Médio" value={size} onChange={(e) => setSize(e.target.value)} />
              </div>
            </div>

            <div className="input-group">
              <label>Nível de Energia</label>
              <div className="slider-container">
                <input type="range" min="1" max="5" value={energy} onChange={(e) => setEnergy(e.target.value)} className="energy-slider" />
              </div>
            </div>
          </div>

          <div className="input-group description-group">
            <label>Descrição</label>
            <div className="input-with-icon">
              <textarea rows="4" placeholder="Conta-nos um pouco sobre o teu pet..." value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
            </div>
          </div>

          <div className="adoption-toggle-container">
            <div className="adoption-info">
              <label>Disponível para Adoção</label>
              <p>Ative esta opção se procura uma nova família para este pet.</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={isAdoptable} onChange={(e) => setIsAdoptable(e.target.checked)} />
              <span className="slider round"></span>
            </label>
          </div>

          {errorMessage && (
            <div style={{ color: '#ff4d4d', textAlign: 'center', margin: '10px 0', fontSize: '14px' }}>
              {errorMessage}
            </div>
          )}

          <div className="profile-actions">
            <button type="submit" className="btn-save" disabled={isLoading}>
              {isLoading ? 'A Guardar...' : 'Adicionar Pet'}
            </button>
          </div>
        </form>
      </main>
      <BottomNav activePage="perfil" />
    </div>
  );
}