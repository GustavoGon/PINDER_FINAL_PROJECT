const express = require('express');
const router = express.Router();
const speciesController = require('../controllers/species.controller');

// GET /species -> Devolve todas as espécies
router.get('/', speciesController.getAllSpecies);

module.exports = router;