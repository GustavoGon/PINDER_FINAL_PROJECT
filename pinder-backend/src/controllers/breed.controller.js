const prisma = require("../prisma");

exports.getBreedsBySpecies = async (req, res) => {
  try {
    // Pega no ID da espécie que vem no URL
     const speciesId = req.params.speciesId;

     console.log("👉 ID da espécie recebido:", speciesId);
     console.log("👉 Tipo do dado:", typeof speciesId);

    const breeds = await prisma.breed.findMany({
      where: { 
        species_id: speciesId // Confirma se a coluna se chama "species_id" no schema.prisma
      }
    });
    
    res.json(breeds);
  } catch (error) {
    console.error("Erro ao procurar raças:", error);
    res.status(500).json({ error: "Erro ao carregar a lista de raças." });
  }
};