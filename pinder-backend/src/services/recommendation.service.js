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

  // 🚫 4. Filter com estratégia de fallback (3 níveis)
  
  // Função auxiliar para filtrar
  function filterCandidates(pets, requireLocation = true, requirePreference = true) {
    return pets.filter((pet) => {
      // Skip same owner - SEMPRE
      if (pet.user_id === userPet.user_id) return false;

      // Nível 1: Exigir localização se ativado
      if (requireLocation) {
        if (hasGPS) {
          // Modo GPS: exigir coordenadas
          if (!pet.owner?.latitude || !pet.owner?.longitude) return false;
        } else if (hasLocation) {
          // Modo DISTRITO: exigir mesmo distrito
          if (pet.owner?.location !== userPet.owner.location) return false;
        }
      }

      // Nível 2: Exigir preferência se ativado
      if (requirePreference) {
        const pref = userPet.preferences?.[0];
        if (pref?.preferred_gender && pet.gender !== pref.preferred_gender) {
          return false;
        }
      }

      return true;
    });
  }

  // Tentar progressivamente com fallback
  let filtered = filterCandidates(candidates, true, true); // Localização + Preferências
  console.log(`✅ Nível 1 (localização + preferências): ${filtered.length} pets`);

  if (filtered.length === 0) {
    filtered = filterCandidates(candidates, true, false); // Localização apenas
    console.log(`📍 Nível 2 (localização apenas): ${filtered.length} pets`);
  }

  if (filtered.length === 0) {
    filtered = filterCandidates(candidates, false, false); // Sem filtros
    console.log(`🌍 Nível 3 (sem localização): ${filtered.length} pets`);
  }

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

  // 🧮 7. Score + distance (sem filtrar distância ainda)
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

      // Calcular score baseado na distância (sem filtrar 100km agora)
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
  });

  console.log(`🎯 Após scoring e distância: ${scored.length} pets`);

  // 📊 8. Separar: Próximos (<=100km) e Distantes (>100km)
  const nearby = scored.filter(p => p.distance <= 100 || !hasGPS).sort((a, b) => b.score - a.score);
  const distant = scored.filter(p => p.distance > 100).sort((a, b) => b.score - a.score);

  console.log(`📍 Próximos (<=100km): ${nearby.length}, Distantes (>100km): ${distant.length}`);

  // 🎯 9. Retornar: Próximos primeiro, depois distantes (sem limite rígido)
  const recommendations = [
    ...nearby,
    ...distant
  ];

  console.log(`✅ Retornando ${recommendations.length} recomendações (${nearby.length} próximos + ${distant.length} distantes)`);
  
  return recommendations;
}

module.exports = {
  getRecommendations
};
