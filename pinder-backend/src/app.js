const express = require("express");
const cors = require("cors");
const prisma = require("./prisma");

const userRoutes = require("./routes/user.routes");
const petRoutes = require("./routes/pet.routes");
const interactionRoutes = require("./routes/interaction.routes");
const matchRoutes = require("./routes/match.routes");
const messageRoutes = require("./routes/message.routes");

const app = express();

// --- Middlewares ---
app.use(cors()); // Permite que o seu front-end acesse a API
app.use(express.json()); // Permite que o app entenda corpo de requisição em JSON

// --- Rotas ---
app.use("/users", userRoutes);
app.use("/pets", petRoutes);
app.use("/interactions", interactionRoutes);
app.use("/matches", matchRoutes);
app.use("/messages", messageRoutes);

// Rota de teste inicial
app.get("/", (req, res) => {
  res.status(200).send({ message: "Pinder API is running! 🚀" });
});

async function testConnection() {
  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log("✅ DB connected:", result);
  } catch (error) {
    console.error("❌ DB connection failed:", error);
  }
}

testConnection();

// --- Exportação ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
