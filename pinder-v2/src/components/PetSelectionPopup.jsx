import React, { useState, useEffect } from "react";
import { FaTimes, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useActiveProfile } from "../contexts/ActiveProfileContext";

export default function PetSelectionPopup({ onClose }) {
  const [pets, setPets] = useState([]);
  const [tutorData, setTutorData] = useState(null); // 👈 Novo estado para guardar a foto do Tutor
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const { activeProfile, setActiveProfile } = useActiveProfile();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const fetchDados = async () => {
      try {
        // 1. Vai buscar os pets
        const petsResponse = await fetch(`${import.meta.env.VITE_API_URL}/pets/user/${user.user_id}`);
        if (!petsResponse.ok) throw new Error("Falha ao procurar os pets.");
        const petsData = await petsResponse.json();
        setPets(petsData);

        // 2. Vai buscar a foto atualizada do Tutor à base de dados
        const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/users/${user.user_id}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setTutorData(userData);
        }

      } catch (err) {
        setError("Não foi possível carregar os perfis.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user.user_id) fetchDados();
    else {
      setIsLoading(false);
      setError("Sessão inválida. Por favor, faz login novamente.");
    }
  }, [user.user_id]);

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h3>Seus Animais<br />de Estimação</h3>
          <button className="close-popup" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="pet-list">
          {/* PERFIL DO TUTOR */}
          <div
            className={`pet-item ${activeProfile.type === "tutor" ? "pet-active" : ""}`}
            onClick={() => {
              setActiveProfile({ type: 'tutor', id: user.user_id });
              onClose();
            }}
            style={{ borderBottom: "2px dashed #D6CEC3", paddingBottom: "15px", marginBottom: "5px" }}
          >
            <img
              // 👇 Mostra a foto da BD. Se não tiver, usa o Placeholder (igual aos pets!)
              src={tutorData?.photo || "https://placehold.co/400x400/eeeeee/999999?text=Sem+Foto"}
              alt="Avatar do Tutor"
              className="pet-popup-avatar"
            />
            <div className="pet-popup-info">
              <span className="pet-popup-name">{tutorData?.username || user.username || "Tutor"}</span>
              <span className="pet-popup-breed">O meu perfil</span>
            </div>
            {activeProfile.type === "tutor" && <span className="pet-badge">Ativo</span>}
          </div>

          {/* LISTA DE PETS */}
          {isLoading ? (
            <p style={{ textAlign: "center", padding: "20px", color: "#666" }}>A carregar patas... 🐾</p>
          ) : error ? (
            <p style={{ textAlign: "center", color: "#ff4d4d", fontSize: "14px" }}>{error}</p>
          ) : pets.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: "14px", color: "#999", margin: "15px 0" }}>
              Ainda não adicionaste nenhum pet.
            </p>
          ) : (
            pets.map((pet) => (
              <div
                key={pet.pet_id}
                className={`pet-item ${activeProfile.type === "pet" && activeProfile.id === pet.pet_id ? "pet-active" : ""}`}
                onClick={() => {
                  setActiveProfile({ type: 'pet', id: pet.pet_id });
                  onClose();
                }}
              >
                <img
                  src={pet.main_photo || "https://placehold.co/400x400/eeeeee/999999?text=Sem+Foto"}
                  alt={pet.name}
                  className="pet-popup-avatar"
                />
                <div className="pet-popup-info">
                  <span className="pet-popup-name">{pet.name}</span>
                  <span className="pet-popup-breed">{pet.breed?.name || "Raça não definida"}</span>
                </div>
                {activeProfile.type === "pet" && activeProfile.id === pet.pet_id && (
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