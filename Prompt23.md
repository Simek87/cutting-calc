We want to redesign Procurement using a multi-item order model.

IMPORTANT:
- keep this simple
- do not overengineer
- do not build a full ERP purchasing system
- make it practical for workshop use

GOAL:
One Order can contain multiple Parts.

This is preferred over one-order-per-part.

However, for simplicity and clarity:
- one Order should belong to one Tool only
- an Order may contain multiple Parts from that Tool

---

1. DATA MODEL

Add an OrderItem model.

Structure:

Order
- id
- supplierId (optional if manual fallback still exists)
- supplier (text fallback if needed)
- status
- eta
- poNumber
- notes

OrderItem
- id
- orderId
- partId
- qty
- notes (optional)

Part is already linked to Tool and Section, so derive Tool/Section through Part.

---

2. CREATION FLOW

Primary workflow:
- create an Order from selected parts of a single Tool
- allow selecting multiple parts
- create one Order with multiple OrderItems

Do NOT allow mixing parts from multiple tools in one order for now.

Keep manual order creation only as fallback if necessary.

---

3. PROCUREMENT PAGE

Each order should display clearly:
- supplier
- status
- ETA
- tool name
- number of items in the order

Example:
ABC Laser | Ordered | ETA 28 Mar
M700x50 | 3 items

Also allow expanding or viewing the parts inside the order:
- Section → Part name
- qty

Example:
Anvil → Wear plate (qty 2)
Cutter → Support plate (qty 1)

---

4. PRODUCTION CONTEXT

Procurement must no longer look like a disconnected list.

Each order should make it obvious:
- which tool it belongs to
- which parts are in it

If possible, show:
- "Blocking X parts"

---

5. LINK TO OPERATIONS

For parts with operation "Order Material":
- allow those operations to be fulfilled by an OrderItem inside an Order
- operation status should derive from the related order status when linked

Suggested mapping:
- Draft / no order → Not Ordered
- Sent / Ordered → Ordered
- Received → Received

Keep this simple and safe.

---

6. BACKWARD COMPATIBILITY

- old Orders without OrderItems should still work
- do not break existing records
- manual fallback can remain temporarily

---

7. UX RULES

- no major redesign
- compact list
- expandable order items is enough
- avoid building a complex purchasing module

---

8. OUTPUT

After implementation, report:
- schema changes
- how orders and order items work
- how creation flow works
- how procurement page displays tool + items
- how backward compatibility is handled
- which files changed