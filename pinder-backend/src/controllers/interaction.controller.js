const prisma = require("../prisma");

// POST /interactions
exports.createInteraction = async (req, res) => {
  const { pet_id, target_pet_id, like_dislike } = req.body;

  const interaction = await prisma.interaction.create({
    data: {
      pet_id,
      target_pet_id,
      like_dislike,
    },
  });

  res.status(201).json(interaction);
};
