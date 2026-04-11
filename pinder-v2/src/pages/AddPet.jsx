import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaw, FaCamera, FaChevronDown, FaArrowLeft, FaSearch } from 'react-icons/fa';
import './css/DashboardTutor.css';
import BottomNav from '../components/BottomNav';
import { useLoading } from '../contexts/LoadingContext';

export default function AddPet() {
  const navigate = useNavigate();
  const { isLoading, setIsLoading } = useLoading();
  const fileInputRef = useRef(null);

  // Estados para as listas vindas da BD
  const [speciesList, setSpeciesList] = useState([]);
  const [breedsList, setBreedsList] = useState([]);

  // Estados do Autocomplete: ESPÉCIE
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [showSpeciesList, setShowSpeciesList] = useState(false);

  // Estados do Autocomplete: RAÇA
  const [breedSearch, setBreedSearch] = useState('');
  const [showBreedList, setShowBreedList] = useState(false);

  // Estados do formulário
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [speciesId, setSpeciesId] = useState(''); 
  const [breedId, setBreedId] = useState('');     
  const [gender, setGender] = useState('Macho');
  const [size, setSize] = useState('');
  const [energy, setEnergy] = useState(3);
  const [description, setDescription] = useState('');
  const [forAdoption, setForAdoption] = useState(false);
  
  const [photoPreview, setPhotoPreview] = useState("https://images.unsplash.com/photo-1543466835-00a7907e9de1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80");
  const [photoData, setPhotoData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Carregar Espécies
  useEffect(() => {
    const fetchSpecies = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/species`);
        if (response.ok) {
          const data = await response.json();
          setSpeciesList(data);
        }
      } catch (error) {
        console.error('Erro ao carregar espécies:', error);
      }
    };
    fetchSpecies();
  }, []);

  // 2. Carregar Raças
  useEffect(() => {
    const fetchBreeds = async () => {
      if (!speciesId) {
        setBreedsList([]);
        return;
      }
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/breeds/species/${speciesId}`);
        if (response.ok) {
          const data = await response.json();
          setBreedsList(data);
        }
      } catch (error) {
        console.error('Erro ao carregar raças:', error);
      }
    };
    fetchBreeds();
  }, [speciesId]);

  const handleCameraClick = () => { fileInputRef.current.click(); };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        setPhotoData(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- LÓGICA DOS AUTOCOMPLETES ---
  
  // Filtra as espécies (mostra max 10)
  const filteredSpecies = speciesList
    .filter(s => s.name.toLowerCase().includes(speciesSearch.toLowerCase()))
    .slice(0, 10);
  const selectedSpeciesName = speciesList.find(s => s.species_id === speciesId)?.name || '';

  // Filtra as raças (mostra max 10)
  const filteredBreeds = breedsList
    .filter(b => b.name.toLowerCase().includes(breedSearch.toLowerCase()))
    .slice(0, 10);
  const selectedBreedName = breedsList.find(b => b.breed_id === breedId)?.name || '';

  // Fecha todas as listas
  const closeAllLists = () => {
    setShowSpeciesList(false);
    setShowBreedList(false);
  };

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!speciesId || !breedId) {
      setErrorMessage('Por favor, seleciona a Espécie e a Raça do teu pet.');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.user_id) {
      setErrorMessage('Sessão inválida. Faz login novamente.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, user_id: user.user_id, species_id: speciesId, breed_id: breedId,
          dob, gender, size, energy, description, forAdoption, photoData 
        }),
      });

      if (response.ok) navigate(-1);
      else {
        const data = await response.json();
        setErrorMessage(data.error || 'Erro ao adicionar o pet.');
      }
    } catch (error) {
      setErrorMessage('Não foi possível ligar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-container">
      {/* Overlay invisível para fechar qualquer lista aberta ao clicar fora */}
      {(showBreedList || showSpeciesList) && (
        <div className="autocomplete-overlay" onClick={closeAllLists}></div>
      )}

      <header className="profile-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#666', padding: '5px' }}>
            <FaArrowLeft />
          </button>
          <h1 className="logo-title" style={{ margin: 0 }}><FaPaw className="logo-icon" /> Pinder</h1>
          <div style={{ width: '24px' }}></div> 
        </div>
        <h2 className="page-subtitle">Adicionar Novo Pet</h2>
      </header>

      <main className="profile-content">
        <form onSubmit={handleSubmit}>
          
          <div className="avatar-section">
            <div className="avatar-wrapper">
              <img src={photoPreview} alt="Novo Pet" className="avatar-image" style={{ objectFit: 'cover' }} />
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} style={{ display: 'none' }} />
              <button type="button" className="btn-icon btn-camera" onClick={handleCameraClick}>
                <FaCamera />
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label>Nome do Pet</label>
              <div className="input-with-icon">
                <input type="text" placeholder="Ex: Buddy" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            </div>
            
            <div className="input-group">
              <label>Data de Nascimento</label>
              <div className="input-with-icon">
                <input 
                  type="date" 
                  value={dob} 
                  onChange={(e) => setDob(e.target.value)} 
                />
              </div>
            </div>

            {/* AUTOCOMPLETE DA ESPÉCIE */}
            <div className="input-group" style={{ zIndex: showSpeciesList ? 1002 : 1 }}>
              <label>Espécie</label>
              <div className="autocomplete-container">
                <div className="input-with-icon">
                  <input 
                    type="text" 
                    placeholder="Pesquisar espécie..."
                    value={showSpeciesList ? speciesSearch : selectedSpeciesName} 
                    onChange={(e) => {
                      setSpeciesSearch(e.target.value);
                      setShowSpeciesList(true);
                      
                      // Ao começar a escrever na espécie, limpamos tudo para forçar nova escolha
                      setSpeciesId(''); 
                      setBreedId('');
                      setBreedSearch('');
                    }}
                    onFocus={() => {
                      setShowSpeciesList(true);
                      setShowBreedList(false); // Fecha a de baixo se estiver aberta
                    }}
                    required
                  />
                  <FaSearch className="edit-icon dropdown-icon" style={{ fontSize: '12px' }} />
                </div>

                {showSpeciesList && (
                  <ul className="autocomplete-list">
                    {filteredSpecies.length > 0 ? (
                      filteredSpecies.map((species) => (
                        <li 
                          key={species.species_id} 
                          className="autocomplete-item"
                          onClick={() => {
                            setSpeciesId(species.species_id); // Guarda o ID da espécie
                            setSpeciesSearch('');             // Limpa a pesquisa
                            setShowSpeciesList(false);        // Fecha a lista
                            
                            // Limpa a raça sempre que troca de espécie
                            setBreedId('');
                            setBreedSearch('');
                          }}
                        >
                          {species.name}
                        </li>
                      ))
                    ) : (
                      <li className="autocomplete-empty">Nenhuma espécie encontrada</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* AUTOCOMPLETE DA RAÇA */}
            <div className="input-group" style={{ zIndex: showBreedList ? 1001 : 1 }}>
              <label>Raça</label>
              <div className="autocomplete-container">
                <div className="input-with-icon">
                  <input 
                    type="text" 
                    placeholder={!speciesId ? 'Primeiro escolhe a espécie' : 'Pesquisar raça...'}
                    disabled={!speciesId}
                    value={showBreedList ? breedSearch : selectedBreedName} 
                    onChange={(e) => {
                      setBreedSearch(e.target.value);
                      setShowBreedList(true);
                      setBreedId(''); 
                    }}
                    onFocus={() => {
                      setShowBreedList(true);
                      setShowSpeciesList(false); // Fecha a de cima se estiver aberta
                    }}
                    required
                  />
                  <FaSearch className="edit-icon dropdown-icon" style={{ fontSize: '12px' }} />
                </div>

                {showBreedList && speciesId && (
                  <ul className="autocomplete-list">
                    {filteredBreeds.length > 0 ? (
                      filteredBreeds.map((breed) => (
                        <li 
                          key={breed.breed_id} 
                          className="autocomplete-item"
                          onClick={() => {
                            setBreedId(breed.breed_id); 
                            setBreedSearch('');         
                            setShowBreedList(false);    
                          }}
                        >
                          {breed.name}
                        </li>
                      ))
                    ) : (
                      <li className="autocomplete-empty">Nenhuma raça encontrada</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="input-group">
              <label>Gênero</label>
              <div className="input-with-icon">
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="Macho">Macho</option>
                  <option value="Fêmea">Fêmea</option>
                </select>
                <FaChevronDown className="edit-icon dropdown-icon" />
              </div>
            </div>

            <div className="input-group">
              <label>Tamanho (cm)</label>
              <div className="input-with-icon">
                <input type="text" placeholder="Ex: Médio" value={size} onChange={(e) => setSize(e.target.value)} />
              </div>
            </div>

            <div className="input-group">
              <label>Nível de Energia</label>
              <div className="slider-container">
                <input type="range" min="1" max="5" value={energy} onChange={(e) => setEnergy(e.target.value)} className="energy-slider" />
              </div>
            </div>
          </div>

          <div className="input-group description-group">
            <label>Descrição</label>
            <div className="input-with-icon">
              <textarea rows="4" placeholder="Conta-nos um pouco sobre o teu pet..." value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
            </div>
          </div>

          <div className="adoption-toggle-container">
            <div className="adoption-info">
              <label>Disponível para Adoção</label>
              <p>Ative esta opção se procura uma nova família para este pet.</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={forAdoption} onChange={(e) => setForAdoption(e.target.checked)} />
              <span className="slider round"></span>
            </label>
          </div>

          {errorMessage && (
            <div style={{ color: '#ff4d4d', textAlign: 'center', margin: '10px 0', fontSize: '14px' }}>
              {errorMessage}
            </div>
          )}

          <div className="profile-actions">
            <button type="submit" className="btn-save" disabled={isLoading}>
              {isLoading ? 'A Guardar...' : 'Adicionar Pet'}
            </button>
          </div>
        </form>
      </main>
      <BottomNav activePage="perfil" />
    </div>
  );
}