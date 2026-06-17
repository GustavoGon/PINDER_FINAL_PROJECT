const express = require("express");
const router = express.Router();
const breedController = require("../controllers/breed.controller");

// GET /breeds/species/:speciesId
router.get("/species/:speciesId", breedController.getBreedsBySpecies);

module.exports = router;
