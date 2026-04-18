<?php
/**
 * SHUBH SCHOOL ERP — Central API Router
 *
 * Routes incoming requests to the correct handler file.
 * Validates JWT on every protected endpoint.
 *
 * PUBLIC (no JWT):
 *   POST /auth/login
 *   POST /auth/refresh
 *   GET  /sync/status   ← health check, always public
 *   POST /migrate/run   ← initial DB setup (IP-restricted in production)
 *   POST /migrate/seed  ← seed default data
 *   GET  /migrate/status
 */

// Silence notices so they can't corrupt JSON
error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/config.php';

// CORS + preflight already handled in index.php, but set content-type again to be sure
if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
}

// Handle OPTIONS preflight (belt-and-braces in case router is loaded directly)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
    exit;
}

// ── Parse URI ─────────────────────────────────────────────────────────────────
$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$scriptDir  = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/');

// Strip script directory prefix (handles both /api/... and /...)
$path = $requestUri;
if ($scriptDir && strpos($requestUri, $scriptDir) === 0) {
    $path = substr($requestUri, strlen($scriptDir));
}
$path     = '/' . ltrim($path, '/');
$segments = array_values(array_filter(explode('/', $path)));

// Drop leading 'api' segment if present (when served as /api/...)
if (isset($segments[0]) && $segments[0] === 'api') {
    array_shift($segments);
}
// Drop 'index.php' if present
if (isset($segments[0]) && $segments[0] === 'index.php') {
    array_shift($segments);
}

$resource = $segments[0] ?? '';
$sub      = $segments[1] ?? '';

$method = $_SERVER['REQUEST_METHOD'];

// Read body — handle both JSON and form-data
$rawBody = file_get_contents('php://input');
$body    = [];
if ($rawBody) {
    $decoded = json_decode($rawBody, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        $body = $decoded ?? [];
    }
}

// ── Public endpoints (no JWT required) ───────────────────────────────────────
// sync/status is always public — it's polled by the frontend as a health check
// migrate endpoints are public to allow initial database setup
$publicRoutes = [
    'auth'    => ['login', 'refresh'],
    'sync'    => ['status'],          // ← health check must be public
    'migrate' => ['run', 'seed', 'status', 'reset-superadmin', ''],  // ← setup/recovery endpoints
];

$isPublic = false;
if (isset($publicRoutes[$resource])) {
    if (in_array($sub, $publicRoutes[$resource], true)) {
        $isPublic = true;
    }
    // Also allow empty sub for migrate (GET /migrate)
    if ($resource === 'sync' && ($sub === '' || $sub === 'status')) {
        $isPublic = true;
    }
}

// ── JWT validation ────────────────────────────────────────────────────────────
$auth = null;
if (!$isPublic) {
    $authHeader = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['HTTP_X_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_X_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $apacheHeaders = apache_request_headers();
        $authHeader = $apacheHeaders['Authorization'] ?? $apacheHeaders['authorization'] ?? '';
    }

    if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        json_error('Missing or invalid Authorization header. Please login first.', 401);
    }
    $auth = jwt_verify($m[1]);
    if (!$auth) {
        json_error('Token expired or invalid. Please login again.', 401);
    }
}

// ── School ID — default to 1 if not provided ─────────────────────────────────
// X-School-ID is optional; defaults to 1 for single-school deployments
$schoolId = 1;
if (isset($_SERVER['HTTP_X_SCHOOL_ID']) && (int)$_SERVER['HTTP_X_SCHOOL_ID'] > 0) {
    $schoolId = (int)$_SERVER['HTTP_X_SCHOOL_ID'];
} elseif ($auth && isset($auth['school_id']) && (int)$auth['school_id'] > 0) {
    $schoolId = (int)$auth['school_id'];
}

if ($auth) {
    $auth['school_id'] = $schoolId;
}

// ── Dispatch ──────────────────────────────────────────────────────────────────
$handlers = [
    'auth'       => 'auth.php',
    'students'   => 'students.php',
    'fees'       => 'fees.php',
    'attendance' => 'attendance.php',
    'hr'         => 'hr.php',
    'academics'  => 'academics.php',
    'transport'  => 'transport.php',
    'inventory'  => 'inventory.php',
    'settings'   => 'settings.php',
    'backup'     => 'backup.php',
    'sync'       => 'sync.php',
    'migrate'    => 'migrate.php',
    'data'       => 'data.php',   // generic CRUD for collections
    'chat'       => 'chat.php',   // chat messaging (DMs + group chat)
];

if ($resource === '' || $resource === 'health') {
    // Root or health ping — always return 200 JSON
    json_success([
        'status'     => 'ok',
        'version'    => APP_VERSION,
        'server'     => 'SHUBH SCHOOL ERP API',
        'time'       => gmdate('c'),
    ], 'API is running');
}

if (!isset($handlers[$resource])) {
    json_error("Unknown endpoint: /$resource", 404);
}

$handlerFile = __DIR__ . '/' . $handlers[$resource];
if (!file_exists($handlerFile)) {
    json_error("Handler not found for: $resource", 500);
}

// Make routing context available to handlers
$GLOBALS['route'] = [
    'resource' => $resource,
    'sub'      => $sub,
    'id'       => $segments[2] ?? $sub,
    'segments' => $segments,
    'method'   => $method,
    'body'     => $body,
    'auth'     => $auth,
    'schoolId' => $schoolId,
    'userId'   => $auth['user_id'] ?? 0,
    'role'     => $auth['role']    ?? '',
];

require $handlerFile;

// ── JWT helpers ───────────────────────────────────────────────────────────────

function jwt_encode(array $payload): string {
    $header  = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64url_encode(json_encode($payload));
    $sig     = base64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$sig";
}

function jwt_verify(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $payload, $sig] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if (!hash_equals($expected, $sig)) return null;
    $data = json_decode(base64url_decode($payload), true);
    if (!$data || ($data['exp'] ?? 0) < time()) return null;
    return $data;
}

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}
