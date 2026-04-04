Claude Code Brief
Enviropax Tooling Project Manager
Full rebuild & extension brief  —  April 2026  —  v1.0

1. Project Context
You are working on an existing Next.js application called 'Toolroom Dashboard' located in E:\Projekty-IT\Enviro-DASHBOARD\. The app is deployed on Vercel at toolrom.vercel.app and uses Prisma ORM with a PostgreSQL database.

The goal is to evolve this application into a full Tooling Project Manager for Enviropax (Haydock) — a thermoforming tooling company. The user is Mateusz (MA), CAD/CAM Designer/Tooling Engineer.

Current state:
•	Working: projects (tools), parts, operations, procurement orders, outsource jobs, suppliers, activity log, calendar events, cutting tools calculator
•	Needs: schema extensions, new UI views, new features per the specification below
•	Remove: CuttingTool model and all associated UI — will be replaced with a separate app later. Keep only the reference fields (vc, rpm, feed etc.) if needed as a simple lookup table, but remove the full calculator UI

2. Prisma Schema Changes
Apply all changes via Prisma migrations. Do not break existing data. Use nullable fields and defaults where adding to existing models.

2.1 Modify Tool model
Add the following fields to the Tool model:
projectType    ProjectType    @default(NewTool)
archived       Boolean        @default(false)
archivedAt     DateTime?
machineTarget  String?        // e.g. KMD 78.2 Speed

Add new enum:
enum ProjectType {
  NewTool
  Conversion
  RnD
  Custom
}

2.2 Modify Part model
Add the following fields to the Part model:
conversionStatus  ConversionStatus  @default(New)
materialType      MaterialType?
dimX              Float?            // finished dimension X mm
dimY              Float?            // finished dimension Y mm
dimZ              Float?            // finished dimension Z mm
revModel          Int               @default(1)   // CAD revision
revProgram        Int               @default(1)   // CAM program revision
revProgramNote    String?           // what changed in last program rev

Add new enums:
enum ConversionStatus {
  New
  Reuse
  Rework
}

enum MaterialType {
  ToolingPlate
  RawStock
}

2.3 Modify Operation model
Add the following fields to the Operation model:
changedBy         String?           // initials, e.g. MA
statusChangedAt   DateTime?         // auto-set when status changes
programRevision   Int?              // for milling ops — program rev number
programRevNote    String?           // note on what changed
toolList          String?           // JSON array of tool T-numbers for milling
estimatedTime     Float?            // already exists — keep
actualTime        Float?            // already exists — keep

2.4 Add Issue model (new)
Add a completely new model:
model Issue {
  id          String        @id @default(cuid())
  toolId      String
  tool        Tool          @relation(fields: [toolId], references: [id], onDelete: Cascade)
  partId      String?
  part        Part?         @relation(fields: [partId], references: [id], onDelete: SetNull)
  title       String
  description String?
  status      IssueStatus   @default(Open)
  priority    IssuePriority @default(Medium)
  openedAt    DateTime      @default(now())
  closedAt    DateTime?
  createdAt   DateTime      @default(now())
}

Add new enums:
enum IssueStatus {
  Open
  InProgress
  Closed
}

enum IssuePriority {
  Low
  Medium
  High
  Critical
}

2.5 Add ProcessCard model (new)
Track when process cards were printed:
model ProcessCard {
  id        String   @id @default(cuid())
  toolId    String
  partId    String
  printedAt DateTime @default(now())
  printedBy String?
}

2.6 Modify Supplier model
Add category field to supplier:
category  SupplierCategory  @default(Material)

enum SupplierCategory {
  Material
  Gundrilling
  Laser
  WaterJet
  Other
}

2.7 Modify Attachment model
Extend AttachmentType enum:
enum AttachmentType {
  DXF
  PDF
  STEP
  NC       // NC program file
  IMAGE    // photos, annotated images
  OTHER
}
Add operationId link to attachment:
operationId  String?
operation    Operation?  @relation(fields: [operationId], references: [id], onDelete: SetNull)

