<?php
/**
 * SHUBH SCHOOL ERP — Database Configuration & Helpers
 *
 * NO .htaccess dependency. Works on any cPanel server regardless of mod_rewrite.
 * Upload api/index.php + api/config.php to cPanel public_html/api/ — that's it.
 *
 * DB credentials for psmkgsco hosting account:
 *   Database : psmkgsco_shubherp_db
 *   User     : psmkgsco_shubherp_user
 *
 * Override at runtime via environment variables:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS, JWT_SECRET
 */

// Silence all PHP notices/warnings — they corrupt JSON output
@error_reporting(0);
@ini_set('display_errors', '0');
@ini_set('log_errors', '1');

define('DB_HOST',     getenv('DB_HOST')     ?: 'localhost');
define('DB_PORT',     getenv('DB_PORT')     ?: '3306');
define('DB_NAME',     getenv('DB_NAME')     ?: 'psmkgsco_shubherp_db');
define('DB_USER',     getenv('DB_USER')     ?: 'psmkgsco_shubherp_user');
define('DB_PASS',     getenv('DB_PASS')     ?: 'Shubh@420');
define('DB_CHARSET',  'utf8mb4');
define('JWT_SECRET',  getenv('JWT_SECRET')  ?: 'shubh_erp_jwt_secret_2024_psmkgs');
define('JWT_EXPIRY',  86400);     // 24 hours
define('JWT_REFRESH', 604800);    // 7 days
define('API_VERSION', '2.0');

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

// ── Response helpers ──────────────────────────────────────────────────────────
function json_success($data = null, string $message = 'OK', int $code = 200): void {
    if (!headers_sent()) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token, X-School-ID');
    }
    echo json_encode(['status' => 'ok', 'message' => $message, 'data' => $data]);
    exit;
}

function json_error(string $message, int $code = 400, $data = null): void {
    if (!headers_sent()) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token, X-School-ID');
    }
    echo json_encode(['status' => 'error', 'message' => $message, 'data' => $data]);
    exit;
}

// ── JWT ───────────────────────────────────────────────────────────────────────
function jwt_encode(array $payload): string {
    $header  = _b64u(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $pay     = _b64u(json_encode($payload));
    $sig     = _b64u(hash_hmac('sha256', "$header.$pay", JWT_SECRET, true));
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
    if (!empty($_SERVER['HTTP_AUTHORIZATION']))   $h = $_SERVER['HTTP_AUTHORIZATION'];
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
    if (!$p) json_error('Missing or expired token. Please login.', 401);
    return $p;
}

function require_superadmin(): array {
    $p = require_auth();
    if (!in_array($p['role'] ?? '', ['superadmin', 'super_admin'], true)) {
        json_error('Super Admin only', 403);
    }
    return $p;
}

// ── Misc helpers ──────────────────────────────────────────────────────────────
function now_str(): string { return gmdate('Y-m-d H:i:s'); }

function school_id_from_auth(?array $auth): int {
    if ($auth && !empty($auth['school_id'])) return (int)$auth['school_id'];
    if (!empty($_SERVER['HTTP_X_SCHOOL_ID']))  return (int)$_SERVER['HTTP_X_SCHOOL_ID'];
    return 1;
}
