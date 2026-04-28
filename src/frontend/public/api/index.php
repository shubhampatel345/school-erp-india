<?php
error_reporting(0);
require_once __DIR__ . '/config.php';

// ─── GLOBAL TRY/CATCH wrapper — every response is guaranteed JSON ─────────────
// (inner try/catch at the bottom catches logic errors; this catches startup errors)
register_shutdown_function(function() {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=UTF-8');
            http_response_code(500);
        }
        echo json_encode(['success' => false, 'error' => 'Fatal error: ' . $err['message'], 'data' => null]);
    }
});

// ─── CORS ────────────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ALLOWED_ORIGINS;
if (in_array($origin, $allowed, true)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Token");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ─── DB CONNECTION ────────────────────────────────────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// ─── JWT ─────────────────────────────────────────────────────────────────────
function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
}
function createJWT(array $payload): string {
    $header  = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRY;
    $body = base64url_encode(json_encode($payload));
    $sig  = base64url_encode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    return "$header.$body.$sig";
}
function verifyJWT(string $token): bool {
    $token = trim($token);
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    [$header, $body, $sig] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    if (!hash_equals($expected, $sig)) return false;
    $payload = json_decode(base64url_decode($body), true);
    // Allow 30-second clock skew tolerance
    return is_array($payload) && isset($payload['exp']) && $payload['exp'] >= (time() - 30);
}
function decodeJWT(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    return json_decode(base64url_decode($parts[1]), true);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function json_out(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data);
    exit;
}
function json_error(string $msg, int $code = 400): void {
    json_out(['success' => false, 'message' => $msg, 'error' => $msg, 'data' => null], $code);
}
function body(): array {
    static $b = null;
    if ($b === null) {
        $raw = file_get_contents('php://input');
        $b   = json_decode($raw, true) ?? [];
    }
    return $b;
}
function getAuthToken(): ?string {
    // Method 0: Superadmin API key — checked FIRST (no JWT needed for superadmin).
    // Frontend appends ?sa_key= when logged in as superadmin. LiteSpeed cannot strip query params.
    if (!empty($_GET['sa_key']) && $_GET['sa_key'] === SUPERADMIN_API_KEY) {
        return 'SUPERADMIN_KEY';
    }
    // Method 1: Query parameter — PRIMARY for LiteSpeed servers (strips ALL auth headers)
    // Frontend always appends &token=JWT to every protected request URL.
    if (!empty($_GET['token'])) {
        return 'Bearer ' . $_GET['token'];
    }
    // Method 2: Standard PHP header (Apache/Nginx)
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        return $_SERVER['HTTP_AUTHORIZATION'];
    }
    // Method 3: Apache mod_rewrite redirect preserves Authorization here
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    // Method 4: apache_request_headers() — works on many cPanel configs
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        foreach ($headers as $key => $value) {
            if (strtolower($key) === 'authorization') {
                return $value;
            }
        }
    }
    // Method 5: getallheaders() fallback
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $key => $value) {
            if (strtolower($key) === 'authorization') {
                return $value;
            }
        }
    }
    // Method 6: X-Token header (belt-and-suspenders fallback)
    if (!empty($_SERVER['HTTP_X_TOKEN'])) {
        return 'Bearer ' . $_SERVER['HTTP_X_TOKEN'];
    }
    return null;
}

function requireAuth(): array {
    $authHeader = getAuthToken();
    if (!$authHeader) {
        json_error('Unauthorized — No authorization header found. Checked: sa_key param, HTTP_AUTHORIZATION, REDIRECT_HTTP_AUTHORIZATION, apache_request_headers, X-Token header, ?token= param.', 401);
    }
    // Superadmin API key bypass — return a fake superadmin user without JWT validation
    if ($authHeader === 'SUPERADMIN_KEY') {
        return ['sub' => 0, 'id' => 0, 'role' => 'superadmin', 'school_id' => 1, 'name' => 'Super Admin'];
    }
    $parts = explode(' ', trim($authHeader));
    if (count($parts) !== 2 || strtolower($parts[0]) !== 'bearer') {
        json_error('Unauthorized — Invalid authorization format. Expected: Bearer TOKEN', 401);
    }
    $token = $parts[1];
    if (!verifyJWT($token)) {
        json_error('Unauthorized — Invalid or expired token', 401);
    }
    return decodeJWT($token);
}

// ─── ROUTE ───────────────────────────────────────────────────────────────────
$route  = trim($_GET['route'] ?? '', '/');
$parts  = explode('/', $route);
$section = $parts[0] ?? '';
$action  = implode('/', array_slice($parts, 1));
$method  = $_SERVER['REQUEST_METHOD'];

// ─── PING (public, no auth) ───────────────────────────────────────────────────
if ($route === 'ping') {
    echo json_encode(['success' => true, 'message' => 'SHUBH ERP API is online', 'version' => API_VERSION, 'timestamp' => date('c')]);
    exit;
}

// ─── DEBUG/TOKEN (public, no auth) ───────────────────────────────────────────
if ($route === 'debug/token') {
    $authHeader = getAuthToken();
    $allHeaders = function_exists('getallheaders') ? getallheaders() : [];
    $apacheHeaders = function_exists('apache_request_headers') ? apache_request_headers() : [];
    $authServerKeys = array_values(array_filter(array_keys($_SERVER), function($k) {
        return stripos($k, 'auth') !== false;
    }));
    echo json_encode([
        'success' => true,
        'message' => 'Debug token info — no auth required',
        'HTTP_AUTHORIZATION' => $_SERVER['HTTP_AUTHORIZATION'] ?? null,
        'REDIRECT_HTTP_AUTHORIZATION' => $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null,
        'HTTP_X_TOKEN' => $_SERVER['HTTP_X_TOKEN'] ?? null,
        'token_query_param' => $_GET['token'] ?? null,
        'sa_key_query_param' => isset($_GET['sa_key']) ? (($_GET['sa_key'] === SUPERADMIN_API_KEY) ? 'VALID_SUPERADMIN_KEY' : 'INVALID_KEY') : null,
        'getallheaders_auth' => $allHeaders['Authorization'] ?? ($allHeaders['authorization'] ?? null),
        'apache_request_headers_auth' => $apacheHeaders['Authorization'] ?? ($apacheHeaders['authorization'] ?? null),
        'resolved_auth_header' => $authHeader,
        'request_method' => $_SERVER['REQUEST_METHOD'],
        'auth_related_server_keys' => $authServerKeys,
        'php_sapi' => PHP_SAPI,
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    ]);
    exit;
}

// Public routes (no auth required)
$public = ['auth/login', 'auth/verify', 'auth/logout', 'auth/refresh', 'migrate/run', 'ping', 'debug/token'];
$isPublic = in_array($route, $public, true);

$user = null;
if (!$isPublic) {
    $user = requireAuth();
}

