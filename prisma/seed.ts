import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding suppliers…");

  const suppliers = [
    {
      name: "Metalweb",
      email: "alex.barker@metalweb.co.uk",
      category: "Material" as const,
      notes: "Primary aluminium & tooling plate supplier",
    },
    {
      name: "Bikar Aerospace",
      email: "adam.rogers@bikar.com",
      category: "Material" as const,
      notes: "Aerospace-grade aluminium, cast plate",
    },
    {
      name: "Stainless & Aluminium",
      email: "sales@stainlessandaluminium.co.uk",
      category: "Material" as const,
      notes: "Stainless and aluminium bar/sheet",
    },
    {
      name: "Perfect Bore",
      email: "TBD@perfectbore.co.uk",
      category: "Gundrilling" as const,
      notes: "Gun-drilling specialist",
    },
    {
      name: "Unicorn Laser",
      email: "TBD@unicorn.co.uk",
      category: "Laser" as const,
      notes: "Laser cutting & engraving",
    },
  ];

  for (const s of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (existing) {
      await prisma.supplier.update({
        where: { id: existing.id },
        data: { email: s.email, category: s.category, notes: s.notes },
      });
      console.log(`  ↺  ${s.name} (updated)`);
    } else {
      await prisma.supplier.create({ data: s });
      console.log(`  ✓  ${s.name} (created)`);
    }
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
