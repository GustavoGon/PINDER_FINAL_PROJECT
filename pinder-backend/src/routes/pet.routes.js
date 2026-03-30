const express = require("express");
const router = express.Router();
const petController = require("../controllers/pet.controller");

router.get("/", petController.getPets);
router.post("/", petController.createPet);

module.exports = router;
