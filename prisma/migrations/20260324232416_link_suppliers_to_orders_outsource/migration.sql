-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "OutsourceJob" ADD COLUMN     "supplierId" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutsourceJob" ADD CONSTRAINT "OutsourceJob_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
