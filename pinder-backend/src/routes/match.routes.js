const express = require("express");
const router = express.Router();
const matchController = require("../controllers/match.controller");

router.get("/", matchController.getMatches);
router.put("/:match_id", matchController.unmatchPets);
router.post("/:matchId/confirm-adoption", matchController.confirmAdoption);

module.exports = router;
