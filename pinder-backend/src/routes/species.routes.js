const express = require("express");
const router = express.Router();
const speciesController = require("../controllers/species.controller");

// GET /species
router.get("/", speciesController.getAllSpecies);

module.exports = router;
