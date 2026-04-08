const express = require("express");
const router = express.Router();
const petController = require("../controllers/pet.controller");

router.get("/", petController.getPets);
router.post("/", petController.createPet);
router.get('/user/:id', petController.getPetsByUser);


module.exports = router;
