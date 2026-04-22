async function getRecommendations(pet_id) {
  // 🧱 1. Get current pet
  const userPet = await prisma.pet.findUnique({
    where: { pet_id },
    include: {
      owner: true,
      preferences: true,
    },
  });

  if (!userPet) {
    throw new Error("Pet not found");
  }

  // 👀 2. Get seen pets
  const seen = await prisma.interaction.findMany({
    where: { pet_id },
    select: { target_pet_id: true },
  });

  const seenIds = seen.map((s) => s.target_pet_id);

  // 🐾 3. Get candidates
  const candidates = await prisma.pet.findMany({
    where: {
      pet_id: { not: pet_id },
      NOT: { pet_id: { in: seenIds } },
    },
    include: {
      breed: true,
      characteristics: true,
      owner: true,
    },
  });

  // 🚫 4. Filter
  const filtered = candidates.filter((pet) => {
    // Skip same owner
    if (pet.user_id === userPet.user_id) return false;

    // Skip missing location
    if (!pet.owner?.latitude || !pet.owner?.longitude) return false;

    // Gender preference
    const pref = userPet.preferences?.[0];
    if (pref?.preferred_gender && pet.gender !== pref.preferred_gender) {
      return false;
    }

    return true;
  });

  // 📍 5. Distance function
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

  // 🧠 6. Scoring
  function scorePet(userPet, candidate) {
    let score = 0;

    // Breed
    if (userPet.breed_id && userPet.breed_id === candidate.breed_id) {
      score += 20;
    }

    // Size
    if (userPet.size && candidate.size && userPet.size === candidate.size) {
      score += 5;
    }

    // Energy
    if (userPet.energy && candidate.energy) {
      const diff = Math.abs(userPet.energy - candidate.energy);
      score += Math.max(0, 10 - diff);
    }

    score += Math.random() * 2;

    return score;
  }

  // 🧮 7. Score + distance
  const scored = filtered.map((pet) => {
    const distance = getDistance(
      userPet.owner.latitude,
      userPet.owner.longitude,
      pet.owner.latitude,
      pet.owner.longitude,
    );

    if (distance > 100) return false; // e.g. 100km max

    const distanceScore = Math.max(0, 50 - distance);

    return {
      ...pet,
      distance,
      score: scorePet(userPet, pet) + distanceScore,
    };
  });

  // 📊 8. Sort + return
  return scored.sort((a, b) => b.score - a.score).slice(0, 20);
}
