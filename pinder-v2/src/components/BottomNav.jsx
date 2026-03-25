import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaUsers, FaComments, FaUser, FaTimes, FaPlus } from 'react-icons/fa';
import './css/BottomNav.css';

export default function BottomNav({ activePage }) {
  const navigate = useNavigate();
  
  const [showPetPopup, setShowPetPopup] = useState(false);
  const [activePet, setActivePet] = useState('pip');

  const timerRef = useRef(null);
  const isLongPress = useRef(false);

  const handlePressStart = () => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      setShowPetPopup(true); // Mostra o pop-up após 500ms
    }, 500);
  };

  // Termina a contagem quando o utilizador levanta o dedo
  const handlePressEnd = () => {
    clearTimeout(timerRef.current);
    // Se não foi um clique longo (foi rápido), navega normalmente
    if (!isLongPress.current) {
      navigate('/profile');
    }
  };

  return (
    <>
      <nav className="bottom-nav">
        <div className={`nav-item ${activePage === 'home' ? 'active' : ''}`} onClick={() => navigate('/swipe')}>
          <FaHome className="nav-icon" />
          <span>Home</span>
        </div>
        
       <div 
          className={`nav-item ${activePage === 'grupo' ? 'active' : ''}`}
          onClick={() => navigate('/grupo')}
        >
          <FaUsers className="nav-icon" />
          <span>Em Grupo</span>
        </div>
        
        <div className={`nav-item ${activePage === 'chat' ? 'active-green' : ''}`} onClick={() => navigate('/chat')}>
          <FaComments className="nav-icon" />
          <span>Chat</span>
        </div>
        
        {/* Botão de Perfil com lógica de Long Press */}
        <div 
          className={`nav-item ${activePage === 'perfil' ? 'active' : ''}`} 
          onPointerDown={handlePressStart}
          onPointerUp={handlePressEnd}
          onPointerLeave={() => clearTimeout(timerRef.current)} // Cancela se o dedo deslizar para fora
          onContextMenu={(e) => e.preventDefault()} // Evita abrir o menu do telemóvel ao segurar
          style={{ touchAction: 'none' }} 
        >
          <FaUser className="nav-icon" />
          <span>Perfil</span>
        </div>
      </nav>

      {/* POP-UP DE SELEÇÃO DE PET */}
      {showPetPopup && (
        <div className="popup-overlay" onClick={() => setShowPetPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            
            <div className="popup-header">
              <h3>Seus Animais<br/>de Estimação</h3>
              <button className="close-popup" onClick={() => setShowPetPopup(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="pet-list">
              {/* 1. Perfil do Tutor (Para adotar) */}
              <div 
                className={`pet-item ${activePet === 'tutor' ? 'pet-active' : ''}`}
                onClick={() => { setActivePet('tutor'); setShowPetPopup(false); }}
                style={{ borderBottom: '2px dashed #D6CEC3', paddingBottom: '15px', marginBottom: '5px' }}
              >
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&w=100&q=80" alt="Meu Perfil" className="pet-popup-avatar" />
                <div className="pet-popup-info">
                  <span className="pet-popup-name">O meu perfil (Tutor)</span>
                  <span className="pet-popup-breed">Quero adotar um pet</span>
                </div>
                {activePet === 'tutor' && <span className="pet-badge">Ativo</span>}
              </div>

              {/* 2. Pet: Pip */}
              <div 
                className={`pet-item ${activePet === 'pip' ? 'pet-active' : ''}`}
                onClick={() => { setActivePet('pip'); setShowPetPopup(false); }}
              >
                <img src="https://images.unsplash.com/photo-1517849845537-4d257902454a?ixlib=rb-4.0.3&w=100&q=80" alt="Pip" className="pet-popup-avatar" />
                <div className="pet-popup-info">
                  <span className="pet-popup-name">Pip</span>
                  <span className="pet-popup-breed">Pug</span>
                </div>
                {activePet === 'pip' && <span className="pet-badge">Ativo</span>}
              </div>

              {/* 3. Pet: Luna */}
              <div 
                className={`pet-item ${activePet === 'luna' ? 'pet-active' : ''}`}
                onClick={() => { setActivePet('luna'); setShowPetPopup(false); }}
              >
                <img src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?ixlib=rb-4.0.3&w=100&q=80" alt="Luna" className="pet-popup-avatar" />
                <div className="pet-popup-info">
                  <span className="pet-popup-name">Luna</span>
                  <span className="pet-popup-breed">French Bulldog</span>
                </div>
                {activePet === 'luna' && <span className="pet-badge">Ativo</span>}
              </div>
            </div>

            <button className="btn-add-pet">
              Adicionar Novo Pet <FaPlus />
            </button>
            
            <div className="popup-arrow"></div>
          </div>
        </div>
      )}
    </>
  );
}