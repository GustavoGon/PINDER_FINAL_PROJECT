const prisma = require("../prisma");

const { getEventStatus } = require("../utils/event.utils");
const { getNearbyEvents } = require("../services/event.service");

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

    const existing = await prisma.eventAttendee.findUnique({
      where: {
        event_id_user_id: {
          event_id: id,
          user_id,
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
    const { user_id } = req.body;

    await prisma.eventAttendee.delete({
      where: {
        event_id_user_id: {
          event_id: id,
          user_id,
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

    const events = await getNearbyEvents(
      parseFloat(latitude),
      parseFloat(longitude),
    );

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching recommendations" });
  }
};
