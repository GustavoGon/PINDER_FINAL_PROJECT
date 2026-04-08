import React from 'react';
import { FaTimes, FaPlus } from 'react-icons/fa';

export default function PetSelectionPopup({ onClose, activePet, setActivePet }) {
  // Função auxiliar para mudar o pet e fechar o pop-up ao mesmo tempo
  const handleSelectPet = (petId) => {
    setActivePet(petId);
    onClose();
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="popup-header">
          <h3>Seus Animais<br/>de Estimação</h3>
          <button className="close-popup" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="pet-list">
          {/* 1. Perfil do Tutor */}
          <div 
            className={`pet-item ${activePet === 'tutor' ? 'pet-active' : ''}`}
            onClick={() => handleSelectPet('tutor')}
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
            onClick={() => handleSelectPet('pip')}
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
            onClick={() => handleSelectPet('luna')}
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
  );
}