const express = require("express");
const router = express.Router();
const { PORTUGUESE_DISTRICTS } = require("../constants/districts");

// GET /districts
router.get("/", (req, res) => {
  res.json(PORTUGUESE_DISTRICTS);
});

module.exports = router;
