const express = require("express");
const router = express.Router();
const { PORTUGUESE_DISTRICTS } = require("../constants/districts");

// GET /districts - Retorna lista de distritos de Portugal
router.get("/", (req, res) => {
  res.json(PORTUGUESE_DISTRICTS);
});

module.exports = router;
