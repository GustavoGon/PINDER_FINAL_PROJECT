const express = require("express");
const router = express.Router();
const petController = require("../controllers/pet.controller");
const upload = require("../middleware/upload");

router.post("/adoptions", petController.saveAdoptionInteraction);
router.get("/adoptions/user/:tutor_id", petController.getTutorAdoptions);
router.get(
  "/adoptions/user/:tutor_id/seen",
  petController.getTutorSeenAdoptions,
);

router.get("/", petController.getPets);

router.post("/", petController.createPet);

router.get("/user/:id", petController.getPetsByUser);

router.get("/:pet_id", petController.getPetById);

router.put("/:pet_id", petController.updatePet);

router.delete("/:pet_id", petController.deletePet);

router.post("/upload", upload.single("photo"), async (req, res) => {
  const filePath = `/uploads/pets/${req.file.filename}`;

  res.json({ url: filePath });
});

module.exports = router;
