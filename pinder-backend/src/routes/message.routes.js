const express = require("express");
const router = express.Router();
const messageController = require("../controllers/message.controller");

router.post("/direct", messageController.getOrCreateDirectConversation);
router.get("/conversations/:userId", messageController.getConversations);
router.get("/unread/:userId", messageController.getUnreadCounts);
router.get("/:matchId", messageController.getMessages);
router.post("/", messageController.createMessage);
router.post("/:matchId/read", messageController.markAsRead);

module.exports = router;
