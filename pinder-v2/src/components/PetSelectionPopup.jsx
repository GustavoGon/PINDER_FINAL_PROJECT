import React, { useState, useEffect } from "react";
import { FaTimes, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function PetSelectionPopup({
  onClose,
  activePet,
  setActivePet,
}) {
  // Novos estados para guardar os pets da BD, loading e erros
  const [pets, setPets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Vai buscar os dados do utilizador que guardámos no Login
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const fetchPets = async () => {
      try {
        console.log(
          "O REACT ESTÁ A TENTAR IR PARA:",
          `${import.meta.env.VITE_API_URL}/pets/user/${user.user_id}`,
        );
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/pets/user/${user.user_id}`,
        );

        if (!response.ok) {
          throw new Error("Falha ao procurar os pets na base de dados.");
        }

        const data = await response.json();
        setPets(data);
      } catch (err) {
        console.error("Erro ao carregar pets:", err);
        setError("Não foi possível carregar os teus animais.");
      } finally {
        setIsLoading(false);
      }
    };

    // Só faz o pedido se existir um utilizador logado
    if (user.user_id) {
      fetchPets();
    } else {
      setIsLoading(false);
      setError("Sessão inválida. Por favor, faz login novamente.");
    }
  }, [user.user_id]);

  const handleSelectPet = (petId) => {
    setActivePet(petId);
    onClose();
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h3>
            Seus Animais
            <br />
            de Estimação
          </h3>
          <button className="close-popup" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="pet-list">
          {/* 1. Perfil do Tutor*/}
          <div
            className={`pet-item ${activePet === "tutor" ? "pet-active" : ""}`}
            onClick={() => handleSelectPet("tutor")}
            style={{
              borderBottom: "2px dashed #D6CEC3",
              paddingBottom: "15px",
              marginBottom: "5px",
            }}
          >
            <img
              // Se o utilizador tiver foto na BD usamos essa, senão usamos a dummy image
              src={
                user.photo ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&w=100&q=80"
              }
              alt="Avatar do Tutor"
              className="pet-popup-avatar"
            />
            <div className="pet-popup-info">
              {/* Colocamos o username aqui. Se por algum motivo falhar, diz "Tutor" */}
              <span className="pet-popup-name">{user.username || "Tutor"}</span>
              <span className="pet-popup-breed">O meu perfil</span>
            </div>
            {activePet === "tutor" && <span className="pet-badge">Ativo</span>}
          </div>

          {/* 2. Lista Dinâmica de Pets vindos da BD */}
          {isLoading ? (
            <p style={{ textAlign: "center", padding: "20px", color: "#666" }}>
              A carregar patas... 🐾
            </p>
          ) : error ? (
            <p
              style={{
                textAlign: "center",
                color: "#ff4d4d",
                fontSize: "14px",
              }}
            >
              {error}
            </p>
          ) : pets.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                fontSize: "14px",
                color: "#999",
                margin: "15px 0",
              }}
            >
              Ainda não adicionaste nenhum pet.
            </p>
          ) : (
            pets.map((pet) => (
              <div
                key={pet.id}
                className={`pet-item ${activePet === pet.id ? "pet-active" : ""}`}
                onClick={() => handleSelectPet(pet.id)}
              >
                <img
                  // Alterado para ler pet.photos em vez de pet.pet_photos
                  src={
                    pet.photos && pet.photos.length > 0
                      ? pet.photos[0].url
                      : "https://images.unsplash.com/photo-1517849845537-4d257902454a?ixlib=rb-4.0.3&w=100&q=80"
                  }
                  alt={pet.name}
                  className="pet-popup-avatar"
                />
                <div className="pet-popup-info">
                  <span className="pet-popup-name">{pet.name}</span>
                  <span className="pet-popup-breed">
                    {pet.breed?.name || "Raça não definida"}
                  </span>
                </div>
                {activePet === pet.id && (
                  <span className="pet-badge">Ativo</span>
                )}
              </div>
            ))
          )}
        </div>

        <button className="btn-add-pet" onClick={() => navigate("/add-pet")}>
          Adicionar Novo Pet <FaPlus />
        </button>

        <div className="popup-arrow"></div>
      </div>
    </div>
  );
}
