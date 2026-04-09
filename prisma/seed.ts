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

  // ── Design Reference categories ──────────────────────────────────────────

  console.log("\nSeeding Design Reference…");

  const referenceData = [
    {
      name: "Shrinkage",
      icon: "📏",
      entries: [
        { label: "PP",   value: "1.5-2.0", unit: "%",  notes: null },
        { label: "PET",  value: "0.3-0.5", unit: "%",  notes: null },
        { label: "PS",   value: "0.4-0.6", unit: "%",  notes: null },
        { label: "PLA",  value: "0.3-0.5", unit: "%",  notes: null },
        { label: "CPET", value: "0.3-0.5", unit: "%",  notes: null },
      ],
    },
    {
      name: "Blade Standards",
      icon: "🔪",
      entries: [
        { label: "Blade offset from edge", value: "0.3",  unit: "mm",  notes: null },
        { label: "Blade holder height",    value: "TBD",  unit: "mm",  notes: null },
        { label: "Blade type standard",    value: "TBD",  unit: null,  notes: null },
      ],
    },
    {
      name: "Tool Limits — KMD 78.2",
      icon: "⚙️",
      entries: [
        { label: "Max tool size",    value: "TBD", unit: "mm", notes: null },
        { label: "Max moulding size",value: "TBD", unit: "mm", notes: null },
        { label: "Web minimum",      value: "TBD", unit: "mm", notes: null },
        { label: "Gap standard",     value: "TBD", unit: "mm", notes: null },
      ],
    },
    {
      name: "General Design",
      icon: "📐",
      entries: [
        { label: "Draft angle minimum",   value: "3",   unit: "deg", notes: null },
        { label: "Corner radius minimum", value: "0.5", unit: "mm",  notes: null },
      ],
    },
  ];

  for (let i = 0; i < referenceData.length; i++) {
    const rd = referenceData[i];
    const existing = await prisma.referenceCategory.findFirst({ where: { name: rd.name } });
    if (existing) {
      console.log(`  ↺  ${rd.name} (already exists — skipping)`);
      continue;
    }
    const cat = await prisma.referenceCategory.create({
      data: { name: rd.name, icon: rd.icon, order: i },
    });
    for (let j = 0; j < rd.entries.length; j++) {
      const e = rd.entries[j];
      await prisma.referenceEntry.create({
        data: { categoryId: cat.id, label: e.label, value: e.value, unit: e.unit, notes: e.notes, order: j },
      });
    }
    console.log(`  ✓  ${rd.name} — ${rd.entries.length} entries`);
  }

  // ── Fusion References ─────────────────────────────────────────────────────

  console.log("\nSeeding Fusion References…");

  const existingFusionRefs = await prisma.fusionRef.count();
  if (existingFusionRefs > 0) {
    console.log("  ↺  Fusion refs already seeded — skipping");
  } else {
    const fusionRefData = [
      // Moulding
      { section: "Moulding",      date: "3.2024",  path: "GENERAL/PRODUCTS/P7103",              notes: "assembly + machining" },
      { section: "Moulding",      date: "10.2024", path: "GENERAL/PRODUCTS/P7537",              notes: "Various" },
      { section: "Moulding",      date: "2.2025",  path: "GENERAL/PRODUCTS/P7609",              notes: "Design Example, Includes Bolster plate" },
      { section: "Moulding",      date: "5.2025",  path: "GENERAL/PRODUCTS/P7504",              notes: "Machining, water inlet" },
      { section: "Moulding",      date: "5.2025",  path: "GENERAL/PRODUCTS/P7555",              notes: "Cavity machining" },
      { section: "Moulding",      date: "5.2025",  path: "GENERAL/PRODUCTS/P7969",              notes: "Jakies slabe programowanie" },
      // Cutter
      { section: "Cutter",        date: "1.2024",  path: "GENERAL/PRODUCTS/M700",               notes: "Quick change cutter block, extrusion model" },
      { section: "Cutter",        date: "10.2024", path: "GENERAL/PRODUCTS/P7537",              notes: "Various" },
      { section: "Cutter",        date: "4.2025",  path: "GENERAL/PRODUCTS/P7503",              notes: "Locator Machining" },
      { section: "Cutter",        date: "5.2025",  path: "GENERAL/PRODUCTS/P7504",              notes: "Machining, Cutter locator, Cutter block" },
      { section: "Cutter",        date: "5.2025",  path: "GENERAL/PRODUCTS/P7555",              notes: "Machining, Cutter locator, Cutter block" },
      // Pusher
      { section: "Pusher",        date: "12.2023", path: "GENERAL/PRODUCTS/SK4",                notes: "Pusher Assembly" },
      { section: "Pusher",        date: "12.2023", path: "GENERAL/PRODUCTS/W125 SQC",           notes: "Pusher assembly z part; Jakis machining; square extrusion" },
      { section: "Pusher",        date: "1.2024",  path: "GENERAL/PRODUCTS/M700",               notes: "Pusher assy" },
      { section: "Pusher",        date: "10.2024", path: "GENERAL/PRODUCTS/P7537",              notes: "Cup machining" },
      { section: "Pusher",        date: "4.2025",  path: "GENERAL/PRODUCTS/P7503",              notes: "Pusher Cup Concept ** Interesting clamping design" },
      { section: "Pusher",        date: "5.2025",  path: "GENERAL/PRODUCTS/P7504",              notes: "Machining, Cutter locator, Cutter block" },
      { section: "Pusher",        date: "5.2025",  path: "GENERAL/PRODUCTS/XXL",                notes: "Pusher cups milling example, pusher mods, new back plate type **" },
      // Pressure Box
      { section: "Pressure Box",  date: "10.2024", path: "GENERAL/PRODUCTS/P7537",              notes: "Design KMD78.2 style" },
      { section: "Pressure Box",  date: "12.2024", path: "GENERAL/PRODUCTS/P7551",              notes: "Plug Machining" },
      { section: "Pressure Box",  date: "5.2025",  path: "GENERAL/PRODUCTS/P7504",              notes: "Assembly" },
      { section: "Pressure Box",  date: "5.2025",  path: "GENERAL/PRODUCTS/P7555",              notes: "Plug plates machining" },
      // Pattern
      { section: "Pattern",       date: "6.2024",  path: "GENERAL/PRODUCTS/XXL-80",             notes: "Pattern milling example" },
      { section: "Pattern",       date: "2.2025",  path: "GENERAL/PRODUCTS/P7609",              notes: "Pattern milling example" },
      { section: "Pattern",       date: "5.2025",  path: "GENERAL/PRODUCTS/P7504",              notes: "Pattern machining" },
      { section: "Pattern",       date: "5.2025",  path: "GENERAL/PRODUCTS/P7619",              notes: "Pattern milling example" },
      { section: "Pattern",       date: "5.2025",  path: "GENERAL/PRODUCTS/P7621",              notes: "Pattern milling example" },
      { section: "Pattern",       date: "5.2025",  path: "GENERAL/PRODUCTS/P7632",              notes: "Pattern milling example" },
      { section: "Pattern",       date: "5.2025",  path: "GENERAL/PRODUCTS/P7634",              notes: "Pattern milling example" },
      // Part
      { section: "Part",          date: "2.2023",  path: "GENERAL/PRODUCTS/R1 Easy Ice",        notes: "Design Produktu" },
      { section: "Part",          date: "1.2024",  path: "GENERAL/PRODUCTS/P7429",              notes: "Design Produktu owalny" },
      { section: "Part",          date: "1.2024",  path: "GENERAL/PRODUCTS/P7435",              notes: "Design Produktu hinged ** Ciekawy" },
      { section: "Part",          date: "12.2024", path: "GENERAL/PRODUCTS/P7551",              notes: "Design Produktu ** Ciekawy" },
      { section: "Part",          date: "12.2024", path: "GENERAL/PRODUCTS/P7582",              notes: "Przyklad partu z hingem i zatrzaskiem" },
      { section: "Part",          date: "12.2024", path: "GENERAL/PRODUCTS/P7602",              notes: "Design Produktu ** Ciekawy" },
      { section: "Part",          date: "5.2025",  path: "GENERAL/PRODUCTS/P7654",              notes: "Design produktu" },
      { section: "Part",          date: "5.2025",  path: "GENERAL/PRODUCTS/P7655 - Gazebo Small Rec", notes: "Design Produktu, Szkic engrave features" },
      { section: "Part",          date: "6.2025",  path: "GENERAL/PRODUCTS/P7655 - Gazebo Small Rec", notes: "Design Produktu, Szkic engrave features" },
      // All
      { section: "All",           date: "4.2025",  path: "GENERAL/PRODUCTS/P7999-CG25",         notes: "Duzo elementow" },
    ];

    await prisma.fusionRef.createMany({ data: fusionRefData });
    console.log(`  ✓  ${fusionRefData.length} fusion refs created`);
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
