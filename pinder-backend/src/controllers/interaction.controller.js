const prisma = require("../prisma");

const prisma = require("../prisma");

exports.createInteraction = async (req, res) => {
  try {
    const { pet_id, target_pet_id, like_dislike } = req.body;

    // 1️⃣ Create interaction
    const interaction = await prisma.interaction.create({
      data: {
        pet_id,
        target_pet_id,
        like_dislike,
      },
    });

    // 2️⃣ Only check match if it's a LIKE
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
        // 3️⃣ Check if match already exists (avoid duplicates)
        const existingMatch = await prisma.match.findFirst({
          where: {
            OR: [
              { pet_1_id: pet_id, pet_2_id: target_pet_id },
              { pet_1_id: target_pet_id, pet_2_id: pet_id },
            ],
          },
        });

        // 4️⃣ Create match if not exists
        if (!existingMatch) {
          const match = await prisma.match.create({
            data: {
              pet_1_id: pet_id,
              pet_2_id: target_pet_id,
            },
          });

          return res.status(201).json({
            message: "🎉 It's a match!",
            match,
          });
        }
      }
    }

    // 5️⃣ Default response
    res.status(201).json({
      message: "Interaction recorded",
      interaction,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating interaction" });
  }
};
