<?php
// ─── DATABASE ────────────────────────────────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_PORT', 3306);
define('DB_NAME', 'psmkgsco_shubherp_db');
define('DB_USER', 'psmkgsco_shubherp_user');
define('DB_PASS', 'Shubh@420');

// ─── JWT ─────────────────────────────────────────────────────────────────────
define('JWT_SECRET', 'shubh_erp_jwt_secret_2024');
define('JWT_EXPIRY', 604800);              // 7 days in seconds
define('REFRESH_TOKEN_EXPIRY', 604800);    // 7 days in seconds

// ─── SUPERADMIN API KEY ───────────────────────────────────────────────────────
// Sent as ?sa_key= query param — LiteSpeed cannot strip query params
define('SUPERADMIN_API_KEY', 'shubh_superadmin_2024_secure_key');

// ─── APP ─────────────────────────────────────────────────────────────────────
define('API_VERSION', '1.0');
define('APP_NAME', 'SHUBH School ERP');
define('APP_API_URL', 'https://shubh.psmkgs.com/api/index.php');
define('ALLOWED_ORIGINS', ['https://shubh.psmkgs.com', 'http://localhost:3000', 'http://localhost:5173']);
