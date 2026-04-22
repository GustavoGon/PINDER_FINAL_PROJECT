const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const upload = require("../middleware/upload");

// LOGIN user
router.post("/login", userController.loginUser);

// CREATE user
router.post("/", userController.createUser);

// GET all users
router.get("/", userController.getUsers);

// UPLOAD photo
router.post("/upload", upload.single("photo"), async (req, res) => {
  const filePath = `/uploads/users/${req.file.filename}`;

  res.json({ url: filePath });
});

// UPDATE user
router.put('/:user_id', userController.updateUser);

// GET user by ID
router.get('/:user_id', userController.getUserById);


module.exports = router;
