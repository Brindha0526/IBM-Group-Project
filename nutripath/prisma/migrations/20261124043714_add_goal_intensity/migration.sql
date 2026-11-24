-- CreateEnum
CREATE TYPE "GoalIntensity" AS ENUM ('MODERATE', 'AGGRESSIVE', 'LEAN', 'STANDARD');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "goalIntensity" "GoalIntensity";