2.8 Remove CuttingTool model
Remove the CuttingTool model and CuttingToolMachine enum entirely from the schema. Run migration to drop the table. Remove all associated API routes, server actions, and UI components.

3. Naming Convention
The app must enforce and display the following naming convention throughout the UI.

3.1 Part ID format
[FAMILY]-[SECTION]-[PART]
Examples: AFS700-MLD-FRAME, AFS700-AVL-BOLSTER, BFS200-PBX-PNP

3.2 NC program naming
[FAMILY]-[SECTION]-[PART]_OP[NUMBER]-[SIDE]_R[REV].[EXT]
Extension: .hnc for Hurco, .h for Danusys
Examples: AFS700-MLD-FRAME_OP10-FRONT_R01.hnc

3.3 Section codes
Code	Section
MLD	Moulding
PLG	Plug Assist
CUT	Cutting
AVL	Anvil
PBX	Pressure Box

3.4 NC file paths
../NCPath/HURCO/[filename].hnc
../NCPath/Danusys/[filename].h

4. Tool & Part Structure
The standard tool structure for Kiefel KMD 78.2 thermoforming tools is:

Section	Code	Parts
Moulding	MLD	Cavity, Baseplate, Frame, Fixture Plate, Bolster, Extrusions
Plug Assist	PLG	Fixture Plate, Extrusions, Plug Base, Plug (+ TBD)
Cutting	CUT	Cutters
Anvil	AVL	Fixture Plate, Bolster, Wear Plate
Pressure Box	PBX	Pusher SB (Basket, Back Plate, Extrusions), Pusher DB (Basket, Back Plate, Extrusions), Pick & Place

Part templates: When creating a new tool, the user should be able to select a template (e.g. KMD 78.2 Standard) that auto-creates all sections and parts with default operations. Build a template system in the UI — store templates as JSON config files or in the database.

5. Operations Per Part
Each part type has a defined operation sequence. Operations must be created automatically when a part is created from a template. The following are known operation sequences:

Part	Operations
MLD — Fixture Plate	OP10 Material Order ✉, OP20 CAM Programming, OP30 Milling, OP40 Inspection, OP50 Assembly
MLD — Frame	OP10 Material Order ✉, OP20 CAM Programming, OP30 Milling, OP40 Inspection, OP50 Gundrilling ✉, OP60 Manual Drilling, OP70 Assembly
PBX — Pick & Place	OP10 Laser Order ✉ (+DXF), OP20 Inspection, OP30 Assembly
AVL — Wear Plate	OP10 Water Jet Order ✉ (+DXF), OP20 Cbore Manual, OP30 Inspection, OP40 Assembly
All others	TBD — use generic: OP10 Material Order, OP20 Programming, OP30 Milling, OP40 Inspection, OP50 Assembly

Operations marked ✉ are external and generate email requests. Operations with (+DXF) require a DXF file attachment.
Milling operations must store: machine (Hurco/Danusys), program revision, program revision note, tool list (T numbers), estimated time.
Status changes must auto-record: changedBy (initials), statusChangedAt (timestamp). This feeds the activity log automatically.

6. Material Calculation
When a part has dimensions and material type set, the app calculates the order size automatically:

Material Type	Allowance	Logic
Tooling Plate	+2.5mm on X and Y only	Z is pre-machined — no allowance on thickness
Raw Stock	+2.5mm on X, Y and Z	All faces need machining allowance

Display both finished dimensions and calculated order dimensions in the part detail view and on material order emails.

7. UI Views to Build / Rebuild

7.1 Dashboard
•	Summary stats: active projects, operations in progress, awaiting material, open issues
•	Projects table: part ID, section chips (MLD/PLG/CUT/AVL/PBX), status badge, progress bar, current operation, deadline, email shortcut
•	Filter bar: search input (Ctrl+F triggers global search overlay) + section filter chips
•	Clicking a row opens right-side detail panel
•	Right panel tabs: OPS / MATERIAL / FILES / LOG
•	OPS tab: operation list with status dots (green=done, amber pulsing=active, gray=waiting), email icon on external ops, estimated time
•	MATERIAL tab: material type, grade, finished dims, calculated order dims
•	FILES tab: attachments list with type badges (PDF/DXF/NC/IMAGE), linked operation
•	LOG tab: changelog entries with timestamp and auto/manual dot indicator

