// routes/recommendation.routes.js

const express = require("express");
const router = express.Router();
const recommendationController = require("../controllers/recommendation.controller");

router.get("/:pet_id", recommendationController.getRecommendations);

module.exports = router;
