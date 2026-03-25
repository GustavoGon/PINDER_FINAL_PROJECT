import React from 'react';
import { FaPaw, FaCamera, FaPencilAlt, FaHome, FaUsers, FaComments, FaUser, FaChevronDown } from 'react-icons/fa';
import './css/DashboardTutor.css';
import BottomNav from '../components/BottomNav';

export default function DashboardTutor() {
  return (
    <div className="profile-container">
      <header className="profile-header">
        <h1 className="logo-title">
          <FaPaw className="logo-icon" /> Pinder
        </h1>
        <h2 className="page-subtitle">Meu Perfil</h2>
      </header>

      {/* Conteúdo com Scroll */}
      <main className="profile-content">
        
        {/* Foto de Perfil  TODO - IR BUSCAR A BD QUANDO TIVERMOS BD*/}
        <div className="avatar-section">
          <div className="avatar-wrapper">
            <img 
              src="https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" 
              alt="Buddy" 
              className="avatar-image"
            />
            <button className="btn-icon btn-camera">
              <FaCamera />
            </button>
            <button className="btn-icon btn-edit-photo">
              <FaPencilAlt />
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label>Nome</label>
            <div className="input-with-icon">
              <input type="text" defaultValue="Buddy" />
              <FaPencilAlt className="edit-icon" />
            </div>
          </div>
          
          <div className="input-group">
            <label>Data nascimento</label>
            <div className="input-with-icon">
              <input type="text" defaultValue="3 anos" />
              <FaPencilAlt className="edit-icon" />
            </div>
          </div>

          <div className="input-group">
            <label>Raça</label>
            <div className="input-with-icon">
              <input type="text" defaultValue="Golden Retriever" />
              <FaPencilAlt className="edit-icon" />
            </div>
          </div>

          <div className="input-group">
            <label>Gênero</label>
            <div className="input-with-icon">
              <select defaultValue="Macho">
                <option value="Macho">Macho</option>
                <option value="Fêmea">Fêmea</option>
              </select>
              <FaChevronDown className="edit-icon dropdown-icon" />
            </div>
          </div>

          <div className="input-group">
            <label>Tamanho (cm) </label>
            <div className="input-with-icon">
              <input type="text" defaultValue="Médio" />
              <FaPencilAlt className="edit-icon" />
            </div>
          </div>

          <div className="input-group">
            <label>Nível de Energia</label>
            <div className="slider-container">
              <input type="range" min="1" max="5" defaultValue="4" className="energy-slider" />
            </div>
          </div>
        </div>

        {/* Descrição */}
        <div className="input-group description-group">
          <label>Descrição</label>
          <div className="input-with-icon">
            <textarea 
              rows="4" 
              defaultValue="Sou o Buddy! Cão ativo e carinhoso. Adoro correr atrás de bolas, nadar e fazer novos amigos peludos e humanos. Vamos brincar no parque!"
            ></textarea>
            <FaPencilAlt className="edit-icon textarea-icon" />
          </div>
        </div>

        {/* Flag de Adoção */}
        <div className="adoption-toggle-container">
          <div className="adoption-info">
            <label>Disponível para Adoção</label>
            <p>Ative esta opção se procura uma nova família para este pet.</p>
          </div>
          <label className="switch">
            <input type="checkbox" defaultChecked={false} />
            <span className="slider round"></span>
          </label>
        </div>

        <div className="profile-actions">
          <button className="btn-save">Salvar Alterações</button>
        </div>

      </main>

      <BottomNav activePage="perfil" />
    </div>
  );
}