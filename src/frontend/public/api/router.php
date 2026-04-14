<?php
/**
 * SHUBH SCHOOL ERP — Central API Router
 *
 * Routes incoming requests to the correct handler file.
 * Validates JWT on every protected endpoint.
 * Injects $auth (decoded token payload) into the handler scope.
 *
 * URL pattern:  /api/<resource>[/<sub>][/<id>]
 * Examples:
 *   GET  /api/students           → students.php  action=list
 *   POST /api/auth/login         → auth.php      action=login  (public)
 *   GET  /api/fees/plan          → fees.php      action=plan
 */

require_once __DIR__ . '/config.php';

// ── CORS pre-flight (already handled by .htaccess but belt+braces) ───────────
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json');

// ── Parse URI ─────────────────────────────────────────────────────────────────
$requestUri  = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$scriptDir   = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/');
$path        = '/' . ltrim(substr($requestUri, strlen($scriptDir)), '/');
$segments    = array_values(array_filter(explode('/', $path)));
// segments[0] = 'api', segments[1] = resource, segments[2+] = sub/id
array_shift($segments); // drop 'api' prefix if present

$resource = $segments[0] ?? '';
$sub      = $segments[1] ?? '';
$id       = $segments[2] ?? $sub; // convenience alias

$method = $_SERVER['REQUEST_METHOD'];
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

// ── Public endpoints (no JWT required) ───────────────────────────────────────
$publicRoutes = [
    'auth' => ['login', 'refresh'],
];

$isPublic = isset($publicRoutes[$resource]) && in_array($sub, $publicRoutes[$resource], true);

// ── JWT validation ────────────────────────────────────────────────────────────
$auth = null;
if (!$isPublic) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['HTTP_X_AUTHORIZATION'] ?? '');
    if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        json_error('Missing or invalid Authorization header', 401);
    }
    $auth = jwt_verify($m[1]);
    if (!$auth) {
        json_error('Token expired or invalid', 401);
    }

    // Multi-school: require X-School-ID header
    $schoolId = (int)($_SERVER['HTTP_X_SCHOOL_ID'] ?? 0);
    if ($schoolId <= 0) {
        json_error('Missing X-School-ID header', 400);
    }
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
];

if (!isset($handlers[$resource])) {
    json_error("Unknown resource: $resource", 404);
}

$handlerFile = __DIR__ . '/' . $handlers[$resource];
if (!file_exists($handlerFile)) {
    json_error("Handler not found", 500);
}

// Make routing context available to handlers
$GLOBALS['route'] = [
    'resource' => $resource,
    'sub'      => $sub,
    'id'       => $id,
    'segments' => $segments,
    'method'   => $method,
    'body'     => $body,
    'auth'     => $auth,
    'schoolId' => $auth['school_id'] ?? 0,
    'userId'   => $auth['user_id']   ?? 0,
    'role'     => $auth['role']      ?? '',
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
