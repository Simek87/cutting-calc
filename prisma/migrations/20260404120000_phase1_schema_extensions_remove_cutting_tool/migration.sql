-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('NewTool', 'Conversion', 'RnD', 'Custom');

-- CreateEnum
CREATE TYPE "ConversionStatus" AS ENUM ('New', 'Reuse', 'Rework');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('ToolingPlate', 'RawStock');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('Open', 'InProgress', 'Closed');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- CreateEnum
CREATE TYPE "SupplierCategory" AS ENUM ('Material', 'Gundrilling', 'Laser', 'WaterJet', 'Other');

-- AlterEnum
ALTER TYPE "AttachmentType" ADD VALUE 'NC';
ALTER TYPE "AttachmentType" ADD VALUE 'IMAGE';
ALTER TYPE "AttachmentType" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "operationId" TEXT;

-- AlterTable
ALTER TABLE "Operation" ADD COLUMN     "changedBy" TEXT,
ADD COLUMN     "programRevNote" TEXT,
ADD COLUMN     "programRevision" INTEGER,
ADD COLUMN     "statusChangedAt" TIMESTAMP(3),
ADD COLUMN     "toolList" TEXT;

-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "conversionStatus" "ConversionStatus" NOT NULL DEFAULT 'New',
ADD COLUMN     "dimX" DOUBLE PRECISION,
ADD COLUMN     "dimY" DOUBLE PRECISION,
ADD COLUMN     "dimZ" DOUBLE PRECISION,
ADD COLUMN     "materialType" "MaterialType",
ADD COLUMN     "revModel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "revProgram" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "revProgramNote" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "category" "SupplierCategory" NOT NULL DEFAULT 'Material';

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "machineTarget" TEXT,
ADD COLUMN     "projectType" "ProjectType" NOT NULL DEFAULT 'NewTool';

-- DropTable
DROP TABLE "CuttingTool";

-- DropEnum
DROP TYPE "CuttingToolMachine";

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "partId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'Open',
    "priority" "IssuePriority" NOT NULL DEFAULT 'Medium',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessCard" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "printedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printedBy" TEXT,

    CONSTRAINT "ProcessCard_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE SET NULL ON UPDATE CASCADE;
