# Settings & Data Management

## Overview

SHUBH SCHOOL ERP supports two data storage modes:

| Mode | Storage | Multi-Device | Setup |
|------|---------|--------------|-------|
| **Local Mode** | Browser localStorage (default) | ❌ Single device only | None |
| **MySQL Mode** | MySQL database on cPanel server | ✅ Real-time sync | See `02-deploy-cpanel.md` |

In **MySQL Mode**, all data is stored in your cPanel MySQL database. The ERP uses a 5-second polling sync — any change made on one device appears on all other devices within 5 seconds. localStorage is used only as a local cache.

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
3. Click **Save API URL** to persist the setting

### Migrate Data to Server

If you have existing data in localStorage (from before setting up MySQL):

1. Click **Migrate Data to Server**
2. All localStorage data is uploaded to MySQL in one batch
3. The sync indicator on the dashboard turns green
4. From this point, all new data writes to MySQL first

### What Data Is Stored Where

| Data | MySQL Mode | Local Mode |
|------|-----------|------------|
| Students | MySQL `students` table | localStorage `shubh_erp_students` |
| Staff | MySQL `staff` table | localStorage `shubh_erp_staff` |
| Fee Receipts | MySQL `fee_receipts` table | localStorage `shubh_erp_fee_receipts` |
| Fee Plan | MySQL `fee_plan` table | localStorage `shubh_erp_fee_plan` |
| Attendance | MySQL `attendance` table | localStorage `shubh_erp_attendance` |
| Transport | MySQL `transport` table | localStorage `shubh_erp_transport` |
| Sessions | MySQL `sessions` table | localStorage `shubh_erp_sessions` |
| School Profile | MySQL `settings` table | localStorage `shubh_erp_school_profile` |
| User Passwords | MySQL `users` table | localStorage `shubh_erp_user_passwords` |
| WhatsApp Keys | MySQL `settings` table | localStorage `shubh_erp_settings` |

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

### Factory Reset
3-step confirmation required. Clears ALL school data. Super Admin login is the only credential preserved.

In MySQL Mode, Factory Reset also sends a clear request to the server — all MySQL tables are emptied (not dropped). The tables remain for future use.

### Data Storage Keys (Local Mode Reference)

```
shubh_erp_students          — All student records
shubh_erp_staff             — All staff records
shubh_erp_fee_receipts      — All fee payment receipts
shubh_erp_fee_plan          — Fee structure per class/section
shubh_erp_fee_headings      — Fee heading definitions
shubh_erp_sessions          — Session archive
shubh_erp_attendance        — Daily attendance records
shubh_erp_transport         — Routes, buses, pickup points
shubh_erp_inventory         — Stock, purchases, sales
shubh_erp_expenses          — Income & expense ledger
shubh_erp_school_profile    — School name, logo, address
shubh_erp_user_passwords    — Hashed user credentials
shubh_erp_settings          — App preferences, WhatsApp keys
shubh_erp_api_url           — Configured MySQL API URL
```
