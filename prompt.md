You are a senior full-stack engineer and product designer.

I want you to help me build a web application for managing thermoforming tool production in a toolroom environment.

This is NOT a generic task manager — it is a simplified MES / workflow system for toolmaking.

---

## 🎯 GOAL

Build a web app that allows me to manage:

1. Tools (projects)
2. Parts (BOM)
3. Operations (manufacturing steps / routing)
4. Procurement (orders)
5. Outsourcing (laser cutting, gundrilling, etc.)
6. Kanban board (like LeanKit)
7. Calendar with reminders

---

## 🧱 TECH STACK

Use:

* Next.js (App Router)
* TypeScript
* PostgreSQL (via Prisma ORM)
* Tailwind CSS
* ShadCN UI (for components)
* Drag & drop (dnd-kit)

Make it production-ready but simple.

---

## 🧩 CORE DATA MODEL

### Tool

* id
* projectName
* dueDate
* status (Management, CAD, CAM, Manufacturing, Toolmaking, Done)
* createdAt

### Part

* id
* toolId
* name
* type (standard, custom, outsource)
* quantity
* status (Not ordered, Ordered, In progress, Ready, Installed)
* supplier
* notes

### Operation

* id
* partId
* name
* order (integer)
* type (internal, outsource, inspection, assembly)
* status (Not started, Ready, In progress, Sent, Done, Blocked)
* machine
* supplier
* estimatedTime
* actualTime

### Order

* id
* supplier
* status
* createdAt
* eta

### OutsourceJob

* id
* partId
* company
* status
* sentDate
* eta

---

## 🖥️ FEATURES

### 1. Kanban Board (MAIN VIEW)

* Columns:

  * Management
  * CAD
  * CAM
  * Manufacturing
  * Toolmaking
  * Done
* Each card = Tool
* Drag & drop between columns

---

### 2. Tool Details Page

When clicking a tool:

Sections:

* Tool info
* List of parts (BOM)
* Each part expandable

---

### 3. Part View

* Show progress (based on operations)
* List of operations in order
* Status indicators
* Ability to update status

---

### 4. Operations System

* Sequential workflow
* Operations unlock when previous is done
* Visual progress bar

---

### 5. Procurement

* Mark parts as "to order"
* Create order list grouped by supplier

---

### 6. Outsourcing

* Track parts sent to external companies
* Status + ETA

---

### 7. Calendar

* Show deadlines
* Show reminders
* Link events to tools

---

## 🎨 UI REQUIREMENTS

* Clean industrial UI (not fancy startup style)
* Fast and minimal
* Color-coded statuses:

  * Red = blocked
  * Yellow = waiting
  * Blue = in progress
  * Green = done

---

## ⚙️ DEVELOPMENT APPROACH

Step-by-step:

1. Initialize Next.js app
2. Setup Prisma schema
3. Create database models
4. Build basic CRUD for tools
5. Build Kanban board
6. Add parts (BOM)
7. Add operations
8. Add status logic
9. Add calendar

---

## 🚀 WHAT I WANT FROM YOU

Start by:

1. Creating full Prisma schema
2. Setting up project structure
3. Building first working version:

   * Tool creation
   * Kanban board
   * Tool details page

Explain everything step by step.

Do not overcomplicate.

Focus on working MVP first.

---

## IMPORTANT

This app is for real-world toolmaking workflow.

Keep it practical, fast, and simple.

Avoid unnecessary complexity.

---

Start now.