7.2 Project Detail
•	Breadcrumb: Projects > AFS700
•	Project header: ID, type badge, status, machine target, deadline, Export PDF button, Archive button
•	Parts displayed as cards grouped by section
•	Each part card shows: part ID, name, operation pip indicators (colored squares), conversion status badge if Conversion project
•	Clicking a part card opens full part detail
•	Sidebar: changelog + open issues for this project

7.3 Part Detail
•	Full operation list with all fields: status, machine, estimated time, changed by, changed at
•	Material section with dimension calculator
•	Attachments section — upload PDF, DXF, NC, IMAGE files
•	Revision section: model revision number + program revision number with note
•	Notes field (free text)
•	Print Process Card button

7.4 To-Do Lists
•	Three columns: My Tasks (manual), Hurco Queue, Danusys Queue
•	Weekly view — Monday reset
•	Incomplete tasks carry over automatically to next week
•	Completed tasks show tick + strikethrough, remain visible until end of week
•	Drag and drop reordering within each column (dnd-kit already installed)
•	Danusys column shows warning if any operation in queue exceeds 5 tools
•	+ Add task button on each column

7.5 Issue Tracker
•	List view with filters: status (Open/InProgress/Closed), priority (Low/Medium/High/Critical)
•	Per issue: number, title, linked part, status badge, priority badge, opened date, closed date
•	New issue button — form with: title, description, linked tool, linked part, priority
•	Closed issues shown with strikethrough and reduced opacity
•	Open critical/high issues shown on Dashboard stats

7.6 Suppliers
•	Grouped by category: Material / Gundrilling / Laser / Water Jet / Other
•	Per supplier card: name, category badge, email, notes, Email button, Edit button
•	Known suppliers: Metalweb (Material), Bikar (Material), Stainless & Aluminium (Material), Perfect Bore (Gundrilling), Unicorn Laser (Laser)

7.7 Global Search (Ctrl+F)
•	Modal overlay triggered by Ctrl+F or Cmd+F keyboard shortcut
•	Searches: project IDs, part names, family names, file names, operation notes, changelog entries
•	Results grouped by: Projects, Parts, Files, Archive
•	Arrow keys to navigate, Enter to open, Esc to close

7.8 Archive
•	Separate view showing archived tools
•	Same table as dashboard but read-only
•	Restore button to unarchive
•	Archived tools still searchable via global search

7.9 Process Card (PDF export)
•	Generate printable A4 PDF for a single part
•	Also generate batch PDF for all parts of a project
•	Card contains: Enviropax header, part ID, revision, material, blank dimensions
•	Operation table columns: Op number, Operation name, Status (tick or empty checkbox), Who (pre-filled initials if done, blank line if not), When (pre-filled date if done, blank line if not), Est. Time (from app), Actual Time (blank line for manual entry)
•	Notes section at bottom
•	Clean minimal layout for A4 printing — no tool list, no attachments
•	Use @react-pdf/renderer or puppeteer for PDF generation

7.10 Naming Convention Reference
•	Static page showing the naming format with examples
•	Copy-to-clipboard button for generating correct file names based on inputs

8. Email Integration
External operations have an email icon. Clicking it opens a pre-filled Outlook email via mailto: link.

Operation Type	Supplier Category	Subject template	Body template
Material Order	Material	Material Request — [FAMILY] — [DATE]	Please supply the following materials for project [FAMILY]: [LIST OF PARTS WITH ORDER DIMENSIONS]
Gundrilling	Gundrilling	Gundrilling Request — [PART ID]	Please find attached drawing for gundrilling. Part: [PART ID]
Laser Cutting	Laser	Laser Cutting Request — [PART ID]	Please find attached DXF for laser cutting. Part: [PART ID]
Water Jet	WaterJet	Water Jet Request — [PART ID]	Please find attached DXF for water jet cutting. Part: [PART ID]

