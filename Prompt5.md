We need the next improvement phase for the toolroom app.

IMPORTANT:
- keep existing working functionality
- do not redesign everything
- make minimal safe changes
- focus on usability for real workshop use

GOALS FOR THIS PHASE

1. FIXED SECTION OPTIONS
When assigning or creating a section for a part/tool, section should be selected from a fixed predefined list only:

- N/A
- Mould
- Plug Assist
- Anvil
- Cutter
- PnP
- Pusher

Requirements:
- use this fixed order in UI
- prevent random free-text section names
- existing data should remain compatible if possible
- if old section names exist, handle them safely

2. DELETE / CANCEL TOOL CARDS
We need the ability to remove tool cards if:
- they were created by mistake
- the job/project was cancelled

Requirements:
- add a safe delete/archive/cancel workflow for tools
- if true delete is risky, prefer:
  - status = Cancelled
  - hidden from normal Kanban/dashboard views
- user should still be able to remove accidental cards easily
- if possible, support both:
  - Cancel tool
  - Delete tool (with confirmation) for mistaken empty cards

Please choose the safest minimal approach.

3. SUPPLIER MANAGEMENT
Add a simple Supplier system.

Supplier should have:
- name
- email
- optional notes
- optional default email template for ordering

Requirements:
- allow creating suppliers
- allow editing suppliers
- allow selecting supplier from existing supplier list where relevant
- keep it simple, no CRM complexity

4. EMAIL TEMPLATE PER SUPPLIER
Each supplier may have a default order email template.

Fields can be simple:
- template name
- email subject template
- email body template

Example use:
- used later for procurement / laser / outsourcing emails

For now:
- just store and manage templates
- do not build full email sending workflow yet unless already easy

5. SEARCH TOOLS / CARDS
Add search for tool cards by:
- project/tool name
- family name

Requirements:
- search on Kanban page
- keep it fast and simple
- client-side is fine if enough data is already loaded
- otherwise expose the minimum safe data needed

6. UX RULES
- minimal industrial UI
- compact forms
- avoid overengineering
- do not break dashboard / kanban / tool page / procurement / outsourcing

7. OUTPUT
After implementation, report:
- changed models
- changed routes/pages/components
- how section selection works now
- how tool cancel/delete works
- how suppliers are created and managed
- how search works on Kanban