const prisma = require("../prisma");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Connected:", socket.id);

    const { userId } = socket.handshake.query || {};
    socket.data.userId = userId;

    socket.on("join_chat", ({ matchId }) => {
      const room = `match_${matchId}`;
      socket.join(room);
      console.log(`➡️ ${socket.id} joined ${room}`);
    });

    socket.on("leave_chat", ({ matchId }) => {
      const room = `match_${matchId}`;
      socket.leave(room);
      console.log(`⬅️ ${socket.id} left ${room}`);
    });

    socket.on("send_message", async (data, ack) => {
      try {
        const { matchId, senderId, content } = data;

        if (!matchId || !senderId || !content) {
          return ack?.({ ok: false, error: "Invalid payload" });
        }

        const match = await prisma.match.findUnique({
          where: { match_id: matchId },
          include: {
            pet1: { include: { owner: true } },
            pet2: { include: { owner: true } },
          },
        });

        if (!match) return ack?.({ ok: false, error: "Match not found" });

        let allowed = false;
        if (
          match.pet1?.owner?.user_id === senderId ||
          match.pet2?.owner?.user_id === senderId
        ) {
          allowed = true;
        }

        if (!allowed && match.is_adoption) {
          const adoptionInteraction =
            await prisma.tutorAdoptionInteraction.findFirst({
              where: {
                tutor_id: senderId,
                pet_id: { in: [match.pet_1_id, match.pet_2_id] },
              },
            });
          if (adoptionInteraction) allowed = true;
        }

        if (!allowed)
          return ack?.({
            ok: false,
            error: "Not authorized for this conversation",
          });

        const message = await prisma.message.create({
          data: {
            match_id: matchId,
            sender_id: senderId,
            content,
          },
        });

        console.log("Message saved:", message);

        const room = `match_${matchId}`;

        io.to(room).emit("receive_message", message);

        ack?.({ ok: true, message });
      } catch (err) {
        console.error(err);
        ack?.({ ok: false, error: "Failed to send message" });
      }
    });

    socket.on("typing", ({ matchId, isTyping }) => {
      const room = `match_${matchId}`;
      socket.to(room).emit("typing", {
        userId: socket.data.userId,
        isTyping,
      });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected:", socket.id);
    });
  });
};
