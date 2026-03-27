-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "poNumber" TEXT,
ADD COLUMN     "supplierQuoteRef" TEXT;

-- AlterTable
ALTER TABLE "OutsourceJob" ADD COLUMN     "externalJobRef" TEXT;

-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "drawingRef" TEXT;

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "toolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);
