const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = require("../prisma");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const validPassword = await bcrypt.compare(password, admin.password);

    if (!validPassword) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        admin_id: admin.admin_id,
        role: "admin",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.json({ token });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

router.get("/users", adminAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany();

    res.json(users);
  } catch (error) {
    res.status(500).json({
      error: "Could not fetch users",
    });
  }
});

router.get("/pets", adminAuth, async (req, res) => {
  try {
    const pets = await prisma.pet.findMany({
      include: {
        owner: true,
        breed: true,
        species: true,
      },
    });

    res.json(pets);
  } catch (error) {
    res.status(500).json({
      error: "Could not fetch pets",
    });
  }
});

router.get("/matches", adminAuth, async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      include: {
        pet1: true,
        pet2: true,
      },
    });

    res.json(matches);
  } catch (error) {
    res.status(500).json({
      error: "Could not fetch matches",
    });
  }
});

router.get("/events", adminAuth, async (req, res) => {
  try {
    const events = await prisma.event.findMany();

    res.json(events);
  } catch (error) {
    res.status(500).json({
      error: "Could not fetch events",
    });
  }
});

module.exports = router;
