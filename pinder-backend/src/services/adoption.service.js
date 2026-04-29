const prisma = require("../prisma");

async function finalizeAdoption(match) {
  const pet = match.pet1; // adoptable pet
  const previousOwner = pet.user_id;
  const newOwner = match.pet2.user_id;

  await prisma.$transaction([
    prisma.adoption.create({
      data: {
        match_id: match.match_id,
        current_owner: newOwner,
        previous_owner: previousOwner,
      },
    }),

    prisma.pet.update({
      where: { pet_id: pet.pet_id },
      data: {
        user_id: newOwner,
        previous_owner_id: previousOwner,
        forAdoption: false,
      },
    }),
  ]);
}

module.exports = { finalizeAdoption };
