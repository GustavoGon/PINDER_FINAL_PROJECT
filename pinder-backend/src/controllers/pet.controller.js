const prisma = require("../prisma");

// GET /pets
exports.getPets = async (req, res) => {
  const pets = await prisma.pet.findMany({
    include: { owner: true },
  });
  res.json(pets);
};

// POST /pets
exports.createPet = async (req, res) => {
  const { name, user_id, species_id, breed_id } = req.body;

  const pet = await prisma.pet.create({
    data: {
      name,
      user_id,
      species_id,
      breed_id,
    },
  });

  res.status(201).json(pet);
};
