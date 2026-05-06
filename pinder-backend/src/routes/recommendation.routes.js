// routes/recommendation.routes.js

const express = require("express");
const router = express.Router();
const recommendationController = require("../controllers/recommendation.controller");

router.get("/", recommendationController.getRecommendations);

module.exports = router;
