-- CreateEnum
CREATE TYPE "Path" AS ENUM ('BEFORE', 'AFTER');

-- CreateEnum
CREATE TYPE "GoalSource" AS ENUM ('GUIDELINES', 'CARE_TEAM', 'USER_DEFINED', 'CURATED');

-- CreateEnum
CREATE TYPE "CareTeamFlag" AS ENUM ('LOW_IRON', 'LOW_VITAMIN_D', 'LOW_B12', 'HIGH_CHOLESTEROL', 'HIGH_BLOOD_SUGAR', 'HIGH_BLOOD_PRESSURE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "path" "Path" NOT NULL,
    "budget" TEXT,
    "schedule" TEXT,
    "cuisines" TEXT[],
    "religiousRules" TEXT[],
    "preferences" TEXT[],
    "allergens" TEXT[],
    "medications" TEXT[],
    "medicalHistory" TEXT,
    "careTeamFlags" "CareTeamFlag"[],
    "isPregnant" BOOLEAN NOT NULL DEFAULT false,
    "hasKidneyDisease" BOOLEAN NOT NULL DEFAULT false,
    "takesInsulin" BOOLEAN NOT NULL DEFAULT false,
    "hasEdHistory" BOOLEAN NOT NULL DEFAULT false,
    "hideCalories" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nutrient" TEXT NOT NULL,
    "targetMin" DOUBLE PRECISION,
    "targetMax" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "source" "GoalSource" NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fdcId" TEXT NOT NULL,
    "foodName" TEXT NOT NULL,
    "servingG" DOUBLE PRECISION NOT NULL,
    "nutrients" JSONB NOT NULL,
    "safetyPassed" BOOLEAN NOT NULL,

    CONSTRAINT "FoodLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLog" ADD CONSTRAINT "FoodLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