try {

// ─── MIGRATE ─────────────────────────────────────────────────────────────────
if ($section === 'migrate' && $action === 'run') {
    $db = getDB();

    $tables = [
        "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(200) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'teacher',
            email VARCHAR(200),
            mobile VARCHAR(20),
            permissions_json TEXT,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS sessions_academic (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            name VARCHAR(20) NOT NULL,
            start_year INT NOT NULL,
            end_year INT NOT NULL,
            is_current TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS classes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            session_id INT,
            name VARCHAR(50) NOT NULL,
            display_order INT NOT NULL DEFAULT 0,
            is_enabled TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS sections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            class_id INT NOT NULL,
            school_id INT NOT NULL DEFAULT 1,
            name VARCHAR(10) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS subjects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            class_id INT NOT NULL,
            school_id INT NOT NULL DEFAULT 1,
            name VARCHAR(100) NOT NULL,
            code VARCHAR(20),
            max_marks INT DEFAULT 100,
            pass_marks INT DEFAULT 33,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            session_id INT,
            class_id INT,
            section_id INT,
            adm_no VARCHAR(50),
            full_name VARCHAR(200) NOT NULL,
            father_name VARCHAR(200),
            mother_name VARCHAR(200),
            father_mobile VARCHAR(20),
            mother_mobile VARCHAR(20),
            dob DATE,
            gender VARCHAR(10),
            address TEXT,
            photo_url VARCHAR(500),
            bus_no VARCHAR(20),
            route_id INT,
            pickup_point_id INT,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            roll_no VARCHAR(20),
            adm_date DATE,
            category VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS fee_headings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS fees_plan (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            class_id INT NOT NULL,
            section_id INT,
            session_id INT,
            fee_heading_id INT NOT NULL,
            monthly_amounts_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_plan (school_id, class_id, section_id, session_id, fee_heading_id)
        )",
        "CREATE TABLE IF NOT EXISTS fee_receipts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            student_id INT NOT NULL,
            session_id INT,
            receipt_no VARCHAR(50),
            payment_date DATE NOT NULL,
            months_json TEXT,
            amounts_json TEXT,
            total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            payment_mode VARCHAR(50) DEFAULT 'cash',
            remarks TEXT,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            student_id INT NOT NULL,
            class_id INT,
            section_id INT,
            date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'present',
            marked_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_att (school_id, student_id, date)
        )",
        "CREATE TABLE IF NOT EXISTS staff (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            name VARCHAR(200) NOT NULL,
            designation VARCHAR(100),
            department VARCHAR(100),
            mobile VARCHAR(20),
            email VARCHAR(200),
            joining_date DATE,
            salary DECIMAL(10,2) DEFAULT 0,
            address TEXT,
            photo_url VARCHAR(500),
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            user_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS payroll (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            staff_id INT NOT NULL,
            month INT NOT NULL,
            year INT NOT NULL,
            basic DECIMAL(10,2) DEFAULT 0,
            allowances_json TEXT,
            deductions_json TEXT,
            net_salary DECIMAL(10,2) DEFAULT 0,
            working_days INT DEFAULT 0,
            present_days INT DEFAULT 0,
            paid_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS exams (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            session_id INT,
            name VARCHAR(200) NOT NULL,
            exam_type VARCHAR(50),
            start_date DATE,
            end_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS exam_timetable (
            id INT AUTO_INCREMENT PRIMARY KEY,
            exam_id INT NOT NULL,
            class_id INT,
            subject_id INT,
            date DATE,
            start_time TIME,
            end_time TIME,
            room VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS exam_results (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            exam_id INT NOT NULL,
            student_id INT NOT NULL,
            subject_id INT NOT NULL,
            marks_obtained DECIMAL(6,2) DEFAULT 0,
            max_marks INT DEFAULT 100,
            grade VARCHAR(5),
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_result (exam_id, student_id, subject_id)
        )",
        "CREATE TABLE IF NOT EXISTS transport_routes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS transport_buses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            route_id INT,
            bus_no VARCHAR(50) NOT NULL,
            driver_id INT,
            capacity INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS transport_pickup_points (
            id INT AUTO_INCREMENT PRIMARY KEY,
            route_id INT NOT NULL,
            school_id INT NOT NULL DEFAULT 1,
            name VARCHAR(200) NOT NULL,
            monthly_fare DECIMAL(10,2) DEFAULT 0,
            sequence_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS library_books (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            title VARCHAR(300) NOT NULL,
            author VARCHAR(200),
            isbn VARCHAR(50),
            category VARCHAR(100),
            quantity INT DEFAULT 1,
            available INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS library_issues (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            book_id INT NOT NULL,
            student_id INT NOT NULL,
            issue_date DATE NOT NULL,
            due_date DATE NOT NULL,
            return_date DATE,
            fine DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS inventory_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            name VARCHAR(200) NOT NULL,
            category VARCHAR(100),
            unit VARCHAR(50),
            purchase_price DECIMAL(10,2) DEFAULT 0,
            sell_price DECIMAL(10,2) DEFAULT 0,
            quantity INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS inventory_transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            item_id INT NOT NULL,
            type VARCHAR(20) NOT NULL,
            quantity INT NOT NULL,
            price DECIMAL(10,2) DEFAULT 0,
            date DATE NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            head VARCHAR(200),
            description TEXT,
            amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            date DATE NOT NULL,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS homework (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            class_id INT,
            section_id INT,
            subject_id INT,
            title VARCHAR(300) NOT NULL,
            description TEXT,
            due_date DATE,
            assigned_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            type VARCHAR(50),
            title VARCHAR(300),
            message TEXT,
            recipient_role VARCHAR(50),
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS chat_rooms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            name VARCHAR(200),
            type VARCHAR(20) DEFAULT 'group',
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS chat_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_id INT NOT NULL,
            school_id INT NOT NULL DEFAULT 1,
            sender_id INT NOT NULL,
            message TEXT,
            file_url VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS chat_room_members (
            room_id INT NOT NULL,
            user_id INT NOT NULL,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (room_id, user_id)
        )",
        "CREATE TABLE IF NOT EXISTS certificates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            type VARCHAR(50),
            name VARCHAR(200),
            template_html LONGTEXT,
            is_default TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL DEFAULT 1,
            `key` VARCHAR(100) NOT NULL,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_setting (school_id, `key`)
        )",
    ];

    foreach ($tables as $sql) {
        $db->exec($sql);
    }

    // Add is_enabled column to classes for existing deployments
    try {
        $db->exec("ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_enabled TINYINT(1) NOT NULL DEFAULT 1");
    } catch (Exception $e) { /* column may already exist */ }

    // Seed default super admin using INSERT IGNORE for idempotency
    $hash = password_hash('admin123', PASSWORD_BCRYPT);
    $stmt = $db->prepare("INSERT IGNORE INTO users (school_id, username, password_hash, name, role, is_active) VALUES (1, 'admin', ?, 'Super Admin', 'super_admin', 1)");
    $stmt->execute([$hash]);

    // Seed default academic session 2025-26 and historical sessions (INSERT IGNORE = idempotent)
    $db->exec("INSERT IGNORE INTO sessions_academic (school_id, name, start_year, end_year, is_current) VALUES (1,'2025-26',2025,2026,1)");

    // Add unique key on sessions name to make INSERT IGNORE idempotent
    try { $db->exec("ALTER TABLE sessions_academic ADD UNIQUE KEY unique_sess_name (school_id, name)"); } catch (Exception $e) { /* already exists */ }

    // Seed historical sessions 2019-20 through 2024-25 (is_current=0)
    $historicalSessions = [
        ['2019-20', 2019, 2020],
        ['2020-21', 2020, 2021],
        ['2021-22', 2021, 2022],
        ['2022-23', 2022, 2023],
        ['2023-24', 2023, 2024],
        ['2024-25', 2024, 2025],
    ];
    $sessInsert = $db->prepare("INSERT IGNORE INTO sessions_academic (school_id, name, start_year, end_year, is_current) VALUES (1, ?, ?, ?, 0)");
    foreach ($historicalSessions as [$sName, $sStart, $sEnd]) {
        $sessInsert->execute([$sName, $sStart, $sEnd]);
    }

    // Seed default classes
    $clsExists = $db->query("SELECT COUNT(*) as cnt FROM classes WHERE school_id=1")->fetch();
    if ((int)$clsExists['cnt'] === 0) {
        $classes = [
            ['Nursery', 1], ['LKG', 2], ['UKG', 3],
            ['Class 1', 4], ['Class 2', 5], ['Class 3', 6], ['Class 4', 7], ['Class 5', 8],
            ['Class 6', 9], ['Class 7', 10], ['Class 8', 11], ['Class 9', 12],
            ['Class 10', 13], ['Class 11', 14], ['Class 12', 15],
        ];
        $stmt = $db->prepare("INSERT INTO classes (school_id, session_id, name, display_order, is_enabled) VALUES (1, NULL, ?, ?, 1)");
        foreach ($classes as [$name, $order]) {
            $stmt->execute([$name, $order]);
        }
    }

    json_out(['success' => true, 'message' => 'Migration complete. Tables created, admin seeded, sessions 2019-20 through 2025-26 pre-loaded.']);
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
if ($section === 'auth') {
    $db = getDB();

    if ($action === 'login' && $method === 'GET') {
        json_out([
            'success' => true,
            'message' => APP_NAME . ' API v' . API_VERSION . ' — POST to this endpoint to login',
            'version' => API_VERSION,
            'routes'  => ['ping', 'auth/login', 'auth/verify', 'auth/refresh', 'auth/me', 'migrate/run'],
        ]);
    }

    if ($action === 'login' && $method === 'POST') {
        $b = body();
        $username = trim($b['username'] ?? '');
        $password = $b['password'] ?? '';
        if (!$username || !$password) json_error('Username and password required');
        $stmt = $db->prepare("SELECT * FROM users WHERE username = ? AND is_active = 1 LIMIT 1");
        $stmt->execute([$username]);
        $u = $stmt->fetch();
        if (!$u || !password_verify($password, $u['password_hash'])) json_error('Invalid credentials', 401);
        $token = createJWT(['sub' => $u['id'], 'role' => $u['role'], 'school_id' => $u['school_id'], 'name' => $u['name']]);
        $refreshToken = bin2hex(random_bytes(32));
        $refreshHash  = hash('sha256', $refreshToken);
        $expires = date('Y-m-d H:i:s', time() + REFRESH_TOKEN_EXPIRY);
        $db->prepare("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)")->execute([$u['id'], $refreshHash, $expires]);
        $perms = json_decode($u['permissions_json'] ?? '{}', true) ?? [];
        $expiresAt = (time() + JWT_EXPIRY) * 1000; // milliseconds for frontend
        json_out([
            'success' => true,
            'token'   => $token,
            'refreshToken' => $refreshToken,
            'expiresAt' => $expiresAt,
            'user'    => ['id' => $u['id'], 'name' => $u['name'], 'role' => $u['role'], 'permissions' => $perms, 'schoolId' => $u['school_id']],
        ]);
    }

    if ($action === 'logout' && $method === 'POST') {
        $b = body();
        $rt = $b['refreshToken'] ?? '';
        if ($rt) {
            $hash = hash('sha256', $rt);
            $db->prepare("DELETE FROM refresh_tokens WHERE token_hash = ?")->execute([$hash]);
        }
        json_out(['success' => true]);
    }

    if ($action === 'refresh' && $method === 'POST') {
        $b  = body();
        $rt = $b['refreshToken'] ?? '';
        if (!$rt) json_error('Refresh token required');
        $hash = hash('sha256', $rt);
        $stmt = $db->prepare("SELECT rt.*, u.role, u.school_id, u.name, u.permissions_json FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token_hash = ? AND rt.expires_at > NOW() LIMIT 1");
        $stmt->execute([$hash]);
        $row = $stmt->fetch();
        if (!$row) json_error('Invalid or expired refresh token', 401);
        $token = createJWT(['sub' => $row['user_id'], 'role' => $row['role'], 'school_id' => $row['school_id'], 'name' => $row['name']]);
        json_out(['success' => true, 'token' => $token]);
    }

    if ($action === 'me' && $method === 'GET') {
        $stmt = $db->prepare("SELECT id, school_id, username, name, role, email, mobile, permissions_json FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$user['sub']]);
        $u = $stmt->fetch();
        if (!$u) json_error('User not found', 404);
        $u['permissions'] = json_decode($u['permissions_json'] ?? '{}', true) ?? [];
        unset($u['permissions_json']);
        json_out(['success' => true, 'user' => $u]);
    }

    if ($action === 'verify') {
        // Public: verify a token passed in Authorization header
        $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!$h && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $h = $headers['Authorization'] ?? '';
        }
        $token = str_starts_with($h, 'Bearer ') ? substr($h, 7) : '';
        if (!$token || !verifyJWT($token)) {
            json_out(['success' => true, 'valid' => false]);
        }
        $payload = decodeJWT($token);
        json_out(['success' => true, 'valid' => true, 'user' => $payload]);
    }

    json_error('Unknown auth route');
}

// ─── STUDENTS ────────────────────────────────────────────────────────────────
if ($section === 'students') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'list' && $method === 'GET') {
        $page      = max(1, (int)($_GET['page'] ?? 1));
        $limit     = min(200, max(1, (int)($_GET['limit'] ?? 50)));
        $offset    = ($page - 1) * $limit;
        $sessionId = $_GET['session_id'] ?? null;
        $classId   = $_GET['class_id'] ?? null;
        $sectionId = $_GET['section_id'] ?? null;
        $search    = $_GET['search'] ?? '';
        $where     = ["s.school_id = $schoolId", "s.is_active = 1"];
        $params    = [];
        if ($sessionId) { $where[] = "s.session_id = ?"; $params[] = $sessionId; }
        if ($classId)   { $where[] = "s.class_id = ?";   $params[] = $classId; }
        if ($sectionId) { $where[] = "s.section_id = ?"; $params[] = $sectionId; }
        if ($search) {
            $where[] = "(s.full_name LIKE ? OR s.adm_no LIKE ? OR s.father_mobile LIKE ?)";
            $like = "%$search%";
            $params = array_merge($params, [$like, $like, $like]);
        }
        $whereStr = implode(' AND ', $where);
        $countStmt = $db->prepare("SELECT COUNT(*) as total FROM students s WHERE $whereStr");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetch()['total'];
        $stmt  = $db->prepare("SELECT s.*, c.name as class_name, sec.name as section_name FROM students s LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN sections sec ON sec.id = s.section_id WHERE $whereStr ORDER BY s.full_name ASC LIMIT $limit OFFSET $offset");
        $stmt->execute($params);
        $students = $stmt->fetchAll();
        json_out(['success' => true, 'students' => $students, 'total' => $total, 'page' => $page, 'limit' => $limit]);
    }

    if ($action === 'get' && $method === 'GET') {
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $db->prepare("SELECT s.*, c.name as class_name, sec.name as section_name FROM students s LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN sections sec ON sec.id = s.section_id WHERE s.id = ? AND s.school_id = ? LIMIT 1");
        $stmt->execute([$id, $schoolId]);
        $s = $stmt->fetch();
        if (!$s) json_error('Student not found', 404);
        json_out(['success' => true, 'student' => $s]);
    }

    if ($action === 'add' && $method === 'POST') {
        $b = body();
        $stmt = $db->prepare("INSERT INTO students (school_id, session_id, class_id, section_id, adm_no, full_name, father_name, mother_name, father_mobile, mother_mobile, dob, gender, address, photo_url, bus_no, route_id, pickup_point_id, roll_no, adm_date, category) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([$schoolId, $b['session_id'] ?? null, $b['class_id'] ?? null, $b['section_id'] ?? null, $b['adm_no'] ?? '', $b['full_name'] ?? '', $b['father_name'] ?? '', $b['mother_name'] ?? '', $b['father_mobile'] ?? '', $b['mother_mobile'] ?? '', $b['dob'] ?? null, $b['gender'] ?? '', $b['address'] ?? '', $b['photo_url'] ?? '', $b['bus_no'] ?? '', $b['route_id'] ?? null, $b['pickup_point_id'] ?? null, $b['roll_no'] ?? '', $b['adm_date'] ?? null, $b['category'] ?? '']);
        $newId = (int)$db->lastInsertId();
        $stmt2 = $db->prepare("SELECT s.*, c.name as class_name, sec.name as section_name FROM students s LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN sections sec ON sec.id = s.section_id WHERE s.id = ?");
        $stmt2->execute([$newId]);
        json_out(['success' => true, 'id' => $newId, 'student' => $stmt2->fetch()]);
    }

    if ($action === 'update' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0);
        $b  = body();
        $stmt = $db->prepare("UPDATE students SET session_id=?, class_id=?, section_id=?, adm_no=?, full_name=?, father_name=?, mother_name=?, father_mobile=?, mother_mobile=?, dob=?, gender=?, address=?, photo_url=?, bus_no=?, route_id=?, pickup_point_id=?, roll_no=?, adm_date=?, category=?, updated_at=NOW() WHERE id=? AND school_id=?");
        $stmt->execute([$b['session_id'] ?? null, $b['class_id'] ?? null, $b['section_id'] ?? null, $b['adm_no'] ?? '', $b['full_name'] ?? '', $b['father_name'] ?? '', $b['mother_name'] ?? '', $b['father_mobile'] ?? '', $b['mother_mobile'] ?? '', $b['dob'] ?? null, $b['gender'] ?? '', $b['address'] ?? '', $b['photo_url'] ?? '', $b['bus_no'] ?? '', $b['route_id'] ?? null, $b['pickup_point_id'] ?? null, $b['roll_no'] ?? '', $b['adm_date'] ?? null, $b['category'] ?? '', $id, $schoolId]);
        json_out(['success' => true]);
    }

    if ($action === 'delete' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0);
        $db->prepare("UPDATE students SET is_active=0 WHERE id=? AND school_id=?")->execute([$id, $schoolId]);
        json_out(['success' => true]);
    }

    if ($action === 'import' && $method === 'POST') {
        $b        = body();
        $rows     = $b['students'] ?? [];
        $imported = 0; $errors = [];
        $stmt = $db->prepare("INSERT INTO students (school_id, session_id, class_id, section_id, adm_no, full_name, father_name, mother_name, father_mobile, mother_mobile, dob, gender, address, roll_no, adm_date, category) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        foreach ($rows as $i => $r) {
            if (empty($r['full_name'])) { $errors[] = "Row $i: full_name required"; continue; }
            try {
                $stmt->execute([$schoolId, $r['session_id'] ?? null, $r['class_id'] ?? null, $r['section_id'] ?? null, $r['adm_no'] ?? '', $r['full_name'], $r['father_name'] ?? '', $r['mother_name'] ?? '', $r['father_mobile'] ?? '', $r['mother_mobile'] ?? '', $r['dob'] ?? null, $r['gender'] ?? '', $r['address'] ?? '', $r['roll_no'] ?? '', $r['adm_date'] ?? null, $r['category'] ?? '']);
                $imported++;
            } catch (Exception $e) {
                $errors[] = "Row $i: " . $e->getMessage();
            }
        }
        json_out(['success' => true, 'imported' => $imported, 'errors' => $errors]);
    }

    if ($action === 'count' && $method === 'GET') {
        $sessionId = $_GET['session_id'] ?? null;
        $where = "school_id = $schoolId AND is_active = 1";
        $params = [];
        if ($sessionId) { $where .= " AND session_id = ?"; $params[] = $sessionId; }
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM students WHERE $where");
        $stmt->execute($params);
        json_out(['success' => true, 'count' => (int)$stmt->fetch()['total']]);
    }

    json_error('Unknown students route');
}

// ─── FEES ─────────────────────────────────────────────────────────────────────
if ($section === 'fees') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'headings' && $method === 'GET') {
        $stmt = $db->prepare("SELECT * FROM fee_headings WHERE school_id = ? AND is_active = 1 ORDER BY name");
        $stmt->execute([$schoolId]);
        json_out(['success' => true, 'headings' => $stmt->fetchAll()]);
    }

    if ($action === 'headings/save' && $method === 'POST') {
        $b = body();
        $id = (int)($b['id'] ?? 0);
        if ($id) {
            $db->prepare("UPDATE fee_headings SET name=?, description=? WHERE id=? AND school_id=?")->execute([$b['name'], $b['description'] ?? '', $id, $schoolId]);
        } else {
            $db->prepare("INSERT INTO fee_headings (school_id, name, description) VALUES (?,?,?)")->execute([$schoolId, $b['name'], $b['description'] ?? '']);
            $id = (int)$db->lastInsertId();
        }
        json_out(['success' => true, 'id' => $id]);
    }

    if ($action === 'headings/delete' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0);
        $db->prepare("UPDATE fee_headings SET is_active=0 WHERE id=? AND school_id=?")->execute([$id, $schoolId]);
        json_out(['success' => true]);
    }

    if ($action === 'plan' && $method === 'GET') {
        $classId   = $_GET['class_id'] ?? null;
        $sectionId = $_GET['section_id'] ?? null;
        $sessionId = $_GET['session_id'] ?? null;
        $where = ["fp.school_id = $schoolId"];
        $params = [];
        if ($classId)   { $where[] = "fp.class_id = ?";   $params[] = $classId; }
        if ($sectionId) { $where[] = "fp.section_id = ?"; $params[] = $sectionId; }
        if ($sessionId) { $where[] = "fp.session_id = ?"; $params[] = $sessionId; }
        $whereStr = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT fp.*, fh.name as heading_name FROM fees_plan fp LEFT JOIN fee_headings fh ON fh.id = fp.fee_heading_id WHERE $whereStr");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['monthly_amounts'] = json_decode($row['monthly_amounts_json'] ?? '{}', true);
        }
        json_out(['success' => true, 'plan' => $rows]);
    }

    if ($action === 'plan/save' && $method === 'POST') {
        $b = body();
        $plans = $b['plans'] ?? [$b]; // support single or array
        foreach ($plans as $p) {
            $amounts = json_encode($p['monthly_amounts'] ?? $p['monthly_amounts_json'] ?? []);
            $classId   = $p['class_id'] ?? null;
            $sectionId = $p['section_id'] ?? null;
            $sessionId = $p['session_id'] ?? null;
            $headingId = $p['fee_heading_id'];
            $id = $p['id'] ?? 0;
            if ($id) {
                $db->prepare("UPDATE fees_plan SET monthly_amounts_json=?, updated_at=NOW() WHERE id=? AND school_id=?")->execute([$amounts, $id, $schoolId]);
            } else {
                $db->prepare("INSERT INTO fees_plan (school_id, class_id, section_id, session_id, fee_heading_id, monthly_amounts_json) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE monthly_amounts_json=VALUES(monthly_amounts_json), updated_at=NOW()")->execute([$schoolId, $classId, $sectionId, $sessionId, $headingId, $amounts]);
            }
        }
        json_out(['success' => true]);
    }

    if ($action === 'collect/student' && $method === 'GET') {
        $studentId = (int)($_GET['student_id'] ?? 0);
        $sessionId = $_GET['session_id'] ?? null;
        // Get student
        $stmt = $db->prepare("SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id = ? AND s.school_id = ?");
        $stmt->execute([$studentId, $schoolId]);
        $student = $stmt->fetch();
        // Get fee plan for student's class
        $where = "fp.school_id = $schoolId AND fp.class_id = " . (int)($student['class_id'] ?? 0);
        $params = [];
        if ($sessionId) { $where .= " AND fp.session_id = ?"; $params[] = $sessionId; }
        $planStmt = $db->prepare("SELECT fp.*, fh.name as heading_name FROM fees_plan fp LEFT JOIN fee_headings fh ON fh.id = fp.fee_heading_id WHERE $where");
        $planStmt->execute($params);
        $plans = $planStmt->fetchAll();
        foreach ($plans as &$p) {
            $p['monthly_amounts'] = json_decode($p['monthly_amounts_json'] ?? '{}', true);
        }
        // Get paid receipts
        $rWhere = "school_id = $schoolId AND student_id = $studentId";
        $rParams = [];
        if ($sessionId) { $rWhere .= " AND session_id = ?"; $rParams[] = $sessionId; }
        $rStmt = $db->prepare("SELECT * FROM fee_receipts WHERE $rWhere ORDER BY payment_date DESC");
        $rStmt->execute($rParams);
        $receipts = $rStmt->fetchAll();
        foreach ($receipts as &$r) {
            $r['months']  = json_decode($r['months_json'] ?? '[]', true);
            $r['amounts'] = json_decode($r['amounts_json'] ?? '{}', true);
        }
        json_out(['success' => true, 'student' => $student, 'feePlan' => $plans, 'receipts' => $receipts]);
    }

    if ($action === 'collect/save' && $method === 'POST') {
        $b = body();
        $studentId = (int)($b['student_id'] ?? 0);
        $sessionId = $b['session_id'] ?? null;
        $months    = $b['months'] ?? [];
        $amounts   = $b['amounts'] ?? [];
        $total     = (float)($b['total_amount'] ?? 0);
        $mode      = $b['payment_mode'] ?? 'cash';
        $remarks   = $b['remarks'] ?? '';
        $date      = $b['payment_date'] ?? date('Y-m-d');
        // Generate receipt number
        $lastR = $db->query("SELECT MAX(id) as mid FROM fee_receipts")->fetch();
        $receiptNo = 'RCP' . str_pad(((int)$lastR['mid'] + 1), 6, '0', STR_PAD_LEFT);
        $stmt = $db->prepare("INSERT INTO fee_receipts (school_id, student_id, session_id, receipt_no, payment_date, months_json, amounts_json, total_amount, payment_mode, remarks, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([$schoolId, $studentId, $sessionId, $receiptNo, $date, json_encode($months), json_encode($amounts), $total, $mode, $remarks, $user['sub']]);
        $newId = (int)$db->lastInsertId();
        $receipt = $db->prepare("SELECT r.*, s.full_name, s.adm_no FROM fee_receipts r LEFT JOIN students s ON s.id = r.student_id WHERE r.id = ?")->execute([$newId]);
        $stmt2 = $db->prepare("SELECT r.*, s.full_name, s.adm_no, s.father_name, c.name as class_name FROM fee_receipts r LEFT JOIN students s ON s.id = r.student_id LEFT JOIN classes c ON c.id = s.class_id WHERE r.id = ?");
        $stmt2->execute([$newId]);
        $rec = $stmt2->fetch();
        $rec['months']  = json_decode($rec['months_json'] ?? '[]', true);
        $rec['amounts'] = json_decode($rec['amounts_json'] ?? '{}', true);
        json_out(['success' => true, 'receipt' => $rec]);
    }

    if ($action === 'receipts' && $method === 'GET') {
        $studentId = $_GET['student_id'] ?? null;
        $sessionId = $_GET['session_id'] ?? null;
        $page  = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(200, (int)($_GET['limit'] ?? 50));
        $offset = ($page - 1) * $limit;
        $where = ["r.school_id = $schoolId"];
        $params = [];
        if ($studentId) { $where[] = "r.student_id = ?"; $params[] = $studentId; }
        if ($sessionId) { $where[] = "r.session_id = ?"; $params[] = $sessionId; }
        $whereStr = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT r.*, s.full_name, s.adm_no FROM fee_receipts r LEFT JOIN students s ON s.id = r.student_id WHERE $whereStr ORDER BY r.payment_date DESC LIMIT $limit OFFSET $offset");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['months']  = json_decode($r['months_json'] ?? '[]', true);
            $r['amounts'] = json_decode($r['amounts_json'] ?? '{}', true);
        }
        json_out(['success' => true, 'receipts' => $rows]);
    }

    if ($action === 'receipt' && $method === 'GET') {
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $db->prepare("SELECT r.*, s.full_name, s.adm_no, s.father_name, s.father_mobile, c.name as class_name, sec.name as section_name FROM fee_receipts r LEFT JOIN students s ON s.id = r.student_id LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN sections sec ON sec.id = s.section_id WHERE r.id = ? AND r.school_id = ?");
        $stmt->execute([$id, $schoolId]);
        $r = $stmt->fetch();
        if (!$r) json_error('Receipt not found', 404);
        $r['months']  = json_decode($r['months_json'] ?? '[]', true);
        $r['amounts'] = json_decode($r['amounts_json'] ?? '{}', true);
        json_out(['success' => true, 'receipt' => $r]);
    }

    if ($action === 'receipt/delete' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0);
        $db->prepare("DELETE FROM fee_receipts WHERE id=? AND school_id=?")->execute([$id, $schoolId]);
        json_out(['success' => true]);
    }

    if ($action === 'due' && $method === 'GET') {
        $sessionId = $_GET['session_id'] ?? null;
        $classId   = $_GET['class_id'] ?? null;
        $sectionId = $_GET['section_id'] ?? null;
        $search    = $_GET['search'] ?? '';
        $page  = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(200, (int)($_GET['limit'] ?? 50));
        $offset = ($page - 1) * $limit;
        $where = ["s.school_id = $schoolId", "s.is_active = 1"];
        $params = [];
        if ($sessionId) { $where[] = "s.session_id = ?"; $params[] = $sessionId; }
        if ($classId)   { $where[] = "s.class_id = ?";   $params[] = $classId; }
        if ($sectionId) { $where[] = "s.section_id = ?"; $params[] = $sectionId; }
        if ($search) {
            $where[] = "(s.full_name LIKE ? OR s.adm_no LIKE ?)";
            $like = "%$search%"; $params[] = $like; $params[] = $like;
        }
        $whereStr = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT s.id, s.full_name, s.adm_no, s.father_mobile, c.name as class_name, sec.name as section_name, COALESCE((SELECT SUM(r.total_amount) FROM fee_receipts r WHERE r.student_id=s.id AND r.school_id=s.school_id),0) as paid_total FROM students s LEFT JOIN classes c ON c.id=s.class_id LEFT JOIN sections sec ON sec.id=s.section_id WHERE $whereStr ORDER BY s.full_name LIMIT $limit OFFSET $offset");
        $stmt->execute($params);
        json_out(['success' => true, 'students' => $stmt->fetchAll()]);
    }

    if ($action === 'collection-chart' && $method === 'GET') {
        $sessionId = $_GET['session_id'] ?? null;
        $months = ['april','may','june','july','august','september','october','november','december','january','february','march'];
        $where = "school_id = $schoolId";
        $params = [];
        if ($sessionId) { $where .= " AND session_id = ?"; $params[] = $sessionId; }
        $stmt = $db->prepare("SELECT payment_date, total_amount FROM fee_receipts WHERE $where");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        $chart = array_fill_keys($months, 0);
        foreach ($rows as $r) {
            $m = (int)date('n', strtotime($r['payment_date']));
            $monthName = strtolower(date('F', mktime(0,0,0,$m,1)));
            if (isset($chart[$monthName])) $chart[$monthName] += (float)$r['total_amount'];
        }
        $result = [];
        foreach ($months as $mn) $result[] = ['month' => ucfirst($mn), 'amount' => $chart[$mn]];
        json_out(['success' => true, 'chart' => $result]);
    }

    json_error('Unknown fees route');
}

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
if ($section === 'attendance') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if (($action === 'list' || $action === 'daily' || $action === '') && $method === 'GET') {
        $classId   = $_GET['class_id'] ?? null;
        $sectionId = $_GET['section_id'] ?? null;
        $date      = $_GET['date'] ?? date('Y-m-d');
        $where = ["s.school_id = $schoolId", "s.is_active = 1"];
        $params = [];
        if ($classId)   { $where[] = "s.class_id = ?";   $params[] = $classId; }
        if ($sectionId) { $where[] = "s.section_id = ?"; $params[] = $sectionId; }
        $whereStr = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT s.id, s.full_name, s.roll_no, s.adm_no, a.status FROM students s LEFT JOIN attendance a ON a.student_id=s.id AND a.date=? AND a.school_id=s.school_id WHERE $whereStr ORDER BY s.roll_no, s.full_name");
        array_unshift($params, $date);
        $stmt->execute($params);
        json_out(['success' => true, 'records' => $stmt->fetchAll(), 'date' => $date]);
    }

    if ($action === 'save' && $method === 'POST') {
        $b = body();
        $records = $b['records'] ?? [];
        $date    = $b['date'] ?? date('Y-m-d');
        $classId = $b['class_id'] ?? null;
        $secId   = $b['section_id'] ?? null;
        $stmt = $db->prepare("INSERT INTO attendance (school_id, student_id, class_id, section_id, date, status, marked_by) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status), marked_by=VALUES(marked_by)");
        foreach ($records as $r) {
            $stmt->execute([$schoolId, $r['student_id'], $classId, $secId, $date, $r['status'] ?? 'present', $user['sub']]);
        }
        json_out(['success' => true]);
    }

    if ($action === 'summary' && $method === 'GET') {
        $classId   = $_GET['class_id'] ?? null;
        $sectionId = $_GET['section_id'] ?? null;
        $month     = (int)($_GET['month'] ?? date('n'));
        $year      = (int)($_GET['year'] ?? date('Y'));
        $where = ["a.school_id = $schoolId", "MONTH(a.date)=$month", "YEAR(a.date)=$year"];
        $params = [];
        if ($classId)   { $where[] = "a.class_id = ?";   $params[] = $classId; }
        if ($sectionId) { $where[] = "a.section_id = ?"; $params[] = $sectionId; }
        $whereStr = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT a.student_id, s.full_name, SUM(a.status='present') as present, SUM(a.status='absent') as absent, COUNT(a.id) as total FROM attendance a JOIN students s ON s.id=a.student_id WHERE $whereStr GROUP BY a.student_id ORDER BY s.full_name");
        $stmt->execute($params);
        json_out(['success' => true, 'summary' => $stmt->fetchAll()]);
    }

    if ($action === 'student' && $method === 'GET') {
        $studentId = (int)($_GET['student_id'] ?? 0);
        $month     = (int)($_GET['month'] ?? date('n'));
        $year      = (int)($_GET['year'] ?? date('Y'));
        $stmt = $db->prepare("SELECT date, status FROM attendance WHERE school_id=? AND student_id=? AND MONTH(date)=? AND YEAR(date)=? ORDER BY date");
        $stmt->execute([$schoolId, $studentId, $month, $year]);
        json_out(['success' => true, 'records' => $stmt->fetchAll()]);
    }

    if ($action === 'face' && $method === 'POST') {
        $b = body();
        $studentId = (int)($b['student_id'] ?? 0);
        $date = $b['date'] ?? date('Y-m-d');
        $stmt = $db->prepare("INSERT INTO attendance (school_id, student_id, date, status, marked_by) VALUES (?,?,?,'present',?) ON DUPLICATE KEY UPDATE status='present', marked_by=VALUES(marked_by)");
        $stmt->execute([$schoolId, $studentId, $date, $user['sub']]);
        json_out(['success' => true]);
    }

    json_error('Unknown attendance route');
}

