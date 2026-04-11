const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { faker } = require("@faker-js/faker");
const fs = require("fs");
const csv = require("csv-parser");
const {
  generateUser,
  generatePet,
  generatePhoto,
  normalizeHeaders,
  parseRange,
} = require("./seed.utils");

const readline = require("readline");

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase());
    }),
  );
}

async function main() {
  console.log("🌱 Seeding advanced data...");

  const shouldReset = process.env.RESET_DB === "true";

  // 🧹 Always clean dynamic data
  await prisma.petPhoto.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.user.deleteMany();

  if (shouldReset === "true") {
    await prisma.characteristic.deleteMany();
    await prisma.breed.deleteMany();
    await prisma.species.deleteMany();
  }
  console.log("🌱 Deleted old data...");

  // 🐾 Species (only if empty or reset)
  let dogSpecies, catSpecies;

  const existingSpecies = await prisma.species.findMany();

  if (existingSpecies.length === 0) {
    console.log("🌱 Seeding species...");
    dogSpecies = await prisma.species.create({
      data: { name: "Dog" },
    });

    catSpecies = await prisma.species.create({
      data: { name: "Cat" },
    });
    console.log("🌱 Seeding breeds...");
    await seedDogs(dogSpecies);
    await seedCats(catSpecies);
  } else {
    console.log("⚡ Using existing species & breeds");

    dogSpecies = existingSpecies.find((s) => s.name === "Dog");
    catSpecies = existingSpecies.find((s) => s.name === "Cat");
  }

  // ✅ Load once
  const speciesList = await prisma.species.findMany();
  const breeds = await prisma.breed.findMany();

  const breedsBySpecies = Object.groupBy(breeds, (b) => b.species_id);

  // 👤 Users
  console.log("🌱 Seeding Users...");
  const users = [];

  for (let i = 0; i < process.env.NUM_USERS; i++) {
    users.push(
      await prisma.user.create({
        data: await generateUser(),
      }),
    );
  }
  // 🐶 Pets + Photos
  console.log("🌱 Seeding pets...");
  for (const user of users) {
    const numPets = faker.number.int({ min: 1, max: 3 });

    for (let i = 0; i < numPets; i++) {
      const species = faker.helpers.arrayElement(speciesList);
      const speciesBreeds = breedsBySpecies[species.species_id] || [];

      if (!speciesBreeds.length) continue;

      const breed = faker.helpers.arrayElement(speciesBreeds);

      const pet = await prisma.pet.create({
        data: generatePet(
          user.user_id,
          species.species_id,
          breed.breed_id,
          species.name,
        ),
      });

      const photos = Array.from({
        length: faker.number.int({ min: 1, max: 3 }),
      }).map((_, i) => ({
        pet_id: pet.pet_id,
        url: generatePhoto(species.name),
        photo_nr: i + 1,
      }));

      await prisma.petPhoto.createMany({ data: photos });
    }
  }

  console.log("✅ Advanced seed completed!");
}

async function seedDogs(dogSpecies) {
  const rows = [];

  await new Promise((resolve) => {
    fs.createReadStream("prisma/dog_breeds.csv")
      .pipe(csv())
      .on("data", (row) => rows.push(normalizeHeaders(row)))
      .on("end", resolve);
  });

  for (const row of rows) {
    if (!row["Breed"]) continue;

    try {
      const breed = await prisma.breed.create({
        data: {
          name: row["Breed"],
          species_id: dogSpecies.species_id,
        },
      });

      const characteristics = [];

      for (const [key, config] of Object.entries(DOG_MAP)) {
        const value = row[key];
        if (!value) continue;

        if (config.kind === "range") {
          const parsed = parseRange(value);
          if (!parsed) continue;

          characteristics.push({
            breed_id: breed.breed_id,
            type: config.type,
            lower_bound: parsed.min_value,
            upper_bound: parsed.max_value,
          });
        } else {
          characteristics.push({
            breed_id: breed.breed_id,
            type: config.type,
            string_value: value,
          });
        }
      }

      if (characteristics.length) {
        await prisma.characteristic.createMany({
          data: characteristics,
        });
      }
    } catch (err) {
      console.error("Dog error:", row["Breed"], err.message);
    }
  }
}

async function seedCats(catSpecies) {
  const rows = [];

  await new Promise((resolve) => {
    fs.createReadStream("prisma/cats_dataset.csv")
      .pipe(csv())
      .on("data", (row) => rows.push(normalizeHeaders(row)))
      .on("end", resolve);
  });

  for (const row of rows) {
    if (!row["Breed"]) continue;

    try {
      const breed = await prisma.breed.create({
        data: {
          name: row["Breed"],
          species_id: catSpecies.species_id,
        },
      });

      const characteristics = [];

      for (const [key, config] of Object.entries(CAT_MAP)) {
        const value = row[key];
        if (!value) continue;

        if (config.kind === "number") {
          const num = parseFloat(value);
          if (isNaN(num)) continue;

          characteristics.push({
            breed_id: breed.breed_id,
            type: config.type,
            exact_value: num,
          });
        } else {
          characteristics.push({
            breed_id: breed.breed_id,
            type: config.type,
            string_value: value,
          });
        }
      }

      if (characteristics.length) {
        await prisma.characteristic.createMany({
          data: characteristics,
        });
      }
    } catch (err) {
      console.error("Cat error:", row["Breed"], err.message);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
