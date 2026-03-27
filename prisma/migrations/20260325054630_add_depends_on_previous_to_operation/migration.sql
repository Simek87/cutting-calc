-- AlterTable
ALTER TABLE "Operation" ADD COLUMN     "dependsOnPrevious" BOOLEAN NOT NULL DEFAULT true;
