# Backup & Restore — SHUBH SCHOOL ERP

All SHUBH SCHOOL ERP data is stored in browser **localStorage**. Regular backups protect against data loss from browser clears, device changes, accidental resets, or OS reinstalls.

---

## How to Create a Backup

1. Go to **Settings → Data** tab
2. Click **Export JSON Backup**
3. A file named `shubh-erp-backup-YYYY-MM-DD.json` downloads automatically
4. Save this file to:
   - Google Drive or OneDrive (recommended)
   - A USB pen drive kept at school
   - Email it to the school admin

> The backup includes **ALL** data: students, staff, fees, receipts, sessions, attendance, transport, inventory, expenses, settings, and WhatsApp configuration.

---

## How to Restore from Backup

1. Go to **Settings → Data** tab
2. Click **Import JSON Backup**
3. Select the backup `.json` file from your computer
4. All data is restored immediately and the page reloads automatically

> ⚠️ **Warning:** Importing replaces ALL current data. If you have newer entries after the backup date, they will be lost. Export a fresh backup first if needed.

---

## Recommended Backup Schedule

| Frequency | When | Reason |
|-----------|------|--------|
| **Daily** | End of school day | Protects against data entry loss |
| **Before Promote Students** | Year-end | Session promotion is irreversible without backup |
| **Before Factory Reset** | Any time | Reset permanently clears ALL data |
| **Weekly minimum** | Every Friday | Safe fallback for any school |
| **Monthly** | 1st of every month | Minimum acceptable backup frequency |
| **Before browser update** | When Chrome/Edge prompts update | Browser updates can clear storage |

---

## Backup File Contents

The exported JSON contains all localStorage keys with prefix `shubh_erp_`:

```json
{
  "shubh_erp_students":       [...],   // All student records
  "shubh_erp_staff":          [...],   // All staff records
  "shubh_erp_fee_receipts":   [...],   // All fee payment receipts
  "shubh_erp_fee_plan":       {...},   // Fee structure per class/section
  "shubh_erp_fee_headings":   [...],   // Fee heading definitions
  "shubh_erp_sessions":       [...],   // Session archive (infinite history)
  "shubh_erp_attendance":     {...},   // Daily attendance records
  "shubh_erp_transport":      {...},   // Routes, buses, pickup points
  "shubh_erp_inventory":      [...],   // Stock, purchases, sales
  "shubh_erp_expenses":       [...],   // Income & expense ledger
  "shubh_erp_school_profile": {...},   // School name, logo, address
  "shubh_erp_user_passwords": {...},   // Hashed user credentials
  "shubh_erp_settings":       {...}    // App preferences, WhatsApp keys
}
```

---

## Transfer Data to Another Computer

To move ERP data to a new computer or browser:

1. **On the old computer:** Export JSON Backup
2. **On the new computer:** Open the ERP URL → Settings → Data → Import JSON Backup
3. Select the backup file — all data transfers instantly

> Note: localStorage is per-browser, per-device. Ensure you always use the same browser (e.g. Chrome) on the same device for consistent data access.

---

## Factory Reset

**Settings → Data → Factory Reset**

Clears **ALL** school data including students, fees, sessions, attendance, and settings. The ERP returns to its initial empty state.

- Super Admin login (`superadmin` / `admin123`) is the only credential preserved
- This action **cannot be undone**
- 3-step confirmation required before reset executes
- Always export a backup before resetting

> 🚨 Use Factory Reset only when starting completely fresh (e.g. setting up for a new school). Do NOT use it to "fix" a problem — restore from backup instead.

---

## Disaster Recovery

If data is lost unexpectedly:

1. **Check if browser history was cleared** — if so, data is gone; restore from backup
2. **Check if wrong browser is open** — different browsers have separate localStorage; use the same browser you always use for the ERP
3. **Check if you're on the same device** — localStorage is device and browser specific
4. **Restore from your last backup** using Import JSON Backup
5. **If no backup exists**, data cannot be recovered — this is why regular backups are critical

### Prevention

- Set a recurring calendar event "ERP Backup" every Friday
- Store the backup file in at least 2 locations (cloud + local)
- Consider using a dedicated browser profile exclusively for the ERP
- Consider deploying to cPanel hosting and using a shared computer for the ERP (single point of truth)