// ─── STAFF / PAYROLL ──────────────────────────────────────────────────────────
if ($section === 'staff' || $section === 'payroll') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($section === 'staff') {
        if ($action === 'list' && $method === 'GET') {
            $page   = max(1, (int)($_GET['page'] ?? 1));
            $limit  = min(200, (int)($_GET['limit'] ?? 50));
            $offset = ($page - 1) * $limit;
            $search = $_GET['search'] ?? '';
            $where  = ["school_id = $schoolId", "is_active = 1"];
            $params = [];
            if ($search) { $where[] = "(name LIKE ? OR designation LIKE ? OR mobile LIKE ?)"; $like = "%$search%"; $params = [$like,$like,$like]; }
            $whereStr = implode(' AND ', $where);
            $countStmt = $db->prepare("SELECT COUNT(*) as total FROM staff WHERE $whereStr");
            $countStmt->execute($params);
            $total = (int)$countStmt->fetch()['total'];
            $stmt = $db->prepare("SELECT * FROM staff WHERE $whereStr ORDER BY name LIMIT $limit OFFSET $offset");
            $stmt->execute($params);
            json_out(['success' => true, 'staff' => $stmt->fetchAll(), 'total' => $total]);
        }
        if ($action === 'get' && $method === 'GET') {
            $id = (int)($_GET['id'] ?? 0);
            $stmt = $db->prepare("SELECT * FROM staff WHERE id=? AND school_id=? LIMIT 1");
            $stmt->execute([$id, $schoolId]);
            $s = $stmt->fetch();
            if (!$s) json_error('Staff not found', 404);
            json_out(['success' => true, 'staff' => $s]);
        }
        if ($action === 'add' && $method === 'POST') {
            $b = body();
            $stmt = $db->prepare("INSERT INTO staff (school_id, name, designation, department, mobile, email, joining_date, salary, address, photo_url) VALUES (?,?,?,?,?,?,?,?,?,?)");
            $stmt->execute([$schoolId, $b['name'] ?? '', $b['designation'] ?? '', $b['department'] ?? '', $b['mobile'] ?? '', $b['email'] ?? '', $b['joining_date'] ?? null, (float)($b['salary'] ?? 0), $b['address'] ?? '', $b['photo_url'] ?? '']);
            $newId = (int)$db->lastInsertId();
            $stmt2 = $db->prepare("SELECT * FROM staff WHERE id=?");
            $stmt2->execute([$newId]);
            json_out(['success' => true, 'id' => $newId, 'staff' => $stmt2->fetch()]);
        }
        if ($action === 'update' && $method === 'POST') {
            $id = (int)($_GET['id'] ?? 0);
            $b  = body();
            $db->prepare("UPDATE staff SET name=?, designation=?, department=?, mobile=?, email=?, joining_date=?, salary=?, address=?, photo_url=?, updated_at=NOW() WHERE id=? AND school_id=?")->execute([$b['name'] ?? '', $b['designation'] ?? '', $b['department'] ?? '', $b['mobile'] ?? '', $b['email'] ?? '', $b['joining_date'] ?? null, (float)($b['salary'] ?? 0), $b['address'] ?? '', $b['photo_url'] ?? '', $id, $schoolId]);
            json_out(['success' => true]);
        }
        if ($action === 'delete' && $method === 'POST') {
            $id = (int)($_GET['id'] ?? 0);
            $db->prepare("UPDATE staff SET is_active=0 WHERE id=? AND school_id=?")->execute([$id, $schoolId]);
            json_out(['success' => true]);
        }
        if ($action === 'import' && $method === 'POST') {
            $b = body();
            $rows = $b['staff'] ?? [];
            $imported = 0; $skipped = 0; $errors = [];
            $stmt = $db->prepare("INSERT INTO staff (school_id, name, designation, department, mobile, email, joining_date, salary, address, photo_url) VALUES (?,?,?,?,?,?,?,?,?,?)");
            foreach ($rows as $i => $r) {
                if (empty($r['name'])) { $errors[] = "Row $i: name required"; continue; }
                try {
                    $stmt->execute([$schoolId, $r['name'], $r['designation'] ?? '', $r['department'] ?? '', $r['mobile'] ?? '', $r['email'] ?? '', $r['joining_date'] ?? null, (float)($r['salary'] ?? 0), $r['address'] ?? '', $r['photo_url'] ?? '']);
                    $imported++;
                } catch (Exception $e) {
                    $errors[] = "Row $i: " . $e->getMessage();
                    $skipped++;
                }
            }
            json_out(['success' => true, 'imported' => $imported, 'skipped' => $skipped, 'errors' => $errors]);
        }
    }

    if ($section === 'payroll') {
        if ($action === 'list' && $method === 'GET') {
            $month = (int)($_GET['month'] ?? date('n'));
            $year  = (int)($_GET['year'] ?? date('Y'));
            $stmt  = $db->prepare("SELECT p.*, s.name as staff_name, s.designation FROM payroll p LEFT JOIN staff s ON s.id=p.staff_id WHERE p.school_id=? AND p.month=? AND p.year=? ORDER BY s.name");
            $stmt->execute([$schoolId, $month, $year]);
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                $r['allowances'] = json_decode($r['allowances_json'] ?? '{}', true);
                $r['deductions'] = json_decode($r['deductions_json'] ?? '{}', true);
            }
            json_out(['success' => true, 'payroll' => $rows]);
        }
        if ($action === 'save' && $method === 'POST') {
            $b = body();
            $staffId = (int)($b['staff_id'] ?? 0);
            $month   = (int)($b['month'] ?? date('n'));
            $year    = (int)($b['year'] ?? date('Y'));
            $db->prepare("INSERT INTO payroll (school_id, staff_id, month, year, basic, allowances_json, deductions_json, net_salary, working_days, present_days, paid_date) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE basic=VALUES(basic),allowances_json=VALUES(allowances_json),deductions_json=VALUES(deductions_json),net_salary=VALUES(net_salary),working_days=VALUES(working_days),present_days=VALUES(present_days),paid_date=VALUES(paid_date)")->execute([$schoolId, $staffId, $month, $year, (float)($b['basic'] ?? 0), json_encode($b['allowances'] ?? []), json_encode($b['deductions'] ?? []), (float)($b['net_salary'] ?? 0), (int)($b['working_days'] ?? 0), (int)($b['present_days'] ?? 0), $b['paid_date'] ?? null]);
            json_out(['success' => true]);
        }
        if ($action === 'payslip' && $method === 'GET') {
            $id = (int)($_GET['id'] ?? 0);
            $stmt = $db->prepare("SELECT p.*, s.name as staff_name, s.designation, s.department, s.mobile FROM payroll p LEFT JOIN staff s ON s.id=p.staff_id WHERE p.id=? AND p.school_id=?");
            $stmt->execute([$id, $schoolId]);
            $r = $stmt->fetch();
            if (!$r) json_error('Payslip not found', 404);
            $r['allowances'] = json_decode($r['allowances_json'] ?? '{}', true);
            $r['deductions'] = json_decode($r['deductions_json'] ?? '{}', true);
            json_out(['success' => true, 'payslip' => $r]);
        }
    }

    json_error('Unknown staff/payroll route');
}

