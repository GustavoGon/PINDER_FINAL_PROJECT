require("dotenv").config();

const express = require("express");
const cors = require("cors");
const prisma = require("./prisma");
const http = require("http");
const { Server } = require("socket.io");

const userRoutes = require("./routes/user.routes");
const petRoutes = require("./routes/pet.routes");
const interactionRoutes = require("./routes/interaction.routes");
const matchRoutes = require("./routes/match.routes");
const messageRoutes = require("./routes/message.routes");
const recommendationRoutes = require("./routes/recommendation.routes");
const speciesRoutes = require("./routes/species.routes");
const breedRoutes = require("./routes/breed.routes");
const groupRoutes = require("./routes/group.routes");
const districtRoutes = require("./routes/district.routes");
const uploadRoutes = require("./routes/upload.routes");
const setupChatSockets = require("./sockets/chat.socket");
const eventRoutes = require("./routes/event.routes");
const app = express();
const server = http.createServer(app);

// --- Middlewares ---
app.use(cors()); // Permite que o seu front-end acesse a API
app.use(express.json({ limit: "50mb" })); // Permite que o app entenda corpo de requisição em JSON e aumenta o limite para uploads de fotos
app.use(express.urlencoded({ limit: "50mb", extended: true })); // Permite que o app entenda dados de formulário (para uploads de fotos)

// --- Rotas ---
app.use("/users", userRoutes);
app.use("/species", speciesRoutes);
app.use("/breeds", breedRoutes);
app.use("/pets", petRoutes);
app.use("/interactions", interactionRoutes);
app.use("/matches", matchRoutes);
app.use("/messages", messageRoutes);
app.use("/groups", groupRoutes);
app.use("/districts", districtRoutes);
app.use("/recommendations", recommendationRoutes);
app.use("/events", eventRoutes);
app.use("/upload", uploadRoutes);

// Rota de teste inicial
app.get("/", (req, res) => {
  res.status(200).send({ message: "Pinder API is running! 🚀" });
});

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.set("io", io);
setupChatSockets(io);

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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}🌐`);
});

module.exports = app;
