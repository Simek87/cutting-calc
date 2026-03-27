prompt6.md
We need to connect certain part operations with Procurement and Outsourcing in a SIMPLE and SAFE way.

IMPORTANT:
- do NOT overengineer
- do NOT redesign the app
- do NOT introduce complex workflow systems
- keep everything minimal and practical

---

GOAL

For specific operations:
- "Order Material"
- "Laser"
- "Gundrill"

We want their status on the part to come from Procurement or Outsourcing.

This should create a single source of truth.

---

1. LINKED OPERATIONS (LIMITED SCOPE)

Only support linking for:

- "Order Material" → Procurement (Order)
- "Laser", "Gundrill" → Outsourcing (OutsourceJob)

Do NOT generalize this to all operations.

---

2. PROCUREMENT LINKING

If a part has an operation "Order Material":

- allow user to:
  - create a new Procurement Order from this operation
  - or link an existing Order

When linked:
- operation status is derived from Order.status

Mapping:
- no order / draft → "Not Ordered"
- ordered/sent → "Ordered"
- received → "Received"

On the operation row show:
- supplier name
- ETA
- optional ordered/received date
- button: "Open Order"

---

3. OUTSOURCING LINKING

If a part has operation "Laser" or "Gundrill":

- allow user to:
  - create a new OutsourceJob
  - or link an existing one

When linked:
- operation status is derived from OutsourceJob.status

Mapping:
- Pending → Pending
- Sent → Sent
- In Progress → In Progress
- Done → Done

On the operation row show:
- supplier/company
- ETA
- button: "Open Job"

---

4. SINGLE SOURCE OF TRUTH

For linked operations:

- status MUST NOT be manually editable on the part
- it must come from Procurement / Outsourcing
- UI should clearly indicate this (e.g. "Linked")

---

5. FALLBACK (IMPORTANT)

If no linked record exists:

- still allow operation to exist
- show default state:
  - Order Material → "Not Ordered"
  - Laser/Gundrill → "Pending"

Do NOT block the user.

---

6. QUICK ACTIONS (VERY IMPORTANT)

From the operation row allow:

- "Create Order"
- "Link Order"
- "Create Outsource Job"
- "Link Outsource Job"

When creating:
- prefill:
  - tool
  - part name
  - supplier (if available)
  - qty / notes if easy

---

7. KEEP IT SIMPLE

- minimal schema changes
- reuse existing Order and OutsourceJob models
- do NOT introduce new complex models
- do NOT change Kanban logic
- do NOT break existing records

---

8. OUTPUT

After implementation, report:

- what schema changes were made
- how linking works step by step
- how status is derived for linked operations
- what happens when no record is linked
- which files were changed