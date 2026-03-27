I am building a manufacturing workflow app (Next.js + Kanban already working).

Current features:
- Kanban board with 6 columns (drag & drop)
- Tool detail page (/tools/[id])
- BOM system: parts with 6 operations (CAM, Mill, Gundrill, Finish, Inspection, Assembly)
- Sequential operations (next unlocked only when previous is Done)

Now I want to implement PROCUREMENT and OUTSOURCING modules.

GOAL:
Full visibility and control over parts, orders, and external processes.

---

1. PROCUREMENT MODULE

Requirements:
- Each part in BOM can generate procurement items
- Procurement item fields:
  - name
  - quantity
  - supplier (Hasco, Laser, Standard Parts, etc.)
  - status: "To Order" | "Ordered" | "Delivered"
  - linked projectId
  - linked partId
  - notes

Features:
- Group procurement items by supplier
- View all items per project
- Ability to mark items as ordered/delivered
- Optional: auto-create procurement items from BOM

---

2. OUTSOURCING MODULE

Requirements:
- Track parts sent outside (laser, gundrill, heat treatment)
- Fields:
  - partId
  - processType (Laser, Gundrill, Heat Treatment, etc.)
  - status: "Pending" | "Sent" | "In Progress" | "Received"
  - sentDate
  - expectedReturnDate
  - supplier
  - notes

Features:
- Show outsourcing status per part
- Integrate with Kanban if possible

---

3. UI REQUIREMENTS

- Simple dashboard:
  - Procurement grouped by supplier
  - Outsourcing list with statuses
- Keep UI minimal (industrial style, not fancy SaaS)

---

4. TECH REQUIREMENTS

- Use Next.js (app router)
- Use simple DB schema (Prisma or similar)
- Keep code modular and clean
- Avoid overengineering

---

Generate:
1. Database schema
2. API routes
3. UI components (basic)
4. Integration with existing BOM system

Focus on MVP, not perfection.