const express = require("express");
const router = express.Router();
const messageController = require("../controllers/message.controller");

router.get("/:matchId", messageController.getMessages);
router.post("/", messageController.createMessage);
router.post("/:matchId/read", messageController.markAsRead);
router.get("/unread/:userId", messageController.getUnreadCounts);

module.exports = router;
