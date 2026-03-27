-- AlterTable
ALTER TABLE "Operation" ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "outsourceJobId" TEXT;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_outsourceJobId_fkey" FOREIGN KEY ("outsourceJobId") REFERENCES "OutsourceJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
