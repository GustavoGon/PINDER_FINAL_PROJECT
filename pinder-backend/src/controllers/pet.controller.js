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

exports.getPetsByUser = async (req, res) => {
  try {
    const userId = req.params.id; 
    
    const pets = await prisma.pet.findMany({
      where: { user_id: userId },
      include: { 
    breed: true,       // Traz a raça
    photos: true   // Traz o array de fotos da tabela pet_photos
  }
    });
    
    res.json(pets); 
  } catch (error) {
    console.error("ERRO NO PRISMA:", error);
    res.status(500).json({ error: "Erro ao procurar pets" });
  }
};

// POST /pets
exports.createPet = async (req, res) => {
  try {
    // 1. Recebemos TODOS os campos que vêm do frontend
    const { 
      name, user_id, species_id, breed_id, 
      dob, gender, size, energy, description, isAdoptable, 
      photoData
    } = req.body;

    const validDob = dob ? new Date(dob).toISOString() : null;

    // 2. Criar o Pet na base de dados
    const pet = await prisma.pet.create({
      data: {
        name,
        user_id,
        species_id, 
        breed_id,
        dob: validDob,
        gender,
        size,
        energy: parseInt(energy), // Garantir que a energia é um número
        description,
        isAdoptable
      },
    });

    // 3. Se o utilizador tiver escolhido uma foto, guardamos na tabela pet_photos
    if (photoData) {
      await prisma.petPhoto.create({
        data: {
          pet_id: pet.pet_id, 
          url: photoData   
        }
      });
    }

    res.status(201).json(pet);
  } catch (error) {
    console.error("Erro ao criar pet:", error);
    res.status(500).json({ error: "Não foi possível criar o pet." });
  }
};