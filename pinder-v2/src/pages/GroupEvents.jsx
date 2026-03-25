import React from 'react';
import { FaPaw, FaSearch, FaSlidersH, FaSyncAlt, FaCalendarAlt, FaMapMarkerAlt, FaLocationArrow } from 'react-icons/fa';
import BottomNav from '../components/BottomNav';
import './css/GroupEvents.css';

export default function GroupEvents() {
  // Mock data para os eventos no fundo do ecrã
  const events = [
    {
      id: 1,
      title: "Passeio de Golden Retrievers",
      date: "Sáb, 15h",
      location: "Parque do Avião",
      dogsCount: "20+ cães inscritos",
      img: "https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
    },
    {
      id: 2,
      title: "Picnic de Pug",
      date: "Dom, 10h",
      location: "Parque do Lis",
      dogsCount: "12 cães inscritos",
      img: "https://images.unsplash.com/photo-1517849845537-4d257902454a?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
    }
  ];

  return (
    <div className="group-container">
      <header className="group-header">
        <h1 className="group-logo-title">
          <FaPaw className="logo-icon" /> Pinder
        </h1>
        <h2 className="group-subtitle">Encontros em Grupo</h2>
      </header>

      {/* Barra de Pesquisa */}
      <div className="group-search-wrapper">
        <div className="group-search-bar">
          <FaPaw className="search-icon" />
          <input type="text" placeholder="Pesquisar Parques ou Eventos" />
        </div>
      </div>

      <div className="map-section">
        <div className="map-controls-top">
          <button className="btn-filter">
            <FaSlidersH /> Filtros
          </button>
          <button className="btn-reload">
            <FaSyncAlt /> Recarregar Mapa
          </button>
        </div>

        {/* Fundo do Mapa (simulado) com Pins */}
        <div className="map-mockup">
          {/* Pins simulados usando posicionamento absoluto*/}
          <div className="map-pin pin-teal" style={{ top: '30%', left: '20%' }}>
            <FaPaw />
            <span className="pin-label">Parque do Lis</span>
          </div>
          <div className="map-pin pin-orange" style={{ top: '25%', left: '45%' }}>
            <FaPaw />
            <span className="pin-label bubble">Grande Encontro:<br/>Amanhã!</span>
          </div>
          <div className="map-pin pin-teal" style={{ top: '45%', left: '60%' }}>
            <FaPaw />
            <span className="pin-label">Zona do Castelo</span>
          </div>
          
          {/* Ícone de localização atual */}
          <div className="current-location" style={{ bottom: '15%', right: '10%' }}>
            <FaLocationArrow />
          </div>
        </div>
      </div>

      {/* Lista Horizontal de Eventos */}
      <div className="events-section">
        <h3 className="events-title">Eventos Programados Próximos</h3>
        
        <div className="events-scroll-container">
          {events.map((ev) => (
            <div className="event-card" key={ev.id}>
              <img src={ev.img} alt={ev.title} className="event-img" />
              <div className="event-info">
                <h4>{ev.title}</h4>
                <p><FaCalendarAlt className="event-icon"/> {ev.date}</p>
                <p><FaMapMarkerAlt className="event-icon"/> {ev.location}</p>
                
                <div className="event-card-bottom">
                  <span className="dogs-count">{ev.dogsCount}</span>
                  <button className="btn-subscribe">Inscrição</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav activePage="grupo" />
    </div>
  );
}