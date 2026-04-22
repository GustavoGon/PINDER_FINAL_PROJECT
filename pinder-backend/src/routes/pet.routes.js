const express = require("express");
const router = express.Router();
const petController = require("../controllers/pet.controller");
const upload = require("../middleware/upload");


router.get('/feed', petController.getFeedPets);

// Rota para obter recomendações inteligentes para um pet
router.get('/recommendations/:pet_id', petController.getRecommendationsPets);

// Rota para obter todos os pets
router.get("/", petController.getPets);

// Rota para criar um novo pet
router.post("/", petController.createPet);

// Rota para obter os pets de um utilizador específico
router.get('/user/:id', petController.getPetsByUser);

// Rota para obter um pet específico por ID
router.get("/:pet_id", petController.getPetById);

// Rota para atualizar um pet existente
router.put("/:pet_id", petController.updatePet);

// Rota para deletar um pet
router.delete('/:pet_id', petController.deletePet);

// Rota para upload de fotos de pets
router.post("/upload", upload.single("photo"), async (req, res) => {
  const filePath = `/uploads/pets/${req.file.filename}`;

  res.json({ url: filePath });
});

module.exports = router;
