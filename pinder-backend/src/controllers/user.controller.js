const prisma = require("../prisma");

const bcrypt = require("bcrypt");

// GET /users/:user_id
exports.getUserById = async (req, res) => {
  try {
    const { user_id } = req.params;

    const user = await prisma.user.findUnique({
      where: { user_id: user_id },
    });

    if (!user) {
      return res.status(404).json({ error: "Utilizador não encontrado" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Erro ao procurar utilizador:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

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
    const { username, email, password, district, dob, photo } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        location: district || null,
        dob: dob ? new Date(dob) : null,
        photo: photo || null,
        isBanned: false,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(400).json({ error: "User already exists" });
    }

    res.status(500).json({ error: "Error creating user" });
  }
};

// POST /users/login
exports.loginUser = async (req, res) => {
  console.log("DADOS RECEBIDOS DO MOBILE:", req.body);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.isBanned) {
      return res.status(403).json({
        error:
          "A tua conta foi banida. Contacta o suporte para mais informações.",
        code: "USER_BANNED",
      });
    }

    // 4. Login com sucesso, retorna os dados do utilizador (sem password)
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Login successful",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error during login" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { username, dob, location, photo, isBanned } = req.body;

    // Construir objeto de dados dinamicamente (só enviar o que foi realmente alterado)
    const dataToUpdate = {};

    if (username !== undefined) dataToUpdate.username = username;
    if (dob !== undefined) dataToUpdate.dob = dob;
    if (location !== undefined) dataToUpdate.location = location;
    if (photo !== undefined) dataToUpdate.photo = photo;
    if (isBanned !== undefined) dataToUpdate.isBanned = isBanned;

    // Atualiza o utilizador na base de dados
    const updatedUser = await prisma.user.update({
      where: { user_id: user_id },
      data: dataToUpdate,
    });

    res
      .status(200)
      .json({ message: "Utilizador atualizado", user: updatedUser });
  } catch (error) {
    console.error("Erro ao atualizar utilizador:", error);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao atualizar utilizador." });
  }
};

// PUT /users/:user_id/location
exports.updateUserLocation = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { latitude, longitude, location } = req.body;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "Latitude e longitude são obrigatórias" });
    }

    const dataToUpdate = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    };

    if (location !== undefined) {
      dataToUpdate.location = location;
    }

    const updatedUser = await prisma.user.update({
      where: { user_id },
      data: dataToUpdate,
    });

    res
      .status(200)
      .json({ message: "Localização atualizada", user: updatedUser });
  } catch (error) {
    console.error("Erro ao atualizar localização:", error);
    res.status(500).json({ error: "Erro ao atualizar localização" });
  }
};

exports.savePushToken = async (req, res) => {
  try {
    const { userId, token } = req.body;

    await prisma.user.update({
      where: {
        user_id: userId,
      },
      data: {
        push_token: token,
      },
    });

    res.json({
      ok: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to save push token",
    });
  }
};
