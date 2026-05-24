const prisma = require("../prisma");
const { sendPushNotification } = require("../services/notification.service");

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
              pet2: { include: { owner: true } },
            },
          });

          // 🔔 notify pet1 owner
          if (match.pet1.owner.push_token) {
            await sendPushNotification({
              pushToken: match.pet1.owner.push_token,
              title: "🐾 Novo Match!",
              body: `${match.pet2.name} fez match com ${match.pet1.name}!`,
              data: {
                type: "match",
                matchId: match.match_id,
              },
            });
          }

          // 🔔 notify pet2 owner
          if (match.pet2.owner.push_token) {
            await sendPushNotification({
              pushToken: match.pet2.owner.push_token,
              title: "🐾 Novo Match!",
              body: `${match.pet1.name} fez match com ${match.pet2.name}!`,
              data: {
                type: "match",
                matchId: match.match_id,
              },
            });
          }

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
