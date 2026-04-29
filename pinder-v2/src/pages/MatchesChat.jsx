import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaw, FaSearch, FaHome, FaUsers, FaComments, FaUser, FaSpinner } from 'react-icons/fa';
import { useActiveProfile } from '../contexts/ActiveProfileContext';
import './css/MatchesChat.css';
import BottomNav from '../components/BottomNav';

export default function MatchesChat() {
  const navigate = useNavigate();
  const { activeProfile } = useActiveProfile();
  const [chatList, setChatList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchConversations();
  }, [activeProfile]);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);

      // Se é PET: buscar conversas (matches)
      if (activeProfile?.type === 'pet' && activeProfile?.id) {
        const response = await fetch(`${API_URL}/matches?petId=${activeProfile.id}`);
        
        if (response.ok) {
          const matches = await response.json();
          
          // Transformar dados para formato de chat
          const chats = matches.map((match) => {
            // Determinar qual é o outro pet (não o nosso)
            const isUserPet1 = match.pet_1_id === activeProfile.id;
            const otherPet = isUserPet1 ? match.pet2 : match.pet1;
            
            // Pegar última mensagem (simulado por enquanto)
            const lastMessage = match.messages?.[0]?.content || 'Sem mensagens ainda';
            
            return {
              id: match.match_id,
              name: otherPet.name,
              breed: otherPet.breed?.name || 'Raça não definida',
              msg: lastMessage,
              time: match.messages?.[0] ? formatTime(new Date(match.messages[0].timestamp)) : 'Agora',
              unread: 0,
              img: otherPet.main_photo || 'https://placehold.co/150x150/eeeeee/999999?text=Sem+Foto',
              petId: otherPet.pet_id,
              ownerId: otherPet.owner?.user_id
            };
          });
          
          setChatList(chats);
        }
      } 
      // Se é TUTOR: mostrar mensagem informativa (futuro: conversas com donos)
      else if (activeProfile?.type === 'tutor') {
        setChatList([]);
      }
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' });
    }
  };

  const handleChatPress = (chat) => {
    navigate('/chatDetail', { state: { matchId: chat.id, petName: chat.name } });
  };

  const filteredChats = chatList.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.breed.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <input 
              type="text" 
              placeholder="Pesquisar conversas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <main className="chat-list">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <FaSpinner className="spinner" style={{ animation: 'spin 1s linear infinite', fontSize: '32px', color: '#5C4A3D' }} />
            <p style={{ color: '#999', marginTop: '10px' }}>A carregar conversas...</p>
          </div>
        ) : chatList.length === 0 && activeProfile?.type === 'tutor' ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <FaComments style={{ fontSize: '48px', color: '#D6CEC3', marginBottom: '10px' }} />
            <p style={{ color: '#999', fontSize: '14px' }}>
              {activeProfile?.type === 'tutor' 
                ? 'Conversas aparecem após fazer interesse em um pet' 
                : 'Sem conversas no momento'}
            </p>
          </div>
        ) : chatList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <FaComments style={{ fontSize: '48px', color: '#D6CEC3', marginBottom: '10px' }} />
            <p style={{ color: '#999', fontSize: '14px' }}>Sem conversas no momento. Faz um match para conversar!</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <FaSearch style={{ fontSize: '32px', color: '#D6CEC3', marginBottom: '10px' }} />
            <p style={{ color: '#999', fontSize: '14px' }}>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div 
              className="chat-item" 
              key={chat.id}
              onClick={() => handleChatPress(chat)}
              style={{ cursor: 'pointer' }}
            >
              <img src={chat.img} alt={chat.name} className="chat-avatar" />
              
              <div className="chat-content">
                <div className="chat-row-top">
                  <span className="chat-name">{chat.name}</span>
                  <span className="chat-time">{chat.time}</span>
                </div>
                
                <span className="chat-breed">{chat.breed}</span>
                
                <div className="chat-row-bottom">
                  <span className="chat-msg">{chat.msg}</span>
                  {chat.unread > 0 && (
                    <span className="chat-unread-badge">{chat.unread}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </main>
      <BottomNav activePage="chat" />
    </div>
  );
}