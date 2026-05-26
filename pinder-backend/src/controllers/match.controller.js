const prisma = require("../prisma");
const { finalizeAdoption } = require("../services/adoption.service");

// GET /matches
exports.getMatches = async (req, res) => {
  try {
    const { petId } = req.query;

    let where = {};

    // Se petId foi passado, filtrar matches por esse pet
    if (petId) {
      where = {
        OR: [{ pet_1_id: petId }, { pet_2_id: petId }],
        unmatched: false, // Apenas matches ativos
      };
    }

    // Avoid strict `include` of `adopter` to prevent Prisma validation errors
    const includeBase = {
      pet1: { include: { owner: true } },
      pet2: { include: { owner: true } },
      messages: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    };

    const matches = await prisma.match.findMany({ where, include: includeBase });

    // If there are adopter_ids, fetch adopters in batch and attach to matches
    const adopterIds = Array.from(new Set(matches.map((m) => m.adopter_id).filter(Boolean)));
    let adoptersMap = {};
    if (adopterIds.length > 0) {
      const adopters = await prisma.user.findMany({ where: { user_id: { in: adopterIds } }, select: { user_id: true, username: true, isBanned: true, photo: true } });
      adoptersMap = adopters.reduce((acc, u) => ({ ...acc, [u.user_id]: u }), {});
    }

    const visibleMatches = matches.filter((match) => {
      const pet1OwnerBanned = Boolean(match.pet1?.owner?.isBanned);
      const pet2OwnerBanned = Boolean(match.pet2?.owner?.isBanned);
      const adopter = match.adopter_id ? adoptersMap[match.adopter_id] : null;
      const adopterBanned = adopter ? Boolean(adopter.isBanned) : false;

      // attach adopter object to the match for the response
      match.adopter = adopter || null;

      return !pet1OwnerBanned && !pet2OwnerBanned && !adopterBanned;
    });

    res.json(visibleMatches);
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
        unmatch_timestamp: new Date(),
      },
      include: {
        pet1: true,
        pet2: true,
      },
    });

    return res.json({
      message: "Match desligado com sucesso",
      match: updatedMatch,
    });
  } catch (error) {
    console.error("Erro ao desligar match:", error);
    res.status(500).json({ error: "Erro ao desligar match" });
  }
};

exports.confirmAdoption = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { userId } = req.body;

    const match = await prisma.match.findUnique({
      where: { match_id: matchId },
      include: { pet1: true, pet2: true },
    });

    if (!match || match.unmatched) {
      return res.status(400).json({ error: "Invalid match" });
    }

    const isOwner = match.pet1.user_id === userId;

    const updatedMatch = await prisma.match.update({
      where: { match_id: matchId },
      data: isOwner
        ? { adoption_confirmed_by_owner: true }
        : { adoption_confirmed_by_adopter: true },
    });

    // 🔥 call service
    if (
      updatedMatch.adoption_confirmed_by_owner &&
      updatedMatch.adoption_confirmed_by_adopter
    ) {
      await finalizeAdoption(match);
    }

    res.json(updatedMatch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
