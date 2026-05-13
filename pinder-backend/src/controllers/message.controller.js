const prisma = require("../prisma");

async function buildConversationEntry(match, currentUserId) {
  const pet1 = match.pet1;
  const pet2 = match.pet2;
  const currentUserOwnsPet1 = pet1?.owner?.user_id === currentUserId;
  const currentUserOwnsPet2 = pet2?.owner?.user_id === currentUserId;

  const otherPet = currentUserOwnsPet1 ? pet2 : pet1;
  let otherUser = otherPet?.owner;

  // Corrige o caso em que o adotante não tem pet na conversa (pet_1_id == pet_2_id)
  if (match.is_adoption && pet1 && pet2 && pet1.pet_id === pet2.pet_id) {
    if (currentUserOwnsPet1) {
      // O usuário atual é o Dono do Pet. Precisamos descobrir quem é o Adotante.
      try {
        let adopterId = null;
        // 1. Tenta encontrar a primeira mensagem enviada por outra pessoa
        const messageFromOther = await prisma.message.findFirst({
          where: { match_id: match.match_id, sender_id: { not: currentUserId } }
        });
        
        if (messageFromOther && messageFromOther.sender_id) {
          adopterId = messageFromOther.sender_id;
        } else {
          // 2. Procura a última pessoa a demonstrar interesse
          const interaction = await prisma.tutorAdoptionInteraction.findFirst({
            where: { pet_id: pet1.pet_id, like_dislike: true },
            orderBy: { timestamp: 'desc' }
          });
          if (interaction && interaction.tutor_id) adopterId = interaction.tutor_id;
        }
        if (adopterId) {
          const adopter = await prisma.user.findUnique({ where: { user_id: adopterId } });
          if (adopter) otherUser = adopter;
        }
      } catch (err) {
        console.error("Erro ao procurar adotante na conversa:", err);
      }
    }
  }

  const lastMessage = match.messages?.[0] || null;

  if (!otherPet || !otherUser) {
    return null;
  }

  return {
    id: match.match_id,
    name: otherPet.name,
    breed: otherPet.breed?.name || "Raça não definida",
    msg: lastMessage?.content || "Sem mensagens ainda",
    time: lastMessage ? lastMessage.timestamp : match.timestamp,
    lastMessageSenderId: lastMessage?.sender_id || null,
    unread: 0,
    img: otherPet.main_photo || "https://placehold.co/150x150/eeeeee/999999?text=Sem+Foto",
    matchId: match.match_id,
    otherPetId: otherPet.pet_id,
    otherUserId: otherUser.user_id,
    otherUserName: otherUser.username,
    otherUserPhoto: otherUser.photo || "https://placehold.co/100x100/eeeeee/999999?text=Sem+Avatar",
    otherUserLocation: otherUser.location || null,
    isInterested: Boolean(match.is_adoption),
    _sortTimestamp: lastMessage?.timestamp || match.timestamp,
  };
}

// POST /messages/direct - Criar ou reutilizar uma conversa direta entre dois pets
exports.getOrCreateDirectConversation = async (req, res) => {
  try {
    const { sender_pet_id, target_pet_id } = req.body;

    if (!target_pet_id) {
      return res.status(400).json({ error: "target_pet_id é obrigatório" });
    }

    const conversationPetId = sender_pet_id || target_pet_id;

    const existingMatch = await prisma.match.findFirst({
      where: {
        OR: [
          { pet_1_id: conversationPetId, pet_2_id: target_pet_id },
          { pet_1_id: target_pet_id, pet_2_id: conversationPetId },
        ],
      },
      include: {
        pet1: { include: { owner: true } },
        pet2: { include: { owner: true } },
      },
    });

    if (existingMatch) {
      if (!existingMatch.is_adoption) {
        const updatedMatch = await prisma.match.update({
          where: { match_id: existingMatch.match_id },
          data: { is_adoption: true },
          include: {
            pet1: { include: { owner: true } },
            pet2: { include: { owner: true } },
          },
        });

        return res.json(updatedMatch);
      }

      return res.json(existingMatch);
    }

    const match = await prisma.match.create({
      data: {
        pet_1_id: conversationPetId,
        pet_2_id: target_pet_id,
        is_adoption: true,
      },
      include: {
        pet1: { include: { owner: true } },
        pet2: { include: { owner: true } },
      },
    });

    return res.status(201).json(match);
  } catch (error) {
    console.error("Erro ao criar conversa direta:", error);
    res.status(500).json({ error: "Erro ao criar conversa direta" });
  }
};

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

  const io = req.app.get("io");
  if (io) {
    io.to(`match_${match_id}`).emit("receive_message", message);
  }

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

