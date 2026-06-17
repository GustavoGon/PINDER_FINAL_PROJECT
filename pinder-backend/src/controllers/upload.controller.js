const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const uploadToCloudinary = require("../utils/cloudinaryUpload");

exports.uploadUserPhoto = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    const result = await uploadToCloudinary(req.file.buffer, "pinder/users");

    const user = await prisma.user.update({
      where: {
        user_id,
      },
      data: {
        photo: result.secure_url,
      },
    });

    res.json({
      message: "User photo uploaded",
      photo: result.secure_url,
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Upload failed",
    });
  }
};

exports.uploadPetMainPhoto = async (req, res) => {
  try {
    const { pet_id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      "pinder/pets/main",
    );

    const pet = await prisma.pet.update({
      where: {
        pet_id,
      },
      data: {
        main_photo: result.secure_url,
      },
    });

    res.json({
      message: "Pet main photo uploaded",
      photo: result.secure_url,
      pet,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Upload failed",
    });
  }
};

exports.uploadPetPhoto = async (req, res) => {
  try {
    const { pet_id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    const existingPhotos = await prisma.petPhoto.count({
      where: {
        pet_id,
      },
    });

    const result = await uploadToCloudinary(
      req.file.buffer,
      "pinder/pets/photos",
    );

    const photo = await prisma.petPhoto.create({
      data: {
        pet_id,
        url: result.secure_url,
        photo_nr: existingPhotos + 1,
      },
    });

    res.json({
      message: "Pet photo uploaded",
      photo,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Upload failed",
    });
  }
};
