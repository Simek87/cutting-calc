Prompt3.md
We need to evolve the existing toolroom app to better match real thermoforming tooling workflows.

IMPORTANT:
- Do NOT rewrite or break existing working modules (Kanban, Procurement, Outsourcing, Dashboard, ActivityLog)
- Do NOT overengineer
- Keep all changes minimal, incremental, and safe

---

CONTEXT (REAL WORKFLOW)

In our toolroom:

1. We have TOOL FAMILIES:
Example:
- Family: M700
- Tools: M700x50, M700x35, MSK700x55

2. Each TOOL is a variant of the family.

3. Each TOOL is divided into SECTIONS:
- Moulding
- Plug Assist
- Anvil
- Cutter
- Pick & Place
- Pusher

4. Each SECTION contains PARTS:
Example (Anvil):
- Anvil fixture plate (2 milling operations)
- Anvil bolster plate (2 milling operations)
- Anvil wear plate (laser + milling)

5. Each PART has:
- operations (already implemented)
- may require outsourcing (already implemented)
- may require procurement (already implemented)

6. Some parts go to LASER:
- they need DXF files
- we want to quickly prepare an email to supplier (Outlook)
- NO ZIP files
- DXF will be attached manually by the user

---

GOAL

Introduce:
- Family layer
- Section layer
- Attachment system (simple)
- Laser email preparation workflow

WITHOUT breaking existing functionality.

---

1. FAMILY MODEL

Add new model:
- Family
  - id
  - name (e.g. M700)
  - notes (optional)

Update Tool:
- add familyId (required for new tools, optional for existing for migration safety)

UI:
- minimal:
  - show family name on tool page
  - optionally simple family view (list tools + attachments)

---

2. SECTION MODEL

Add new model:
- Section
  - id
  - name (Moulding, Anvil, etc.)
  - toolId

Update Part:
- add sectionId (optional for migration safety)

UI:
- On tool page:
  - group parts by Section
  - allow assigning section to part
- Do NOT redesign entire page, just group visually

---

3. PART EXTENSIONS (FOR LASER)

Extend Part minimally (only if fields not already present):

- requiresLaser (boolean)
- material (string, optional)
- thickness (string, optional)
- qty (number or string, optional)

These are used for laser orders.

---

4. ATTACHMENT SYSTEM (MVP)

Add simple Attachment model:

- id
- name
- type (DXF / PDF / STEP)
- filePath or url
- optional:
  - partId
  - familyId

No file upload system required.
Manual entry is enough.

UI:
- On part row:
  - show attachments (especially DXF)
  - allow adding/editing attachment references
- keep UI minimal

---

5. LASER EMAIL WORKFLOW (NO ZIP, NO OUTLOOK API)

Add a simple workflow:

From tool page:
- user can select one or more parts where requiresLaser = true

Add action:
- "Compose Laser Email"

When clicked:
- generate email preview (modal or page)

Email must include:
- supplier/company (user input or existing data)
- subject
- body

Subject example:
"Laser parts request – M700x50 – Anvil"

Body must include:
- tool name
- section (if consistent or list per part)
- list of parts:
  - part name
  - qty
  - material
  - thickness
  - drawingRef (if exists)
  - DXF file names

End with:
"Please see attached DXF files."

IMPORTANT:
- DO NOT generate ZIP
- DO NOT attach files automatically
- user will attach DXF manually in Outlook

UI actions:
- Copy Subject
- Copy Body

---

6. UX RULES

- minimal industrial UI
- compact layouts
- no redesign of existing pages
- no new complex navigation
- everything should feel like an extension, not a rewrite

---

7. TECH RULES

- minimal schema changes
- migration-safe (optional fields where needed)
- reuse existing components where possible
- avoid duplicating logic
- do not break:
  - procurement
  - outsourcing
  - dashboard
  - activity log

---

8. OUTPUT AFTER IMPLEMENTATION

Report:
- new models added
- fields added to existing models
- updated components
- where:
  - family is visible
  - sections are visible
  - attachments are handled
  - laser email is triggered

Also describe:
- step-by-step user flow for:
  - adding DXF
  - selecting parts
  - composing laser email

---

9. FUTURE-READY (DO NOT IMPLEMENT NOW)

Structure the solution so it can later support:
- Outlook integration (Graph API)
- real attachments in draft emails

But DO NOT implement it now.

---

Focus on MVP that matches real workshop workflow.