# Settings & Data Management

## Overview

SHUBH SCHOOL ERP supports two data storage modes:

| Mode | Storage | Multi-Device | Setup |
|------|---------|--------------|-------|
| **Local Mode** | Browser localStorage (default) | ❌ Single device only | None |
| **MySQL Mode** | MySQL database on cPanel server | ✅ Real-time sync | See `02-deploy-cpanel.md` |

In **MySQL Mode**, all data is stored in your cPanel MySQL database via the DataService layer. All module pages (Students, Fees, Attendance, HR, Inventory, Expenses, Homework, etc.) read from the server cache and write to MySQL first, then update the local cache. localStorage is used only as a fallback when the server is unreachable.

### DataService Architecture

Every module uses `dataService` (not direct `localStorage`) for reads and writes:

```typescript
import { dataService } from '../utils/dataService';

// Read (from cache or localStorage)
const students = dataService.get<Student[]>('students');

// Write (MySQL first → cache → localStorage)
const saved = await dataService.save('fee_receipts', newReceipt);
await dataService.update('students', id, changes);
await dataService.delete('inventory_items', itemId);
```

There are 27 synced collections: `students`, `staff`, `attendance`, `fee_receipts`, `fees_plan`, `fee_heads`, `fee_headings`, `fee_balances`, `transport_routes`, `pickup_points`, `inventory_items`, `expenses`, `expense_heads`, `homework`, `alumni`, `sessions`, `classes`, `sections`, `subjects`, `notifications`, `biometric_devices`, `payroll_setup`, `payslips`, `whatsapp_logs`, `old_fee_entries`, `student_transport`, `student_discounts`.

### Sync Status Indicator (Dashboard)

The dashboard shows a live sync status indicator:

| Status | Meaning |
|--------|---------|
| 🟢 **Local** | No server configured — data is in localStorage only |
| 🟢 **Connected** | MySQL server connected, data is in sync |
| 🔄 **Syncing** | Actively transferring data to/from server |
| 🔴 **Offline** | Server configured but currently unreachable |

---

## School Profile

`Settings → School Profile`

| Field | Used In |
|-------|---------|
| School Name | All receipts, certificates, reports |
| Address | Receipts, admission forms |
| Phone / Email | Receipts, ID cards |
| Logo | Header, receipts, ID cards |
| Dashboard Background | Dashboard hero image |

---

## Session Management

`Settings → Sessions` (also via header session switcher)

- Sessions run April to March (Indian academic year)
- Current session shown in the header top-left
- Creating a new session archives the current one
- Archived sessions are **read-only** for non-Super Admin roles
- **Super Admin** can edit data in any session, including archived ones
- Sessions are preserved indefinitely — no data is ever deleted on promotion
- Use **Promote Students** wizard at year-end to advance students and create the next session

---

## User Management

`Settings → User Management` (Super Admin only)

- Searchable table of all users (students, teachers, staff, parents)
- Reset any user's password
- Add new staff users (Admin, Receptionist, Accountant, Librarian, Driver) with name, position, mobile (becomes username), and password

---

## Database Server Tab (MySQL Mode)

`Settings → Data → Database Server`

This tab is the control center for MySQL mode. Available to Super Admin only.

### Configuring the API URL

1. Enter your API URL: `https://yourdomain.com/api`
2. Click **Test Connection** — a green ✅ "Connected" message confirms the database is reachable
3. Click **Authenticate Now** and enter your Super Admin password (default: `admin123`) — gets a JWT token for all server write calls
4. Click **Save API URL** to persist the setting

> ⚠️ If you get "Invalid username or password", run the migration first: `https://yourdomain.com/api/migrate.php?action=run` — this creates all tables AND seeds the default superadmin. To reset: `https://yourdomain.com/api/migrate/reset-superadmin`

### Push Local Data to Server

Click **Push Local Data to Server** to upload all 27 data collections from your browser localStorage to MySQL in one batch. Use this:
- After first connecting to MySQL (to migrate existing data)
- After making data changes while offline
- If server data appears empty after connecting

### What Data Is Stored Where

