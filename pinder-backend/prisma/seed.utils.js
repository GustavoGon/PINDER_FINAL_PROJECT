const { faker } = require("@faker-js/faker");
const bcrypt = require("bcrypt");

const cities = [
  { city: "Lisbon", lat: 38.7223, lng: -9.1393 },
  { city: "Porto", lat: 41.1579, lng: -8.6291 },
  { city: "Braga", lat: 41.5454, lng: -8.4265 },
  { city: "Coimbra", lat: 40.2033, lng: -8.4103 },
  { city: "Aveiro", lat: 40.6405, lng: -8.6538 },
  { city: "Faro", lat: 37.0194, lng: -7.9304 },
  { city: "Setúbal", lat: 38.5244, lng: -8.8882 },
  { city: "Leiria", lat: 39.7436, lng: -8.8071 },
  { city: "Évora", lat: 38.5714, lng: -7.9135 },
  { city: "Viseu", lat: 40.661, lng: -7.9097 },
  { city: "Guimarães", lat: 41.4425, lng: -8.2918 },
  { city: "Castelo Branco", lat: 39.8222, lng: -7.4909 },
  { city: "Viana do Castelo", lat: 41.6918, lng: -8.8345 },
  { city: "Santarém", lat: 39.2362, lng: -8.6853 },
  { city: "Beja", lat: 38.0151, lng: -7.8632 },
  { city: "Portalegre", lat: 39.2967, lng: -7.428 },
  { city: "Bragança", lat: 41.806, lng: -6.7567 },
  { city: "Guarda", lat: 40.5373, lng: -7.2658 },
  { city: "Covilhã", lat: 40.2833, lng: -7.5033 },
  { city: "Tomar", lat: 39.601, lng: -8.4092 },
];

// Generate user
async function generateUser() {
  const hashedPassword = await bcrypt.hash("123456", 10);
  const place = faker.helpers.arrayElement(cities);

  return {
    username: faker.internet.username(),
    email: faker.internet.email(),
    password: hashedPassword,
    location: place.city,
    latitude: place.lat,
    longitude: place.lng,
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
