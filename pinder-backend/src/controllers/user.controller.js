const prisma = require("../prisma");

const bcrypt = require("bcrypt");

// GET /users/:user_id
exports.getUserById = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    // Vai buscar o utilizador à BD
    const user = await prisma.user.findUnique({
      where: { user_id: user_id }
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

    // basic validation
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
        isBanned: false
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
  console.log("DADOS RECEBIDOS DO MOBILE:", req.body);
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
      data: dataToUpdate
    });

    res.status(200).json({ message: "Utilizador atualizado", user: updatedUser });
  } catch (error) {
    console.error("Erro ao atualizar utilizador:", error);
    res.status(500).json({ error: "Erro interno do servidor ao atualizar utilizador." });
  }
};

// PUT /users/:user_id/location - Atualizar localização do user
exports.updateUserLocation = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { latitude, longitude, location } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude e longitude são obrigatórias" });
    }

    // Se location não é enviado, manter o valor anterior
    const dataToUpdate = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    // Só atualizar location se for explicitamente enviado
    if (location !== undefined) {
      dataToUpdate.location = location;
    }

    const updatedUser = await prisma.user.update({
      where: { user_id },
      data: dataToUpdate
    });

    res.status(200).json({ message: "Localização atualizada", user: updatedUser });
  } catch (error) {
    console.error("Erro ao atualizar localização:", error);
    res.status(500).json({ error: "Erro ao atualizar localização" });
  }
};