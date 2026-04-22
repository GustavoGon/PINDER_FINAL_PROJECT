const prisma = require("../prisma");

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

  // 🚫 Validar localização OU distrito
  const hasGPS = userPet.owner?.latitude && userPet.owner?.longitude;
  const hasLocation = userPet.owner?.location;

  if (!hasGPS && !hasLocation) {
    console.warn(`⚠️ User pet ${pet_id} owner sem localização ou distrito!`);
    throw new Error("Por favor adiciona localização ou distrito no perfil!");
  }

  console.log(`📍 Modo: ${hasGPS ? "GPS" : "DISTRITO"} (${hasGPS ? `${userPet.owner.latitude}, ${userPet.owner.longitude}` : userPet.owner.location})`);

  // 👀 2. Get seen pets
  const seen = await prisma.interaction.findMany({
    where: { pet_id },
    select: { target_pet_id: true },
  });

  const seenIds = seen.map((s) => s.target_pet_id);
  console.log(`📊 Pet ${pet_id} já viu ${seenIds.length} pets`);

  // 🐾 3. Get candidates (TODOS os pets, independente do tipo)
  const candidates = await prisma.pet.findMany({
    where: {
      pet_id: { not: pet_id },
      // 🔑 Sem filtro de forAdoption: pets veem TODOS os outros pets
      NOT: { pet_id: { in: seenIds } },
    },
    include: {
      breed: true,
      owner: true,
      species: true,
    },
  });

  console.log(`🐾 Encontrados ${candidates.length} candidatos (todos os tipos)`);

  // 🚫 4. Filter (com lógica de GPS vs DISTRITO)
  const filtered = candidates.filter((pet) => {
    // Skip same owner
    if (pet.user_id === userPet.user_id) return false;

    // Se estamos em modo GPS: exigir coordenadas válidas
    if (hasGPS && (!pet.owner?.latitude || !pet.owner?.longitude)) {
      return false;
    }

    // Se estamos em modo DISTRITO: exigir mesmo distrito
    if (hasLocation && !hasGPS) {
      if (pet.owner?.location !== userPet.owner.location) {
        return false;
      }
    }

    // Gender preference
    const pref = userPet.preferences?.[0];
    if (pref?.preferred_gender && pet.gender !== pref.preferred_gender) {
      return false;
    }

    return true;
  });

  console.log(`✅ Após filtros: ${filtered.length} pets válidos`);

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
    let distance = 0;
    let distanceScore = 0;

    // Se temos GPS: calcular distância real
    if (hasGPS) {
      distance = getDistance(
        userPet.owner.latitude,
        userPet.owner.longitude,
        pet.owner.latitude,
        pet.owner.longitude,
      );

      if (distance > 100) return null; // Filtrar depois

      distanceScore = Math.max(0, 50 - distance);
    } else {
      // Se estamos em modo DISTRITO: todos já estão no mesmo distrito
      distanceScore = 20; // Bonus por estar no mesmo distrito
      distance = 0; // Mostrar como 0 no frontend
    }

    return {
      ...pet,
      distance,
      score: scorePet(userPet, pet) + distanceScore,
    };
  }).filter(p => p !== null); // 🧹 Remover nulls

  console.log(`🎯 Após scoring e distância: ${scored.length} pets`);

  // 📊 8. Sort + return
  return scored.sort((a, b) => b.score - a.score).slice(0, 20);
}

module.exports = {
  getRecommendations
};
