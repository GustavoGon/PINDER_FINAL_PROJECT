const prisma = require("../prisma");

// GET messages for a match
exports.getMessages = async (req, res) => {
  const { matchId } = req.params;

  const messages = await prisma.message.findMany({
    where: { match_id: matchId },
    orderBy: { timestamp: "asc" },
  });

  res.json(messages);
};

// POST message
exports.createMessage = async (req, res) => {
  const { match_id, sender_id, content } = req.body;

  const message = await prisma.message.create({
    data: {
      match_id,
      sender_id,
      content,
    },
  });

  res.status(201).json(message);
};
