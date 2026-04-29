const express = require("express");
const router = express.Router();
const controller = require("../controllers/match.controller");

router.get("/", controller.getMatches);
router.put("/:match_id", controller.unmatchPets);
router.post("/:matchId/confirm-adoption", matchController.confirmAdoption);

module.exports = router;
