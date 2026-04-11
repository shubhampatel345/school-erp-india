# Settings & Data Management

## How Data Storage Works

SHUBH SCHOOL ERP stores all data in your browser's **localStorage** with the prefix `shubh_erp_`.

Key storage keys:
- `shubh_erp_students` — All student records
- `shubh_erp_staff` — All staff/teacher records
- `shubh_erp_fee_receipts` — All fee receipts
- `shubh_erp_sessions` — Academic sessions
- `shubh_erp_attendance` — Attendance records
- `shubh_erp_school_profile` — School name, address, logo
- `shubh_erp_user_passwords` — Hashed user passwords
- `shubh_erp_whatsapp_settings` — WhatsApp API credentials

**Important:** Data persists until you clear browser data or run a Factory Reset. Different browsers on the same device have separate storage.

## Backup & Restore

### Export Backup
Settings → Data → Export JSON Backup  
Downloads a `.json` file with all ERP data. Store this file safely.

### Import Backup  
Settings → Data → Import JSON Backup  
Select your exported `.json` file. All data will be restored.

**Best practice:** Export a backup:
- Every week (routine)
- Before running Promote Students
- Before a browser/OS update
- Before Factory Reset

## Session Management

- Sessions run April to March (Indian academic year)
- Creating a new session archives the current one
- Archived sessions are read-only (viewable but not editable)
- Sessions are preserved indefinitely — no data is lost on promotion
- Use Promote Students wizard to advance students between sessions

## Factory Reset

Settings → Data → Factory Reset  
Clears **all** school data including students, fees, sessions, and settings.  
⚠️ This is irreversible. Always export a backup first.

## WhatsApp API Settings (Super Admin only)

- Endpoint: `https://wacoder.in/api/whatsapp-web/send-message`
- App Key: Pre-filled in Settings → WhatsApp API
- Auth Key: Pre-filled in Settings → WhatsApp API
- Test connection from Settings → WhatsApp API → Send Test Message