exports.getConversations = async (req, res) => {
  try {
    const { userId } = req.params;

    const userPets = await prisma.pet.findMany({
      where: { user_id: userId },
      select: { pet_id: true },
    });

    const petIds = userPets.map((pet) => pet.pet_id);
    const conversationMap = new Map();
    const unreadCounts = await prisma.message.groupBy({
      by: ["match_id"],
      where: {
        read: false,
        sender_id: { not: userId },
      },
      _count: {
        message_id: true,
      },
    });

    const unreadByMatchId = new Map(
      unreadCounts.map((entry) => [entry.match_id, entry._count.message_id])
    );

    if (petIds.length > 0) {
      const matches = await prisma.match.findMany({
        where: {
          unmatched: false,
          OR: [
            ...petIds.map((petId) => ({ pet_1_id: petId })),
            ...petIds.map((petId) => ({ pet_2_id: petId })),
          ],
        },
        include: {
          pet1: { include: { owner: true, breed: true } },
          pet2: { include: { owner: true, breed: true } },
          messages: {
            orderBy: { timestamp: "desc" },
            take: 1,
          },
        },
      });

      const builtMatches = await Promise.all(
        matches.map((match) => buildConversationEntry(match, userId))
      );

      builtMatches.forEach((entry) => {
        if (entry) {
          entry.unread = unreadByMatchId.get(entry.id) || 0;
          conversationMap.set(entry.id, entry);
        }
      });
    }

    const adoptionInteractions = await prisma.tutorAdoptionInteraction.findMany({
      where: {
        tutor_id: userId,
        like_dislike: true,
      },
      include: {
        pet: {
          include: {
            owner: true,
            breed: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
    });

    for (const adoption of adoptionInteractions) {
      const directMatch = await prisma.match.findFirst({
        where: {
          unmatched: false,
          is_adoption: true,
          OR: petIds.length
            ? [
                ...petIds.flatMap((petId) => [
                  { pet_1_id: petId, pet_2_id: adoption.pet_id },
                  { pet_1_id: adoption.pet_id, pet_2_id: petId },
                ]),
                { pet_1_id: adoption.pet_id, pet_2_id: adoption.pet_id },
              ]
            : [{ pet_1_id: adoption.pet_id, pet_2_id: adoption.pet_id }],
        },
        include: {
          pet1: { include: { owner: true, breed: true } },
          pet2: { include: { owner: true, breed: true } },
          messages: {
            orderBy: { timestamp: "desc" },
            take: 1,
          },
        },
      });

      if (!directMatch) {
        continue;
      }

      const entry = await buildConversationEntry(directMatch, userId);
      if (entry) {
        entry.unread = unreadByMatchId.get(entry.id) || 0;
        conversationMap.set(entry.id, entry);
      }
    }

    const conversations = Array.from(conversationMap.values())
      .sort((left, right) => new Date(right._sortTimestamp).getTime() - new Date(left._sortTimestamp).getTime())
      .map(({ _sortTimestamp, ...conversation }) => conversation);

    res.json(conversations);
  } catch (error) {
    console.error("Erro ao carregar conversas:", error);
    res.status(500).json({ error: "Erro ao carregar conversas" });
  }
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
