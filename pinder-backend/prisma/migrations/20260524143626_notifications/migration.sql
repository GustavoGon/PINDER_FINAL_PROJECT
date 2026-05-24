-- CreateEnum
CREATE TYPE "CharacteristicType" AS ENUM ('ORIGIN', 'FUR_COLOR', 'HEIGHT', 'EYE_COLOR', 'LIFE_SPAN', 'TEMPERAMENT', 'HEALTH_ISSUES', 'AGE', 'WEIGHT', 'COLOR', 'GENDER');

-- CreateTable
CREATE TABLE "admins" (
    "admin_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "photo" TEXT,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "dob" TIMESTAMP(3),
    "description" TEXT,
    "isBanned" BOOLEAN NOT NULL,
    "push_token" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "pets" (
    "pet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species_id" TEXT NOT NULL,
    "breed_id" TEXT,
    "main_photo" TEXT,
    "gender" TEXT,
    "dob" TIMESTAMP(3),
    "size" TEXT,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "energy" INTEGER,
    "description" TEXT,
    "forAdoption" BOOLEAN NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("pet_id")
);

-- CreateTable
CREATE TABLE "species" (
    "species_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "species_pkey" PRIMARY KEY ("species_id")
);

-- CreateTable
CREATE TABLE "breeds" (
    "breed_id" TEXT NOT NULL,
    "species_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "breeds_pkey" PRIMARY KEY ("breed_id")
);

-- CreateTable
CREATE TABLE "pet_photos" (
    "photo_id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "photo_nr" INTEGER NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "pet_photos_pkey" PRIMARY KEY ("photo_id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "interaction_id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "target_pet_id" TEXT NOT NULL,
    "like_dislike" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("interaction_id")
);

-- CreateTable
CREATE TABLE "matches" (
    "match_id" TEXT NOT NULL,
    "pet_1_id" TEXT NOT NULL,
    "pet_2_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unmatched" BOOLEAN NOT NULL DEFAULT false,
    "unmatched_by" TEXT,
    "unmatch_timestamp" TIMESTAMP(3),
    "is_adoption" BOOLEAN NOT NULL DEFAULT false,
    "adopter_id" TEXT,
    "adoption_confirmed_by_owner" BOOLEAN NOT NULL DEFAULT false,
    "adoption_confirmed_by_adopter" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "adoptions" (
    "adoption_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "current_owner" TEXT NOT NULL,
    "previous_owner" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adoptions_pkey" PRIMARY KEY ("adoption_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "message_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "texts" (
    "text_id" TEXT NOT NULL,
    "original_text" TEXT NOT NULL,

    CONSTRAINT "texts_pkey" PRIMARY KEY ("text_id")
);

-- CreateTable
CREATE TABLE "translated_texts" (
    "text_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "translated_texts_pkey" PRIMARY KEY ("text_id","language")
);

-- CreateTable
CREATE TABLE "preferences" (
    "preference_id" TEXT NOT NULL,
    "text_id" TEXT NOT NULL,

    CONSTRAINT "preferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "user_id" TEXT NOT NULL,
    "preference_id" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id","preference_id")
);

-- CreateTable
CREATE TABLE "pet_preferences" (
    "pet_id" TEXT NOT NULL,
    "preference_id" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "pet_preferences_pkey" PRIMARY KEY ("pet_id","preference_id")
);

-- CreateTable
CREATE TABLE "characteristics" (
    "characteristic_id" TEXT NOT NULL,
    "breed_id" TEXT NOT NULL,
    "type" "CharacteristicType" NOT NULL,
    "lower_bound" DOUBLE PRECISION,
    "upper_bound" DOUBLE PRECISION,
    "exact_value" DOUBLE PRECISION,
    "string_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "characteristics_pkey" PRIMARY KEY ("characteristic_id")
);

-- CreateTable
CREATE TABLE "events" (
    "event_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "image" TEXT,
    "max_attendees" INTEGER,
    "attendee_count" INTEGER NOT NULL DEFAULT 0,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "event_attendees" (
    "event_attendee_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pet_id" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("event_attendee_id")
);

-- CreateTable
CREATE TABLE "tutor_adoption_interactions" (
    "adoption_id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "like_dislike" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutor_adoption_interactions_pkey" PRIMARY KEY ("adoption_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "breeds_name_species_id_key" ON "breeds"("name", "species_id");

-- CreateIndex
CREATE UNIQUE INDEX "adoptions_match_id_key" ON "adoptions"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendees_event_id_user_id_pet_id_key" ON "event_attendees"("event_id", "user_id", "pet_id");

-- CreateIndex
CREATE UNIQUE INDEX "tutor_adoption_interactions_tutor_id_pet_id_key" ON "tutor_adoption_interactions"("tutor_id", "pet_id");

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("species_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_breed_id_fkey" FOREIGN KEY ("breed_id") REFERENCES "breeds"("breed_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breeds" ADD CONSTRAINT "breeds_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("species_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_photos" ADD CONSTRAINT "pet_photos_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("pet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("pet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_target_pet_id_fkey" FOREIGN KEY ("target_pet_id") REFERENCES "pets"("pet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_adopter_id_fkey" FOREIGN KEY ("adopter_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_pet_1_id_fkey" FOREIGN KEY ("pet_1_id") REFERENCES "pets"("pet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_pet_2_id_fkey" FOREIGN KEY ("pet_2_id") REFERENCES "pets"("pet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoptions" ADD CONSTRAINT "adoptions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("match_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoptions" ADD CONSTRAINT "adoptions_current_owner_fkey" FOREIGN KEY ("current_owner") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoptions" ADD CONSTRAINT "adoptions_previous_owner_fkey" FOREIGN KEY ("previous_owner") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("match_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translated_texts" ADD CONSTRAINT "translated_texts_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "texts"("text_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "texts"("text_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_preference_id_fkey" FOREIGN KEY ("preference_id") REFERENCES "preferences"("preference_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_preferences" ADD CONSTRAINT "pet_preferences_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("pet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_preferences" ADD CONSTRAINT "pet_preferences_preference_id_fkey" FOREIGN KEY ("preference_id") REFERENCES "preferences"("preference_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characteristics" ADD CONSTRAINT "characteristics_breed_id_fkey" FOREIGN KEY ("breed_id") REFERENCES "breeds"("breed_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("pet_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_adoption_interactions" ADD CONSTRAINT "tutor_adoption_interactions_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_adoption_interactions" ADD CONSTRAINT "tutor_adoption_interactions_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("pet_id") ON DELETE RESTRICT ON UPDATE CASCADE;
