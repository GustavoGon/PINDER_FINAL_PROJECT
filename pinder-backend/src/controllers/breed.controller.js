const prisma = require("../prisma");

exports.getBreedsBySpecies = async (req, res) => {
  try {
    const speciesId = req.params.speciesId;

    console.log("👉 ID da espécie recebido:", speciesId);
    console.log("👉 Tipo do dado:", typeof speciesId);

    const breeds = await prisma.breed.findMany({
      where: {
        species_id: speciesId,
      },
    });

    res.json(breeds);
  } catch (error) {
    console.error("Erro ao procurar raças:", error);
    res.status(500).json({ error: "Erro ao carregar a lista de raças." });
  }
};
