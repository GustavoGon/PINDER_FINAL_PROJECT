const express = require("express");
const router = express.Router();
const controller = require("../controllers/message.controller");

router.get("/:matchId", controller.getMessages);
router.post("/", controller.createMessage);
router.post("/:matchId/read", messageController.markAsRead);
router.get("/unread/:userId", messageController.getUnreadCounts);

module.exports = router;