// ─── ACADEMICS ────────────────────────────────────────────────────────────────
if ($section === 'academics') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'classes' && $method === 'GET') {
        $sessionId = $_GET['session_id'] ?? null;
        $where  = "school_id = $schoolId";
        $params = [];
        if ($sessionId) { $where .= " AND (session_id = ? OR session_id IS NULL)"; $params[] = $sessionId; }
        $stmt = $db->prepare("SELECT * FROM classes WHERE $where ORDER BY display_order ASC, name ASC");
        $stmt->execute($params);
        json_out(['success' => true, 'classes' => $stmt->fetchAll()]);
    }

    if ($action === 'classes/save' && $method === 'POST') {
        $b = body(); $id = (int)($b['id'] ?? 0);
        $isEnabled = isset($b['is_enabled']) ? (int)$b['is_enabled'] : 1;
        if ($id) {
            $db->prepare("UPDATE classes SET name=?, display_order=?, session_id=?, is_enabled=? WHERE id=? AND school_id=?")->execute([$b['name'], (int)($b['display_order'] ?? 0), $b['session_id'] ?? null, $isEnabled, $id, $schoolId]);
        } else {
            $db->prepare("INSERT INTO classes (school_id, session_id, name, display_order, is_enabled) VALUES (?,?,?,?,?)")->execute([$schoolId, $b['session_id'] ?? null, $b['name'], (int)($b['display_order'] ?? 0), $isEnabled]);
            $id = (int)$db->lastInsertId();
        }
        json_out(['success' => true, 'id' => $id]);
    }

    if ($action === 'classes/delete' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0);
        $db->prepare("DELETE FROM classes WHERE id=? AND school_id=?")->execute([$id, $schoolId]);
        json_out(['success' => true]);
    }

    if ($action === 'sections' && $method === 'GET') {
        $classId = $_GET['class_id'] ?? null;
        $where = "school_id = $schoolId"; $params = [];
        if ($classId) { $where .= " AND class_id = ?"; $params[] = $classId; }
        $stmt = $db->prepare("SELECT * FROM sections WHERE $where ORDER BY name");
        $stmt->execute($params);
        json_out(['success' => true, 'sections' => $stmt->fetchAll()]);
    }

    if ($action === 'sections/save' && $method === 'POST') {
        $b = body(); $id = (int)($b['id'] ?? 0);
        if ($id) {
            $db->prepare("UPDATE sections SET name=? WHERE id=? AND school_id=?")->execute([$b['name'], $id, $schoolId]);
        } else {
            $db->prepare("INSERT INTO sections (school_id, class_id, name) VALUES (?,?,?)")->execute([$schoolId, $b['class_id'], $b['name']]);
            $id = (int)$db->lastInsertId();
        }
        json_out(['success' => true, 'id' => $id]);
    }

    if ($action === 'subjects' && $method === 'GET') {
        $classId = $_GET['class_id'] ?? null;
        $where = "school_id = $schoolId"; $params = [];
        if ($classId) { $where .= " AND class_id = ?"; $params[] = $classId; }
        $stmt = $db->prepare("SELECT * FROM subjects WHERE $where ORDER BY name");
        $stmt->execute($params);
        json_out(['success' => true, 'subjects' => $stmt->fetchAll()]);
    }

    if ($action === 'subjects/save' && $method === 'POST') {
        $b = body(); $id = (int)($b['id'] ?? 0);
        if ($id) {
            $db->prepare("UPDATE subjects SET name=?, code=?, max_marks=?, pass_marks=? WHERE id=? AND school_id=?")->execute([$b['name'], $b['code'] ?? '', (int)($b['max_marks'] ?? 100), (int)($b['pass_marks'] ?? 33), $id, $schoolId]);
        } else {
            $db->prepare("INSERT INTO subjects (school_id, class_id, name, code, max_marks, pass_marks) VALUES (?,?,?,?,?,?)")->execute([$schoolId, $b['class_id'], $b['name'], $b['code'] ?? '', (int)($b['max_marks'] ?? 100), (int)($b['pass_marks'] ?? 33)]);
            $id = (int)$db->lastInsertId();
        }
        json_out(['success' => true, 'id' => $id]);
    }

    if ($action === 'subjects/delete' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0);
        $db->prepare("DELETE FROM subjects WHERE id=? AND school_id=?")->execute([$id, $schoolId]);
        json_out(['success' => true]);
    }

    json_error('Unknown academics route');
}

