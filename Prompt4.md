We are implementing dynamic operations per part with simple templates.

Goal:
Allow fast creation of realistic operation sequences without fixed structure.

---

1. OPERATION TEMPLATES

Add support for applying predefined templates when creating a part.

Create at least this template:

Template: "Standard Part"
Operations:
1. Order material (type: procurement)
2. CAM (type: internal)
3. Milling (type: internal)
4. Assembly (type: assembly)
5. Inspection (type: inspection)

---

2. TEMPLATE BEHAVIOR

- when creating a part, user can select a template
- template creates operations with correct order
- user can still:
  - add operations
  - remove operations
  - edit names

---

3. OPERATION TYPES

Ensure operation type supports:
- procurement
- internal
- outsource
- inspection
- assembly

---

4. SEQUENTIAL LOGIC

Keep existing behavior:
- operations unlock sequentially
- no change in logic

---

5. UI

- add simple template selector on part creation
- keep it minimal (dropdown or buttons)
- no complex configuration

---

6. COMPATIBILITY

- existing parts must still work
- no breaking changes

---

7. OUTPUT

After implementation:
- explain how templates work
- where user selects template
- how operations are created
