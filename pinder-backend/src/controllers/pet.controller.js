const prisma = require("../prisma");

// GET /pets
exports.getPets = async (req, res) => {
  const pets = await prisma.pet.findMany({
    include: { owner: true },
  });
  res.json(pets);
};

// GET /pets/:id
exports.getPetById = async (req, res) => {
  try {
    const { pet_id } = req.params;
    const pet = await prisma.pet.findUnique({
      where: { pet_id: pet_id },
      include: { breed: true, species: true, photos: true } // Traz a raça, espécie e fotos do pet
    });

    if (!pet) {
      return res.status(404).json({ error: "Pet não encontrado" });
    }

    res.json(pet);
  } catch (error) {
    res.status(500).json({ error: "Erro ao procurar pet" });
  }
}

// GET /pets/user/:id
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
      dob, gender, size, energy, description, forAdoption, 
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
        forAdoption,
        main_photo: photoData || null // Guardar a foto principal diretamente na tabela pet (para facilitar consultas)
      },
    });

    res.status(201).json(pet);
  } catch (error) {
    console.error("Erro ao criar pet:", error);
    res.status(500).json({ error: "Não foi possível criar o pet." });
  }
};

// PUT /pets/:pet_id
exports.updatePet = async (req, res) => {
  try {
    const { pet_id } = req.params;
    const { 
      name, dob, gender, size, energy, description, forAdoption, 
      species_id, 
      breed_id,   
      main_photo,
      new_gallery_photos,
      deleted_photo_ids
    } = req.body;

    // Atualiza os dados na Base de Dados
    const updatedPet = await prisma.pet.update({
      where: { pet_id: pet_id },
      data: {
        name, dob, gender, size, energy, description, forAdoption,
        species_id: species_id !== undefined ? species_id : undefined,
        breed_id: breed_id !== undefined ? breed_id : undefined,       
        main_photo: main_photo !== undefined ? main_photo : undefined 
      }
    });

    // Apaga as fotos que o utilizador removeu no X
    if (deleted_photo_ids && deleted_photo_ids.length > 0) {
      await prisma.petPhoto.deleteMany({
        where: { photo_id: { in: deleted_photo_ids } }
      });
    }

    // Guarda as fotos novas da galeria
    if (new_gallery_photos && new_gallery_photos.length > 0) {
      const count = await prisma.petPhoto.count({ where: { pet_id } });
      let currentPhotoNr = count + 1;

      for (const photoData of new_gallery_photos) {
        await prisma.petPhoto.create({
          data: {
            pet_id: pet_id,
            url: photoData, 
            photo_nr: currentPhotoNr
          }
        });
        currentPhotoNr++;
      }
    }

    res.json({ message: "Pet atualizado com sucesso!", pet: updatedPet });
  } catch (error) {
    console.error("Erro ao atualizar pet:", error);
    res.status(500).json({ error: "Erro ao atualizar dados do pet." });
  }
};

exports.deletePet = async (req, res) => {
  try {
    const { pet_id } = req.params;

    await prisma.petPhoto.deleteMany({
      where: { pet_id: pet_id }
    });

    // 2º Passo: Apagar o Pet
    await prisma.pet.delete({
      where: { pet_id: pet_id }
    });

    res.status(200).json({ message: "Pet apagado com sucesso!" });
  } catch (error) {
    console.error("Erro ao apagar pet:", error);
    res.status(500).json({ error: "Erro interno ao apagar pet." });
  }
};