import { prisma } from "@/lib/prisma";
import { SuppliersClient } from "./SuppliersClient";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  return <SuppliersClient initialSuppliers={JSON.parse(JSON.stringify(suppliers))} />;
}