Material orders are batched — one email for multiple parts. Other operations generate one email per part. Email templates are stored on the Supplier model (emailSubjectTemplate, emailBodyTemplate fields already exist in schema).
User initials for email context: MA (Mateusz Abramowicz).

9. UX & Design Requirements
•	Dark theme by default — dark background (#0d0f10), surface (#141618), accent (#e8a020 amber)
•	Light/dark mode toggle in the UI
•	Font: JetBrains Mono for IDs and codes, Barlow or similar sans-serif for body text
•	Keyboard shortcuts: Ctrl+N = New Project, Ctrl+F = Global Search, Esc = Close modal/panel
•	In-app shortcuts cheat sheet accessible via ? key
•	Responsive — full desktop layout primary, mobile read-only view for dashboard
•	Section color coding: MLD=blue, PLG=purple, CUT=red, AVL=violet, PBX=green
•	Status color coding: Done=green, InProgress=amber, Blocked=red, NotStarted=gray

10. Technical Notes
•	Stack: Next.js (App Router), Prisma, PostgreSQL, Vercel, @vercel/blob for file storage
•	Authentication: add Supabase Auth or NextAuth — email + password, single user for now
•	PDF generation: install @react-pdf/renderer for process cards
•	DXF viewer: install dxf-parser — render DXF as SVG inline in the app
•	Image annotation: install Fabric.js — annotate uploaded images with arrows, text, rectangles
•	Drag and drop: dnd-kit already installed — use for To-Do queue ordering
•	Global search: implement as client-side fuzzy search with fuse.js over API-fetched data, or server-side full-text search via Prisma
•	Feeds & speeds calculator: remove CuttingTool model and UI completely. The existing cutting-calc.vercel.app will remain as a separate app. Add a simple link to it in the sidebar.
•	Run prisma migrate dev for each schema change. Use prisma db seed to populate default part templates and supplier list.

11. Build Priority Order
Complete in this order to have a working app at each stage:

Phase	What to build	Why
1 — Schema	Apply all Prisma schema changes and run migrations	Foundation — nothing else works without this
2 — Remove CuttingTool	Delete CuttingTool model, routes, and UI	Clean slate before building new features
3 — Dashboard	Rebuild dashboard with new project table, stats, right panel	Most used view — highest daily value
4 — Project & Part Detail	Part cards, operation list, material calculator	Core workflow
5 — Email	Wire up email icons to mailto with pre-filled templates	High daily value — saves time every day
6 — To-Do Lists	Three-column weekly to-do with drag and drop	Planning and machine queue management
7 — Issue Tracker	Issue list, new issue form, status/priority filters	Quality tracking
8 — Global Search	Ctrl+F overlay with grouped results	Solves the original problem — can't find anything
9 — Process Card PDF	PDF export for single part and batch project	Replaces manual Word/Excel setup sheets
10 — Archive	Archive/unarchive tools, archive view	Project lifecycle management
11 — DXF Viewer	In-app DXF file preview	Convenience — reduces switching to AutoCAD
12 — Image Annotation	Annotate screenshots and images	Nice to have — low priority

12. Seed Data
Populate the database with the following on first setup:

Suppliers
Name	Email	Category
Metalweb	alex.barker@metalweb.co.uk	Material
Bikar Aerospace	adam.rogers@bikar.com	Material
Stainless & Aluminium	sales@stainlessandaluminium.co.uk	Material
Perfect Bore	TBD	Gundrilling
Unicorn Laser	TBD	Laser

Default section codes
MLD, PLG, CUT, AVL, PBX — pre-populate as section name options when creating parts.


Brief prepared: April 2026  —  Enviropax Tooling PM  —  v1.0
Repo: github.com/Simek87/cutting-calc  |  Live: toolrom.vercel.app  |  Local: E:\Projekty-IT\Enviro-DASHBOARD\