// ─── ACADEMIC SESSIONS ────────────────────────────────────────────────────────
if ($section === 'academic-sessions') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'list' && $method === 'GET') {
        $stmt = $db->prepare("SELECT * FROM sessions_academic WHERE school_id=? ORDER BY start_year DESC");
        $stmt->execute([$schoolId]);
        json_out(['success' => true, 'sessions' => $stmt->fetchAll()]);
    }

    if ($action === 'create' && $method === 'POST') {
        $b = body();
        $name  = $b['name'] ?? '';
        $start = (int)($b['start_year'] ?? 0);
        $end   = (int)($b['end_year'] ?? 0);
        $db->prepare("INSERT INTO sessions_academic (school_id, name, start_year, end_year, is_current) VALUES (?,?,?,?,0)")->execute([$schoolId, $name, $start, $end]);
        json_out(['success' => true, 'id' => (int)$db->lastInsertId()]);
    }

    if ($action === 'set-current' && $method === 'POST') {
        $b  = body();
        $id = (int)($b['session_id'] ?? $_GET['id'] ?? 0);
        if (!$id) json_error('session_id required');
        $db->prepare("UPDATE sessions_academic SET is_current=0 WHERE school_id=?")->execute([$schoolId]);
        $db->prepare("UPDATE sessions_academic SET is_current=1 WHERE id=? AND school_id=?")->execute([$id, $schoolId]);
        json_out(['success' => true, 'session_id' => $id]);
    }

    if ($action === 'promote' && $method === 'POST') {
        $b = body();
        $fromSessionId = (int)($b['from_session_id'] ?? 0);
        $toSessionId   = (int)($b['to_session_id'] ?? 0);
        $mappings      = $b['class_mappings'] ?? []; // [{from_class_id, to_class_id}]

        // Auto-create next session if not provided
        if (!$toSessionId) {
            $fromSess = $db->prepare("SELECT * FROM sessions_academic WHERE id=?")->execute([$fromSessionId]);
            $fs = $db->query("SELECT * FROM sessions_academic WHERE id=$fromSessionId")->fetch();
            if ($fs) {
                $nextName  = ($fs['start_year'] + 1) . '-' . substr(($fs['end_year'] + 1), 2, 2);
                $nextStart = $fs['start_year'] + 1;
                $nextEnd   = $fs['end_year'] + 1;
                $existing  = $db->prepare("SELECT id FROM sessions_academic WHERE name=? AND school_id=?")->execute([$nextName, $schoolId]);
                $ex = $db->query("SELECT id FROM sessions_academic WHERE name='$nextName' AND school_id=$schoolId LIMIT 1")->fetch();
                if ($ex) {
                    $toSessionId = (int)$ex['id'];
                } else {
                    $db->prepare("INSERT INTO sessions_academic (school_id, name, start_year, end_year, is_current) VALUES (?,?,?,?,0)")->execute([$schoolId, $nextName, $nextStart, $nextEnd]);
                    $toSessionId = (int)$db->lastInsertId();
                }
            }
        }

        $promoted = 0;
        $stmt = $db->prepare("SELECT * FROM students WHERE session_id=? AND school_id=? AND is_active=1");
        $stmt->execute([$fromSessionId, $schoolId]);
        $students = $stmt->fetchAll();

        $insertStmt = $db->prepare("INSERT INTO students (school_id, session_id, class_id, section_id, adm_no, full_name, father_name, mother_name, father_mobile, mother_mobile, dob, gender, address, photo_url, bus_no, route_id, pickup_point_id, roll_no, adm_date, category) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");

        foreach ($students as $s) {
            $toClassId = null;
            foreach ($mappings as $m) {
                if ((int)$m['from_class_id'] === (int)$s['class_id']) {
                    $toClassId = $m['to_class_id'] ?? null;
                    break;
                }
            }
            if (!$toClassId) continue; // skip if not in mapping (alumni/graduated)
            // Check if already promoted
            $chk = $db->prepare("SELECT id FROM students WHERE adm_no=? AND session_id=? AND school_id=? LIMIT 1");
            $chk->execute([$s['adm_no'], $toSessionId, $schoolId]);
            if ($chk->fetch()) continue;
            $insertStmt->execute([$schoolId, $toSessionId, $toClassId, $s['section_id'], $s['adm_no'], $s['full_name'], $s['father_name'], $s['mother_name'], $s['father_mobile'], $s['mother_mobile'], $s['dob'], $s['gender'], $s['address'], $s['photo_url'], $s['bus_no'], $s['route_id'], $s['pickup_point_id'], $s['roll_no'], $s['adm_date'], $s['category']]);
            $promoted++;
        }
        json_out(['success' => true, 'promoted' => $promoted, 'to_session_id' => $toSessionId]);
    }

    json_error('Unknown academic-sessions route');
}

// ─── EXAMS ────────────────────────────────────────────────────────────────────
if ($section === 'exams') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'list' && $method === 'GET') {
        $sessionId = $_GET['session_id'] ?? null;
        $where = "school_id = $schoolId"; $params = [];
        if ($sessionId) { $where .= " AND session_id = ?"; $params[] = $sessionId; }
        $stmt = $db->prepare("SELECT * FROM exams WHERE $where ORDER BY start_date DESC");
        $stmt->execute($params);
        json_out(['success' => true, 'exams' => $stmt->fetchAll()]);
    }

    if ($action === 'save' && $method === 'POST') {
        $b = body(); $id = (int)($b['id'] ?? 0);
        if ($id) {
            $db->prepare("UPDATE exams SET name=?, exam_type=?, start_date=?, end_date=?, session_id=? WHERE id=? AND school_id=?")->execute([$b['name'], $b['exam_type'] ?? '', $b['start_date'] ?? null, $b['end_date'] ?? null, $b['session_id'] ?? null, $id, $schoolId]);
        } else {
            $db->prepare("INSERT INTO exams (school_id, session_id, name, exam_type, start_date, end_date) VALUES (?,?,?,?,?,?)")->execute([$schoolId, $b['session_id'] ?? null, $b['name'], $b['exam_type'] ?? '', $b['start_date'] ?? null, $b['end_date'] ?? null]);
            $id = (int)$db->lastInsertId();
        }
        json_out(['success' => true, 'id' => $id]);
    }

    if ($action === 'timetable' && $method === 'GET') {
        $examId = (int)($_GET['exam_id'] ?? 0);
        $stmt   = $db->prepare("SELECT et.*, s.name as subject_name, c.name as class_name FROM exam_timetable et LEFT JOIN subjects s ON s.id=et.subject_id LEFT JOIN classes c ON c.id=et.class_id WHERE et.exam_id=? ORDER BY et.date, et.start_time");
        $stmt->execute([$examId]);
        json_out(['success' => true, 'timetable' => $stmt->fetchAll()]);
    }

    if ($action === 'timetable/save' && $method === 'POST') {
        $b = body();
        $entries = $b['entries'] ?? [$b];
        $stmt = $db->prepare("INSERT INTO exam_timetable (exam_id, class_id, subject_id, date, start_time, end_time, room) VALUES (?,?,?,?,?,?,?)");
        foreach ($entries as $e) {
            $stmt->execute([(int)($e['exam_id']), $e['class_id'] ?? null, $e['subject_id'] ?? null, $e['date'] ?? null, $e['start_time'] ?? null, $e['end_time'] ?? null, $e['room'] ?? '']);
        }
        json_out(['success' => true]);
    }

    if ($action === 'results' && $method === 'GET') {
        $examId  = (int)($_GET['exam_id'] ?? 0);
        $classId = $_GET['class_id'] ?? null;
        $where   = "er.exam_id = $examId AND er.school_id = $schoolId";
        $params  = [];
        if ($classId) {
            $where .= " AND s.class_id = ?"; $params[] = $classId;
        }
        $stmt = $db->prepare("SELECT er.*, st.full_name, st.adm_no, su.name as subject_name FROM exam_results er LEFT JOIN students st ON st.id=er.student_id LEFT JOIN subjects su ON su.id=er.subject_id WHERE $where ORDER BY st.full_name, su.name");
        $stmt->execute($params);
        json_out(['success' => true, 'results' => $stmt->fetchAll()]);
    }

    if ($action === 'results/save' && $method === 'POST') {
        $b = body();
        $results = $b['results'] ?? [$b];
        $stmt = $db->prepare("INSERT INTO exam_results (school_id, exam_id, student_id, subject_id, marks_obtained, max_marks, grade, remarks) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE marks_obtained=VALUES(marks_obtained),grade=VALUES(grade),remarks=VALUES(remarks)");
        foreach ($results as $r) {
            $stmt->execute([$schoolId, $r['exam_id'], $r['student_id'], $r['subject_id'], (float)($r['marks_obtained'] ?? 0), (int)($r['max_marks'] ?? 100), $r['grade'] ?? '', $r['remarks'] ?? '']);
        }
        json_out(['success' => true]);
    }

    json_error('Unknown exams route');
}

// ─── RESULTS (top-level alias: ?route=results/save) ──────────────────────────
if ($section === 'results') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'save' && $method === 'POST') {
        $b = body();
        $results = $b['results'] ?? [$b];
        $stmt = $db->prepare("INSERT INTO exam_results (school_id, exam_id, student_id, subject_id, marks_obtained, max_marks, grade, remarks) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE marks_obtained=VALUES(marks_obtained),grade=VALUES(grade),remarks=VALUES(remarks)");
        foreach ($results as $r) {
            $stmt->execute([$schoolId, $r['exam_id'], $r['student_id'], $r['subject_id'], (float)($r['marks_obtained'] ?? 0), (int)($r['max_marks'] ?? 100), $r['grade'] ?? '', $r['remarks'] ?? '']);
        }
        json_out(['success' => true]);
    }

    if ($action === 'list' && $method === 'GET') {
        $examId  = (int)($_GET['exam_id'] ?? 0);
        $classId = $_GET['class_id'] ?? null;
        $where   = "er.exam_id = $examId AND er.school_id = $schoolId";
        $params  = [];
        if ($classId) { $where .= " AND st.class_id = ?"; $params[] = $classId; }
        $stmt = $db->prepare("SELECT er.*, st.full_name, st.adm_no, su.name as subject_name FROM exam_results er LEFT JOIN students st ON st.id=er.student_id LEFT JOIN subjects su ON su.id=er.subject_id WHERE $where ORDER BY st.full_name, su.name");
        $stmt->execute($params);
        json_out(['success' => true, 'results' => $stmt->fetchAll()]);
    }

    json_error('Unknown results route');
}

// ─── TRANSPORT ────────────────────────────────────────────────────────────────
if ($section === 'transport') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'routes' && $method === 'GET') {
        $stmt = $db->prepare("SELECT * FROM transport_routes WHERE school_id=? ORDER BY name");
        $stmt->execute([$schoolId]);
        json_out(['success' => true, 'routes' => $stmt->fetchAll()]);
    }
    if ($action === 'routes/save' && $method === 'POST') {
        $b = body(); $id = (int)($b['id'] ?? 0);
        if ($id) { $db->prepare("UPDATE transport_routes SET name=?, description=? WHERE id=? AND school_id=?")->execute([$b['name'], $b['description'] ?? '', $id, $schoolId]); }
        else { $db->prepare("INSERT INTO transport_routes (school_id, name, description) VALUES (?,?,?)")->execute([$schoolId, $b['name'], $b['description'] ?? '']); $id = (int)$db->lastInsertId(); }
        json_out(['success' => true, 'id' => $id]);
    }
    if ($action === 'routes/delete' && $method === 'POST') {
        $db->prepare("DELETE FROM transport_routes WHERE id=? AND school_id=?")->execute([(int)($_GET['id'] ?? 0), $schoolId]);
        json_out(['success' => true]);
    }
    if ($action === 'buses' && $method === 'GET') {
        $stmt = $db->prepare("SELECT tb.*, tr.name as route_name FROM transport_buses tb LEFT JOIN transport_routes tr ON tr.id=tb.route_id WHERE tb.school_id=? ORDER BY tb.bus_no");
        $stmt->execute([$schoolId]);
        json_out(['success' => true, 'buses' => $stmt->fetchAll()]);
    }
    if ($action === 'buses/save' && $method === 'POST') {
        $b = body(); $id = (int)($b['id'] ?? 0);
        if ($id) { $db->prepare("UPDATE transport_buses SET route_id=?, bus_no=?, driver_id=?, capacity=? WHERE id=? AND school_id=?")->execute([$b['route_id'] ?? null, $b['bus_no'], $b['driver_id'] ?? null, (int)($b['capacity'] ?? 0), $id, $schoolId]); }
        else { $db->prepare("INSERT INTO transport_buses (school_id, route_id, bus_no, driver_id, capacity) VALUES (?,?,?,?,?)")->execute([$schoolId, $b['route_id'] ?? null, $b['bus_no'], $b['driver_id'] ?? null, (int)($b['capacity'] ?? 0)]); $id = (int)$db->lastInsertId(); }
        json_out(['success' => true, 'id' => $id]);
    }
    if ($action === 'pickup-points' && $method === 'GET') {
        $routeId = $_GET['route_id'] ?? null;
        $where = "school_id = $schoolId"; $params = [];
        if ($routeId) { $where .= " AND route_id = ?"; $params[] = $routeId; }
        $stmt = $db->prepare("SELECT * FROM transport_pickup_points WHERE $where ORDER BY sequence_order, name");
        $stmt->execute($params);
        json_out(['success' => true, 'pickup_points' => $stmt->fetchAll()]);
    }
    if ($action === 'pickup-points/save' && $method === 'POST') {
        $b = body(); $id = (int)($b['id'] ?? 0);
        if ($id) { $db->prepare("UPDATE transport_pickup_points SET name=?, monthly_fare=?, sequence_order=? WHERE id=? AND school_id=?")->execute([$b['name'], (float)($b['monthly_fare'] ?? 0), (int)($b['sequence_order'] ?? 0), $id, $schoolId]); }
        else { $db->prepare("INSERT INTO transport_pickup_points (school_id, route_id, name, monthly_fare, sequence_order) VALUES (?,?,?,?,?)")->execute([$schoolId, $b['route_id'], $b['name'], (float)($b['monthly_fare'] ?? 0), (int)($b['sequence_order'] ?? 0)]); $id = (int)$db->lastInsertId(); }
        json_out(['success' => true, 'id' => $id]);
    }
    if ($action === 'driver-students' && $method === 'GET') {
        $driverId = (int)($_GET['driver_id'] ?? 0);
        $stmt = $db->prepare("SELECT s.id, s.full_name, s.adm_no, s.bus_no, tr.name as route_name, tp.name as pickup_point FROM students s LEFT JOIN transport_routes tr ON tr.id=s.route_id LEFT JOIN transport_pickup_points tp ON tp.id=s.pickup_point_id LEFT JOIN transport_buses tb ON tb.route_id=s.route_id WHERE s.school_id=? AND tb.driver_id=? AND s.is_active=1");
        $stmt->execute([$schoolId, $driverId]);
        json_out(['success' => true, 'students' => $stmt->fetchAll()]);
    }
    json_error('Unknown transport route');
}

