-- CreateTable
CREATE TABLE "FusionRef" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FusionRef_pkey" PRIMARY KEY ("id")
);
