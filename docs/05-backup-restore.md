# Backup & Restore — SHUBH SCHOOL ERP

Regular backups protect against data loss from browser clears, device changes, accidental resets, or OS reinstalls. Backup behavior differs slightly between Local Mode and MySQL Mode.

---

## How to Create a Backup

1. Go to **Settings → Data** tab
2. Click **Export JSON Backup**
3. A file named `shubh-erp-backup-YYYY-MM-DD.json` downloads automatically
4. Save this file to:
   - Google Drive or OneDrive (recommended)
   - A USB pen drive kept at school
   - Email it to the school admin

### What Is Included in the Backup

- **Local Mode:** All localStorage keys with prefix `shubh_erp_` — students, staff, fees, receipts, sessions, attendance, transport, inventory, expenses, settings, and WhatsApp configuration.
- **MySQL Mode:** The backup fetches a complete snapshot from the MySQL database via the API, then downloads it as JSON. This means the backup always reflects the latest server data, not just what is cached locally.

> The backup includes **ALL** data regardless of mode: students, staff, fees, receipts, sessions, attendance, transport, inventory, expenses, settings, and WhatsApp configuration.

---

## How to Restore from Backup

1. Go to **Settings → Data** tab
2. Click **Import JSON Backup**
3. Select the backup `.json` file from your computer
4. All data is restored immediately and the page reloads automatically

### Restore Behavior by Mode

- **Local Mode:** Data is written to localStorage. Works immediately.
- **MySQL Mode:** Data is written to both localStorage (cache) and sent to the MySQL server. The server receives the full dataset from the backup. Sync status briefly shows "Syncing" then returns to "Connected".

> ⚠️ **Warning:** Importing replaces ALL current data. If you have newer entries after the backup date, they will be lost. Export a fresh backup first if needed.

---

## MySQL Backup (Server-Side)

When using MySQL Mode, you have two additional backup options:

### Option 1: ERP JSON Backup (Recommended)
Use the Export JSON Backup button as described above. This is the easiest and works in both modes.

### Option 2: phpMyAdmin SQL Dump (Advanced)
In cPanel, go to **phpMyAdmin** → select your ERP database → click **Export**:
- Format: SQL
- Click **Go**
- Downloads a `.sql` file containing full database schema + data

To restore: phpMyAdmin → select database → **Import** → select the `.sql` file.

> phpMyAdmin backup is useful for keeping a full SQL archive alongside the JSON backups.

### Option 3: cPanel Database Backup
In cPanel → **Backup** → **Partial Backups** → **Download a MySQL Database Backup** → select your ERP database.

This creates a compressed `.sql.gz` file. Store it alongside your JSON backups.

---

## Recommended Backup Schedule

| Frequency | When | Reason |
|-----------|------|--------|
| **Daily** | End of school day | Protects against data entry loss |
| **Before Promote Students** | Year-end | Session promotion is irreversible without backup |
| **Before Factory Reset** | Any time | Reset permanently clears ALL data |
| **Weekly minimum** | Every Friday | Safe fallback for any school |
| **Monthly** | 1st of every month | Minimum acceptable backup frequency |
| **Before browser update** | When Chrome/Edge prompts update | Browser updates can clear local cache |

> In MySQL Mode, daily automatic backups are still strongly recommended because accidental data entry (wrong fees, wrong student info) can be recovered only from a backup.

---

## Backup File Contents

The exported JSON contains all data organized by module:

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

### Local Mode
1. **On the old computer:** Export JSON Backup
2. **On the new computer:** Open the ERP URL → Settings → Data → Import JSON Backup
3. Select the backup file — all data transfers instantly

### MySQL Mode
No transfer needed — just open the ERP URL on the new computer, configure the same API URL in Settings → Data → Database Server, and all data loads automatically from the server.

---

## Factory Reset

**Settings → Data → Factory Reset**

Clears **ALL** school data including students, fees, sessions, attendance, and settings. The ERP returns to its initial empty state.

- Super Admin login (`superadmin` / `admin123`) is the only credential preserved
- This action **cannot be undone**
- 3-step confirmation required before reset executes
- Always export a backup before resetting

### Factory Reset in MySQL Mode

In MySQL Mode, Factory Reset:
1. Clears all localStorage cache locally
2. Sends a clear request to the MySQL server via the API
3. All MySQL tables are truncated (emptied but not dropped)
4. Tables remain intact for future use — no need to re-run migration

> 🚨 Use Factory Reset only when starting completely fresh (e.g. setting up for a new school). Do NOT use it to "fix" a problem — restore from backup instead.

---

## Disaster Recovery

If data is lost unexpectedly:

1. **MySQL Mode:** Log in from any device — data is on the server, not the device. Simply open the ERP URL.
2. **Local Mode:** Check if browser history was cleared — if so, data is gone; restore from backup
3. **Wrong browser open?** Different browsers have separate localStorage; use the same browser you always use
4. **Wrong device?** In local mode, localStorage is device and browser specific
5. **Restore from last backup:** Settings → Data → Import JSON Backup
6. **If no backup exists,** data cannot be recovered — this is why regular backups are critical

### Prevention

- Set a recurring calendar event "ERP Backup" every Friday
- Store the backup file in at least 2 locations (cloud + local)
- **Use MySQL Mode** — server data survives any device or browser issue
- Consider running phpMyAdmin automated backups as a second layer of protection
