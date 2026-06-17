const prisma = require("../prisma");

// GET /groups
exports.getAllGroups = async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;

    let where = {};

    if (latitude && longitude && radius) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusInDegrees = parseFloat(radius) / 111; // aproximado: 1 grau ≈ 111km

      where = {
        AND: [
          {
            latitude: {
              gte: lat - radiusInDegrees,
              lte: lat + radiusInDegrees,
            },
          },
          {
            longitude: {
              gte: lng - radiusInDegrees,
              lte: lng + radiusInDegrees,
            },
          },
        ],
      };
    }

    const groups = await prisma.group.findMany({
      where,
      include: {
        _count: { select: { attendees: true } },
      },
      orderBy: { date: "asc" },
    });

    res.json(groups);
  } catch (error) {
    console.error("ERRO:", error);
    res.status(500).json({ error: "Erro ao procurar grupos" });
  }
};

// GET /groups/:group_id
exports.getGroupById = async (req, res) => {
  try {
    const { group_id } = req.params;

    const group = await prisma.group.findUnique({
      where: { group_id },
      include: {
        attendees: {
          include: {
            group: false,
          },
        },
        _count: { select: { attendees: true } },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    res.json(group);
  } catch (error) {
    console.error("ERRO:", error);
    res.status(500).json({ error: "Erro ao procurar grupo" });
  }
};

// POST /groups
exports.createGroup = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      location,
      latitude,
      longitude,
      max_attendees,
      image,
      created_by,
    } = req.body;

    // Validar campos obrigatórios
    if (!title || !location || !latitude || !longitude || !created_by) {
      return res
        .status(400)
        .json({
          error:
            "Campos obrigatórios: title, location, latitude, longitude, created_by",
        });
    }

    const group = await prisma.group.create({
      data: {
        title,
        description,
        date: new Date(date),
        time,
        location,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        max_attendees: max_attendees ? parseInt(max_attendees) : null,
        image,
        created_by,
      },
    });

    res.status(201).json(group);
  } catch (error) {
    console.error("ERRO:", error);
    res.status(500).json({ error: "Erro ao criar grupo" });
  }
};

// POST /groups/:group_id/join
exports.joinGroup = async (req, res) => {
  try {
    const { group_id } = req.params;
    const { user_id, pet_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id é obrigatório" });
    }

    // Verificar se o grupo existe
    const group = await prisma.group.findUnique({
      where: { group_id },
      include: { _count: { select: { attendees: true } } },
    });

    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    const existingAttendee = await prisma.groupEventAttendee.findUnique({
      where: {
        group_id_user_id: { group_id, user_id },
      },
    });

    if (existingAttendee) {
      return res
        .status(400)
        .json({ error: "User já está inscrito neste grupo" });
    }

    if (group.max_attendees && group._count.attendees >= group.max_attendees) {
      return res.status(400).json({ error: "Grupo cheio" });
    }

    const attendee = await prisma.groupEventAttendee.create({
      data: {
        group_id,
        user_id,
        pet_id: pet_id || null,
      },
    });

    res.status(201).json(attendee);
  } catch (error) {
    console.error("ERRO:", error);
    res.status(500).json({ error: "Erro ao inscrever no grupo" });
  }
};

// DELETE /groups/:group_id/leave
exports.leaveGroup = async (req, res) => {
  try {
    const { group_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id é obrigatório" });
    }

    const attendee = await prisma.groupEventAttendee.findUnique({
      where: {
        group_id_user_id: { group_id, user_id },
      },
    });

    if (!attendee) {
      return res
        .status(404)
        .json({ error: "User não está inscrito neste grupo" });
    }

    await prisma.groupEventAttendee.delete({
      where: {
        group_id_user_id: { group_id, user_id },
      },
    });

    res.json({ message: "Removido do grupo com sucesso" });
  } catch (error) {
    console.error("ERRO:", error);
    res.status(500).json({ error: "Erro ao sair do grupo" });
  }
};

// GET /groups/:group_id/attendees
exports.getGroupAttendees = async (req, res) => {
  try {
    const { group_id } = req.params;

    const attendees = await prisma.groupEventAttendee.findMany({
      where: { group_id },
      include: {
        group: false,
      },
    });

    res.json(attendees);
  } catch (error) {
    console.error("ERRO:", error);
    res.status(500).json({ error: "Erro ao procurar attendees" });
  }
};

// DELETE /groups/:group_id
exports.deleteGroup = async (req, res) => {
  try {
    const { group_id } = req.params;
    const { user_id } = req.body;
    const forceDelete = req.body?.admin === true || req.query?.admin === "true";

    const group = await prisma.group.findUnique({
      where: { group_id },
    });

    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    if (!forceDelete && group.created_by !== user_id) {
      return res
        .status(403)
        .json({ error: "Apenas o criador pode deletar o grupo" });
    }

    await prisma.group.delete({
      where: { group_id },
    });

    res.json({ message: "Grupo deletado com sucesso" });
  } catch (error) {
    console.error("ERRO:", error);
    res.status(500).json({ error: "Erro ao deletar grupo" });
  }
};

// GET /groups/user/:user_id
exports.getUserGroups = async (req, res) => {
  try {
    const { user_id } = req.params;

    const userGroups = await prisma.groupEventAttendee.findMany({
      where: { user_id },
      include: {
        group: {
          include: {
            _count: { select: { attendees: true } },
          },
        },
      },
    });

    res.json(userGroups);
  } catch (error) {
    console.error("ERRO:", error);
    res.status(500).json({ error: "Erro ao procurar grupos do user" });
  }
};
