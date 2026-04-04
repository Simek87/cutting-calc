-- CreateEnum
CREATE TYPE "TodoColumn" AS ENUM ('MyTasks', 'Hurco', 'Danusys');

-- CreateTable
CREATE TABLE "TodoItem" (
    "id" TEXT NOT NULL,
    "column" "TodoColumn" NOT NULL,
    "text" TEXT NOT NULL,
    "subtext" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "linkedPartId" TEXT,
    "linkedOperationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoItem_pkey" PRIMARY KEY ("id")
);