// ─── LIBRARY ─────────────────────────────────────────────────────────────────
if ($section === 'library') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'books' && $method === 'GET') {
        $page   = max(1, (int)($_GET['page'] ?? 1));
        $limit  = min(200, (int)($_GET['limit'] ?? 50));
        $offset = ($page - 1) * $limit;
        $search = $_GET['search'] ?? '';
        $where  = "school_id = $schoolId"; $params = [];
        if ($search) { $where .= " AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)"; $like="%$search%"; $params=[$like,$like,$like]; }
        $stmt = $db->prepare("SELECT * FROM library_books WHERE $where ORDER BY title LIMIT $limit OFFSET $offset");
        $stmt->execute($params);
        json_out(['success' => true, 'books' => $stmt->fetchAll()]);
    }
    if ($action === 'books/add' && $method === 'POST') {
        $b = body();
        $db->prepare("INSERT INTO library_books (school_id, title, author, isbn, category, quantity, available) VALUES (?,?,?,?,?,?,?)")->execute([$schoolId, $b['title'], $b['author'] ?? '', $b['isbn'] ?? '', $b['category'] ?? '', (int)($b['quantity'] ?? 1), (int)($b['quantity'] ?? 1)]);
        json_out(['success' => true, 'id' => (int)$db->lastInsertId()]);
    }
    if ($action === 'books/update' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0); $b = body();
        $db->prepare("UPDATE library_books SET title=?, author=?, isbn=?, category=?, quantity=? WHERE id=? AND school_id=?")->execute([$b['title'], $b['author'] ?? '', $b['isbn'] ?? '', $b['category'] ?? '', (int)($b['quantity'] ?? 1), $id, $schoolId]);
        json_out(['success' => true]);
    }
    if ($action === 'issue' && $method === 'POST') {
        $b = body();
        $bookId    = (int)($b['book_id'] ?? 0);
        $studentId = (int)($b['student_id'] ?? 0);
        $issueDate = $b['issue_date'] ?? date('Y-m-d');
        $dueDate   = $b['due_date'] ?? date('Y-m-d', strtotime('+14 days'));
        $avail = $db->query("SELECT available FROM library_books WHERE id=$bookId AND school_id=$schoolId")->fetch();
        if (!$avail || (int)$avail['available'] < 1) json_error('Book not available');
        $db->prepare("INSERT INTO library_issues (school_id, book_id, student_id, issue_date, due_date) VALUES (?,?,?,?,?)")->execute([$schoolId, $bookId, $studentId, $issueDate, $dueDate]);
        $db->prepare("UPDATE library_books SET available = available - 1 WHERE id=? AND school_id=?")->execute([$bookId, $schoolId]);
        json_out(['success' => true, 'id' => (int)$db->lastInsertId()]);
    }
    if ($action === 'return' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0); $b = body();
        $issue = $db->query("SELECT * FROM library_issues WHERE id=$id AND school_id=$schoolId")->fetch();
        if (!$issue) json_error('Issue record not found', 404);
        $returnDate = $b['return_date'] ?? date('Y-m-d');
        $fine = (float)($b['fine'] ?? 0);
        $db->prepare("UPDATE library_issues SET return_date=?, fine=? WHERE id=?")->execute([$returnDate, $fine, $id]);
        $db->prepare("UPDATE library_books SET available = available + 1 WHERE id=? AND school_id=?")->execute([$issue['book_id'], $schoolId]);
        json_out(['success' => true]);
    }
    if ($action === 'overdue' && $method === 'GET') {
        $stmt = $db->prepare("SELECT li.*, lb.title, s.full_name, s.adm_no FROM library_issues li JOIN library_books lb ON lb.id=li.book_id JOIN students s ON s.id=li.student_id WHERE li.school_id=? AND li.return_date IS NULL AND li.due_date < CURDATE() ORDER BY li.due_date");
        $stmt->execute([$schoolId]);
        json_out(['success' => true, 'overdue' => $stmt->fetchAll()]);
    }
    json_error('Unknown library route');
}

// ─── INVENTORY ────────────────────────────────────────────────────────────────
if ($section === 'inventory') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'items' && $method === 'GET') {
        $page   = max(1, (int)($_GET['page'] ?? 1));
        $limit  = min(200, (int)($_GET['limit'] ?? 50));
        $offset = ($page - 1) * $limit;
        $search = $_GET['search'] ?? '';
        $where  = "school_id = $schoolId"; $params = [];
        if ($search) { $where .= " AND (name LIKE ? OR category LIKE ?)"; $like="%$search%"; $params=[$like,$like]; }
        $stmt = $db->prepare("SELECT * FROM inventory_items WHERE $where ORDER BY name LIMIT $limit OFFSET $offset");
        $stmt->execute($params);
        json_out(['success' => true, 'items' => $stmt->fetchAll()]);
    }
    if ($action === 'items/add' && $method === 'POST') {
        $b = body();
        $db->prepare("INSERT INTO inventory_items (school_id, name, category, unit, purchase_price, sell_price, quantity) VALUES (?,?,?,?,?,?,?)")->execute([$schoolId, $b['name'], $b['category'] ?? '', $b['unit'] ?? '', (float)($b['purchase_price'] ?? 0), (float)($b['sell_price'] ?? 0), (int)($b['quantity'] ?? 0)]);
        json_out(['success' => true, 'id' => (int)$db->lastInsertId()]);
    }
    if ($action === 'items/update' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0); $b = body();
        $db->prepare("UPDATE inventory_items SET name=?, category=?, unit=?, purchase_price=?, sell_price=?, quantity=?, updated_at=NOW() WHERE id=? AND school_id=?")->execute([$b['name'], $b['category'] ?? '', $b['unit'] ?? '', (float)($b['purchase_price'] ?? 0), (float)($b['sell_price'] ?? 0), (int)($b['quantity'] ?? 0), $id, $schoolId]);
        json_out(['success' => true]);
    }
    if ($action === 'items/delete' && $method === 'POST') {
        $db->prepare("DELETE FROM inventory_items WHERE id=? AND school_id=?")->execute([(int)($_GET['id'] ?? 0), $schoolId]);
        json_out(['success' => true]);
    }
    if ($action === 'transactions/add' && $method === 'POST') {
        $b = body();
        $itemId = (int)($b['item_id'] ?? 0);
        $type   = $b['type'] ?? 'purchase'; // purchase | sell
        $qty    = (int)($b['quantity'] ?? 0);
        $db->prepare("INSERT INTO inventory_transactions (school_id, item_id, type, quantity, price, date, notes) VALUES (?,?,?,?,?,?,?)")->execute([$schoolId, $itemId, $type, $qty, (float)($b['price'] ?? 0), $b['date'] ?? date('Y-m-d'), $b['notes'] ?? '']);
        $delta = $type === 'sell' ? -$qty : $qty;
        $db->prepare("UPDATE inventory_items SET quantity = quantity + ?, updated_at=NOW() WHERE id=? AND school_id=?")->execute([$delta, $itemId, $schoolId]);
        json_out(['success' => true]);
    }
    json_error('Unknown inventory route');
}

