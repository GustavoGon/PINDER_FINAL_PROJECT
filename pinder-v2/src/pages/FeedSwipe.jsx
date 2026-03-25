import React, { useState } from 'react';
import { FaPaw, FaTimes, FaHeart } from 'react-icons/fa';
import { MdFlipToBack, MdFlipToFront } from 'react-icons/md';
import BottomNav from '../components/BottomNav';
import './css/FeedSwipe.css';

export default function FeedSwipe() {
  // Estado para controlar se o cartão está virado ou não
  const [isFlipped, setIsFlipped] = useState(false);

  // Função que inverte o estado do cartão
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="feed-container">
      <header className="feed-header">
        <h1 className="logo-title">
          <FaPaw className="logo-icon" /> Pinder
        </h1>
      </header>

      {/* Cartão Principal */}
      <main className="card-area">

        <div className={`swipe-card ${isFlipped ? 'flipped' : ''}`}>
          
 
          <div className="inner-card">

            {/* FRENTE DO CARTÃO*/}
            <div className="card-front">
              <div className="image-container">
                <div className="story-bars">
                  <div className="bar active"></div>
                  <div className="bar"></div>
                  <div className="bar"></div>
                  <div className="bar"></div>
                </div>
                <div className="photo-counter">Fotos (4)</div>
                <img 
                  src="https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60" 
                  alt="Golden Retriever Buddy" 
                  className="pet-image"
                />
              </div>

              <div className="card-info">
                <h2>Buddy - 3 anos</h2>
                <p>Golden Retriever</p>
              </div>

              <div className="card-actions">
                <div className="action-item">
                  <span className="action-label"></span>
                  <button className="btn-dislike">
                    <FaTimes />
                  </button>
                </div>
                
                <button className="btn-like">
                  <FaHeart />
                </button>
                
                <div className="action-item">
                  <button className="btn-flip" onClick={handleFlip}>
                    <MdFlipToBack />
                  </button>
                  <span className="action-label hint">Ver Descrição &gt;</span>
                </div>
              </div>
            </div>

            {/* VERSO DO CARTÃO (Descrição) */}
            <div className="card-back">
              <div className="back-header">
                <h2>Buddy</h2>
                <button className="btn-flip-back" onClick={handleFlip}>
                  <MdFlipToFront /> Voltar
                </button>
              </div>

              <div className="back-content">
                <p className="back-breed">Golden Retriever • 3 anos • Macho</p>
                
                <div className="traits-grid">
                  <span className="trait-badge">Tamanho: Médio</span>
                  <span className="trait-badge">Energia: Alta ⚡</span>
                </div>

                <div className="description-box">
                  <h3>Sobre mim</h3>
                  <p>Sou o Buddy! Cão ativo e carinhoso. Adoro correr atrás de bolas, nadar e fazer novos amigos peludos e humanos. Vamos brincar no parque!</p>
                </div>
              </div>

              <div className="card-actions back-actions">
                <button className="btn-dislike"><FaTimes /></button>
                <button className="btn-like"><FaHeart /></button>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Barra de Navegação Inferior */}
      <BottomNav activePage="home" />
    </div>
  );
}