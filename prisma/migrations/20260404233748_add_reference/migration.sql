-- CreateTable
CREATE TABLE "ReferenceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceEntry" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReferenceEntry" ADD CONSTRAINT "ReferenceEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ReferenceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
