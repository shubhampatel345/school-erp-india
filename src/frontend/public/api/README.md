# SHUBH SCHOOL ERP — cPanel API Setup Guide

## What these files are

This `api/` folder contains the PHP backend for SHUBH SCHOOL ERP. It provides
a REST API that connects to your MySQL database on cPanel.

The frontend React app calls `https://shubh.psmkgs.com/api/*` — all those
requests are handled by these PHP files.

---

## Step-by-Step cPanel Upload

### Step 1 — Log into cPanel
Go to your hosting control panel (e.g. `https://shubh.psmkgs.com:2083`).

### Step 2 — Open File Manager
Click **File Manager** → navigate to **`public_html`** (or the folder your
domain points to).

> If your domain `shubh.psmkgs.com` points to a subfolder (e.g. `public_html/school`),
> navigate to that folder instead.

### Step 3 — Create the `api` folder
Inside `public_html`, click **+ Folder** and create a folder named **`api`**.

### Step 4 — Upload ALL files
Upload every file from this `api/` folder into `public_html/api/`:

```
index.php       ← entry point (required)
.htaccess       ← URL rewriting (required — upload with hidden files shown)
config.php
router.php
auth.php
sync.php
migrate.php
students.php
fees.php
attendance.php
hr.php
academics.php
transport.php
inventory.php
settings.php
backup.php
database.sql    ← reference only, migrations run automatically
```

> **Important:** Make sure `.htaccess` is uploaded. In cPanel File Manager,
> enable "Show Hidden Files" in Settings to see it after upload.

### Step 5 — Upload the root `.htaccess`
The `public_html/.htaccess` file (one level UP from api/) must also be uploaded.
This ensures `/api/*` requests go to PHP and all other requests serve the React SPA.

### Step 6 — Initialize the database
Open your browser and visit:

```
https://shubh.psmkgs.com/api/migrate/run
```

Use a REST client (Postman, Thunder Client) or a simple HTML form to POST to it:

```bash
curl -X POST https://shubh.psmkgs.com/api/migrate/run
```

You should see:
```json
{"status":"success","message":"X migration(s) applied","data":{...}}
```

### Step 7 — Seed default data (first time only)
```bash
curl -X POST https://shubh.psmkgs.com/api/migrate/seed \
  -H "Content-Type: application/json" \
  -d '{"school_name":"Your School Name","superadmin_username":"superadmin","superadmin_password":"admin123"}'
```

### Step 8 — Test the connection
Open the ERP app → **Settings → Data Management → Database Server**

Enter: `https://shubh.psmkgs.com/api`

Click **Test Connection** — you should see a green "Connected" status.

---

## Database Configuration

The credentials are already set in `config.php`:

| Setting | Value |
|---------|-------|
| Host | localhost |
| Port | 3306 |
| Database | `psmkgsco_shubherp_db` |
| Username | `psmkgsco_shubherp_user` |
| Password | `Shubh@420` |

To change credentials, edit `config.php` or set environment variables in cPanel.

---

## Verify the API is working

Visit in browser (should return JSON):
```
https://shubh.psmkgs.com/api/sync/status
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "connected": true,
  "server_time": "2024-...",
  "counts": {...}
}
```

If you see HTML (a 403 or 404 page), check:

1. **Files uploaded?** — Make sure all `.php` files and `.htaccess` are in `public_html/api/`
2. **mod_rewrite enabled?** — Contact your hosting provider (most cPanel hosts have it on)
3. **PHP version?** — Must be PHP 7.4 or higher (PHP 8.x recommended). Set in cPanel → PHP Selector
4. **Database created?** — The database `psmkgsco_shubherp_db` and user `psmkgsco_shubherp_user` must exist in cPanel → MySQL Databases
5. **Permissions?** — Files should be 644, folders 755

---

## Troubleshooting

### Error: "Unexpected token '<', <!DOCTYPE..."
The API is returning an HTML page. Causes:
- The `api/` folder is not uploaded
- The `.htaccess` is missing (upload with hidden files visible in cPanel)
- mod_rewrite is not enabled on your server

### Error: 403 Forbidden
- Check that `.htaccess` files were uploaded (both `public_html/.htaccess` and `public_html/api/.htaccess`)
- Check file permissions: PHP files should be 644

### Error: "Database connection failed"
- Verify MySQL database `psmkgsco_shubherp_db` exists in cPanel → MySQL Databases
- Verify user `psmkgsco_shubherp_user` has full privileges on that database
- Verify password `Shubh@420` is correct

### Error: "Super Admin only"
- You are not authenticated as Super Admin
- Go to Settings → Data Management → click "Authenticate Now" and enter your Super Admin password

---

## API Endpoints Reference

All endpoints are under `https://shubh.psmkgs.com/api/`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/sync/status` | None | Health check |
| POST | `/migrate/run` | None | Run DB migrations |
| POST | `/migrate/seed` | None | Seed default data |
| POST | `/auth/login` | None | Login (returns JWT) |
| GET | `/students` | JWT | List students |
| POST | `/fees/collect` | JWT | Collect fees |
| POST | `/attendance/mark` | JWT | Mark attendance |
| ... | all other modules | JWT | See individual PHP files |

---

## Indian Hosting Providers (cPanel)

| Provider | Price/year | PHP 8 | MySQL | Recommended |
|----------|-----------|-------|-------|-------------|
| Hostinger | ₹2,500 | ✅ | ✅ | ✅ Best value |
| MilesWeb | ₹2,999 | ✅ | ✅ | ✅ Good support |
| HostGator India | ₹3,500 | ✅ | ✅ | Good |
| BigRock | ₹4,000 | ✅ | ✅ | OK |

---

*SHUBH SCHOOL ERP — Production API v1.0.0*
