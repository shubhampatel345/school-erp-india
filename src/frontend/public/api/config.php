<?php
/**
 * SCHOOL LEDGER ERP — Database Configuration & Helpers v5.0
 *
 * NO .htaccess dependency. Works on any cPanel server regardless of mod_rewrite.
 * Upload api/index.php + api/config.php to cPanel public_html/api/
 *
 * DB credentials for psmkgsco hosting account:
 *   Database : psmkgsco_shubherp_db
 *   User     : psmkgsco_shubherp_user
 *
 * Override at runtime via environment variables:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS, JWT_SECRET
 */

@error_reporting(0);
@ini_set('display_errors', '0');
@ini_set('log_errors', '1');

define('DB_HOST',     getenv('DB_HOST')     ?: 'localhost');
define('DB_PORT',     getenv('DB_PORT')     ?: '3306');
define('DB_NAME',     getenv('DB_NAME')     ?: 'psmkgsco_shubherp_db');
define('DB_USER',     getenv('DB_USER')     ?: 'psmkgsco_shubherp_user');
define('DB_PASS',     getenv('DB_PASS')     ?: 'Shubh@420');
define('DB_CHARSET',  'utf8mb4');
define('JWT_SECRET',  getenv('JWT_SECRET')  ?: 'shubh_erp_jwt_secret_2024_psmkgs_school_ledger');
define('JWT_EXPIRY',  86400);     // 24 hours
define('JWT_REFRESH', 604800);    // 7 days
define('API_VERSION', '5.0');
define('API_URL',     getenv('API_URL')     ?: 'https://shubh.psmkgs.com/api');
define('UPLOAD_DIR',  __DIR__ . '/uploads/');
define('MAX_FILE_SIZE', 5242880); // 5 MB

// ── PDO singleton ─────────────────────────────────────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
        );
        $opts = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $opts);
    }
    return $pdo;
}

// ── CORS headers (always sent) ────────────────────────────────────────────────
function send_cors_headers(): void {
    if (headers_sent()) return;
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token, X-School-ID');
}

// ── Response helpers ──────────────────────────────────────────────────────────
function json_success($data = null, string $message = 'OK', int $code = 200): void {
    send_cors_headers();
    http_response_code($code);
    echo json_encode(['status' => 'ok', 'message' => $message, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $code = 400, $data = null): void {
    send_cors_headers();
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error_coded(string $message, int $httpCode, string $errorCode, $data = null): void {
    send_cors_headers();
    http_response_code($httpCode);
    echo json_encode(['status' => 'error', 'message' => $message, 'code' => $errorCode, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── JWT ───────────────────────────────────────────────────────────────────────
function jwt_encode(array $payload): string {
    $header = _b64u(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $pay    = _b64u(json_encode($payload));
    $sig    = _b64u(hash_hmac('sha256', "$header.$pay", JWT_SECRET, true));
    return "$header.$pay.$sig";
}

function jwt_verify(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    $expected = _b64u(hash_hmac('sha256', "$h.$p", JWT_SECRET, true));
    if (!hash_equals($expected, $s)) return null;
    $data = json_decode(_b64d($p), true);
    if (!$data || ($data['exp'] ?? 0) < time()) return null;
    return $data;
}

function _b64u(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
function _b64d(string $d): string { return base64_decode(strtr($d, '-_', '+/')); }

// ── Auth helpers ──────────────────────────────────────────────────────────────
function get_jwt_payload(): ?array {
    $h = '';
    if (!empty($_SERVER['HTTP_AUTHORIZATION']))       $h = $_SERVER['HTTP_AUTHORIZATION'];
    elseif (!empty($_SERVER['HTTP_X_AUTHORIZATION'])) $h = $_SERVER['HTTP_X_AUTHORIZATION'];
    elseif (function_exists('apache_request_headers')) {
        $ah = apache_request_headers();
        $h  = $ah['Authorization'] ?? $ah['authorization'] ?? '';
    }
    if (!preg_match('/^Bearer\s+(.+)$/i', $h, $m)) return null;
    return jwt_verify($m[1]);
}

function require_auth(): array {
    $p = get_jwt_payload();
    if (!$p) json_error_coded('Token expired or missing. Please re-authenticate.', 401, 'TOKEN_EXPIRED');
    return $p;
}

function require_superadmin(): array {
    $p = require_auth();
    if (!is_superadmin($p)) {
        json_error_coded('Super Admin access required.', 403, 'FORBIDDEN');
    }
    return $p;
}

function is_superadmin(?array $auth): bool {
    return $auth && in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true);
}

// ── Password helpers ──────────────────────────────────────────────────────────
function hash_password(string $pw): string {
    return password_hash($pw, PASSWORD_BCRYPT);
}

function verify_password(string $pw, string $hash): bool {
    // Support bcrypt, SHA-256 hex (legacy), and plain text (legacy fallback)
    if (strpos($hash, '$2') === 0) {
        return password_verify($pw, $hash);
    }
    if (strlen($hash) === 64 && ctype_xdigit($hash)) {
        return hash('sha256', $pw) === $hash;
    }
    return $pw === $hash;
}

// ── Misc helpers ──────────────────────────────────────────────────────────────
function now_str(): string { return gmdate('Y-m-d H:i:s'); }

function gen_uuid(): string {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