// ─── COMMUNICATION ────────────────────────────────────────────────────────────
if ($section === 'communication') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'whatsapp/send' && $method === 'POST') {
        // Placeholder — integrate with WhatsApp Business API
        $b = body();
        json_out(['success' => true, 'message' => 'WhatsApp send queued', 'to' => $b['to'] ?? '', 'text' => $b['message'] ?? '']);
    }
    if ($action === 'broadcast-history' && $method === 'GET') {
        $stmt = $db->prepare("SELECT * FROM notifications WHERE school_id=? ORDER BY created_at DESC LIMIT 50");
        $stmt->execute([$schoolId]);
        json_out(['success' => true, 'history' => $stmt->fetchAll()]);
    }
    if ($action === 'notification/schedule' && $method === 'POST') {
        $b = body();
        $db->prepare("INSERT INTO notifications (school_id, type, title, message, recipient_role) VALUES (?,?,?,?,?)")->execute([$schoolId, $b['type'] ?? 'info', $b['title'] ?? '', $b['message'] ?? '', $b['recipient_role'] ?? 'all']);
        json_out(['success' => true, 'id' => (int)$db->lastInsertId()]);
    }
    if ($action === 'notifications' && $method === 'GET') {
        $userId = $user['sub'];
        $limit  = min(100, (int)($_GET['limit'] ?? 20));
        $stmt   = $db->prepare("SELECT * FROM notifications WHERE school_id=? ORDER BY created_at DESC LIMIT $limit");
        $stmt->execute([$schoolId]);
        json_out(['success' => true, 'notifications' => $stmt->fetchAll()]);
    }
    if ($action === 'notifications/mark-read' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0);
        $db->prepare("UPDATE notifications SET is_read=1 WHERE id=? AND school_id=?")->execute([$id, $schoolId]);
        json_out(['success' => true]);
    }
    json_error('Unknown communication route');
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────
if ($section === 'chat') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);
    $userId   = (int)$user['sub'];

    if ($action === 'rooms' && $method === 'GET') {
        $stmt = $db->prepare("SELECT cr.*, u.name as creator_name FROM chat_rooms cr LEFT JOIN users u ON u.id=cr.created_by WHERE cr.school_id=? ORDER BY cr.created_at DESC");
        $stmt->execute([$schoolId]);
        json_out(['success' => true, 'rooms' => $stmt->fetchAll()]);
    }
    if ($action === 'rooms/create' && $method === 'POST') {
        $b = body();
        $db->prepare("INSERT INTO chat_rooms (school_id, name, type, created_by) VALUES (?,?,?,?)")->execute([$schoolId, $b['name'] ?? '', $b['type'] ?? 'group', $userId]);
        $roomId = (int)$db->lastInsertId();
        $db->prepare("INSERT INTO chat_room_members (room_id, user_id) VALUES (?,?)")->execute([$roomId, $userId]);
        json_out(['success' => true, 'id' => $roomId]);
    }
    if ($action === 'messages' && $method === 'GET') {
        $roomId = (int)($_GET['room_id'] ?? 0);
        $page   = max(1, (int)($_GET['page'] ?? 1));
        $limit  = min(100, (int)($_GET['limit'] ?? 50));
        $offset = ($page - 1) * $limit;
        $stmt   = $db->prepare("SELECT cm.*, u.name as sender_name FROM chat_messages cm LEFT JOIN users u ON u.id=cm.sender_id WHERE cm.room_id=? AND cm.school_id=? ORDER BY cm.created_at DESC LIMIT $limit OFFSET $offset");
        $stmt->execute([$roomId, $schoolId]);
        json_out(['success' => true, 'messages' => array_reverse($stmt->fetchAll())]);
    }
    if ($action === 'messages/send' && $method === 'POST') {
        $b = body();
        $roomId = (int)($b['room_id'] ?? 0);
        $db->prepare("INSERT INTO chat_messages (room_id, school_id, sender_id, message, file_url) VALUES (?,?,?,?,?)")->execute([$roomId, $schoolId, $userId, $b['message'] ?? '', $b['file_url'] ?? '']);
        json_out(['success' => true, 'id' => (int)$db->lastInsertId()]);
    }
    json_error('Unknown chat route');
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
if ($section === 'dashboard') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'stats' && $method === 'GET') {
        $sessionRow = $db->query("SELECT id FROM sessions_academic WHERE school_id=$schoolId AND is_current=1 LIMIT 1")->fetch();
        $sessionId  = $sessionRow ? (int)$sessionRow['id'] : 0;

        $totalStudents = (int)$db->query("SELECT COUNT(*) as c FROM students WHERE school_id=$schoolId AND is_active=1 AND session_id=$sessionId")->fetch()['c'];
        $totalStaff    = (int)$db->query("SELECT COUNT(*) as c FROM staff WHERE school_id=$schoolId AND is_active=1")->fetch()['c'];
        $totalClasses  = (int)$db->query("SELECT COUNT(*) as c FROM classes WHERE school_id=$schoolId")->fetch()['c'];
        $thisMonth     = date('Y-m');
        $feesThisMonth = (float)($db->query("SELECT COALESCE(SUM(total_amount),0) as total FROM fee_receipts WHERE school_id=$schoolId AND DATE_FORMAT(payment_date,'%Y-%m')='$thisMonth'")->fetch()['total'] ?? 0);
        $today         = date('Y-m-d');
        $presentToday  = (int)$db->query("SELECT COUNT(*) as c FROM attendance WHERE school_id=$schoolId AND date='$today' AND status='present'")->fetch()['c'];
        $attPct        = $totalStudents > 0 ? round($presentToday / $totalStudents * 100, 1) : 0;

        json_out(['success' => true, 'stats' => [
            'totalStudents'        => $totalStudents,
            'totalStaff'           => $totalStaff,
            'totalClasses'         => $totalClasses,
            'feesCollectedThisMonth' => $feesThisMonth,
            'pendingDues'          => 0, // requires fee plan total calc
            'presentToday'         => $presentToday,
            'attendancePercent'    => $attPct,
        ]]);
    }

    if ($action === 'fee-chart' && $method === 'GET') {
        $sessionId = $_GET['session_id'] ?? null;
        $months    = ['april','may','june','july','august','september','october','november','december','january','february','march'];
        $where     = "school_id = $schoolId"; $params = [];
        if ($sessionId) { $where .= " AND session_id = ?"; $params[] = $sessionId; }
        $stmt = $db->prepare("SELECT payment_date, total_amount FROM fee_receipts WHERE $where");
        $stmt->execute($params);
        $rows   = $stmt->fetchAll();
        $chart  = array_fill_keys($months, 0);
        foreach ($rows as $r) {
            $mn = strtolower(date('F', strtotime($r['payment_date'])));
            if (isset($chart[$mn])) $chart[$mn] += (float)$r['total_amount'];
        }
        $result = [];
        foreach ($months as $mn) $result[] = ['month' => ucfirst($mn), 'amount' => $chart[$mn]];
        json_out(['success' => true, 'chart' => $result]);
    }

    if ($action === 'recent-activity' && $method === 'GET') {
        $students = $db->query("SELECT 'student_added' as type, full_name as title, created_at FROM students WHERE school_id=$schoolId AND is_active=1 ORDER BY created_at DESC LIMIT 5")->fetchAll();
        $receipts = $db->query("SELECT 'fee_collected' as type, CONCAT('Receipt #', receipt_no) as title, created_at FROM fee_receipts WHERE school_id=$schoolId ORDER BY created_at DESC LIMIT 5")->fetchAll();
        $activity = array_merge($students, $receipts);
        usort($activity, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));
        json_out(['success' => true, 'activity' => array_slice($activity, 0, 10)]);
    }

    json_error('Unknown dashboard route');
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
if ($section === 'settings') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if (($action === 'all' || $action === 'get') && $method === 'GET') {
        $stmt = $db->prepare("SELECT `key`, value FROM settings WHERE school_id=?");
        $stmt->execute([$schoolId]);
        $rows = $stmt->fetchAll();
        $map  = [];
        foreach ($rows as $r) $map[$r['key']] = $r['value'];
        json_out(['success' => true, 'settings' => $map]);
    }

    if ($action === 'save' && $method === 'POST') {
        $b = body();
        $stmt = $db->prepare("INSERT INTO settings (school_id, `key`, value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value=VALUES(value), updated_at=NOW()");
        foreach ($b as $k => $v) {
            if ($k !== 'school_id') $stmt->execute([$schoolId, $k, (string)$v]);
        }
        json_out(['success' => true]);
    }

    if ($action === 'users' && $method === 'GET') {
        $stmt = $db->prepare("SELECT id, school_id, username, name, role, email, mobile, is_active, created_at FROM users WHERE school_id=? ORDER BY name");
        $stmt->execute([$schoolId]);
        json_out(['success' => true, 'users' => $stmt->fetchAll()]);
    }

    if ($action === 'users/create' && $method === 'POST') {
        $b = body();
        $hash = password_hash($b['password'] ?? 'changeme123', PASSWORD_BCRYPT);
        $db->prepare("INSERT INTO users (school_id, username, password_hash, name, role, email, mobile, permissions_json) VALUES (?,?,?,?,?,?,?,?)")->execute([$schoolId, $b['username'], $hash, $b['name'], $b['role'] ?? 'teacher', $b['email'] ?? '', $b['mobile'] ?? '', json_encode($b['permissions'] ?? [])]);
        json_out(['success' => true, 'id' => (int)$db->lastInsertId()]);
    }

    if ($action === 'users/update' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0); $b = body();
        $db->prepare("UPDATE users SET name=?, role=?, email=?, mobile=?, permissions_json=?, is_active=?, updated_at=NOW() WHERE id=? AND school_id=?")->execute([$b['name'], $b['role'] ?? 'teacher', $b['email'] ?? '', $b['mobile'] ?? '', json_encode($b['permissions'] ?? []), (int)($b['is_active'] ?? 1), $id, $schoolId]);
        json_out(['success' => true]);
    }

    if ($action === 'users/delete' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0);
        $db->prepare("UPDATE users SET is_active=0 WHERE id=? AND school_id=?")->execute([$id, $schoolId]);
        json_out(['success' => true]);
    }

    if ($action === 'users/reset-password' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0); $b = body();
        $hash = password_hash($b['password'] ?? 'changeme123', PASSWORD_BCRYPT);
        $db->prepare("UPDATE users SET password_hash=?, updated_at=NOW() WHERE id=? AND school_id=?")->execute([$hash, $id, $schoolId]);
        json_out(['success' => true]);
    }

    json_error('Unknown settings route');
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────
if ($section === 'reports') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'students' && $method === 'GET') {
        $sessionId = $_GET['session_id'] ?? null;
        $classId   = $_GET['class_id'] ?? null;
        $sectionId = $_GET['section_id'] ?? null;
        $where = ["s.school_id = $schoolId", "s.is_active = 1"]; $params = [];
        if ($sessionId) { $where[] = "s.session_id = ?"; $params[] = $sessionId; }
        if ($classId)   { $where[] = "s.class_id = ?";   $params[] = $classId; }
        if ($sectionId) { $where[] = "s.section_id = ?"; $params[] = $sectionId; }
        $whereStr = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT s.*, c.name as class_name, sec.name as section_name FROM students s LEFT JOIN classes c ON c.id=s.class_id LEFT JOIN sections sec ON sec.id=s.section_id WHERE $whereStr ORDER BY c.display_order, s.roll_no, s.full_name");
        $stmt->execute($params);
        json_out(['success' => true, 'students' => $stmt->fetchAll()]);
    }

    if ($action === 'finance' && $method === 'GET') {
        $sessionId = $_GET['session_id'] ?? null;
        $month     = $_GET['month'] ?? null;
        $where = "school_id = $schoolId"; $params = [];
        if ($sessionId) { $where .= " AND session_id = ?"; $params[] = $sessionId; }
        if ($month) { $where .= " AND DATE_FORMAT(payment_date,'%Y-%m') = ?"; $params[] = $month; }
        $stmt = $db->prepare("SELECT payment_mode, SUM(total_amount) as total, COUNT(*) as count FROM fee_receipts WHERE $where GROUP BY payment_mode");
        $stmt->execute($params);
        $byMode = $stmt->fetchAll();
        $stmt2  = $db->prepare("SELECT SUM(total_amount) as grand_total FROM fee_receipts WHERE $where");
        $stmt2->execute($params);
        json_out(['success' => true, 'by_mode' => $byMode, 'grand_total' => (float)$stmt2->fetch()['grand_total']]);
    }

    if ($action === 'attendance' && $method === 'GET') {
        $classId = $_GET['class_id'] ?? null;
        $month   = (int)($_GET['month'] ?? date('n'));
        $year    = (int)($_GET['year'] ?? date('Y'));
        $where   = "a.school_id = $schoolId AND MONTH(a.date)=$month AND YEAR(a.date)=$year"; $params = [];
        if ($classId) { $where .= " AND a.class_id = ?"; $params[] = $classId; }
        $stmt = $db->prepare("SELECT s.full_name, s.adm_no, s.roll_no, SUM(a.status='present') as present, SUM(a.status='absent') as absent, COUNT(a.id) as total_days FROM attendance a JOIN students s ON s.id=a.student_id WHERE $where GROUP BY a.student_id ORDER BY s.full_name");
        $stmt->execute($params);
        json_out(['success' => true, 'attendance' => $stmt->fetchAll()]);
    }

    if (($action === 'fee-register' || $action === 'fees') && $method === 'GET') {
        $sessionId = $_GET['session_id'] ?? null;
        $classId   = $_GET['class_id'] ?? null;
        $where = ["s.school_id = $schoolId", "s.is_active = 1"]; $params = [];
        if ($sessionId) { $where[] = "s.session_id = ?"; $params[] = $sessionId; }
        if ($classId)   { $where[] = "s.class_id = ?";   $params[] = $classId; }
        $whereStr = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT s.id, s.full_name, s.adm_no, s.father_mobile, c.name as class_name, COALESCE((SELECT SUM(r.total_amount) FROM fee_receipts r WHERE r.student_id=s.id AND r.school_id=s.school_id),0) as total_paid FROM students s LEFT JOIN classes c ON c.id=s.class_id WHERE $whereStr ORDER BY c.display_order, s.full_name");
        $stmt->execute($params);
        json_out(['success' => true, 'register' => $stmt->fetchAll()]);
    }

    json_error('Unknown reports route');
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────
if ($section === 'expenses') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($method === 'GET' && ($action === 'list' || $action === '')) {
        $page   = max(1, (int)($_GET['page'] ?? 1));
        $limit  = min(200, (int)($_GET['limit'] ?? 50));
        $offset = ($page - 1) * $limit;
        $month  = $_GET['month'] ?? null;
        $where  = "school_id = $schoolId"; $params = [];
        if ($month) { $where .= " AND DATE_FORMAT(date,'%Y-%m') = ?"; $params[] = $month; }
        $stmt = $db->prepare("SELECT * FROM expenses WHERE $where ORDER BY date DESC LIMIT $limit OFFSET $offset");
        $stmt->execute($params);
        json_out(['success' => true, 'expenses' => $stmt->fetchAll()]);
    }
    if ($method === 'POST' && $action === 'add') {
        $b = body();
        $db->prepare("INSERT INTO expenses (school_id, head, description, amount, date, created_by) VALUES (?,?,?,?,?,?)")->execute([$schoolId, $b['head'] ?? '', $b['description'] ?? '', (float)($b['amount'] ?? 0), $b['date'] ?? date('Y-m-d'), $user['sub']]);
        json_out(['success' => true, 'id' => (int)$db->lastInsertId()]);
    }
    if ($method === 'POST' && $action === 'delete') {
        $db->prepare("DELETE FROM expenses WHERE id=? AND school_id=?")->execute([(int)($_GET['id'] ?? 0), $schoolId]);
        json_out(['success' => true]);
    }
    json_error('Unknown expenses route');
}

// ─── HOMEWORK ────────────────────────────────────────────────────────────────
if ($section === 'homework') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($method === 'GET' && ($action === 'list' || $action === '')) {
        $classId   = $_GET['class_id'] ?? null;
        $sectionId = $_GET['section_id'] ?? null;
        $where = "school_id = $schoolId"; $params = [];
        if ($classId)   { $where .= " AND class_id = ?";   $params[] = $classId; }
        if ($sectionId) { $where .= " AND section_id = ?"; $params[] = $sectionId; }
        $stmt = $db->prepare("SELECT h.*, c.name as class_name, s.name as subject_name FROM homework h LEFT JOIN classes c ON c.id=h.class_id LEFT JOIN subjects s ON s.id=h.subject_id WHERE $where ORDER BY h.due_date DESC LIMIT 100");
        $stmt->execute($params);
        json_out(['success' => true, 'homework' => $stmt->fetchAll()]);
    }
    if ($method === 'POST' && $action === 'add') {
        $b = body();
        $db->prepare("INSERT INTO homework (school_id, class_id, section_id, subject_id, title, description, due_date, assigned_by) VALUES (?,?,?,?,?,?,?,?)")->execute([$schoolId, $b['class_id'] ?? null, $b['section_id'] ?? null, $b['subject_id'] ?? null, $b['title'], $b['description'] ?? '', $b['due_date'] ?? null, $user['sub']]);
        json_out(['success' => true, 'id' => (int)$db->lastInsertId()]);
    }
    if ($method === 'POST' && $action === 'delete') {
        $db->prepare("DELETE FROM homework WHERE id=? AND school_id=?")->execute([(int)($_GET['id'] ?? 0), $schoolId]);
        json_out(['success' => true]);
    }
    json_error('Unknown homework route');
}

