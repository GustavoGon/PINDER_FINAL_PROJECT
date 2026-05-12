const prisma = require("../prisma");

async function getRecommendations({ pet_id, user_id, mode = "normal" }) {
  let userPet = null;
  let userPrefs = [];
  let baseLocation = null;

  // 🐾 NORMAL MODE → use pet
  if (mode === "normal") {
    if (!pet_id) throw new Error("pet_id is required");

    userPet = await prisma.pet.findUnique({
      where: { pet_id },
      include: {
        owner: true,
        preferences: true,
      },
    });

    if (!userPet) throw new Error("Pet not found");

    baseLocation = userPet.owner;
  }

  // 🏠 ADOPTION MODE → use user
  if (mode === "adoption") {
    if (!user_id) throw new Error("user_id is required");

    const user = await prisma.user.findUnique({
      where: { user_id },
    });

    if (!user) throw new Error("User not found");

    baseLocation = user;

    userPrefs = await prisma.userPreference.findMany({
      where: { user_id },
    });
  }

  // 📍 Location validation
  const hasGPS = baseLocation?.latitude && baseLocation?.longitude;
  const hasLocation = baseLocation?.location;

  if (!hasGPS && !hasLocation) {
    throw new Error("Add location or district to profile");
  }

  // 👀 Seen pets
  let seenIds = [];
  if (mode === "normal") {
    const seen = await prisma.interaction.findMany({
      where: { pet_id },
      select: { target_pet_id: true },
    });

    seenIds = seen.map((s) => s.target_pet_id);
  } else if (mode === "adoption") {
    // 👀 Para modo adoption: buscar pets já interagidos
    const seen = await prisma.tutorAdoptionInteraction.findMany({
      where: { tutor_id: user_id },
      select: { pet_id: true },
    });

    seenIds = seen.map((s) => s.pet_id);
  }

  // 🐾 Candidates
  const candidates = await prisma.pet.findMany({
    where: {
      ...(mode === "normal" && { pet_id: { not: pet_id } }),
      ...(mode === "normal" && { NOT: { pet_id: { in: seenIds } } }),
      forAdoption: mode === "adoption",
    },
    include: {
      breed: true,
      owner: true,
      species: true,
      preferences: true,
    },
  });

  // 🚫 Filter
  function filterCandidates(pets, requireLocation = true) {
    return pets.filter((pet) => {
      if (seenIds.includes(pet.pet_id)) return false;

      // skip same owner (normal mode and adoption mode)
      if (mode === "normal" && pet.user_id === userPet.user_id) return false;
      if (mode === "adoption" && pet.user_id === user_id) return false;

      if (requireLocation) {
        if (hasGPS) {
          if (!pet.owner?.latitude || !pet.owner?.longitude) return false;
        } else if (hasLocation) {
          if (pet.owner?.location !== baseLocation.location) return false;
        }
      }

      return true;
    });
  }

  let filtered = filterCandidates(candidates, true);

  if (filtered.length === 0) {
    filtered = filterCandidates(candidates, false);
  }

  // 📍 Distance
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  // 🧠 Preference scoring
  function scorePreferences(sourcePrefs, targetPrefs) {
    let score = 0;

    for (const sPref of sourcePrefs) {
      const match = targetPrefs.find(
        (p) => p.preference_id === sPref.preference_id,
      );

      if (match) {
        const sWeight = sPref.weight || 1;
        const tWeight = match.weight || 1;
        score += sWeight * tWeight;
      }
    }

    return score;
  }

  function normalizePreferenceScore(score) {
    return Math.min(score, 5) * 10;
  }

  // 🧠 Main scoring
  function scorePet(candidate) {
    let score = 0;

    let prefRaw = 0;

    if (mode === "adoption") {
      prefRaw = scorePreferences(userPrefs, candidate.preferences);
    } else {
      prefRaw = scorePreferences(userPet.preferences, candidate.preferences);
    }

    const prefScore = normalizePreferenceScore(prefRaw);

    score += mode === "adoption" ? prefScore * 1.2 : prefScore * 1.5;

    // Extra signals only for normal
    if (mode === "normal") {
      if (userPet.breed_id === candidate.breed_id) score += 20;

      if (userPet.size && candidate.size === userPet.size) score += 5;

      if (userPet.energy && candidate.energy) {
        const diff = Math.abs(userPet.energy - candidate.energy);
        score += Math.max(0, 10 - diff);
      }
    }

    score += Math.random() * 2;

    return score;
  }

  // 🧮 Final scoring
  const scored = filtered.map((pet) => {
    let distance = 0;
    let distanceScore = 0;

    if (hasGPS) {
      distance = getDistance(
        baseLocation.latitude,
        baseLocation.longitude,
        pet.owner.latitude,
        pet.owner.longitude,
      );

      distanceScore = Math.max(0, 50 - distance);
    } else {
      distanceScore = 20;
    }

    return {
      ...pet,
      distance,
      score: scorePet(pet) + distanceScore,
    };
  });

  // 📊 Sort
  const nearby = scored
    .filter((p) => p.distance <= 100 || !hasGPS)
    .sort((a, b) => b.score - a.score);

  const distant = scored
    .filter((p) => p.distance > 100)
    .sort((a, b) => b.score - a.score);

  return [...nearby, ...distant];
}

module.exports = {
  getRecommendations,
};
