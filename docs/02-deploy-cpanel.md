# Deploy on cPanel Hosting

Host SHUBH SCHOOL ERP on any Indian shared hosting that supports cPanel.

## Prerequisites
- cPanel hosting with File Manager access
- Node.js 18+ on your local machine
- pnpm package manager

## Step-by-Step Deployment

### Step 1: Build the App

```bash
# In project root
pnpm install
cd src/frontend
pnpm build
# Output is in src/frontend/dist/
```

### Step 2: Compress the dist/ folder

Right-click the `dist/` folder → Compress as ZIP. Name it `school-erp.zip`.

### Step 3: Upload via File Manager

Login to cPanel → File Manager → navigate to `public_html/` (or a subdirectory) → Upload → select the ZIP → Extract it here.

### Step 4: Create .htaccess for React Router

Create or edit `public_html/.htaccess`:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QR,L]
```

### Step 5: Enable SSL (HTTPS)

cPanel → SSL/TLS → Install Free Let's Encrypt certificate for your domain.  
HTTPS is **required** for camera (QR scanner) and PWA install features.

### Step 6: Verify

Open your domain in a browser. Login with `superadmin` / `admin123`.  
Go to Settings → School Profile and fill in your school details.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Page refresh shows 404 | Check `.htaccess` RewriteRule and that `mod_rewrite` is enabled |
| App loads but shows blank white | Check browser console (F12). Usually a JS build error — rebuild. |
| Can't install PWA | Must be HTTPS. Chrome on Android only. Check `manifest.json` is accessible. |
| QR Scanner camera blocked | Chrome Settings → Site Settings → Camera → Allow your domain. |
| Data lost after browser update | localStorage cleared — restore from JSON backup. |

## Recommended Indian Hosting Providers

| Provider | Plan | Price | Notes |
|----------|------|-------|-------|
| Hostinger India | Web Hosting Starter | ₹79/mo | Best value, 1-click SSL |
| BigRock | Starter Plan | ₹99/mo | Reliable Indian hosting |
| GoDaddy India | Economy | ₹149/mo | 24/7 support |
