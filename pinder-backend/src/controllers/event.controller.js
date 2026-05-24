const prisma = require("../prisma");

const { getEventStatus } = require("../utils/event.utils");
const { getNearbyEvents } = require("../services/event.service");

// GET /events
exports.getAllEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        creator: true,
        attendees: {
          include: {
            user: true,
            pet: true,
          },
        },
      },
      orderBy: { starts_at: "asc" },
    });

    res.json(
      events.map((event) => ({
        ...event,
        status: getEventStatus(event),
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching events" });
  }
};

// CREATE EVENT
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      starts_at,
      ends_at,
      location,
      latitude,
      longitude,
      image,
      max_attendees,
      created_by,
    } = req.body;

    console.info('[Events] Pedido para criar evento', {
      title,
      location,
      createdBy: created_by,
    });

    const event = await prisma.event.create({
      data: {
        title,
        description,
        starts_at: new Date(starts_at),
        ends_at: ends_at ? new Date(ends_at) : null,
        location,
        latitude,
        longitude,
        image,
        max_attendees,
        created_by,
      },
      include: {
        creator: true,
      },
    });

    res.status(201).json({
      ...event,
      status: getEventStatus(event),
    });

    console.info('[Events] Evento criado', {
      eventId: event.event_id,
      title: event.title,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating event" });
  }
};

// GET EVENT BY ID
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: {
        event_id: id,
      },
      include: {
        creator: true,
        attendees: {
          include: {
            user: true,
            pet: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    console.info('[Events] Evento carregado', {
      eventId: id,
      attendeeCount: event.attendees.length,
    });

    res.json({
      ...event,
      status: getEventStatus(event),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching event" });
  }
};

// JOIN EVENT
exports.joinEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, pet_id } = req.body;

    console.info('[Events] Pedido para inscrever pet', { eventId: id, userId: user_id, petId: pet_id });

    if (!pet_id) {
      return res.status(400).json({
        error: "pet_id is required",
      });
    }

    const existing = await prisma.eventAttendee.findUnique({
      where: {
        event_id_user_id_pet_id: {
          event_id: id,
          user_id,
          pet_id,
        },
      },
    });

    if (existing) {
      return res.status(400).json({
        error: "User already joined this event",
      });
    }

    const event = await prisma.event.findUnique({
      where: {
        event_id: id,
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.max_attendees && event.attendee_count >= event.max_attendees) {
      return res.status(400).json({
        error: "Event is full",
      });
    }

    await prisma.eventAttendee.create({
      data: {
        event_id: id,
        user_id,
        pet_id,
      },
    });

    await prisma.event.update({
      where: {
        event_id: id,
      },
      data: {
        attendee_count: {
          increment: 1,
        },
      },
    });

    console.info('[Events] Pet inscrito com sucesso', { eventId: id, userId: user_id, petId: pet_id });

    res.status(201).json({
      message: "Joined event successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error joining event" });
  }
};

// LEAVE EVENT
exports.leaveEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, pet_id } = req.body;

    console.info('[Events] Pedido para remover inscrição de pet', { eventId: id, userId: user_id, petId: pet_id });

    if (!pet_id) {
      return res.status(400).json({
        error: "pet_id is required",
      });
    }

    await prisma.eventAttendee.delete({
      where: {
        event_id_user_id_pet_id: {
          event_id: id,
          user_id,
          pet_id,
        },
      },
    });

    await prisma.event.update({
      where: {
        event_id: id,
      },
      data: {
        attendee_count: {
          decrement: 1,
        },
      },
    });

    console.info('[Events] Inscrição de pet removida', { eventId: id, userId: user_id, petId: pet_id });

    res.json({
      message: "Left event successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error leaving event" });
  }
};

// CANCEL EVENT
exports.cancelEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.update({
      where: {
        event_id: id,
      },
      data: {
        cancelled: true,
      },
    });

    res.json({
      ...event,
      status: getEventStatus(event),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error cancelling event" });
  }
};

// GET RECOMMENDED EVENTS
exports.getRecommendedEvents = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    console.info('[Events] Pedido de recomendações', {
      hasLatitude: Boolean(latitude),
      hasLongitude: Boolean(longitude),
    });

    const events = await getNearbyEvents(
      parseFloat(latitude),
      parseFloat(longitude),
    );

    console.info('[Events] Recomendações geradas', {
      count: events.length,
    });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching recommendations" });
  }
};
