<?php
/**
 * SHUBH SCHOOL ERP — Database Configuration & Helpers
 *
 * Upload api/index.php + api/config.php to cPanel public_html/api/
 * Fill in your MySQL credentials below, then visit:
 *   https://yourdomain.com/api/?route=migrate/run
 * to create all tables and seed the default admin account.
 */

@error_reporting(0);
@ini_set('display_errors', '0');
@ini_set('log_errors', '1');

// ── Database credentials (fill these in for your cPanel hosting) ──────────────
define('DB_HOST',    getenv('DB_HOST')    ?: 'localhost');
define('DB_PORT',    getenv('DB_PORT')    ?: '3306');
define('DB_NAME',    getenv('DB_NAME')    ?: 'school_erp_db');
define('DB_USER',    getenv('DB_USER')    ?: 'root');
define('DB_PASS',    getenv('DB_PASS')    ?: '');
define('DB_CHARSET', 'utf8mb4');

// ── JWT & App settings ─────────────────────────────────────────────────────────
define('APP_SECRET',  getenv('JWT_SECRET') ?: 'shubh_school_erp_secret_change_me_2025');
define('JWT_SECRET',  APP_SECRET);
define('JWT_EXPIRY',  86400);   // 24 hours
define('JWT_REFRESH', 604800);  // 7 days
define('API_VERSION', '6.0');
define('MAX_FILE_SIZE', 5242880); // 5 MB
define('UPLOAD_DIR',  __DIR__ . '/uploads/');


// ── PDO singleton ─────────────────────────────────────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn  = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
        );
        $opts = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $opts);
        } catch (PDOException $e) {
            jsonResponse(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()], 503);
        }
    }
    return $pdo;
}


// ── CORS headers ───────────────────────────────────────────────────────────────
function sendCorsHeaders(): void {
    if (headers_sent()) return;
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token');
}


