-- CreateEnum
CREATE TYPE "ToolStatus" AS ENUM ('Management', 'CAD', 'CAM', 'Manufacturing', 'Toolmaking', 'Done');

-- CreateEnum
CREATE TYPE "PartType" AS ENUM ('standard', 'custom', 'outsource');

-- CreateEnum
CREATE TYPE "PartStatus" AS ENUM ('NotOrdered', 'Ordered', 'InProgress', 'Ready', 'Installed');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('internal', 'outsource', 'inspection', 'assembly');

-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('NotStarted', 'Ready', 'InProgress', 'Sent', 'Done', 'Blocked');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('Draft', 'Sent', 'Received', 'Cancelled');

-- CreateEnum
CREATE TYPE "OutsourceStatus" AS ENUM ('Pending', 'Sent', 'InProgress', 'Done', 'Cancelled');

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "ToolStatus" NOT NULL DEFAULT 'Management',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartType" NOT NULL DEFAULT 'standard',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "PartStatus" NOT NULL DEFAULT 'NotOrdered',
    "supplier" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "OperationType" NOT NULL DEFAULT 'internal',
    "status" "OperationStatus" NOT NULL DEFAULT 'NotStarted',
    "machine" TEXT,
    "supplier" TEXT,
    "estimatedTime" DOUBLE PRECISION,
    "actualTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'Draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eta" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutsourceJob" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "status" "OutsourceStatus" NOT NULL DEFAULT 'Pending',
    "sentDate" TIMESTAMP(3),
    "eta" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "OutsourceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "toolId" TEXT,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutsourceJob" ADD CONSTRAINT "OutsourceJob_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE SET NULL ON UPDATE CASCADE;