// ─── BACKUP ───────────────────────────────────────────────────────────────────
if ($section === 'backup') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'export' && $method === 'GET') {
        $data = [];
        $tables = [
            'students'                => "SELECT * FROM students WHERE school_id=$schoolId",
            'staff'                   => "SELECT * FROM staff WHERE school_id=$schoolId",
            'classes'                 => "SELECT * FROM classes WHERE school_id=$schoolId",
            'sections'                => "SELECT * FROM sections WHERE school_id=$schoolId",
            'subjects'                => "SELECT * FROM subjects WHERE school_id=$schoolId",
            'sessions'                => "SELECT * FROM sessions_academic WHERE school_id=$schoolId",
            'fee_headings'            => "SELECT * FROM fee_headings WHERE school_id=$schoolId",
            'fees_plan'               => "SELECT * FROM fees_plan WHERE school_id=$schoolId",
            'fee_receipts'            => "SELECT * FROM fee_receipts WHERE school_id=$schoolId",
            'attendance'              => "SELECT * FROM attendance WHERE school_id=$schoolId ORDER BY date DESC LIMIT 10000",
            'expenses'                => "SELECT * FROM expenses WHERE school_id=$schoolId",
            'homework'                => "SELECT * FROM homework WHERE school_id=$schoolId",
            'exams'                   => "SELECT * FROM exams WHERE school_id=$schoolId",
            'exam_results'            => "SELECT * FROM exam_results WHERE school_id=$schoolId",
            'transport_routes'        => "SELECT * FROM transport_routes WHERE school_id=$schoolId",
            'transport_buses'         => "SELECT * FROM transport_buses WHERE school_id=$schoolId",
            'transport_pickup_points' => "SELECT * FROM transport_pickup_points WHERE school_id=$schoolId",
            'library_books'           => "SELECT * FROM library_books WHERE school_id=$schoolId",
            'inventory_items'         => "SELECT * FROM inventory_items WHERE school_id=$schoolId",
            'settings'                => "SELECT * FROM settings WHERE school_id=$schoolId",
        ];
        foreach ($tables as $key => $sql) {
            try { $data[$key] = $db->query($sql)->fetchAll(); } catch (Exception $e) { $data[$key] = []; }
        }
        json_out(['success' => true, 'data' => $data, 'exported_at' => date('Y-m-d H:i:s'), 'school_id' => $schoolId]);
    }

    if ($action === 'import' && $method === 'POST') {
        $b = body();
        $imported = [];
        $tableMap = [
            'sessions'                => ['sessions_academic',        "INSERT IGNORE INTO sessions_academic (id,school_id,name,start_year,end_year,is_current,created_at) VALUES (?,?,?,?,?,?,?)"],
            'classes'                 => ['classes',                  "INSERT IGNORE INTO classes (id,school_id,session_id,name,display_order,is_enabled,created_at) VALUES (?,?,?,?,?,?,?)"],
            'sections'                => ['sections',                 "INSERT IGNORE INTO sections (id,class_id,school_id,name,created_at) VALUES (?,?,?,?,?)"],
            'subjects'                => ['subjects',                 "INSERT IGNORE INTO subjects (id,class_id,school_id,name,code,max_marks,pass_marks,created_at) VALUES (?,?,?,?,?,?,?,?)"],
            'fee_headings'            => ['fee_headings',             "INSERT IGNORE INTO fee_headings (id,school_id,name,description,is_active,created_at) VALUES (?,?,?,?,?,?)"],
            'fees_plan'               => ['fees_plan',                "INSERT IGNORE INTO fees_plan (id,school_id,class_id,section_id,session_id,fee_heading_id,monthly_amounts_json,created_at) VALUES (?,?,?,?,?,?,?,?)"],
            'students'                => ['students',                 "INSERT IGNORE INTO students (id,school_id,session_id,class_id,section_id,adm_no,full_name,father_name,mother_name,father_mobile,mother_mobile,dob,gender,address,photo_url,bus_no,route_id,pickup_point_id,is_active,roll_no,adm_date,category,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"],
            'staff'                   => ['staff',                    "INSERT IGNORE INTO staff (id,school_id,name,designation,department,mobile,email,joining_date,salary,address,photo_url,is_active,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"],
            'fee_receipts'            => ['fee_receipts',             "INSERT IGNORE INTO fee_receipts (id,school_id,student_id,session_id,receipt_no,payment_date,months_json,amounts_json,total_amount,payment_mode,remarks,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"],
            'expenses'                => ['expenses',                 "INSERT IGNORE INTO expenses (id,school_id,head,description,amount,date,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)"],
        ];
        foreach ($tableMap as $key => [$tbl, $sql]) {
            if (!isset($b['data'][$key])) continue;
            $rows = $b['data'][$key];
            $n = 0;
            foreach ($rows as $row) {
                try {
                    $params = array_values($row);
                    // Ensure school_id is correct
                    $db->prepare($sql)->execute($params);
                    $n++;
                } catch (Exception $e) { /* skip duplicates */ }
            }
            $imported[$key] = $n;
        }
        json_out(['success' => true, 'imported' => $imported]);
    }

    json_error('Unknown backup route');
}

// ─── SCHOOL SETTINGS (alias for settings module, used by profile/theme/whatsapp pages) ──
if ($section === 'school_settings') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'list' && $method === 'GET') {
        $stmt = $db->prepare("SELECT `key`, value FROM settings WHERE school_id=?");
        $stmt->execute([$schoolId]);
        $rows = $stmt->fetchAll();
        $map  = [];
        foreach ($rows as $r) $map[$r['key']] = $r['value'];
        json_out(['success' => true, 'settings' => $map]);
    }

    if ($action === 'save' && $method === 'POST') {
        $b = body();
        $stmt = $db->prepare("INSERT INTO settings (school_id, `key`, value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value=VALUES(value), updated_at=NOW()");
        foreach ($b as $k => $v) {
            if ($k !== 'school_id') $stmt->execute([$schoolId, $k, (string)$v]);
        }
        json_out(['success' => true]);
    }

    json_error('Unknown school_settings route');
}

// ─── NOTIFICATIONS (standalone route used by NotificationScheduler) ───────────
if ($section === 'notifications') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'save' && $method === 'POST') {
        $b = body();
        $db->prepare("INSERT INTO notifications (school_id, type, title, message, recipient_role) VALUES (?,?,?,?,?)")
            ->execute([$schoolId, $b['type'] ?? 'info', $b['title'] ?? '', $b['message'] ?? '', $b['recipient_role'] ?? 'all']);
        json_out(['success' => true, 'id' => (int)$db->lastInsertId()]);
    }

    if ($action === 'trigger' && $method === 'POST') {
        // Placeholder for trigger-based notification dispatch
        $b = body();
        json_out(['success' => true, 'message' => 'Notification trigger queued', 'trigger' => $b['trigger'] ?? '']);
    }

    if ($action === 'list' && $method === 'GET') {
        $limit = min(100, (int)($_GET['limit'] ?? 20));
        $stmt  = $db->prepare("SELECT * FROM notifications WHERE school_id=? ORDER BY created_at DESC LIMIT $limit");
        $stmt->execute([$schoolId]);
        json_out(['success' => true, 'notifications' => $stmt->fetchAll()]);
    }

    if ($action === 'mark-read' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0);
        $db->prepare("UPDATE notifications SET is_read=1 WHERE id=? AND school_id=?")->execute([$id, $schoolId]);
        json_out(['success' => true]);
    }

    json_error('Unknown notifications route');
}

// ─── CLASSES (direct route: ?route=classes/...) ──────────────────────────────
if ($section === 'classes') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'list' && $method === 'GET') {
        $sessionId = $_GET['session_id'] ?? null;
        $where  = "school_id = $schoolId";
        $params = [];
        if ($sessionId) { $where .= " AND (session_id = ? OR session_id IS NULL)"; $params[] = $sessionId; }
        $stmt = $db->prepare("SELECT * FROM classes WHERE $where ORDER BY display_order ASC, name ASC");
        $stmt->execute($params);
        $classes = $stmt->fetchAll();
        // Attach sections for each class
        foreach ($classes as &$cls) {
            $secStmt = $db->prepare("SELECT name FROM sections WHERE class_id=? AND school_id=? ORDER BY name");
            $secStmt->execute([$cls['id'], $schoolId]);
            $cls['sections'] = array_column($secStmt->fetchAll(), 'name');
        }
        json_out(['success' => true, 'classes' => $classes]);
    }

    if ($action === 'add' && $method === 'POST') {
        $b         = body();
        $name      = trim($b['name'] ?? '');
        $sections  = $b['sections'] ?? [];
        $isEnabled = isset($b['is_enabled']) ? (int)$b['is_enabled'] : 1;
        $sessionId = $b['session_id'] ?? null;
        if (!$name) json_error('Class name is required');
        // Determine display order (max + 1)
        $maxOrder = (int)($db->query("SELECT COALESCE(MAX(display_order),0) as mo FROM classes WHERE school_id=$schoolId")->fetch()['mo'] ?? 0);
        $db->prepare("INSERT INTO classes (school_id, session_id, name, display_order, is_enabled) VALUES (?,?,?,?,?)")
           ->execute([$schoolId, $sessionId, $name, $maxOrder + 1, $isEnabled]);
        $classId = (int)$db->lastInsertId();
        // Insert sections if provided
        $sectionNames = [];
        if (!empty($sections) && is_array($sections)) {
            $secStmt = $db->prepare("INSERT INTO sections (school_id, class_id, name) VALUES (?,?,?)");
            foreach ($sections as $sec) {
                $sec = trim($sec);
                if ($sec) {
                    $secStmt->execute([$schoolId, $classId, $sec]);
                    $sectionNames[] = $sec;
                }
            }
        }
        json_out(['success' => true, 'data' => [
            'id'         => (string)$classId,
            'name'       => $name,
            'sections'   => $sectionNames,
            'is_enabled' => (bool)$isEnabled,
        ]]);
    }

    if ($action === 'save' && $method === 'POST') {
        $b         = body();
        $id        = (int)($b['id'] ?? 0);
        $name      = trim($b['name'] ?? '');
        $isEnabled = isset($b['is_enabled']) ? (int)$b['is_enabled'] : 1;
        $sessionId = $b['session_id'] ?? null;
        if ($id) {
            $db->prepare("UPDATE classes SET name=?, display_order=?, session_id=?, is_enabled=? WHERE id=? AND school_id=?")
               ->execute([$name, (int)($b['display_order'] ?? 0), $sessionId, $isEnabled, $id, $schoolId]);
        } else {
            $maxOrder = (int)($db->query("SELECT COALESCE(MAX(display_order),0) as mo FROM classes WHERE school_id=$schoolId")->fetch()['mo'] ?? 0);
            $db->prepare("INSERT INTO classes (school_id, session_id, name, display_order, is_enabled) VALUES (?,?,?,?,?)")
               ->execute([$schoolId, $sessionId, $name, $maxOrder + 1, $isEnabled]);
            $id = (int)$db->lastInsertId();
        }
        json_out(['success' => true, 'id' => $id]);
    }

    if ($action === 'delete' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0);
        $db->prepare("DELETE FROM classes WHERE id=? AND school_id=?")->execute([$id, $schoolId]);
        json_out(['success' => true]);
    }

    json_error('Unknown classes route');
}

// ─── USERS (direct route: ?route=users/...) ───────────────────────────────────
if ($section === 'users') {
    $db = getDB();
    $schoolId = (int)($user['school_id'] ?? 1);

    if ($action === 'list' && $method === 'GET') {
        $stmt = $db->prepare("SELECT id, school_id, username, name, role, email, mobile, is_active, created_at FROM users WHERE school_id=? ORDER BY name");
        $stmt->execute([$schoolId]);
        json_out(['success' => true, 'users' => $stmt->fetchAll()]);
    }

    if ($action === 'add' && $method === 'POST') {
        $b        = body();
        $fullName = trim($b['fullName'] ?? $b['name'] ?? '');
        $username = trim($b['username'] ?? '');
        $email    = trim($b['email'] ?? '');
        $phone    = trim($b['phone'] ?? $b['mobile'] ?? '');
        $password = $b['password'] ?? '';
        $role     = $b['role'] ?? 'teacher';
        if (!$username) json_error('Username is required');
        if (!$password) json_error('Password is required');
        // Check duplicate
        $dup = $db->prepare("SELECT id FROM users WHERE (username=? OR (email!='' AND email=?)) AND school_id=? LIMIT 1");
        $dup->execute([$username, $email ?: '__no_email__', $schoolId]);
        if ($dup->fetch()) json_error('Username or email already exists');
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $db->prepare("INSERT INTO users (school_id, username, password_hash, name, role, email, mobile, is_active) VALUES (?,?,?,?,?,?,?,1)")
           ->execute([$schoolId, $username, $hash, $fullName, $role, $email, $phone]);
        $newId = (int)$db->lastInsertId();
        json_out(['success' => true, 'data' => [
            'id'       => (string)$newId,
            'username' => $username,
            'name'     => $fullName,
            'role'     => $role,
            'email'    => $email,
        ]]);
    }

    if ($action === 'update' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0);
        $b  = body();
        $db->prepare("UPDATE users SET name=?, role=?, email=?, mobile=?, is_active=?, updated_at=NOW() WHERE id=? AND school_id=?")
           ->execute([$b['name'] ?? '', $b['role'] ?? 'teacher', $b['email'] ?? '', $b['mobile'] ?? '', (int)($b['is_active'] ?? 1), $id, $schoolId]);
        json_out(['success' => true]);
    }

    if ($action === 'delete' && $method === 'POST') {
        $id = (int)($_GET['id'] ?? 0);
        $db->prepare("UPDATE users SET is_active=0 WHERE id=? AND school_id=?")->execute([$id, $schoolId]);
        json_out(['success' => true]);
    }

    if ($action === 'reset-password' && $method === 'POST') {
        $id   = (int)($_GET['id'] ?? 0);
        $b    = body();
        $hash = password_hash($b['password'] ?? 'changeme123', PASSWORD_BCRYPT);
        $db->prepare("UPDATE users SET password_hash=?, updated_at=NOW() WHERE id=? AND school_id=?")->execute([$hash, $id, $schoolId]);
        json_out(['success' => true]);
    }

    json_error('Unknown users route');
}

// ─── 404 ────────────────────────────────────────────────────────────────────
json_out(['success' => false, 'error' => "Route not found: $route", 'data' => null], 404);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage(), 'error' => $e->getMessage()]);
    exit;
}
