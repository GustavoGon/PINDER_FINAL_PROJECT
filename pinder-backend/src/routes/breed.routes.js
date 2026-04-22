const express = require('express');
const router = express.Router();
const breedController = require('../controllers/breed.controller');

// GET /breeds/species/:speciesId -> Devolve as raças de uma espécie específica
router.get('/species/:speciesId', breedController.getBreedsBySpecies);

module.exports = router;