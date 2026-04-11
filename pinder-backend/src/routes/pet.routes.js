const express = require("express");
const router = express.Router();
const petController = require("../controllers/pet.controller");
const upload = require("../middleware/upload");

router.get("/", petController.getPets);
router.post("/", petController.createPet);
router.get('/user/:id', petController.getPetsByUser);


router.post("/upload", upload.single("photo"), async (req, res) => {
  const filePath = `/uploads/pets/${req.file.filename}`;

  res.json({ url: filePath });
});

module.exports = router;
