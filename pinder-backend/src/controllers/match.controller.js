const prisma = require("../prisma");

// GET /matches
exports.getMatches = async (req, res) => {
  try {
    const { petId } = req.query;

    let where = {};
    
    // Se petId foi passado, filtrar matches por esse pet
    if (petId) {
      where = {
        OR: [
          { pet_1_id: petId },
          { pet_2_id: petId }
        ],
        unmatched: false // Apenas matches ativos
      };
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        pet1: { include: { owner: true } },
        pet2: { include: { owner: true } },
      },
    });

    res.json(matches);
  } catch (error) {
    console.error("Erro ao carregar matches:", error);
    res.status(500).json({ error: "Erro ao carregar matches" });
  }
};

// PUT /matches/:match_id (Desligar um match)
exports.unmatchPets = async (req, res) => {
  try {
    const { match_id } = req.params;
    const { unmatched_by } = req.body;

    const updatedMatch = await prisma.match.update({
      where: { match_id },
      data: {
        unmatched: true,
        unmatched_by: unmatched_by || null,
        unmatch_timestamp: new Date()
      },
      include: {
        pet1: true,
        pet2: true
      }
    });

    return res.json({
      message: "Match desligado com sucesso",
      match: updatedMatch
    });
  } catch (error) {
    console.error("Erro ao desligar match:", error);
    res.status(500).json({ error: "Erro ao desligar match" });
  }
};
