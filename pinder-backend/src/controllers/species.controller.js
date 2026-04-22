const prisma = require("../prisma"); // Verifica se o caminho para o prisma está correto

exports.getAllSpecies = async (req, res) => {
  try {
    const species = await prisma.species.findMany();
    res.json(species);
  } catch (error) {
    console.error("Erro ao procurar espécies:", error);
    res.status(500).json({ error: "Erro ao carregar a lista de espécies." });
  }
};