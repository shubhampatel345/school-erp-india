# SHUBH SCHOOL ERP — PHP API Backend

This folder contains the complete PHP REST API backend for cPanel/MySQL deployment.
Upload all files in this `api/` folder to your `public_html/api/` directory on cPanel.

---

## Quick Setup (3 steps)

### Step 1 — Upload Files

1. Download your SHUBH SCHOOL ERP build ZIP
2. Log in to **cPanel File Manager** → go to `public_html/`
3. Upload the entire `api/` folder to `public_html/api/`
4. Also upload `.htaccess` from the build root to `public_html/` (enables SPA routing)

Your directory should look like:
```
public_html/
├── .htaccess          ← SPA routing + API passthrough  (REQUIRED)
├── index.html         ← React app
├── assets/
└── api/
    ├── .htaccess      ← PHP router rewrite rules  (REQUIRED)
    ├── index.php
    ├── config.php
    ├── router.php
    ├── auth.php
    ├── sync.php
    ├── migrate.php
    ├── data.php
    ├── students.php
    ├── fees.php
    ├── attendance.php
    ├── hr.php
    ├── academics.php
    ├── transport.php
    ├── inventory.php
    ├── settings.php
    ├── backup.php
    └── README.md
```

### Step 2 — Create Database Tables

Open this URL in your browser **once** after uploading:

```
https://shubh.psmkgs.com/api/migrate/run
```

Expected response:
```json
{"status":"success","message":"9 migration(s) applied","data":{"applied":[...],"errors":[]}}
```

If you see HTML instead of JSON → the `api/.htaccess` file is missing or `mod_rewrite` is disabled.

### Step 3 — Test & Authenticate

Open the ERP → **Settings → Data Management → Database Server**

1. URL should already show `https://shubh.psmkgs.com/api` (pre-filled)
2. Click **Test Connection** → should show green "Connected · Xms"
3. Enter Super Admin password (`admin123` default) → click **Authenticate Now**

---

## Database Configuration

Pre-configured in `config.php` for your cPanel account:

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `3306` |
| Database | `psmkgsco_shubherp_db` |
| User | `psmkgsco_shubherp_user` |
| Password | `Shubh@420` |

Override via cPanel environment variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`

---

## API Endpoints

### Public (no JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sync/status` | Health check — always JSON |
| POST | `/api/auth/login` | Returns JWT token |
| POST | `/api/auth/refresh` | Refresh JWT |
| GET/POST | `/api/migrate/run` | Create DB tables (initial setup) |
| POST | `/api/migrate/seed` | Seed default superadmin |
| GET | `/api/migrate/status` | Show migration history |

### Protected (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/students[/:id]` | Student records |
| GET/POST/PUT/DELETE | `/api/fees/headings[/:id]` | Fee headings |
| GET/POST | `/api/fees/plan` | Fee plans (superadmin) |
| POST | `/api/fees/collect` | Record payment |
| GET/PUT/DELETE | `/api/fees/receipt/:id` | Receipt management |
| GET/POST/PUT/DELETE | `/api/data/{collection}[/:id]` | Generic CRUD |
| POST | `/api/sync/push` | Bulk migrate (superadmin) |
| GET | `/api/sync/pull` | Pull changes |

---

## Troubleshooting

### "Server returned HTML instead of JSON" / Connection fails
**Cause:** `api/.htaccess` is missing or `mod_rewrite` is disabled.

**Fix:**
1. Ensure `api/.htaccess` is uploaded (it contains the PHP rewrite rules)
2. Ensure `public_html/.htaccess` is also uploaded
3. In cPanel → Apache Handlers, verify `.htaccess` files are allowed
4. Contact hosting support to enable `mod_rewrite` if needed

### "403 Forbidden"
**Fix:** In cPanel File Manager, set permissions:
- Folders: `755`
- PHP files: `644`

### "Database connection failed"
**Fix:**
1. Verify database `psmkgsco_shubherp_db` exists in cPanel MySQL Databases
2. Verify user `psmkgsco_shubherp_user` has ALL PRIVILEGES on that database
3. In phpMyAdmin run: `GRANT ALL PRIVILEGES ON psmkgsco_shubherp_db.* TO 'psmkgsco_shubherp_user'@'localhost'; FLUSH PRIVILEGES;`

### `{"status":"error","message":"Super Admin only"}`
**Fix:** Go to Settings → Data Management → Database Server → Authenticate Now, enter `admin123`

### Tables not created after /migrate/run
**Fix:** Ensure the DB user has CREATE TABLE privileges (run GRANT command above)

### CORS errors in browser console
`index.php` already sets `Access-Control-Allow-Origin: *`. If still failing:
- Check your cPanel `.htaccess` isn't overriding headers
- Check browser isn't blocking mixed content (use HTTPS)

---

## Security

1. Change the default `admin123` password immediately after first login
2. `migrate/run` is public for initial setup — restrict it afterward if needed
3. All JWT tokens expire in 24 hours; refresh tokens expire in 7 days
4. DB password and JWT secret can be set as cPanel environment variables

## PHP Requirements

- PHP 7.4+ (PHP 8.x recommended)
- PDO with MySQL driver
- `mod_rewrite` enabled
- SSL certificate (for HTTPS)