// ── JSON response helper ───────────────────────────────────────────────────────
function jsonResponse(array $data, int $code = 200): void {
    sendCorsHeaders();
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonSuccess($data = null, string $message = 'OK', int $code = 200): void {
    jsonResponse(['success' => true, 'data' => $data, 'message' => $message], $code);
}

function jsonError(string $error, int $code = 400, $data = null): void {
    jsonResponse(['success' => false, 'error' => $error, 'data' => $data], $code);
}


// ── JWT helpers ────────────────────────────────────────────────────────────────
function generateToken(array $payload): string {
    $header  = b64u(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $pay     = b64u(json_encode($payload));
    $sig     = b64u(hash_hmac('sha256', "$header.$pay", APP_SECRET, true));
    return "$header.$pay.$sig";
}

function verifyToken(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    $expected = b64u(hash_hmac('sha256', "$h.$p", APP_SECRET, true));
    if (!hash_equals($expected, $s)) return null;
    $data = json_decode(b64d($p), true);
    if (!$data || ($data['exp'] ?? 0) < time()) return null;
    return $data;
}

function b64u(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
function b64d(string $d): string { return base64_decode(strtr($d, '-_', '+/')); }


// ── Auth helpers ───────────────────────────────────────────────────────────────
function getBearerToken(): ?string {
    $h = '';
    if (!empty($_SERVER['HTTP_AUTHORIZATION']))       $h = $_SERVER['HTTP_AUTHORIZATION'];
    elseif (!empty($_SERVER['HTTP_X_AUTHORIZATION'])) $h = $_SERVER['HTTP_X_AUTHORIZATION'];
    elseif (function_exists('apache_request_headers')) {
        $ah = apache_request_headers();
        $h  = $ah['Authorization'] ?? $ah['authorization'] ?? '';
    }
    if (preg_match('/^Bearer\s+(.+)$/i', $h, $m)) return $m[1];
    return null;
}

function getAuthPayload(): ?array {
    $token = getBearerToken();
    if (!$token) return null;
    return verifyToken($token);
}

function requireAuth(): array {
    $p = getAuthPayload();
    if (!$p) jsonError('Token expired or missing. Please re-authenticate.', 401);
    return $p;
}

function isSuperAdmin(?array $auth): bool {
    return $auth && in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true);
}

function requireSuperAdmin(): array {
    $auth = requireAuth();
    if (!isSuperAdmin($auth)) jsonError('Super Admin access required.', 403);
    return $auth;
}


// ── Password helpers ───────────────────────────────────────────────────────────
function hashPassword(string $pw): string {
    return password_hash($pw, PASSWORD_BCRYPT);
}

function verifyPassword(string $pw, string $hash): bool {
    if (str_starts_with($hash, '$2')) return password_verify($pw, $hash);
    if (strlen($hash) === 64 && ctype_xdigit($hash)) return hash('sha256', $pw) === $hash;
    return $pw === $hash;
}


// ── Misc helpers ───────────────────────────────────────────────────────────────
function nowStr(): string  { return gmdate('Y-m-d H:i:s'); }
function genUuid(): string {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function sanitize(string $value): string {
    return strip_tags(trim($value));
}

function sanitizeArray(array $data): array {
    $out = [];
    foreach ($data as $k => $v) {
        if (is_string($v))      $out[$k] = sanitize($v);
        elseif (is_array($v))   $out[$k] = sanitizeArray($v);
        else                    $out[$k] = $v;
    }
    return $out;
}

// Class sort order for Indian schools: Nursery=0, LKG=1, UKG=2, Class 1=3 ... Class 12=14
function classSortOrder(string $name): int {
    $name = strtolower(trim($name));
    if ($name === 'nursery')   return 0;
    if ($name === 'lkg')       return 1;
    if ($name === 'ukg')       return 2;
    if (preg_match('/class\s*(\d+)/', $name, $m)) return 2 + (int)$m[1];
    if (preg_match('/^(\d+)$/', $name, $m))        return 2 + (int)$m[1];
    return 99;
}


// ── Write changelog entry ──────────────────────────────────────────────────────
function writeChangelog(PDO $db, ?array $auth, string $tableName, string $action, ?string $recordId, $oldValues, $newValues): void {
    try {
        $db->prepare("INSERT IGNORE INTO `changelog`
            (`id`,`userId`,`username`,`role`,`module`,`action`,`recordId`,`oldValue`,`newValue`,`createdAt`)
            VALUES (UUID(),:uid,:uname,:role,:module,:action,:rid,:old,:new,:ca)")
           ->execute([
               ':uid'    => $auth['user_id'] ?? 'system',
               ':uname'  => $auth['username'] ?? 'system',
               ':role'   => $auth['role'] ?? 'system',
               ':module' => $tableName,
               ':action' => $action,
               ':rid'    => $recordId,
               ':old'    => $oldValues ? json_encode($oldValues) : null,
               ':new'    => $newValues ? json_encode($newValues) : null,
               ':ca'     => nowStr(),
           ]);
    } catch (Throwable $e) {}
}


// ── Generic filtered columns upsert ──────────────────────────────────────────
function upsertRow(PDO $db, string $table, array $row, ?array $auth = null): string {
    if (empty($row['id'])) $row['id'] = genUuid();

    // Get live columns
    $cols = [];
    try {
        $s = $db->query("DESCRIBE `{$table}`");
        $cols = $s ? $s->fetchAll(PDO::FETCH_COLUMN, 0) : [];
    } catch (Throwable $e) {}

    $filtered = [];
    foreach ($row as $k => $v) {
        if (!preg_match('/^[a-zA-Z0-9_]+$/', (string)$k)) continue;
        if (!empty($cols) && !in_array($k, $cols, true)) continue;
        $filtered[$k] = is_array($v) || is_object($v)
            ? json_encode($v, JSON_UNESCAPED_UNICODE)
            : ($v === 'undefined' || $v === 'null' ? '' : $v);
    }

    if (empty($filtered)) jsonError("No valid fields for table '{$table}'", 400);

    $columns      = array_keys($filtered);
    $values       = array_values($filtered);
    $colList      = implode(',', array_map(fn($c) => "`{$c}`", $columns));
    $placeholders = implode(',', array_fill(0, count($columns), '?'));
    $updateParts  = array_map(fn($c) => "`{$c}` = VALUES(`{$c}`)", $columns);

    $db->prepare("INSERT INTO `{$table}` ({$colList}) VALUES ({$placeholders}) ON DUPLICATE KEY UPDATE " . implode(',', $updateParts))
       ->execute($values);

    if ($auth) writeChangelog($db, $auth, $table, 'upsert', $filtered['id'] ?? null, null, $filtered);
    return $filtered['id'];
}
