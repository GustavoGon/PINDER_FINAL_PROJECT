import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaUsers, FaComments, FaUser, FaTimes, FaPlus } from 'react-icons/fa';
import './css/BottomNav.css';
import PetSelectionPopup from './PetSelectionPopup';

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
    // Se não foi um clique longo, navega normalmente
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
        <PetSelectionPopup 
          onClose={() => setShowPetPopup(false)} 
          activePet={activePet} 
          setActivePet={setActivePet} 
        />
      )}
    </>
  );
}