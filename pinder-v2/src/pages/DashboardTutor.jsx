import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaw, FaCamera, FaPencilAlt, FaChevronDown, FaSignOutAlt, FaPlus, FaTimes } from 'react-icons/fa';
import './css/DashboardTutor.css';
import BottomNav from '../components/BottomNav';
import { useActiveProfile } from '../contexts/ActiveProfileContext';

export default function DashboardTutor() {
  const navigate = useNavigate();
  const { activeProfile } = useActiveProfile();
  
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [newExtraPhotos, setNewExtraPhotos] = useState([]);
  const [photosToDelete, setPhotosToDelete] = useState([]); 
  const [selectedPhoto, setSelectedPhoto] = useState(null); 
  const extraPhotoInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setSaveMessage('');
      setNewExtraPhotos([]); 
      setPhotosToDelete([]); 
      setSelectedPhoto(null);

      try {
        if (activeProfile.type === 'tutor') {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          setProfileData({ ...user, name: user.username }); 
        } else if (activeProfile.type === 'pet' && activeProfile.id) {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/pets/${activeProfile.id}`);
          if (response.ok) {
            const data = await response.json();
            setProfileData(data);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [activeProfile, refreshTrigger]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.clear(); 
    navigate('/'); 
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleExtraPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewExtraPhotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    }
    // Limpa o input para permitir selecionar a mesma foto novamente se o utilizador a apagar
    e.target.value = null; 
  };

  const handleRemoveNewPhoto = (indexToRemove) => {
    setNewExtraPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // 👇 CORREÇÃO DO BUG "APAGA TODAS" 👇
  const handleRemoveExistingPhoto = (photoId) => {
    if (!photoId) {
      console.error("Erro: A foto não tem um ID válido reconhecido.");
      return; 
    }
    setPhotosToDelete(prev => [...prev, photoId]);
    setProfileData(prev => ({
      ...prev,
      // Procura por p.id ou p.photo_id ou p.pet_photo_id, dependendo do que estiver na base de dados
      photos: prev.photos.filter(p => (p.id || p.photo_id || p.pet_photo_id) !== photoId) 
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      if (activeProfile.type === 'tutor') {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${activeProfile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: profileData.name })
        });
        if (response.ok) setSaveMessage('Perfil atualizado com sucesso!');
        else setSaveMessage('Erro ao atualizar perfil.');
      } else {
        const payload = {
          name: profileData.name,
          dob: profileData.dob ? new Date(profileData.dob).toISOString() : null,
          gender: profileData.gender,
          size: profileData.size,
          energy: parseInt(profileData.energy),
          description: profileData.description,
          forAdoption: profileData.forAdoption,
          new_gallery_photos: newExtraPhotos, 
          deleted_photo_ids: photosToDelete 
        };

        const response = await fetch(`${import.meta.env.VITE_API_URL}/pets/${activeProfile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          setSaveMessage('Pet atualizado com sucesso!');
          setNewExtraPhotos([]); 
          setPhotosToDelete([]);
          setRefreshTrigger(prev => prev + 1); 
        } else {
          setSaveMessage('Erro ao atualizar o pet.');
        }
      }
    } catch (error) {
      setSaveMessage('Erro de ligação ao servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split('T')[0];
  };

  if (isLoading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>A carregar perfil... 🐾</div>;
  if (!profileData) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Nenhum perfil encontrado.</div>;

  return (
    <div className="profile-container">
      {/* Modal da Foto Ampliada */}
      {selectedPhoto && (
        <div 
          onClick={() => setSelectedPhoto(null)} 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setSelectedPhoto(null); }}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <FaTimes />
          </button>
          <img src={selectedPhoto} alt="Ampliada" style={{ maxWidth: '90%', maxHeight: '80%', borderRadius: '10px', objectFit: 'contain' }} />
        </div>
      )}

      <header className="profile-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ width: '34px' }}></div> 
          <h1 className="logo-title" style={{ margin: 0 }}><FaPaw className="logo-icon" /> Pinder</h1>
          <button onClick={handleLogout} title="Terminar Sessão" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: '#666', padding: '5px' }}>
            <FaSignOutAlt />
          </button>
        </div>
        <h2 className="page-subtitle">
          {activeProfile.type === 'tutor' ? 'Meu Perfil (Tutor)' : 'Perfil do Pet'}
        </h2>
      </header>

      <main className="profile-content">
        <div className="avatar-section">
          <div className="avatar-wrapper">
            <img 
              src={profileData.main_photo || profileData.photo || "https://placehold.co/400x400/eeeeee/999999?text=Sem+Foto"} 
              alt="Avatar" 
              className="avatar-image"
              style={{ objectFit: 'cover' }}
            />
            <button className="btn-icon btn-camera"><FaCamera /></button>
          </div>
        </div>

        {activeProfile.type === 'pet' && (
          <div className="gallery-section" style={{ padding: '0 20px', marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Galeria de Fotos do Pet</label>
            <div style={{ display: 'flex', gap: '15px', marginTop: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
              
              {/* Fotos Existentes */}
              {profileData.photos && profileData.photos.map((p, index) => {
                // 👇 Apanha a ID certa dependendo do teu esquema Prisma
                const currentId = p.id || p.photo_id || p.pet_photo_id; 
                
                return (
                  <div key={currentId || `old-${index}`} style={{ position: 'relative', display: 'inline-block', flexShrink: 0, width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <img 
                      src={p.url} 
                      alt="Galeria" 
                      onClick={() => setSelectedPhoto(p.url)} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                    />
                    {/* 👇 Botão Minimalista por DENTRO da foto */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveExistingPhoto(currentId); }} 
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    ><FaTimes /></button>
                  </div>
                )
              })}

              {/* Fotos Novas */}
              {newExtraPhotos.map((photo, index) => (
                <div key={`new-${index}`} style={{ position: 'relative', display: 'inline-block', flexShrink: 0, width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '2px solid #D6CEC3' }}>
                  <img 
                    src={photo} 
                    alt="Nova" 
                    onClick={() => setSelectedPhoto(photo)} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                  />
                  {/* 👇 Botão Minimalista por DENTRO da foto */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRemoveNewPhoto(index); }} 
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  ><FaTimes /></button>
                </div>
              ))}

              {/* Botão Adicionar */}
              <div 
                onClick={() => extraPhotoInputRef.current.click()}
                style={{ width: '64px', height: '64px', borderRadius: '8px', border: '2px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <FaPlus color="#999" />
              </div>
              <input type="file" accept="image/*" ref={extraPhotoInputRef} onChange={handleExtraPhotoChange} style={{ display: 'none' }} />
            </div>
          </div>
        )}

        <div className="form-grid" key={activeProfile.id}>
          {/* ... Inputs normais ... */}
          <div className="input-group">
            <label>Nome</label>
            <div className="input-with-icon">
              <input type="text" name="name" value={profileData.name || ''} onChange={handleChange} />
              <FaPencilAlt className="edit-icon" />
            </div>
          </div>

          {activeProfile.type === 'pet' && (
            <>
              <div className="input-group">
                <label>Data nascimento</label>
                <div className="input-with-icon">
                  <input type="date" name="dob" value={formatDate(profileData.dob)} onChange={handleChange} />
                </div>
              </div>

              <div className="input-group">
                <label>Gênero</label>
                <div className="input-with-icon">
                  <select name="gender" value={profileData.gender || "Macho"} onChange={handleChange}>
                    <option value="Macho">Macho</option>
                    <option value="Fêmea">Fêmea</option>
                  </select>
                  <FaChevronDown className="edit-icon dropdown-icon" />
                </div>
              </div>

              <div className="input-group">
                <label>Tamanho (cm) </label>
                <div className="input-with-icon">
                  <input type="text" name="size" value={profileData.size || ''} onChange={handleChange} />
                  <FaPencilAlt className="edit-icon" />
                </div>
              </div>

              <div className="input-group">
                <label>Nível de Energia</label>
                <div className="slider-container">
                  <input type="range" min="1" max="5" name="energy" value={profileData.energy || 3} onChange={handleChange} className="energy-slider" />
                </div>
              </div>
            </>
          )}
        </div>

        {activeProfile.type === 'pet' && (
          <>
            <div className="input-group description-group">
              <label>Descrição</label>
              <div className="input-with-icon">
                <textarea rows="4" name="description" value={profileData.description || ''} onChange={handleChange}></textarea>
                <FaPencilAlt className="edit-icon textarea-icon" />
              </div>
            </div>

            <div className="adoption-toggle-container">
              <div className="adoption-info">
                <label>Disponível para Adoção</label>
                <p>Ative esta opção se procura uma nova família para este pet.</p>
              </div>
              <label className="switch">
                <input type="checkbox" name="forAdoption" checked={profileData.forAdoption || false} onChange={handleChange} />
                <span className="slider round"></span>
              </label>
            </div>
          </>
        )}

        {saveMessage && (
          <div style={{ textAlign: 'center', margin: '10px 0', color: saveMessage.includes('Erro') ? 'red' : 'green', fontWeight: 'bold' }}>
            {saveMessage}
          </div>
        )}

        <div className="profile-actions">
          <button className="btn-save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'A guardar...' : 'Salvar Alterações'}
          </button>
        </div>
      </main>

      <BottomNav activePage="perfil" />
    </div>
  );
}