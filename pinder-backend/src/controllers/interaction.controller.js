const prisma = require("../prisma");

exports.createInteraction = async (req, res) => {
  try {
    const { pet_id, target_pet_id, like_dislike } = req.body;

    // Create interaction
    const interaction = await prisma.interaction.create({
      data: {
        pet_id,
        target_pet_id,
        like_dislike,
      },
    });

    // Only check match if it's a LIKE
    if (like_dislike) {
      // Check if reverse like exists
      const reverse = await prisma.interaction.findFirst({
        where: {
          pet_id: target_pet_id,
          target_pet_id: pet_id,
          like_dislike: true,
        },
      });

      if (reverse) {
        // Check if match already exists (avoid duplicates)
        const existingMatch = await prisma.match.findFirst({
          where: {
            OR: [
              { pet_1_id: pet_id, pet_2_id: target_pet_id },
              { pet_1_id: target_pet_id, pet_2_id: pet_id },
            ],
          },
        });

        // Create match if not exists
        if (!existingMatch) {
          const match = await prisma.match.create({
            data: {
              pet_1_id: pet_id,
              pet_2_id: target_pet_id,
            },
            include: {
              pet1: { include: { owner: true } },
              pet2: { include: { owner: true } }
            }
          });

          return res.status(201).json({
            message: "🎉 It's a match!",
            match,
          });
        }
      }
    }

    // Default response
    res.status(201).json({
      message: "Interaction recorded",
      interaction,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating interaction" });
  }
};
