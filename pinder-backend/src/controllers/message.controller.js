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

exports.markAsRead = async (req, res) => {
  const { matchId } = req.params;
  const { userId } = req.body;

  await prisma.message.updateMany({
    where: {
      match_id: matchId,
      sender_id: { not: userId }, // only messages from OTHER user
      read: false,
    },
    data: { read: true },
  });

  res.json({ success: true });
};

exports.getUnreadCounts = async (req, res) => {
  const { userId } = req.params;

  const counts = await prisma.message.groupBy({
    by: ["match_id"],
    where: {
      read: false,
      sender_id: { not: userId },
    },
    _count: {
      message_id: true,
    },
  });

  res.json(counts);
};

exports.getLastMessages = async (req, res) => {
  const { userId } = req.params;

  const matches = await prisma.match.findMany({
    where: {
      unmatched: false,
    },
    include: {
      messages: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    },
  });

  res.json(matches);
};