| Data | MySQL Mode | Local Mode |
|------|-----------|------------|
| Students | MySQL `students` table | localStorage |
| Staff | MySQL `staff` table | localStorage |
| Fee Receipts | MySQL `fee_receipts` table | localStorage |
| Fee Balances | MySQL `fee_balances` table | localStorage `old_balances` |
| Fee Plan | MySQL `fees_plan` table | localStorage |
| Attendance | MySQL `attendance` table | localStorage |
| Transport | MySQL `transport_routes` table | localStorage |
| Inventory | MySQL `inventory_items` table | localStorage |
| Expenses | MySQL `expenses` table | localStorage |
| Expense Heads | MySQL `expense_heads` table | localStorage |
| Homework | MySQL `homework` table | localStorage |
| Payroll Setup | MySQL `payroll_setup` table | localStorage |
| Student Discounts | MySQL `student_discounts` table | localStorage |
| Sessions | MySQL `sessions` table | localStorage |
| School Profile | MySQL `settings` table | localStorage |
| User Passwords | MySQL `users` table | localStorage |
| WhatsApp Keys | MySQL `settings` table | localStorage |

---

## WhatsApp API Settings

`Settings → WhatsApp API` (Super Admin only)

- API endpoint: `https://wacoder.in/api/whatsapp-web/send-message`
- Enter `app_key` and `auth_key` from wacoder.in
- Toggle enable/disable
- Send Test Message to verify connection
- View recent sends log (last 10, masked phone numbers)

See `03-whatsapp-setup.md` for full WhatsApp setup guide.

---

## WhatsApp Bot

`Settings → WhatsApp Bot`

Enable/disable the auto-reply bot. When enabled, parents can send their child's Admission No. to the school WhatsApp and receive automated attendance + fees reply.

---

## Online Payment

`Settings → Online Payment` (Super Admin only)

Toggle each payment gateway ON/OFF:
- **GPay** — UPI via Google Pay
- **Razorpay** — Accepts cards, UPI, netbanking
- **PayU** — Popular Indian gateway

When enabled, students/parents can pay fees online. Payments auto-update the Fee Register and generate a receipt.

---

## Notification Scheduler

`Settings → Notification Scheduler`

7 event cards, each configurable:

| Event | Default | Channel Options |
|-------|---------|-----------------|
| Fee Due Reminder | OFF | WhatsApp / RCS / Both |
| Absent Alert | OFF | WhatsApp / RCS / Both |
| Birthday Wish | OFF | WhatsApp / RCS / Both |
| Exam Timetable | OFF | WhatsApp / RCS / Both |
| Result Published | OFF | WhatsApp / RCS / Both |
| General Notice | OFF | WhatsApp / RCS / Both |
| Homework Deadline | OFF | WhatsApp / RCS / Both |

---

## System Update

`Settings → System Update` (Super Admin only)

Check for new feature releases pushed from the server. The updater shows a changelog and instructions for applying the update. Only Super Admin can trigger updates.

---

## Themes

`Settings → Themes`

Select and save a preferred color theme. Changes apply immediately and are saved per user.

---

## Data Management

`Settings → Data`

### Export Backup
Downloads a timestamped JSON file: `shubh-erp-backup-YYYY-MM-DD.json`

In MySQL Mode, the backup fetches data from the server (not just localStorage) — so the backup is a complete snapshot of the MySQL database exported to JSON.

### Import Backup
Select a previously exported `.json` file. All data is restored immediately.

In MySQL Mode, imported data is written to both localStorage (cache) and the MySQL database.

> ⚠️ Import replaces ALL current data. Export a fresh backup first if needed.

### Push Local Data to Server
Uploads all 27 localStorage collections to MySQL in one batch. Use this when you've added data offline or when the server shows empty tables.

### Factory Reset
3-step confirmation required. Clears ALL school data. Super Admin login is the only credential preserved.

In MySQL Mode, Factory Reset also sends a clear request to the server — all MySQL tables are emptied (not dropped). The tables remain for future use.

### Data Collections Reference (DataService)

```
students              — All student profiles
staff                 — All staff and teachers
attendance            — Daily attendance records
fee_receipts          — Fee payment receipts
fees_plan             — Fee amounts per class/section/heading
fee_heads / fee_headings — Fee heading definitions
fee_balances          — Running balance per student (carry-forward + credit)
transport_routes      — Bus routes
pickup_points         — Pickup stops with monthly fares
inventory_items       — Stock items, purchases, sales
expenses              — Income/expense ledger entries
expense_heads         — Expense categories
homework              — Homework assignments
alumni                — Alumni directory
sessions              — Academic session archive
classes / sections    — Class structure
subjects              — Subject definitions
notifications         — ERP event log
biometric_devices     — ESSL/ZKTeco device configurations
payroll_setup         — Staff salary settings
payslips              — Generated payslips
whatsapp_logs         — WhatsApp send history
old_fee_entries       — Manually entered old dues
student_transport     — Student transport assignments
student_discounts     — Per-student discount settings
```

