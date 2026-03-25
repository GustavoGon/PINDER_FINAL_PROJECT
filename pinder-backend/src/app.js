const express = require('express');
const cors = require('cors');
// const router = require('./routes'); // Descomente quando criar o index.js em routes

const app = express();

// --- Middlewares ---
app.use(cors()); // Permite que o seu front-end acesse a API
app.use(express.json()); // Permite que o app entenda corpo de requisição em JSON

// --- Rotas ---
// app.use('/api', router); 

// Rota de teste inicial
app.get('/', (req, res) => {
  res.status(200).send({ message: "Pinder API está rodando! 🚀" });
});

// --- Exportação ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;