const { faker } = require("@faker-js/faker");
const bcrypt = require("bcrypt");

// Generate user
async function generateUser() {
  const hashedPassword = await bcrypt.hash("123456", 10);
  return {
    username: faker.internet.username(),
    email: faker.internet.email(),
    password: hashedPassword,
    isBanned: false,
  };
}

// Generate pet
function generatePet(userId, speciesId, breedId) {
  return {
    name: faker.animal.dog(),
    user_id: userId,
    species_id: speciesId,
    breed_id: breedId,
    description: faker.lorem.sentence(),
    forAdoption: false,
  };
}

function generatePhoto(speciesName) {
  if (speciesName === "Dog") {
    return `https://placedog.net/500?id=${faker.number.int(1000)}`;
  }

  if (speciesName === "Cat") {
    return `https://placekitten.com/500/500?image=${faker.number.int(16)}`;
  }

  if (speciesName === "Bird") {
    return `https://loremflickr.com/500/500/bird?random=${faker.number.int(1000)}`;
  }

  // fallback
  return faker.image.url();
}

function parseRange(value) {
  if (!value) return null;

  const numbers = value.toString().match(/\d+/g);
  if (!numbers) return null;

  if (numbers.length === 1) {
    return {
      min_value: Number(numbers[0]),
      max_value: Number(numbers[0]),
    };
  }

  return {
    min_value: Number(numbers[0]),
    max_value: Number(numbers[1]),
  };
}

function normalizeHeaders(row) {
  const newRow = {};
  for (const key in row) {
    newRow[key.trim()] = row[key];
  }
  return newRow;
}

module.exports = {
  generateUser,
  generatePet,
  generatePhoto,
  parseRange,
  normalizeHeaders,
};
