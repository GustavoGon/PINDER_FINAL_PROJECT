import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaw, FaCamera, FaChevronDown, FaSignOutAlt, FaPlus, FaTimes, FaStar, FaSearch } from 'react-icons/fa';
import './css/DashboardTutor.css';
import BottomNav from '../components/BottomNav';
import { useActiveProfile } from '../contexts/ActiveProfileContext';

const distritosPortugal = [
  "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra", "Évora", 
  "Faro", "Guarda", "Leiria", "Lisboa", "Portalegre", "Porto", "Santarém", 
  "Setúbal", "Viana do Castelo", "Vila Real", "Viseu", 
  "Região Autónoma dos Açores", "Região Autónoma da Madeira"
];

export default function DashboardTutor() {
  const navigate = useNavigate();
const { activeProfile, setActiveProfile } = useActiveProfile();
const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [newExtraPhotos, setNewExtraPhotos] = useState([]);
  const [photosToDelete, setPhotosToDelete] = useState([]); 
  const [selectedPhoto, setSelectedPhoto] = useState(null); 
  const extraPhotoInputRef = useRef(null);
  const [newAvatarPhoto, setNewAvatarPhoto] = useState(null);
  const avatarInputRef = useRef(null);

  const [speciesList, setSpeciesList] = useState([]);
  const [breedsList, setBreedsList] = useState([]);
  const [speciesId, setSpeciesId] = useState('');
  const [breedId, setBreedId] = useState('');
  const [showBreedList, setShowBreedList] = useState(false);
  const [breedSearch, setBreedSearch] = useState('');
  const [showLocationList, setShowLocationList] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');


  const filteredDistritos = distritosPortugal.filter(distrito => 
    distrito.toLowerCase().includes(locationSearch.toLowerCase())
  );

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setSaveMessage('');
      setNewExtraPhotos([]); 
      setPhotosToDelete([]); 
      setSelectedPhoto(null);
      setNewAvatarPhoto(null); 

      try {
        const resSpecies = await fetch(`${import.meta.env.VITE_API_URL}/species`);
        if (resSpecies.ok) {
          const dataSpecies = await resSpecies.json();
          setSpeciesList(dataSpecies);
        }

        if (activeProfile.type === 'tutor') {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${activeProfile.id}`);
          if (response.ok) {
            const data = await response.json();
            setProfileData({ ...data, name: data.username });
          } else {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            setProfileData({ ...user, name: user.username }); 
          }
        } else if (activeProfile.type === 'pet' && activeProfile.id) {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/pets/${activeProfile.id}`);
          if (response.ok) {
            const data = await response.json();
            setProfileData(data);
            setSpeciesId(data.species_id || '');
            setBreedId(data.breed_id || '');
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

  useEffect(() => {
    if (speciesId) {
      const fetchBreeds = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/breeds/species/${speciesId}`);
          if (response.ok) {
            const data = await response.json();
            setBreedsList(data);
          }
        } catch (error) {
          console.error("Erro ao carregar raças:", error);
        }
      };
      fetchBreeds();
    } else {
      setBreedsList([]);
    }
  }, [speciesId]);

  const selectedBreedName = breedsList.find(b => b.breed_id === breedId)?.name || '';
  const filteredBreeds = breedsList.filter(breed => 
    breed.name.toLowerCase().includes(breedSearch.toLowerCase())
  );

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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setNewAvatarPhoto(reader.result); };
      reader.readAsDataURL(file);
    }
    e.target.value = null; 
  };

  const handleExtraPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setNewExtraPhotos(prev => [...prev, reader.result]); };
      reader.readAsDataURL(file);
    }
    e.target.value = null; 
  };
  
  const handleRemoveNewPhoto = (indexToRemove) => setNewExtraPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
  
  const handleRemoveExistingPhoto = (photoId) => {
    if (!photoId) return; 
    setPhotosToDelete(prev => [...prev, photoId]);
    setProfileData(prev => ({ ...prev, photos: prev.photos.filter(p => (p.id || p.photo_id || p.pet_photo_id) !== photoId) }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      if (activeProfile.type === 'tutor') {
        const payload = {
          username: profileData.name, 
          dob: profileData.dob ? new Date(profileData.dob).toISOString() : null,
          location: profileData.location, 
          photo: newAvatarPhoto || profileData.photo 
        };

        const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${activeProfile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const updatedUser = await response.json();
          setSaveMessage('Perfil atualizado com sucesso!');
          setNewAvatarPhoto(null);
          
          const localUser = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...localUser, username: updatedUser.user.username }));
          setRefreshTrigger(prev => prev + 1);
        } else {
          setSaveMessage('Erro ao atualizar perfil.');
        }

      } else {
        const payload = {
          name: profileData.name,
          dob: profileData.dob ? new Date(profileData.dob).toISOString() : null,
          gender: profileData.gender,
          size: profileData.size,
          energy: parseInt(profileData.energy),
          description: profileData.description,
          forAdoption: profileData.forAdoption,
          species_id: speciesId, 
          breed_id: breedId,     
          main_photo: newAvatarPhoto || profileData.main_photo, 
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
          setNewAvatarPhoto(null);
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

  const confirmDeletePet = async () => {
    setShowDeleteModal(false); // Fecha o modal primeiro
    setIsSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/pets/${activeProfile.id}`, {
        method: 'DELETE', 
      });

      if (response.ok) {
        // Redireciona o utilizador de volta para o próprio perfil sem alertas feios!
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setActiveProfile({ type: 'tutor', id: user.user_id || user.id });
      } else {
        setSaveMessage('Erro ao apagar o pet.');
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

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #D6CEC3',
    backgroundColor: 'transparent',
    outline: 'none',
    boxSizing: 'border-box' // Impede o campo de extravasar
  };

  const wrapperStyle = {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #D6CEC3',
    borderRadius: '12px',
    backgroundColor: 'transparent',
    paddingRight: '12px',
    boxSizing: 'border-box', // Impede o wrapper de extravasar
    width: '100%'
  };

  const innerInputStyle = {
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    outline: 'none',
    appearance: 'none',
    boxSizing: 'border-box',
    width: '100%'
  };

  if (isLoading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>A carregar perfil... 🐾</div>;
  if (!profileData) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Nenhum perfil encontrado.</div>;

  return (
    <div className="profile-container" style={{ backgroundColor: '#F5F2EB', minHeight: '100vh', paddingBottom: '100px', boxSizing: 'border-box' }}>
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '25px', width: '100%', maxWidth: '340px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'fadeIn 0.3s ease' }}>
            
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#ffe6e6', color: '#ff4d4d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', fontSize: '24px' }}>
              <FaTimes />
            </div>
            
            <h3 style={{ margin: '0 0 10px', color: '#333', fontSize: '20px' }}>Apagar Pet?</h3>
            
            <p style={{ margin: '0 0 25px', color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
              Tens a certeza que queres apagar este pet? Todas as fotos e dados serão perdidos. <b>Esta ação não pode ser desfeita!</b>
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '30px', backgroundColor: '#f0f0f0', color: '#333', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmDeletePet} style={{ flex: 1, padding: '14px', borderRadius: '30px', backgroundColor: '#ff4d4d', color: 'white', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                Sim, Apagar
              </button>
            </div>

          </div>
        </div>
      )}
      
      {selectedPhoto && (
        <div onClick={() => setSelectedPhoto(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaTimes /></button>
          <img src={selectedPhoto} alt="Ampliada" style={{ maxWidth: '90%', maxHeight: '80%', borderRadius: '10px', objectFit: 'contain' }} />
        </div>
      )}

      <header className="profile-header" style={{ paddingTop: '20px', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ width: '34px' }}></div> 
          <h1 className="logo-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#5C4A3D' }}>
            <FaPaw className="logo-icon" style={{ color: '#5C4A3D' }} /> Pinder
          </h1>
          <button onClick={handleLogout} title="Terminar Sessão" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: '#666', padding: '5px' }}><FaSignOutAlt /></button>
        </div>
        <h2 className="page-subtitle" style={{ color: '#5C4A3D', fontSize: '1.2rem', marginTop: '10px', fontWeight: 'bold' }}>
          {activeProfile.type === 'tutor' ? 'Editar Perfil Tutor' : 'Editar Perfil do Pet'}
        </h2>
      </header>

      <main className="profile-content" style={{ padding: '0 20px', boxSizing: 'border-box' }}>
        
        <div className="avatar-section" style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <div className="avatar-wrapper" style={{ position: 'relative', width: '130px', height: '130px', borderRadius: '50%', border: '4px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer' }} onClick={() => avatarInputRef.current.click()}>
            <img 
              src={newAvatarPhoto || profileData.main_photo || profileData.photo || "https://placehold.co/400x400/eeeeee/999999?text=Sem+Foto"} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', bottom: '5px', left: '15px', background: '#5C4A3D', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
              <FaCamera size={14} />
            </div>
            <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarChange} style={{ display: 'none' }} />
          </div>
        </div>

        {activeProfile.type === 'pet' && (
          <div className="gallery-section" style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', color: '#5C4A3D', marginBottom: '8px', display: 'block' }}>Galeria de Fotos do Pet</label>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px' }}>
              
              {profileData.photos && profileData.photos.map((p, index) => {
                const currentId = p.id || p.photo_id || p.pet_photo_id; 
                const isMain = newAvatarPhoto ? newAvatarPhoto === p.url : profileData.main_photo === p.url;
                return (
                  <div key={currentId || `old-${index}`} style={{ position: 'relative', flexShrink: 0, width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden', border: isMain ? '2px solid #5C4A3D' : '1px solid #D6CEC3' }}>
                    <img src={p.url} alt="Galeria" onClick={() => setSelectedPhoto(p.url)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} />
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveExistingPhoto(currentId); }} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FaTimes /></button>
                    <button title="Definir como principal" onClick={(e) => { e.stopPropagation(); setNewAvatarPhoto(p.url); }} style={{ position: 'absolute', bottom: '4px', left: '4px', background: isMain ? '#5C4A3D' : 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FaStar /></button>
                  </div>
                )
              })}

              {newExtraPhotos.map((photo, index) => {
                 const isMain = newAvatarPhoto === photo;
                 return (
                  <div key={`new-${index}`} style={{ position: 'relative', flexShrink: 0, width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden', border: isMain ? '2px solid #5C4A3D' : '1px solid #D6CEC3' }}>
                    <img src={photo} alt="Nova" onClick={() => setSelectedPhoto(photo)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} />
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveNewPhoto(index); }} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FaTimes /></button>
                    <button title="Definir como principal" onClick={(e) => { e.stopPropagation(); setNewAvatarPhoto(photo); }} style={{ position: 'absolute', bottom: '4px', left: '4px', background: isMain ? '#5C4A3D' : 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FaStar /></button>
                  </div>
                 )
              })}

              <div onClick={() => extraPhotoInputRef.current.click()} style={{ width: '64px', height: '64px', borderRadius: '12px', border: '1px solid #D6CEC3', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <FaPlus color="#5C4A3D" />
              </div>
              <input type="file" accept="image/*" ref={extraPhotoInputRef} onChange={handleExtraPhotoChange} style={{ display: 'none' }} />
            </div>
          </div>
        )}

        {/* GRELHA REPARADA COM BOX-SIZING */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', width: '100%', boxSizing: 'border-box' }} key={activeProfile.id}>
          
          <div className="input-group" style={{ boxSizing: 'border-box' }}>
            <label style={{ fontSize: '13px', color: '#5C4A3D', marginBottom: '6px', display: 'block' }}>Nome do {activeProfile.type === 'pet' ? 'Pet' : 'Tutor'}</label>
            <input type="text" name="name" value={profileData.name || ''} onChange={handleChange} placeholder="Ex: Buddy" style={inputStyle} />
          </div>

          <div className="input-group" style={{ boxSizing: 'border-box' }}>
            <label style={{ fontSize: '13px', color: '#5C4A3D', marginBottom: '6px', display: 'block' }}>Data de Nascimento</label>
            <input type="date" name="dob" value={formatDate(profileData.dob)} onChange={handleChange} style={inputStyle} />
          </div>

          {activeProfile.type === 'tutor' && (
            <div className="input-group" style={{ gridColumn: '1 / -1', zIndex: showLocationList ? 1001 : 1, boxSizing: 'border-box' }}>
              <label style={{ fontSize: '13px', color: '#5C4A3D', marginBottom: '6px', display: 'block' }}>Localização (Distrito)</label>
              <div className="autocomplete-container" style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                <div style={wrapperStyle}>
                  <input 
                    type="text" 
                    placeholder="Pesquisar distrito..."
                    value={showLocationList ? locationSearch : (profileData.location || '')} 
                    onChange={(e) => { setLocationSearch(e.target.value); setShowLocationList(true); }}
                    onFocus={() => { setShowLocationList(true); setLocationSearch(''); }}
                    onBlur={() => setTimeout(() => setShowLocationList(false), 200)}
                    style={innerInputStyle}
                  />
                  <FaSearch color="#999" size={14} />
                </div>
                {showLocationList && (
                  <ul className="autocomplete-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', marginTop: '4px', maxHeight: '150px', overflowY: 'auto', listStyle: 'none', padding: 0, zIndex: 10 }}>
                    {filteredDistritos.length > 0 ? filteredDistritos.map(distrito => (
                      <li key={distrito} onClick={() => { setProfileData(prev => ({ ...prev, location: distrito })); setLocationSearch(''); setShowLocationList(false); }} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>{distrito}</li>
                    )) : <li style={{ padding: '10px', color: '#999' }}>Nenhum distrito encontrado</li>}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeProfile.type === 'pet' && (
            <>
              <div className="input-group" style={{ boxSizing: 'border-box' }}>
                <label style={{ fontSize: '13px', color: '#5C4A3D', marginBottom: '6px', display: 'block' }}>Espécie</label>
                <div style={wrapperStyle}>
                  <select value={speciesId} onChange={(e) => { setSpeciesId(e.target.value); setBreedId(''); }} style={innerInputStyle}>
                    <option value="" disabled>Pesquisar espécie...</option>
                    {speciesList.map((species) => (
                      <option key={species.species_id} value={species.species_id}>{species.name}</option>
                    ))}
                  </select>
                  <FaSearch color="#999" size={14} style={{ pointerEvents: 'none' }} />
                </div>
              </div>

              <div className="input-group" style={{ zIndex: showBreedList ? 1001 : 1, boxSizing: 'border-box' }}>
                <label style={{ fontSize: '13px', color: '#5C4A3D', marginBottom: '6px', display: 'block' }}>Raça</label>
                <div className="autocomplete-container" style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                  <div style={wrapperStyle}>
                    <input 
                      type="text" 
                      placeholder={!speciesId ? 'Escolha a es...' : 'Pesquisar raça...'}
                      disabled={!speciesId}
                      value={showBreedList ? breedSearch : selectedBreedName} 
                      onChange={(e) => { setBreedSearch(e.target.value); setShowBreedList(true); setBreedId(''); }}
                      onFocus={() => setShowBreedList(true)}
                      onBlur={() => setTimeout(() => setShowBreedList(false), 200)}
                      style={innerInputStyle}
                    />
                    <FaSearch color="#999" size={14} />
                  </div>
                  {showBreedList && speciesId && (
                    <ul className="autocomplete-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', marginTop: '4px', maxHeight: '150px', overflowY: 'auto', listStyle: 'none', padding: 0, zIndex: 10 }}>
                      {filteredBreeds.length > 0 ? filteredBreeds.map((breed) => (
                        <li key={breed.breed_id} onClick={() => { setBreedId(breed.breed_id); setBreedSearch(''); setShowBreedList(false); }} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>{breed.name}</li>
                      )) : <li style={{ padding: '10px', color: '#999' }}>Nenhuma raça encontrada</li>}
                    </ul>
                  )}
                </div>
              </div>

              <div className="input-group" style={{ boxSizing: 'border-box' }}>
                <label style={{ fontSize: '13px', color: '#5C4A3D', marginBottom: '6px', display: 'block' }}>Gênero</label>
                <div style={wrapperStyle}>
                  <select name="gender" value={profileData.gender || "Macho"} onChange={handleChange} style={innerInputStyle}>
                    <option value="Macho">Macho</option>
                    <option value="Fêmea">Fêmea</option>
                  </select>
                  <FaChevronDown color="#5C4A3D" size={12} style={{ pointerEvents: 'none' }} />
                </div>
              </div>

              <div className="input-group" style={{ boxSizing: 'border-box' }}>
                <label style={{ fontSize: '13px', color: '#5C4A3D', marginBottom: '6px', display: 'block' }}>Tamanho (cm)</label>
                <input type="text" name="size" value={profileData.size || ''} onChange={handleChange} placeholder="Ex: Grande" style={inputStyle} />
              </div>

              <div className="input-group" style={{ gridColumn: '1 / -1', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '13px', color: '#5C4A3D', marginBottom: '6px', display: 'block' }}>Nível de Energia</label>
                <div style={{ border: '1px solid #D6CEC3', borderRadius: '12px', padding: '12px 20px', backgroundColor: 'transparent', boxSizing: 'border-box', width: '100%' }}>
                  <input type="range" min="1" max="5" name="energy" value={profileData.energy || 3} onChange={handleChange} style={{ width: '100%', accentColor: '#5C4A3D', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div className="input-group" style={{ gridColumn: '1 / -1', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '13px', color: '#5C4A3D', marginBottom: '6px', display: 'block' }}>Descrição</label>
                <textarea 
                  rows="4" name="description" value={profileData.description || ''} onChange={handleChange} placeholder="Conta-nos um pouco sobre o teu pet..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                ></textarea>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginTop: '5px', boxSizing: 'border-box', width: '100%' }}>
                <div style={{ flex: 1, paddingRight: '15px' }}>
                  <label style={{ display: 'block', fontSize: '16px', fontWeight: 'bold', color: '#5C4A3D', marginBottom: '4px' }}>Disponível para Adoção</label>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888', lineHeight: '1.4' }}>Ative esta opção se procura uma nova família para este pet.</p>
                </div>
                <label className="switch" style={{ flexShrink: 0, margin: 0, position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
                  <input type="checkbox" name="forAdoption" checked={profileData.forAdoption || false} onChange={handleChange} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span className="slider round" style={{ backgroundColor: profileData.forAdoption ? '#5C4A3D' : '#ccc' }}></span>
                </label>
              </div>
            </>
          )}
        </div>

        {saveMessage && (
          <div style={{ textAlign: 'center', margin: '15px 0', color: saveMessage.includes('Erro') ? 'red' : 'green', fontWeight: 'bold' }}>
            {saveMessage}
          </div>
        )}

   <div className="profile-actions" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box', width: '100%' }}>
          
          <button className="btn-save" onClick={handleSave} disabled={isSaving} style={{ width: '100%', padding: '15px', borderRadius: '30px', backgroundColor: '#5C4A3D', color: 'white', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxSizing: 'border-box' }}>
            {isSaving ? 'A guardar...' : 'Salvar Alterações'}
          </button>

          {activeProfile.type === 'pet' && (
            <button 
              onClick={() => setShowDeleteModal(true)} 
              disabled={isSaving} 
              style={{ width: '100%', padding: '15px', borderRadius: '30px', backgroundColor: 'transparent', color: '#ff4d4d', border: '2px solid #ff4d4d', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxSizing: 'border-box' }}
            >
              Apagar Pet
            </button>
          )}

        </div>
      </main>

      {/*NAVBAR CORRIGIDA E FIXA AO FUNDO DO ECRÃ */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 9999 }}>
        <BottomNav activePage="perfil" />
      </div>
    </div>
  );
}