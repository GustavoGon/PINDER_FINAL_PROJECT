const express = require("express");
const router = express.Router();

const eventController = require("../controllers/event.controller");

router.get("/", eventController.getAllEvents);
router.post("/", eventController.createEvent);

router.get("/recommendations", eventController.getRecommendedEvents);

router.get("/:id", eventController.getEventById);

router.post("/:id/join", eventController.joinEvent);

router.delete("/:id/leave", eventController.leaveEvent);

router.patch("/:id/cancel", eventController.cancelEvent);

module.exports = router;
