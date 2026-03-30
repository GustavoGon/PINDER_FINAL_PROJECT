const express = require("express");
const router = express.Router();
const controller = require("../controllers/interaction.controller");

router.post("/", controller.createInteraction);

module.exports = router;
