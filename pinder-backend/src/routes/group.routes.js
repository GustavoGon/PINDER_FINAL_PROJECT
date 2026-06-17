const express = require("express");
const router = express.Router();
const groupController = require("../controllers/group.controller");

// GET /groups
router.get("/", groupController.getAllGroups);

// GET /groups/user/:user_id
router.get("/user/:user_id", groupController.getUserGroups);

// POST /groups
router.post("/", groupController.createGroup);

// GET /groups/:group_id
router.get("/:group_id", groupController.getGroupById);

// POST /groups/:group_id/join
router.post("/:group_id/join", groupController.joinGroup);

// DELETE /groups/:group_id/leave
router.delete("/:group_id/leave", groupController.leaveGroup);

// GET /groups/:group_id/attendees
router.get("/:group_id/attendees", groupController.getGroupAttendees);

// DELETE /groups/:group_id
router.delete("/:group_id", groupController.deleteGroup);

module.exports = router;
