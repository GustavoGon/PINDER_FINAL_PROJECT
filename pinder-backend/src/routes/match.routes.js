const express = require("express");
const router = express.Router();
const controller = require("../controllers/match.controller");

router.get("/", controller.getMatches);

module.exports = router;
