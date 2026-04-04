import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import { SECTION_TEMPLATES } from "../src/lib/operation-templates";

dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── Suppliers ─────────────────────────────────────────────────────────────

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

  // ── Part template demo tool ───────────────────────────────────────────────
  // Creates a "TEMPLATE" tool with all standard sections and default parts.
  // This serves as a reference / starting point for new tools.

  console.log("\nSeeding KMD 78.2 Standard template tool…");

  const TEMPLATE_NAME = "KMD78-TEMPLATE";

  const existing = await prisma.tool.findFirst({
    where: { projectName: TEMPLATE_NAME },
  });

  if (existing) {
    console.log(`  ↺  ${TEMPLATE_NAME} already exists — skipping`);
  } else {
    const templateTool = await prisma.tool.create({
      data: {
        projectName: TEMPLATE_NAME,
        status: "Management",
        projectType: "NewTool",
        archived: true, // kept out of active view
      },
    });

    for (const sectionTpl of SECTION_TEMPLATES) {
      const section = await prisma.section.create({
        data: {
          name: sectionTpl.code,
          toolId: templateTool.id,
        },
      });

      for (const partTpl of sectionTpl.parts) {
        await prisma.part.create({
          data: {
            toolId: templateTool.id,
            sectionId: section.id,
            name: partTpl.name,
            isStandard: partTpl.isStandard,
          },
        });
      }

      console.log(
        `  ✓  ${sectionTpl.code} — ${sectionTpl.parts.length} parts`
      );
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
