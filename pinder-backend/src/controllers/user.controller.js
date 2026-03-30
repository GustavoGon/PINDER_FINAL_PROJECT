const prisma = require("../prisma");
const bcrypt = require("bcrypt");

// GET /users
exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching users" });
  }
};

// POST /users
exports.createUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // basic validation // buld better validations
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error(error);

    // Prisma unique error (email/username duplicate)
    if (error.code === "P2002") {
      return res.status(400).json({ error: "User already exists" });
    }

    res.status(500).json({ error: "Error creating user" });
  }
};
