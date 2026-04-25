<?php
define('DB_HOST', 'localhost');
define('DB_PORT', 3306);
define('DB_NAME', 'psmkgsco_shubherp_db');
define('DB_USER', 'psmkgsco_shubherp_user');
define('DB_PASS', 'Shubh@420');
define('JWT_SECRET', 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_shubh_erp_2025');
define('JWT_EXPIRY', 3600);         // 1 hour
define('JWT_REFRESH_EXPIRY', 604800);  // 7 days
define('REFRESH_TOKEN_EXPIRY', JWT_REFRESH_EXPIRY); // alias for backward compat
define('ALLOWED_ORIGINS', ['https://shubh.psmkgs.com', 'http://localhost:3000', 'http://localhost:5173']);
