const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");

const {
  uploadUserPhoto,
  uploadPetMainPhoto,
  uploadPetPhoto,
} = require("../controllers/upload.controller");

// USER PHOTO
router.post("/users/:user_id/photo", upload.single("photo"), uploadUserPhoto);

// PET MAIN PHOTO
router.post(
  "/pets/:pet_id/main-photo",
  upload.single("photo"),
  uploadPetMainPhoto,
);

// EXTRA PET PHOTO
router.post("/pets/:pet_id/photos", upload.single("photo"), uploadPetPhoto);

module.exports = router;
