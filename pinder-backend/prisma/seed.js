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
  getRandomPreferences,
} = require("./seed.utils");

const args = process.argv;

const WITH_USERS = args.includes("--with-users");

const WITH_PETS = args.includes("--with-pets");

const FULL_SEED = args.includes("--full");

const PREFERENCES = [
  { id: "pref_playful", label: "Playful" },
  { id: "pref_calm", label: "Calm" },
  { id: "pref_affectionate", label: "Affectionate" },
  { id: "pref_independent", label: "Independent" },
  { id: "pref_high_energy", label: "High Energy" },
  { id: "pref_low_energy", label: "Low Energy" },
  { id: "pref_good_with_kids", label: "Good with Kids" },
  { id: "pref_good_with_pets", label: "Good with Other Pets" },
  { id: "pref_apartment", label: "Apartment Friendly" },
  { id: "pref_needs_yard", label: "Needs Yard" },
  { id: "pref_low_maintenance", label: "Low Maintenance" },
  { id: "pref_high_grooming", label: "High Grooming Needs" },
];

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
  await prisma.petPreference.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.petPhoto.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.user.deleteMany();

  if (shouldReset === "true") {
    await prisma.characteristic.deleteMany();
    await prisma.breed.deleteMany();
    await prisma.species.deleteMany();
  }
  console.log("🌱 Deleted old data...");

  console.log("🌱 Seeding texts + preferences...");

  // Clean
  await prisma.preference.deleteMany();
  await prisma.text.deleteMany();

  // 1. Create texts
  const createdTexts = await Promise.all(
    PREFERENCES.map((p) =>
      prisma.text.create({
        data: {
          original_text: p.label,
        },
      }),
    ),
  );

  // 2. Create preferences linked to texts
  const createdPreferences = await Promise.all(
    createdTexts.map((text) =>
      prisma.preference.create({
        data: {
          text_id: text.text_id,
        },
      }),
    ),
  );

  // 3. Build prefMap: "pref_playful" → DB id
  const prefMap = {};
  createdPreferences.forEach((pref, index) => {
    prefMap[PREFERENCES[index].id] = pref.preference_id;
  });

  console.log("✅ Preferences ready");

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

  const bcrypt = require("bcrypt");
  const adminPassword = await bcrypt.hash("admin123", 10);

  const adminsData = [
    {
      email: "admin@mail.com",
      password: adminPassword,
    },
    {
      email: "admin2@mail.com",
      password: adminPassword,
    },
  ];

  const fixedUsersData = [
    {
      username: "testuser1",
      email: "test1@mail.com",
      location: "Lisbon",
      latitude: 38.7223,
      longitude: -9.1393,
    },
    {
      username: "testuser2",
      email: "test2@mail.com",
      location: "Porto",
      latitude: 41.1579,
      longitude: -8.6291,
    },
  ];

  // Optional: avoid duplicates if not resetting DB
  for (const admin of adminsData) {
    await prisma.admin.upsert({
      where: { email: admin.email },
      update: {},
      create: admin,
    });
  }

  console.log("✅ Admins created");

  if (WITH_USERS || FULL_SEED) {
    // Insert all fixed users
    const fixedUsers = [];

    for (const userData of [...fixedUsersData]) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      const user = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          isBanned: false,
        },
      });

      fixedUsers.push(user);
    }

    console.log("🌱 Creating pets for fixed users...");

    for (const user of fixedUsers) {
      const species = speciesList[0]; // Dog (safe default)
      const breed = breedsBySpecies[species.species_id][0];

      const pet = await prisma.pet.create({
        data: generatePet(user.user_id, species.species_id, breed.breed_id),
      });

      // Add preferences (reuse your logic)
      const petPrefs = getRandomPreferences(3);

      await prisma.petPreference.createMany({
        data: petPrefs.map((prefKey) => ({
          pet_id: pet.pet_id,
          preference_id: prefMap[prefKey],
          weight: faker.helpers.weightedArrayElement([
            { weight: 1, value: 0.5 },
            { weight: 2, value: 0.8 },
            { weight: 3, value: 1.0 },
          ]),
        })),
      });
    }
    console.log("🌱 Assigning preferences to fixed users...");

    for (const user of fixedUsers) {
      const userPrefs = getRandomPreferences(3);

      await prisma.userPreference.createMany({
        data: userPrefs.map((prefKey) => ({
          user_id: user.user_id,
          preference_id: prefMap[prefKey],
          weight: Math.random() * 0.5 + 0.7,
        })),
        skipDuplicates: true, // 🔥 REQUIRED
      });
    }

    console.log("✅ Fixed users created");
    const users = [...fixedUsers];

    for (let i = 0; i < process.env.NUM_USERS; i++) {
      users.push(
        await prisma.user.create({
          data: await generateUser(),
        }),
      );
    }
    // 🐶 Pets + Photos
    if (WITH_PETS || FULL_SEED) {
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

          const petPrefs = getRandomPreferences(
            faker.number.int({ min: 2, max: 4 }),
          );

          await prisma.petPreference.createMany({
            data: petPrefs.map((prefKey) => ({
              pet_id: pet.pet_id,
              preference_id: prefMap[prefKey],
              weight: Math.random() * 0.5 + 0.5,
            })),
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

        const userPrefs = getRandomPreferences(3);

        await prisma.userPreference.createMany({
          data: userPrefs.map((prefKey) => ({
            user_id: user.user_id,
            preference_id: prefMap[prefKey],
            weight: Math.random() * 0.5 + 0.7,
          })),
          skipDuplicates: true, // 🔥 REQUIRED
        });
      }

      console.log("✅ Advanced seed completed!");
    }
  }
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
