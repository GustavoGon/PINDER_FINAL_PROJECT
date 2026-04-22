const express = require("express");
const router = express.Router();
const groupController = require("../controllers/group.controller");

// GET /groups - Listar todos os grupos (com filtro por proximidade opcional)
router.get("/", groupController.getAllGroups);

// GET /groups/user/:user_id - Listar grupos onde user está inscrito
router.get("/user/:user_id", groupController.getUserGroups);

// POST /groups - Criar novo grupo
router.post("/", groupController.createGroup);

// GET /groups/:group_id - Detalhes de um grupo
router.get("/:group_id", groupController.getGroupById);

// POST /groups/:group_id/join - User se inscreve num grupo
router.post("/:group_id/join", groupController.joinGroup);

// DELETE /groups/:group_id/leave - User sai de um grupo
router.delete("/:group_id/leave", groupController.leaveGroup);

// GET /groups/:group_id/attendees - Listar attendees de um grupo
router.get("/:group_id/attendees", groupController.getGroupAttendees);

// DELETE /groups/:group_id - Deletar grupo (apenas criador)
router.delete("/:group_id", groupController.deleteGroup);

module.exports = router;
