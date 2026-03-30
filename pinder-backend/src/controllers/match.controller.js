const prisma = require("../prisma");

// GET /matches
exports.getMatches = async (req, res) => {
  const matches = await prisma.match.findMany({
    include: {
      pet1: true,
      pet2: true,
    },
  });

  res.json(matches);
};
