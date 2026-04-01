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

// POST /users/login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. verificar se enviaram email e password
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 2. Procurar o utilizador pelo email BD
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    // Se o não existe, manda erro
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. Compara a password enviada com a password guardada (hash)
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 4. Login com sucesso, retorna os dados do utilizador (sem password)
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Login successful",
      user: userWithoutPassword
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error during login" });
  }
};
