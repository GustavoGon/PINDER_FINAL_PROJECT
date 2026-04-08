const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const upload = require("../middleware/upload");

// GET all users
router.get("/", userController.getUsers);

// CREATE user
router.post("/", userController.createUser);

// UPLOAD photo
router.post("/upload", upload.single("photo"), async (req, res) => {
  const filePath = `/uploads/users/${req.file.filename}`;

  res.json({ url: filePath });
});

module.exports = router;
