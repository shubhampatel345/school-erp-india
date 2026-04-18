# SHUBH SCHOOL ERP — PHP API Backend (v2.0, No .htaccess)

This folder contains the complete PHP REST API backend for cPanel/MySQL deployment.

**Version 2.0** uses **query-string routing** — NO `.htaccess` or `mod_rewrite` needed.
Works on any cPanel server regardless of server configuration.

---

## Quick Setup (2 files only)

### Step 1 — Upload 2 Files to cPanel

Only **2 files** are needed. Upload them to `public_html/api/` on cPanel:

| File | Purpose |
|------|---------|
| `index.php` | All API routes + handlers inline |
| `config.php` | Database connection + helper functions |

Your directory should look like:
```
public_html/
├── index.html         ← React app
├── assets/
└── api/
    ├── index.php      ← ALL API logic (upload this)
    └── config.php     ← DB credentials (upload this)
```

> **Do NOT upload `.htaccess`** — it is not needed and may cause issues on some servers.

---

### Step 2 — Create Database Tables

Open this URL in your browser (run ONCE):
```
https://shubh.psmkgs.com/api/index.php?route=migrate/run
```

This creates all 28 database tables and seeds the `superadmin` user.

---

### Step 3 — Test the Connection

```
https://shubh.psmkgs.com/api/index.php?route=health
```
Expected response: `{"status":"ok","message":"API is running",...}`

---

## All API Endpoints

All endpoints use the format: `?route=ROUTE_NAME`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `?route=health` | Public | Health check |
| GET | `?route=sync/status` | Public | DB connection + row counts |
| POST | `?route=auth/login` | Public | Login, returns JWT |
| POST | `?route=auth/refresh` | Public | Refresh JWT token |
| POST | `?route=auth/change-password` | JWT | Change password |
| GET | `?route=migrate/run` | Public | Create all tables + seed superadmin |
| GET | `?route=migrate/seed` | Public | Seed default data |
| GET | `?route=migrate/reset-superadmin` | Public | Reset password to admin123 |
| POST | `?route=sync/push` | Super Admin | Bulk upsert all collections |
| POST | `?route=sync/batch` | Super Admin | Upsert single collection |
| GET | `?route=sync/pull` | JWT | Pull records since timestamp |
| GET | `?route=data/{collection}` | JWT | List records |
| POST | `?route=data/{collection}` | JWT | Create/upsert record |
| PUT | `?route=data/{collection}/{id}` | JWT | Update record |
| DELETE | `?route=data/{collection}/{id}` | JWT | Soft-delete record |
| GET | `?route=backup/export` | Admin+ | Export all data as JSON |
| POST | `?route=backup/import` | Super Admin | Restore from JSON backup |
| GET | `?route=backup/history` | JWT | List backup history |
| POST | `?route=backup/factory-reset` | Super Admin | Wipe all data |
| GET | `?route=settings/school` | JWT | Get school settings |
| POST | `?route=settings/school` | Super Admin | Update school settings |
| GET | `?route=settings/users` | JWT | List users |
| POST | `?route=settings/users` | Super Admin | Create user |

---

## Default Credentials

| Field | Value |
|-------|-------|
| Username | `superadmin` |
| Password | `admin123` |

> Reset password anytime: `?route=migrate/reset-superadmin`

---

## Database Credentials (psmkgsco cPanel)

```php
DB_HOST = localhost
DB_PORT = 3306
DB_NAME = psmkgsco_shubherp_db
DB_USER = psmkgsco_shubherp_user
DB_PASS = Shubh@420
```

Override with PHP environment variables if needed.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Server returned HTML instead of JSON` | `index.php` not uploaded to `public_html/api/` |
| `Database connection failed` | Check DB credentials in `config.php` |
| `User not found` | Run `?route=migrate/run` then `?route=migrate/seed` |
| `Invalid username or password` | Run `?route=migrate/reset-superadmin` |
| Tables empty after push | Ensure you're logged in as Super Admin before pushing |
| CORS errors | Headers are set by `index.php` — no server config needed |

---

## Why No .htaccess?

Previous versions used `.htaccess` URL rewriting (`/api/students` → `router.php`).
This failed on many cPanel servers where `mod_rewrite` is disabled or `AllowOverride None` is set.

v2.0 uses **query-string routing** instead:
- `?route=health` → health check
- `?route=auth/login` → login handler  
- `?route=data/students` → students CRUD

This works on **every** PHP server, no configuration required.
