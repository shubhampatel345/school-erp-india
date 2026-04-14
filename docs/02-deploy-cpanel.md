# Deploy on cPanel Hosting — SHUBH SCHOOL ERP

Complete guide for hosting SHUBH SCHOOL ERP on Indian cPanel hosting with MySQL database for real-time multi-device sync.

---

## Overview — Two Deployment Modes

| Mode | Data Storage | Multi-Device | Setup Complexity |
|------|-------------|--------------|-----------------|
| **Static Only** | Browser localStorage | ❌ No | 5 minutes |
| **MySQL Mode** | MySQL on cPanel | ✅ Yes — real-time | 20–30 minutes |

This guide covers the **MySQL Mode** (recommended for schools). For Static Only, see Steps 1–6 only.

---

## Prerequisites

- cPanel hosting account with **PHP 7.4+** and **MySQL 5.7+** (see recommended providers below)
- **SSL certificate** (AutoSSL/Let's Encrypt — free on all major Indian hosts)
- Node.js 18+ and pnpm on your **local computer** (for building only)
- A custom domain (strongly recommended for HTTPS, PWA, and WhatsApp API)

---

## Part 1 — Build & Upload the React App

### Step 1 — Build the Project Locally

Run these commands on your computer:

```bash
# In the project root folder
pnpm install

# Build the frontend
cd src/frontend
pnpm build

# Build output will be at: src/frontend/dist/
```

### Step 2 — Locate the dist/ Folder

After the build completes, find `src/frontend/dist/`. It contains:

```
dist/
├── index.html           ← main HTML entry point
├── assets/
│   ├── index-[hash].js  ← bundled JavaScript
│   ├── index-[hash].css ← bundled CSS
│   └── ...              ← fonts, icons, images
├── api/                 ← PHP REST API (if present)
└── manifest.json        ← PWA manifest
```

### Step 3 — Log In to cPanel

Go to your hosting provider's cPanel URL (usually `yourdomain.com/cpanel` or as provided in your hosting welcome email).

### Step 4 — Upload to public_html

> ⚠️ Upload the **contents** of `dist/`, not the `dist` folder itself.

1. Compress the `dist/` folder as a ZIP file on your computer
2. In File Manager, navigate to `public_html/`
3. Click **Upload** → select the ZIP file
4. After upload, right-click the ZIP → **Extract**
5. Confirm that `index.html`, `assets/`, `manifest.json` are directly inside `public_html/`
6. Delete the ZIP file after extraction

### Step 5 — Create .htaccess for SPA Routing

Without this, refreshing any page will show a 404 error.

In File Manager, click **+ File**, name it `.htaccess` (with the dot prefix), and paste:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

> Note: Use `QSA,L` — not `QR,L`. The `QSA` flag correctly passes query strings.

### Step 6 — Enable SSL via AutoSSL

In cPanel, go to **SSL/TLS** → **Free SSL Certificate (Let's Encrypt / AutoSSL)** → click **Issue** for your domain.

HTTPS is **mandatory** for:
- QR code camera scanner (browser security requirement)
- PWA installation on Android/iOS
- WhatsApp API calls from production
- MySQL API calls (CORS security)

---

## Part 2 — MySQL Database Setup

### Step 7 — Create MySQL Database

In cPanel, go to **MySQL Databases**:

1. Under **Create New Database**, enter a name: `shubherp_db` → click **Create Database**
2. Under **Create New User**, enter:
   - Username: `shubherp_user`
   - Password: Choose a strong password (16+ characters, save it securely)
   - Click **Create User**
3. Under **Add User to Database**, select:
   - User: `shubherp_user`
   - Database: `shubherp_db`
   - Click **Add** → on the next screen, check **ALL PRIVILEGES** → **Make Changes**

> ⚠️ Your full database username will be `cpanelusername_shubherp_user` (cPanel prefixes your account username). Note the full username from the MySQL Users list.

### Step 8 — Upload the PHP API

The PHP REST API files are in `public/api/` in your project. These should already be inside `public_html/api/` after extraction (if they were included in the dist build).

If not, manually upload the `api/` folder from `src/frontend/public/api/` to `public_html/api/`.

The API folder structure:
```
public_html/api/
├── config.php       ← Database credentials (EDIT THIS)
├── index.php        ← Router — all API requests go through here
├── migrate.php      ← Creates all MySQL tables on first run
└── endpoints/       ← Module endpoints (students, fees, attendance, etc.)
```

### Step 9 — Configure config.php

In File Manager, navigate to `public_html/api/` and open `config.php` for editing:

```php
<?php
// SHUBH SCHOOL ERP — Database Configuration
define('DB_HOST', 'localhost');           // Always localhost on cPanel
define('DB_NAME', 'cpanelusername_shubherp_db');  // Your full DB name
define('DB_USER', 'cpanelusername_shubherp_user'); // Your full DB username
define('DB_PASS', 'YourStrongPassword');  // The password you set in Step 7
define('DB_CHARSET', 'utf8mb4');
define('JWT_SECRET', 'change-this-to-a-random-32-char-string'); // Change this!
define('ALLOWED_ORIGIN', 'https://yourdomain.com'); // Your domain
?>
```

> ⚠️ **Important:** Replace all placeholder values with your actual credentials. The `ALLOWED_ORIGIN` must exactly match your domain including `https://`.

### Step 10 — Run Database Migration

Open your browser and navigate to:

```
https://yourdomain.com/api/migrate.php?action=run
```

You should see a response like:

```json
{
  "success": true,
  "message": "Migration complete",
  "tables_created": ["students", "staff", "fee_receipts", "attendance", ...]
}
```

> This creates all required MySQL tables. Run this only once. If you run it again, it safely skips already-created tables.

### Step 11 — Configure API URL in ERP

1. Open your ERP: `https://yourdomain.com`
2. Log in as **Super Admin** (superadmin / admin123)
3. Go to **Settings → Data → Database Server** tab
4. Enter your API URL: `https://yourdomain.com/api`
5. Click **Test Connection** — you should see a green ✅ "Connected" message
6. Click **Save API URL**

### Step 12 — Migrate Existing Data (if any)

If you have data in localStorage from before setting up MySQL:

1. Go to **Settings → Data → Database Server** tab
2. Click **Migrate Data to Server**
3. All localStorage data is uploaded to MySQL
4. Confirm the sync status indicator turns green

After migration, all new data writes to MySQL. localStorage is used only as a local cache.

### Step 13 — Test Multi-Device Sync

1. Open the ERP on a second device (another computer or phone)
2. Log in — you should see the same students, fees, and settings
3. Add a student on Device A — it should appear on Device B within 5 seconds (auto-sync every 5 seconds)

---

## Part 3 — Domain & SSL Verification

### Step 14 — Point Custom Domain

If you have a domain (e.g. `school.in`), update DNS at your registrar:

```
Type: A Record
Name: @ (root) or erp (subdomain)
Value: [Your server IP from cPanel → General Info]
TTL: 3600
```

DNS changes take 15 minutes to 24 hours to propagate.

### Step 15 — Verify the Complete Deployment

- [ ] `https://yourdomain.com` → login screen appears
- [ ] Login with `superadmin / admin123`
- [ ] Settings → School Profile: enter your school details
- [ ] Settings → Data → Database Server: shows "Connected" ✅
- [ ] Add a test student → appears on another device within 5 seconds
- [ ] Fees → Collect Fees: collect test fees → receipt generated
- [ ] Attendance → QR Scanner: camera works on mobile (HTTPS required)
- [ ] Chrome on Android → "Add to Home Screen" prompt appears

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Blank white page | Missing files or build error | Open F12 console. Rebuild with `pnpm build`. Verify all `dist/` contents are in `public_html/` |
| 404 on page refresh | Missing .htaccess | Create `.htaccess` with the RewriteRule above. Check mod_rewrite is enabled in cPanel |
| CSS / styles not loading | Wrong asset paths | Rebuild the app — Vite uses relative paths. Verify `assets/` folder is alongside `index.html` |
| API returns 500 error | Wrong DB credentials in config.php | Double-check `DB_NAME`, `DB_USER`, `DB_PASS` — include the cPanel username prefix |
| "Access denied for user" MySQL error | Wrong user permissions | In cPanel → MySQL Databases → verify user has ALL PRIVILEGES on the database |
| Migration fails with table errors | PHP version too old | Check cPanel → MultiPHP Manager — set PHP 7.4 or 8.x for your domain |
| "CORS error" in browser | `ALLOWED_ORIGIN` mismatch | In `config.php`, set `ALLOWED_ORIGIN` to your exact domain including `https://` |
| Sync not working | API URL not saved | Settings → Data → Database Server → verify URL is saved and Test shows green |
| Can't install PWA | Not HTTPS or wrong browser | Ensure SSL is active. Use Chrome on Android. iOS requires Safari |
| QR scanner blocked | Camera permission denied | Chrome Settings → Site Settings → Camera → find your domain → Allow |
| WhatsApp CORS error | Localhost restriction | Deploy to real domain — CORS only occurs in preview/localhost |
| Database connection timeout | Firewall / wrong hostname | Verify `DB_HOST` is `localhost` — not an IP address — on cPanel |

---

## Recommended Indian Hosting Providers

All providers below support cPanel + MySQL + PHP + SSL (required for MySQL mode):

| Provider | MySQL | PHP 8.x | cPanel | Price/mo | SSL | Notes |
|----------|-------|---------|--------|----------|-----|-------|
| Hostinger India | ✅ | ✅ | ✅ | ₹69 | ✅ Free | Best value, fast NVMe SSD, recommended |
| MilesWeb | ✅ | ✅ | ✅ | ₹49 | ✅ Free | Cheapest, good for small schools |
| ResellerClub | ✅ | ✅ | ✅ | ✅ | ₹79 | ✅ Free | Good Indian support, reliable |
| BigRock | ✅ | ✅ | ✅ | ₹89 | ✅ Free | ICANN accredited, popular in India |
| HostGator India | ✅ | ✅ | ✅ | ₹99 | ✅ Free | 24/7 support, very popular |
| Bluehost India | ✅ | ✅ | ✅ | ₹199 | ✅ Free | Good for larger schools with more traffic |

> Prices approximate as of 2025. Node.js is **not** required for deployment — only for building on your local machine.

---

## Post-Deployment Checklist

- [ ] Login works (superadmin / admin123)
- [ ] Changed Super Admin password from default
- [ ] School profile filled with real school name and logo
- [ ] SSL certificate active (padlock icon in browser)
- [ ] Page refresh does not show 404 (.htaccess working)
- [ ] Database Server tab shows "Connected" (MySQL mode)
- [ ] Test student added and visible on second device (MySQL mode)
- [ ] QR scanner camera works on mobile (HTTPS required)
- [ ] WhatsApp test message sends successfully
- [ ] PWA "Add to Home Screen" prompt appears on Android Chrome
- [ ] Backup exported and stored safely
