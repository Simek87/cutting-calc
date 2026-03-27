-- CreateEnum
CREATE TYPE "CuttingToolMachine" AS ENUM ('Danusys', 'Hurco', 'Both');

-- CreateTable
CREATE TABLE "CuttingTool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "machine" "CuttingToolMachine" NOT NULL,
    "toolType" TEXT,
    "diameter" DOUBLE PRECISION NOT NULL,
    "cornerRadius" DOUBLE PRECISION,
    "flutes" INTEGER NOT NULL,
    "notes" TEXT,
    "vc" DOUBLE PRECISION,
    "rpm" DOUBLE PRECISION,
    "feed" DOUBLE PRECISION,
    "fz" DOUBLE PRECISION,
    "ap" DOUBLE PRECISION,
    "ae" DOUBLE PRECISION,
    "mrr" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuttingTool_pkey" PRIMARY KEY ("id")
);
