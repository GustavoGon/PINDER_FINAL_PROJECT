import React from 'react';
import { FaPaw, FaSearch, FaHome, FaUsers, FaComments, FaUser } from 'react-icons/fa';
import './css/MatchesChat.css';
import BottomNav from '../components/BottomNav';

export default function MatchesChat() {
  //TODO - lista de conversas enquanto ainda não temos BD
  const chatList = [
    {
      id: 1,
      name: "Max",
      breed: "Labrador Retriever",
      msg: "Woof! Vamos brincar no parque?",
      time: "10:40",
      unread: 0,
      img: "https://images.unsplash.com/photo-1529815481058-55e5b656f6d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80"
    },
    {
      id: 2,
      name: "Luna",
      breed: "French Bulldog",
      msg: "*Lick* Vi que curtiu o meu perfil!",
      time: "10:35",
      unread: 2,
      img: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80"
    },
    {
      id: 3,
      name: "Cooper",
      breed: "Beagle",
      msg: "Encontrei um pau ótimo! Vem ver?",
      time: "Ontem",
      unread: 1,
      img: "https://images.unsplash.com/photo-1537151608804-ea2f1ea14a15?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80"
    },
    {
      id: 4,
      name: "Pog",
      breed: "Moma!",
      msg: "😉",
      time: "Ontem",
      unread: 0,
      img: "https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80"
    }
  ];

  return (
    <div className="chat-container">
      
      <div className="chat-header-area">
        <header className="chat-header">
          <h1 className="logo-title">
            <FaPaw className="logo-icon" /> Pinder
          </h1>
        </header>

        <div className="search-container">
          <div className="search-bar">
            <FaSearch className="search-icon" />
            <input type="text" placeholder="Pesquisar conversas..." />
          </div>
        </div>
      </div>

      <main className="chat-list">
        {chatList.map((chat) => (
          <div className="chat-item" key={chat.id}>
            <img src={chat.img} alt={chat.name} className="chat-avatar" />
            
            <div className="chat-content">
              <div className="chat-row-top">
                <span className="chat-name">{chat.name}</span>
                <span className="chat-time">{chat.time}</span>
              </div>
              
              <span className="chat-breed">{chat.breed}</span>
              
              <div className="chat-row-bottom">
                <span className="chat-msg">{chat.msg}</span>
                {/* Só mostra a bolinha verde se houver mensagens não lidas */}
                {chat.unread > 0 && (
                  <span className="chat-unread-badge">{chat.unread}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </main>
        <BottomNav activePage="chat" />
    </div>
  );
}