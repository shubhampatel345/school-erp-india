<?php
define('DB_HOST', 'localhost');
define('DB_PORT', 3306);
define('DB_NAME', 'psmkgsco_shubherp_db');
define('DB_USER', 'psmkgsco_shubherp_user');
define('DB_PASS', 'Shubh@420');
define('JWT_SECRET', 'shubh_erp_jwt_secret_2025');
define('JWT_EXPIRY', 604800);                          // 7 days — access token
define('JWT_REFRESH', 604800);                         // alias used in auth.php
define('JWT_REFRESH_EXPIRY', 604800);                  // 7 days — refresh token
define('REFRESH_TOKEN_EXPIRY', JWT_REFRESH_EXPIRY);
define('API_VERSION', '1.0');
define('APP_VERSION', '1.0');
define('APP_NAME', 'SHUBH SCHOOL ERP');
define('API_URL', 'https://shubh.psmkgs.com/api');
// Superadmin API key — used by the frontend when logged in as superadmin (no JWT needed).
// LiteSpeed strips all Authorization headers; the superadmin key is sent as ?sa_key= query param.
define('SUPERADMIN_API_KEY', 'shubh_superadmin_2024_secure_key');
define('ALLOWED_ORIGINS', ['https://shubh.psmkgs.com', 'http://localhost:3000', 'http://localhost:5173']);
