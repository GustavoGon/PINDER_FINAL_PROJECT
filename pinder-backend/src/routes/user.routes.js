const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

// GET all users
router.get("/", userController.getUsers);

// CREATE user
router.post("/", userController.createUser);

module.exports = router;
