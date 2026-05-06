const prisma = require("../prisma");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Connected:", socket.id);

    // 🔐 (opcional) autenticação simples via query
    const { userId } = socket.handshake.query || {};
    socket.data.userId = userId;

    // 📥 entrar numa sala (match)
    socket.on("join_chat", ({ matchId }) => {
      const room = `match_${matchId}`;
      socket.join(room);
      console.log(`➡️ ${socket.id} joined ${room}`);
    });

    // 📤 sair da sala
    socket.on("leave_chat", ({ matchId }) => {
      const room = `match_${matchId}`;
      socket.leave(room);
      console.log(`⬅️ ${socket.id} left ${room}`);
    });

    // ✉️ enviar mensagem
    socket.on("send_message", async (data, ack) => {
      try {
        const { matchId, senderId, content } = data;

        if (!matchId || !senderId || !content) {
          return ack?.({ ok: false, error: "Invalid payload" });
        }

        // 💾 guardar na DB
        const message = await prisma.message.create({
          data: {
            match_id: matchId,
            sender_id: senderId,
            content,
          },
        });

        console.log("Message saved:", message);

        const room = `match_${matchId}`;

        // 📡 emitir para todos na sala (inclui quem enviou)
        io.to(room).emit("receive_message", message);

        // 👍 confirmação ao cliente que enviou
        ack?.({ ok: true, message });
      } catch (err) {
        console.error(err);
        ack?.({ ok: false, error: "Failed to send message" });
      }
    });

    // ⌨️ typing indicator (extra)
    socket.on("typing", ({ matchId, isTyping }) => {
      const room = `match_${matchId}`;
      socket.to(room).emit("typing", {
        userId: socket.data.userId,
        isTyping,
      });
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected:", socket.id);
    });
  });
};
