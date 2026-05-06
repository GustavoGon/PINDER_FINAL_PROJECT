const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { getEventStatus } = require("../utils/event.utils");

exports.getNearbyEvents = async (latitude, longitude) => {
  const events = await prisma.event.findMany({
    where: {
      cancelled: false,
    },
    include: {
      attendees: {
        include: {
          user: true,
          pet: true,
        },
      },
      creator: true,
    },
  });

  const scored = events.map((event) => {
    const distance = getDistance(
      latitude,
      longitude,
      event.latitude,
      event.longitude,
    );

    return {
      ...event,
      status: getEventStatus(event),
      distance,
      score: 100 - distance + event.attendee_count,
    };
  });

  return scored
    .filter((e) => e.distance < 50)
    .sort((a, b) => b.score - a.score);
};

function getDistance(lat1, lon1, lat2, lon2) {
  const dx = lat1 - lat2;
  const dy = lon1 - lon2;

  return Math.sqrt(dx * dx + dy * dy) * 111;
}
