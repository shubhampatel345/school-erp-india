<?php
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'psmkgsco_shubherp_db');
define('DB_USER', 'psmkgsco_shubherp_user');
define('DB_PASS', 'Shubh@420');
define('JWT_SECRET', 'shubh_erp_jwt_secret_2024');
define('JWT_EXPIRY', 604800);           // 7 days — matches frontend
define('REFRESH_TOKEN_EXPIRY', 604800); // 7 days
// Both constants defined for cross-version compatibility
define('SUPER_ADMIN_API_KEY', 'shubh_superadmin_2024_secure_key');
// SUPERADMIN_API_KEY alias used by frontend v143+
if (!defined('SUPERADMIN_API_KEY')) define('SUPERADMIN_API_KEY', SUPER_ADMIN_API_KEY);
define('API_VERSION', '1.0');
define('APP_NAME', 'SHUBH SCHOOL ERP');
define('ALLOWED_ORIGINS', ['https://shubh.psmkgs.com', 'http://localhost:3000', 'http://localhost:5173']);
