<?php
/**
 * SHUBH SCHOOL ERP — Complete PHP API Backend
 * Version 2.0 — NO .htaccess / mod_rewrite needed at all.
 *
 * Usage: https://shubh.psmkgs.com/api/index.php?route=ROUTE_NAME
 * All routes work via query-string routing only.
 *
 * Upload ONLY these 2 files to cPanel public_html/api/:
 *   index.php   ← this file (all handlers inline)
 *   config.php  ← DB connection + helpers
 *
 * Quick-start:
 *   1. Upload both files to public_html/api/
 *   2. Visit https://shubh.psmkgs.com/api/index.php?route=migrate/run
 *   3. Visit https://shubh.psmkgs.com/api/index.php?route=health  → {"status":"ok"}
 *   4. Login via POST ?route=auth/login with {"username":"superadmin","password":"admin123"}
 */

// ── 1. Silence PHP output — JSON must NEVER be corrupted by notices/warnings ──
@ini_set('display_errors', '0');
@ini_set('log_errors',     '1');
@error_reporting(0);

// ── 2. CORS + JSON headers — MUST be on EVERY response ───────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token, X-School-ID');

// ── 3. Handle OPTIONS preflight — return immediately ─────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
    exit;
}

// ── 4. Load helpers ───────────────────────────────────────────────────────────
require_once __DIR__ . '/config.php';

// ── 5. Parse route + request context ─────────────────────────────────────────
$route  = trim($_GET['route'] ?? '', '/');
$method = $_SERVER['REQUEST_METHOD'];
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$auth   = get_jwt_payload();
$sid    = school_id_from_auth($auth);   // school_id (defaults to 1)

// ── 6. Route dispatcher ───────────────────────────────────────────────────────
try {

    // --- health / root -------------------------------------------------------
    if ($route === '' || $route === 'health') {
        json_success([
            'status'      => 'ok',
            'version'     => API_VERSION,
            'server'      => 'SHUBH SCHOOL ERP API',
            'server_time' => gmdate('c'),
            'routing'     => 'query-string (no .htaccess needed)',
        ], 'API is running');
    }

    // --- sync/status — ALWAYS returns JSON, NEVER crashes --------------------
    if ($route === 'sync/status') {
        handle_sync_status($sid);
    }

    // --- auth -----------------------------------------------------------------
    if ($route === 'auth/login')           { handle_auth_login($method, $body); }
    if ($route === 'auth/refresh')         { handle_auth_refresh($method, $body); }
    if ($route === 'auth/change-password') { handle_change_password($method, $body, $auth); }

    // --- migrate (all public — needed for initial setup) ---------------------
    if ($route === 'migrate/run')              { handle_migrate_run($method, $sid); }
    if ($route === 'migrate/seed')             { handle_migrate_seed($method, $sid, $body); }
    if ($route === 'migrate/reset-superadmin') { handle_migrate_reset_superadmin($method, $sid); }
    if ($route === 'migrate/status')           { handle_migrate_status($method); }

    // --- sync/push and sync/batch --------------------------------------------
    if ($route === 'sync/push')  { handle_sync_push($method, $body, $auth, $sid); }
    if ($route === 'sync/batch') { handle_sync_batch($method, $body, $auth, $sid); }
    if ($route === 'sync/pull')  { handle_sync_pull($method, $auth, $sid); }

    // --- backup --------------------------------------------------------------
    if ($route === 'backup/export')        { handle_backup_export($method, $auth, $sid); }
    if ($route === 'backup/import')        { handle_backup_import($method, $body, $auth, $sid); }
    if ($route === 'backup/history')       { handle_backup_history($method, $auth, $sid); }
    if ($route === 'backup/factory-reset') { handle_factory_reset($method, $body, $auth, $sid); }

    // --- settings ------------------------------------------------------------
    if ($route === 'settings/school') { handle_settings_school($method, $body, $auth, $sid); }
    if ($route === 'settings/users')  { handle_settings_users($method, $body, $auth, $sid); }

    // --- data/{collection} — generic CRUD -----------------------------------
    if (preg_match('#^data/([a-z_]+)$#', $route, $m)) {
        handle_data_collection($method, $m[1], $body, $auth, $sid, null);
    }
    if (preg_match('#^data/([a-z_]+)/(.+)$#', $route, $m)) {
        handle_data_collection($method, $m[1], $body, $auth, $sid, $m[2]);
    }

    // --- 404 -----------------------------------------------------------------
    json_error('Route not found: ' . $route, 404);

} catch (PDOException $e) {
    json_error('Database error: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    json_error('Server error: ' . $e->getMessage(), 500);
}


// =============================================================================
// HANDLER FUNCTIONS
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// SYNC / STATUS — health check, always returns JSON, never crashes
// ─────────────────────────────────────────────────────────────────────────────
function handle_sync_status(int $sid): void {
    $counts    = [];
    $connected = false;
    $dbVersion = null;

    $tables = [
        'students', 'staff', 'fee_receipts', 'fees_plan', 'fee_heads',
        'attendance', 'routes', 'pickup_points', 'student_transport',
        'student_discounts', 'classes', 'sections', 'subjects',
        'homework', 'expenses', 'expense_heads', 'inventory_items',
        'payroll_setup', 'payslips', 'chat_messages', 'biometric_devices',
        'alumni', 'sessions', 'schools', 'users',
    ];

    try {
        $db        = getDB();
        $connected = true;

        $verStmt   = $db->query('SELECT VERSION()');
        $dbVersion = $verStmt ? $verStmt->fetchColumn() : null;

        foreach ($tables as $t) {
            try {
                $s = $db->prepare("SELECT COUNT(*) FROM `{$t}` WHERE is_deleted=0");
                $s->execute();
                $counts[$t] = (int)$s->fetchColumn();
            } catch (Throwable $e) {
                $counts[$t] = -1; // table not created yet
            }
        }
    } catch (Throwable $e) {
        $connected = false;
    }

    // ALWAYS return 200 JSON — never error here
    http_response_code(200);
    echo json_encode([
        'status'      => 'ok',
        'version'     => API_VERSION,
        'db_version'  => $dbVersion,
        'server_time' => gmdate('c'),
        'timestamp'   => gmdate('c'),
        'connected'   => $connected,
        'synced'      => $connected,
        'counts'      => $counts,
    ]);
    exit;
}


// ─────────────────────────────────────────────────────────────────────────────
// AUTH — login, refresh, change-password
// ─────────────────────────────────────────────────────────────────────────────
function handle_auth_login(string $method, array $body): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);

    $username = trim($body['username'] ?? '');
    $password = trim($body['password'] ?? '');
    if (!$username || !$password) json_error('username and password are required', 400);

    try {
        $db = getDB();
    } catch (Throwable $e) {
        json_error('Database connection failed. Run ?route=migrate/run first.', 503);
    }

    $stmt = $db->prepare(
        'SELECT u.*, s.name AS school_name
         FROM users u
         LEFT JOIN schools s ON s.id = u.school_id
         WHERE u.username = :un AND u.is_deleted = 0
         LIMIT 1'
    );
    $stmt->execute([':un' => $username]);
    $user = $stmt->fetch();

    if (!$user) {
        json_error('User not found. Run ?route=migrate/run then ?route=migrate/seed to create the superadmin.', 401);
    }

    $hash = $user['password_hash'] ?? '';
    if (empty($hash)) json_error('Account has no password set. Run ?route=migrate/reset-superadmin to fix.', 401);

    $ok = false;
    if (strpos($hash, '$2') === 0) {
        $ok = password_verify($password, $hash);
    } else {
        // Legacy plaintext — compare then upgrade
        $ok = ($password === $hash);
        if ($ok) {
            $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
            $db->prepare('UPDATE users SET password_hash=:h, updated_at=NOW() WHERE id=:id')
               ->execute([':h' => $newHash, ':id' => $user['id']]);
        }
    }

    if (!$ok) json_error('Invalid username or password', 401);
    if ((int)($user['is_active'] ?? 1) === 0) json_error('Account disabled — contact Super Admin', 403);

    $now = time();
    $payload = [
        'user_id'   => $user['id'],
        'school_id' => $user['school_id'],
        'role'      => $user['role'],
        'name'      => $user['full_name'],
        'iat'       => $now,
        'exp'       => $now + JWT_EXPIRY,
    ];
    $token        = jwt_encode($payload);
    $refreshPay   = array_merge($payload, ['exp' => $now + JWT_REFRESH, 'type' => 'refresh']);
    $refreshToken = jwt_encode($refreshPay);

    $db->prepare('UPDATE users SET refresh_token=:rt, last_login=NOW() WHERE id=:id')
       ->execute([':rt' => hash('sha256', $refreshToken), ':id' => $user['id']]);

    json_success([
        'token'         => $token,
        'refresh_token' => $refreshToken,
        'expires_in'    => JWT_EXPIRY,
        'user' => [
            'id'          => $user['id'],
            'username'    => $user['username'],
            'full_name'   => $user['full_name'],
            'role'        => $user['role'],
            'school_id'   => $user['school_id'],
            'school_name' => $user['school_name'] ?? '',
        ],
    ], 'Login successful');
}

function handle_auth_refresh(string $method, array $body): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    $rt = $body['refresh_token'] ?? '';
    if (!$rt) json_error('refresh_token is required', 400);

    $payload = jwt_verify($rt);
    if (!$payload || ($payload['type'] ?? '') !== 'refresh') json_error('Invalid or expired refresh token', 401);

    $db   = getDB();
    $stmt = $db->prepare('SELECT id, role, school_id, full_name, is_active FROM users WHERE id=:id AND refresh_token=:rt AND is_deleted=0 LIMIT 1');
    $stmt->execute([':id' => $payload['user_id'], ':rt' => hash('sha256', $rt)]);
    $user = $stmt->fetch();

    if (!$user || !(int)$user['is_active']) json_error('Token revoked', 401);

    $now   = time();
    $np    = ['user_id' => $user['id'], 'school_id' => $user['school_id'], 'role' => $user['role'], 'name' => $user['full_name'], 'iat' => $now, 'exp' => $now + JWT_EXPIRY];
    json_success(['token' => jwt_encode($np), 'expires_in' => JWT_EXPIRY], 'Token refreshed');
}

function handle_change_password(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $currentUserId = (int)($auth['user_id'] ?? 0);
    $targetId      = (int)($body['user_id'] ?? $currentUserId);
    $newPassword   = $body['new_password'] ?? '';
    $oldPassword   = $body['old_password'] ?? '';

    if (strlen($newPassword) < 6) json_error('New password must be at least 6 characters', 400);

    $db   = getDB();
    $stmt = $db->prepare('SELECT id, password_hash FROM users WHERE id=:id AND is_deleted=0 LIMIT 1');
    $stmt->execute([':id' => $targetId]);
    $user = $stmt->fetch();
    if (!$user) json_error('User not found', 404);

    $isSuperAdmin = in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true);
    $isSelf       = ($currentUserId === $targetId);

    if (!$isSuperAdmin) {
        if (!$isSelf) json_error('Forbidden', 403);
        if (!password_verify($oldPassword, $user['password_hash'])) json_error('Current password is incorrect', 401);
    }

    $hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 10]);
    $db->prepare('UPDATE users SET password_hash=:h, updated_at=NOW() WHERE id=:id')->execute([':h' => $hash, ':id' => $targetId]);
    json_success(null, 'Password changed successfully');
}


// ─────────────────────────────────────────────────────────────────────────────
// MIGRATE — create tables, seed, reset password
// ─────────────────────────────────────────────────────────────────────────────
function handle_migrate_run(string $method, int $sid): void {
    if (!in_array($method, ['GET', 'POST'], true)) json_error('Method not allowed', 405);

    try {
        $db = getDB();
    } catch (Throwable $e) {
        json_error('Database connection failed: ' . $e->getMessage() . '. Check DB credentials in config.php.', 503);
    }

    $applied = [];
    $errors  = [];

    foreach (get_migrations() as $mig) {
        try {
            // Each migration may contain multiple CREATE TABLE statements — execute them all
            foreach (array_filter(array_map('trim', explode(";\n", $mig['sql']))) as $stmt) {
                if ($stmt !== '') $db->exec($stmt . ';');
            }
            $applied[] = $mig['name'];
        } catch (Throwable $e) {
            $errors[] = ['migration' => $mig['name'], 'error' => $e->getMessage()];
        }
    }

    // Seed superadmin after table creation
    $seedResult = seed_superadmin($db, $sid);

    json_success([
        'applied'  => $applied,
        'errors'   => $errors,
        'seeded'   => $seedResult,
        'message'  => count($applied) . ' migration(s) applied. Login: superadmin / admin123',
    ], 'Database setup complete. Login with superadmin / admin123');
}

function handle_migrate_seed(string $method, int $sid, array $body): void {
    if (!in_array($method, ['GET', 'POST'], true)) json_error('Method not allowed', 405);

    try {
        $db = getDB();
    } catch (Throwable $e) {
        json_error('Run ?route=migrate/run first to create tables.', 503);
    }

    $seeded = [];

    // Ensure school record exists
    try {
        $db->prepare('INSERT IGNORE INTO schools (id, name) VALUES (:id, :name)')
           ->execute([':id' => $sid, ':name' => $body['school_name'] ?? 'SHUBH SCHOOL ERP']);
        $seeded[] = 'school';
    } catch (Throwable $e) { /* ignore */ }

    // Seed superadmin
    $seeded[] = seed_superadmin($db, $sid, $body['username'] ?? 'superadmin', $body['password'] ?? 'admin123');

    // Seed default session if none
    try {
        $chk = $db->prepare('SELECT id FROM sessions WHERE school_id=:sid AND is_current=1 LIMIT 1');
        $chk->execute([':sid' => $sid]);
        if (!$chk->fetch()) {
            $db->prepare('INSERT INTO sessions (school_id,name,start_date,end_date,is_current,is_archived,is_deleted) VALUES (:sid,:name,:start,:end,1,0,0)')
               ->execute([':sid' => $sid, ':name' => date('Y').'-'.(date('y')+1), ':start' => date('Y').'-04-01', ':end' => (date('Y')+1).'-03-31']);
            $seeded[] = 'default session';
        }
    } catch (Throwable $e) { /* ignore */ }

    json_success(['seeded' => $seeded], 'Seed complete. Login: superadmin / admin123');
}

function handle_migrate_reset_superadmin(string $method, int $sid): void {
    if (!in_array($method, ['GET', 'POST'], true)) json_error('Method not allowed', 405);

    try {
        $db = getDB();
    } catch (Throwable $e) {
        json_error('Run ?route=migrate/run first.', 503);
    }

    $result = seed_superadmin($db, $sid, 'superadmin', 'admin123', true);
    json_success(['action' => $result, 'username' => 'superadmin', 'password' => 'admin123'],
                 'Superadmin password reset to admin123. You can now login.');
}

function handle_migrate_status(string $method): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);

    try {
        $db = getDB();
    } catch (Throwable $e) {
        json_error('Database connection failed', 503);
    }

    $tableList = array_column(get_migrations(), 'name');
    $existing  = [];
    foreach ($tableList as $name) {
        $existing[$name] = true; // migrations are idempotent (IF NOT EXISTS), so just report all as "available"
    }
    json_success(['migrations' => $tableList, 'note' => 'All migrations use CREATE TABLE IF NOT EXISTS'], 'OK');
}

/**
 * Seed or force-reset the superadmin user.
 * Returns a human-readable description of what was done.
 */
function seed_superadmin(PDO $db, int $sid, string $username = 'superadmin', string $password = 'admin123', bool $force = false): string {
    // Ensure tables exist minimally
    try {
        $db->exec('CREATE TABLE IF NOT EXISTS schools (
            id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name        VARCHAR(200) NOT NULL,
            address     TEXT,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

        $db->exec('CREATE TABLE IF NOT EXISTS users (
            id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            school_id     INT UNSIGNED NOT NULL DEFAULT 1,
            username      VARCHAR(100) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name     VARCHAR(200),
            role          VARCHAR(50) NOT NULL DEFAULT \'teacher\',
            is_active     TINYINT(1) DEFAULT 1,
            refresh_token VARCHAR(500),
            last_login    TIMESTAMP NULL,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            is_deleted    TINYINT(1) DEFAULT 0,
            UNIQUE KEY uq_school_username (school_id, username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    } catch (Throwable $e) { /* tables already exist */ }

    try {
        $db->prepare('INSERT IGNORE INTO schools (id, name) VALUES (:id, :name)')
           ->execute([':id' => $sid, ':name' => 'SHUBH SCHOOL ERP']);
    } catch (Throwable $e) { /* ignore */ }

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);

    $stmt = $db->prepare('SELECT id, password_hash FROM users WHERE username=:u AND school_id=:sid AND is_deleted=0 LIMIT 1');
    $stmt->execute([':u' => $username, ':sid' => $sid]);
    $existing = $stmt->fetch();

    if (!$existing) {
        $db->prepare('INSERT INTO users (school_id,username,password_hash,full_name,role,is_active,created_at,updated_at) VALUES (:sid,:u,:h,"Super Admin","superadmin",1,NOW(),NOW())')
           ->execute([':sid' => $sid, ':u' => $username, ':h' => $hash]);
        return 'superadmin created';
    }

    $existingHash = $existing['password_hash'] ?? '';
    $needsUpdate  = $force || empty($existingHash) || strpos($existingHash, '$2') !== 0;
    if ($needsUpdate) {
        $db->prepare('UPDATE users SET password_hash=:h, is_active=1, is_deleted=0, role="superadmin", full_name="Super Admin", updated_at=NOW() WHERE id=:id')
           ->execute([':h' => $hash, ':id' => $existing['id']]);
        return 'superadmin updated (hash refreshed)';
    }

    return 'superadmin already exists';
}


// ─────────────────────────────────────────────────────────────────────────────
// SYNC / PUSH — bulk upsert all collections in one request
// Frontend DataManagement.tsx reads: response.data.results[collection].pushed
//
// Accepts two body formats:
//   Format A (multi-collection): { students: [...], staff: [...], ... }
//   Format B (single-collection, from batchPushCollection): { collection: "students", items: [...] }
// ─────────────────────────────────────────────────────────────────────────────
function handle_sync_push(string $method, array $body, ?array $auth, int $sid): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);
    if (!in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true)) json_error('Super Admin only', 403);

    // Format B: { collection: "students", items: [...] } — single collection
    // Redirect to the batch handler which returns { pushed, total, errors }
    if (isset($body['collection']) && isset($body['items'])) {
        handle_sync_batch($method, $body, $auth, $sid);
        return; // handle_sync_batch calls json_success/json_error which exit
    }

    $db = getDB();

    // Map frontend collection names → actual MySQL table names
    $tableMap = [
        'students'           => 'students',
        'staff'              => 'staff',
        'sessions'           => 'sessions',
        'classes'            => 'classes',
        'sections'           => 'sections',
        'subjects'           => 'subjects',
        'routes'             => 'routes',
        'pickup_points'      => 'pickup_points',
        'fee_heads'          => 'fee_heads',
        'fee_headings'       => 'fee_heads',
        'fees_plan'          => 'fees_plan',
        'fee_plans'          => 'fees_plan',
        'fee_receipts'       => 'fee_receipts',
        'attendance'         => 'attendance',
        'inventory_items'    => 'inventory_items',
        'expenses'           => 'expenses',
        'expense_heads'      => 'expense_heads',
        'homework'           => 'homework',
        'alumni'             => 'alumni',
        'notifications'      => 'notifications',
        'payroll_setup'      => 'payroll_setup',
        'payslips'           => 'payslips',
        'biometric_devices'  => 'biometric_devices',
        'student_transport'  => 'student_transport',
        'student_discounts'  => 'student_discounts',
    ];

    $results = [];

    // Pre-initialize all keys to {pushed:0, errors:[]} so response is always complete
    foreach ($tableMap as $key => $table) {
        if (!isset($results[$table])) {
            $results[$table] = ['pushed' => 0, 'errors' => []];
        }
    }

    try {
        $db->beginTransaction();

        foreach ($tableMap as $key => $table) {
            $records = $body[$key] ?? [];
            if (empty($records) || !is_array($records)) continue;

            foreach ($records as $idx => $row) {
                if (!is_array($row)) {
                    $results[$table]['errors'][] = "Row $idx is not an object";
                    continue;
                }

                $row['school_id']  = $sid;
                $row['is_deleted'] = isset($row['is_deleted']) ? (int)$row['is_deleted'] : 0;
                if (empty($row['created_at'])) $row['created_at'] = now_str();
                if (empty($row['updated_at'])) $row['updated_at'] = now_str();

                // Keep only scalar/null and safe column names
                $row      = array_filter($row, fn($v) => is_scalar($v) || is_null($v));
                $cols     = array_keys($row);
                $safeCols = array_values(array_filter($cols, fn($c) => (bool)preg_match('/^[a-zA-Z0-9_]+$/', $c)));

                if (empty($safeCols)) continue;

                $colList    = implode(',', array_map(fn($c) => "`{$c}`", $safeCols));
                $valList    = implode(',', array_map(fn($c) => ":{$c}", $safeCols));
                $updateList = implode(',', array_map(
                    fn($c) => "`{$c}`=:{$c}",
                    array_filter($safeCols, fn($c) => $c !== 'id')
                ));
                $params = [];
                foreach ($safeCols as $c) $params[":{$c}"] = $row[$c];

                try {
                    $sql = "INSERT INTO `{$table}` ({$colList}) VALUES ({$valList})";
                    if ($updateList) $sql .= " ON DUPLICATE KEY UPDATE {$updateList}";
                    $db->prepare($sql)->execute($params);
                    $results[$table]['pushed']++;
                } catch (Throwable $e) {
                    // Check if table exists — if not, set a clearer error
                    if (strpos($e->getMessage(), "doesn't exist") !== false || strpos($e->getMessage(), "Table") !== false) {
                        $results[$table]['errors'][] = "Table '{$table}' not found — run ?route=migrate/run first";
                    } else {
                        $results[$table]['errors'][] = "Row {$idx}: " . $e->getMessage();
                    }
                }
            }
        }

        $db->commit();
    } catch (Throwable $e) {
        try { $db->rollBack(); } catch (Throwable $re) { /* ignore */ }
        json_error('Sync push failed: ' . $e->getMessage(), 500);
    }

    json_success(['results' => $results], 'Push complete');
}


// ─────────────────────────────────────────────────────────────────────────────
// SYNC / BATCH — upsert a single named collection
// Returns { pushed: N, total: N, errors: [], collection: string, table: string }
// ─────────────────────────────────────────────────────────────────────────────
function handle_sync_batch(string $method, array $body, ?array $auth, int $sid): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);
    if (!in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true)) json_error('Super Admin only', 403);

    $collection = trim($body['collection'] ?? '');
    $items      = $body['items'] ?? [];
    if ($collection === '') json_error('collection is required', 400);
    if (!is_array($items))  json_error('items must be an array', 400);

    $tableMap = [
        'students'             => 'students',
        'staff'                => 'staff',
        'sessions'             => 'sessions',
        'academic_sessions'    => 'sessions',
        'classes'              => 'classes',
        'sections'             => 'sections',
        'subjects'             => 'subjects',
        'routes'               => 'routes',
        'pickup_points'        => 'pickup_points',
        'fee_heads'            => 'fee_heads',
        'fee_headings'         => 'fee_heads',
        'fees_plan'            => 'fees_plan',
        'fee_plans'            => 'fees_plan',
        'fee_receipts'         => 'fee_receipts',
        'attendance'           => 'attendance',
        'attendance_records'   => 'attendance',
        'inventory_items'      => 'inventory_items',
        'expenses'             => 'expenses',
        'expense_heads'        => 'expense_heads',
        'homework'             => 'homework',
        'alumni'               => 'alumni',
        'notifications'        => 'notifications',
        'payroll_setup'        => 'payroll_setup',
        'payslips'             => 'payslips',
        'biometric_devices'    => 'biometric_devices',
        'student_transport'    => 'student_transport',
        'student_discounts'    => 'student_discounts',
        'users'                => 'users',
        'school_config'        => 'schools',
    ];

    if (!isset($tableMap[$collection])) json_error("Unknown collection: {$collection}", 400);

    $table  = $tableMap[$collection];
    $db     = getDB();
    $pushed = 0;
    $errors = [];

    foreach ($items as $idx => $row) {
        if (!is_array($row)) { $errors[] = "Item {$idx} is not an object"; continue; }

        $row['school_id']  = $sid;
        $row['is_deleted'] = isset($row['is_deleted']) ? (int)$row['is_deleted'] : 0;
        if (empty($row['created_at'])) $row['created_at'] = now_str();
        if (empty($row['updated_at'])) $row['updated_at'] = now_str();

        $row      = array_filter($row, fn($v) => is_scalar($v) || is_null($v));
        $cols     = array_keys($row);
        $safeCols = array_values(array_filter($cols, fn($c) => (bool)preg_match('/^[a-zA-Z0-9_]+$/', $c)));
        if (empty($safeCols)) { $errors[] = "Item {$idx} has no valid columns"; continue; }

        $colList    = implode(',', array_map(fn($c) => "`{$c}`", $safeCols));
        $valList    = implode(',', array_map(fn($c) => ":{$c}", $safeCols));
        $updateList = implode(',', array_map(fn($c) => "`{$c}`=:{$c}", array_filter($safeCols, fn($c) => $c !== 'id')));
        $params     = [];
        foreach ($safeCols as $c) $params[":{$c}"] = $row[$c];

        try {
            $sql = "INSERT INTO `{$table}` ({$colList}) VALUES ({$valList})";
            if ($updateList) $sql .= " ON DUPLICATE KEY UPDATE {$updateList}";
            $db->prepare($sql)->execute($params);
            $pushed++;
        } catch (Throwable $e) {
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                $errors[] = "Table '{$table}' not found — run ?route=migrate/run first";
            } else {
                $errors[] = "Row {$idx}: " . $e->getMessage();
            }
        }
    }

    json_success([
        'pushed'     => $pushed,
        'total'      => count($items),
        'errors'     => $errors,
        'collection' => $collection,
        'table'      => $table,
    ], "{$pushed} of " . count($items) . " records saved");
}


// ─────────────────────────────────────────────────────────────────────────────
// SYNC / PULL — pull all changed records since a timestamp
// ─────────────────────────────────────────────────────────────────────────────
function handle_sync_pull(string $method, ?array $auth, int $sid): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $db    = getDB();
    $since = $_GET['since'] ?? null;
    $tables = [
        'sessions', 'classes', 'sections', 'subjects',
        'students', 'staff',
        'routes', 'pickup_points', 'student_transport',
        'fee_heads', 'fees_plan', 'fee_receipts',
        'attendance', 'inventory_items',
        'expense_heads', 'expenses', 'homework', 'alumni',
    ];

    $pull = [];
    foreach ($tables as $table) {
        $where  = ['school_id=:sid'];
        $params = [':sid' => $sid];
        if ($since) {
            $where[]          = 'updated_at > :since';
            $params[':since'] = $since;
        }
        $wc = implode(' AND ', $where);
        try {
            $stmt = $db->prepare("SELECT * FROM `{$table}` WHERE {$wc} ORDER BY updated_at ASC LIMIT 500");
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            if (!empty($rows)) $pull[$table] = $rows;
        } catch (Throwable $e) { /* skip missing tables */ }
    }

    json_success(['pulled_at' => gmdate('c'), 'since' => $since, 'tables' => $pull]);
}


// ─────────────────────────────────────────────────────────────────────────────
// BACKUP — export, import, history, factory-reset
// ─────────────────────────────────────────────────────────────────────────────
function handle_backup_export(string $method, ?array $auth, int $sid): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);
    if (!in_array($auth['role'] ?? '', ['superadmin', 'super_admin', 'admin'], true)) json_error('Forbidden', 403);

    $db = getDB();
    $tables = [
        'sessions', 'classes', 'sections', 'subjects', 'class_subject_mapping',
        'students', 'student_transport', 'student_discounts',
        'staff', 'teacher_subjects', 'payroll_setup', 'payslips',
        'routes', 'pickup_points',
        'fee_heads', 'fees_plan', 'fee_receipts', 'accounts',
        'attendance', 'biometric_devices',
        'inventory_items', 'inventory_purchases', 'inventory_sales',
        'expense_heads', 'expenses', 'homework', 'alumni',
        'notifications',
    ];

    $export = [
        'version'     => API_VERSION,
        'school_id'   => $sid,
        'exported_at' => gmdate('c'),
        'tables'      => [],
    ];

    foreach ($tables as $table) {
        try {
            $stmt = $db->prepare("SELECT * FROM `{$table}` WHERE school_id=:sid AND is_deleted=0");
            $stmt->execute([':sid' => $sid]);
            $export['tables'][$table] = $stmt->fetchAll();
        } catch (Throwable $e) {
            $export['tables'][$table] = [];
        }
    }

    try {
        $ss = $db->prepare('SELECT * FROM schools WHERE id=:id LIMIT 1');
        $ss->execute([':id' => $sid]);
        $export['school'] = $ss->fetch();
    } catch (Throwable $e) { $export['school'] = null; }

    json_success($export, 'Backup ready');
}

function handle_backup_import(string $method, array $body, ?array $auth, int $sid): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);
    if (!in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true)) json_error('Super Admin only', 403);

    $data = $body['data'] ?? null;
    if (!$data || !isset($data['tables'])) json_error('Invalid backup — missing tables key', 400);

    $db = getDB();
    $allowedTables = [
        'sessions', 'classes', 'sections', 'subjects', 'class_subject_mapping',
        'students', 'student_transport', 'student_discounts',
        'staff', 'teacher_subjects', 'payroll_setup', 'payslips',
        'routes', 'pickup_points',
        'fee_heads', 'fees_plan', 'fee_receipts',
        'attendance', 'biometric_devices',
        'inventory_items', 'inventory_purchases', 'inventory_sales',
        'expense_heads', 'expenses', 'homework', 'alumni', 'notifications',
    ];

    $imported = [];
    $db->beginTransaction();
    try {
        foreach ($data['tables'] as $table => $rows) {
            if (!in_array($table, $allowedTables, true)) continue;
            if (empty($rows)) { $imported[$table] = 0; continue; }

            try {
                $db->prepare("UPDATE `{$table}` SET is_deleted=1 WHERE school_id=:sid")->execute([':sid' => $sid]);
            } catch (Throwable $e) { /* ignore */ }

            $count = 0;
            foreach ($rows as $row) {
                $row['school_id'] = $sid;
                unset($row['id']);

                $cols     = array_keys($row);
                $safeCols = array_filter($cols, fn($c) => (bool)preg_match('/^[a-zA-Z0-9_]+$/', $c));
                if (count($safeCols) !== count($cols)) continue;

                $colList = implode(',', array_map(fn($c) => "`{$c}`", $safeCols));
                $valList = implode(',', array_map(fn($c) => ":{$c}", $safeCols));
                $params  = [];
                foreach ($safeCols as $c) $params[":{$c}"] = $row[$c];

                try {
                    $db->prepare("INSERT IGNORE INTO `{$table}` ({$colList}) VALUES ({$valList})")->execute($params);
                    $count++;
                } catch (Throwable $e) { /* skip row */ }
            }
            $imported[$table] = $count;
        }
        $db->commit();
        json_success(['imported' => $imported], 'Backup restored');
    } catch (Throwable $e) {
        $db->rollBack();
        json_error('Restore failed: ' . $e->getMessage(), 500);
    }
}

function handle_backup_history(string $method, ?array $auth, int $sid): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    try {
        $db   = getDB();
        $stmt = $db->prepare('SELECT * FROM backup_history WHERE school_id=:sid ORDER BY created_at DESC LIMIT 50');
        $stmt->execute([':sid' => $sid]);
        json_success($stmt->fetchAll());
    } catch (Throwable $e) {
        json_success([], 'No backup history yet');
    }
}

function handle_factory_reset(string $method, array $body, ?array $auth, int $sid): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);
    if (!in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true)) json_error('Super Admin only', 403);

    if (($body['confirmation'] ?? '') !== 'DELETE_ALL_DATA') {
        json_error('Factory reset requires confirmation = "DELETE_ALL_DATA"', 400);
    }

    $db = getDB();
    $tables = [
        'students', 'student_transport', 'student_discounts',
        'fee_receipts', 'fee_heads', 'fees_plan', 'accounts',
        'staff', 'teacher_subjects', 'payroll_setup', 'payslips',
        'routes', 'pickup_points',
        'sessions', 'classes', 'sections', 'subjects', 'class_subject_mapping',
        'attendance', 'biometric_devices',
        'inventory_items', 'inventory_purchases', 'inventory_sales',
        'expense_heads', 'expenses', 'homework', 'alumni',
        'notifications', 'backup_history',
    ];

    $db->beginTransaction();
    try {
        foreach ($tables as $table) {
            try {
                $db->prepare("DELETE FROM `{$table}` WHERE school_id=:sid")->execute([':sid' => $sid]);
            } catch (Throwable $e) { /* skip missing */ }
        }
        $db->prepare("DELETE FROM users WHERE school_id=:sid AND role NOT IN ('super_admin','superadmin')")->execute([':sid' => $sid]);
        $db->commit();
        json_success(null, 'Factory reset complete. All data wiped.');
    } catch (Throwable $e) {
        $db->rollBack();
        json_error('Factory reset failed: ' . $e->getMessage(), 500);
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS — school profile, user management
// ─────────────────────────────────────────────────────────────────────────────
function handle_settings_school(string $method, array $body, ?array $auth, int $sid): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT * FROM schools WHERE id=:id LIMIT 1');
        $stmt->execute([':id' => $sid]);
        $school = $stmt->fetch();
        json_success($school ?: new stdClass());
    }

    if ($method === 'POST' || $method === 'PUT') {
        if (!in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true)) json_error('Super Admin only', 403);

        // Build dynamic SET clause from allowed fields
        $allowed = ['name','address','phone','email','logo_url','background_url','whatsapp_app_key',
                    'whatsapp_auth_key','whatsapp_enabled','rcs_enabled','gpay_enabled',
                    'razorpay_enabled','payu_enabled'];
        $set = [];
        $params = [];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $body)) {
                $set[] = "`{$field}`=:{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }
        if (empty($set)) json_error('No valid fields provided', 400);

        $params[':id'] = $sid;
        try {
            $upd = $db->prepare('UPDATE schools SET ' . implode(',', $set) . ', updated_at=NOW() WHERE id=:id');
            $upd->execute($params);
            if ($upd->rowCount() === 0) {
                // School doesn't exist yet — insert
                $params[':name'] = $body['name'] ?? 'SHUBH SCHOOL ERP';
                $db->prepare('INSERT INTO schools (id,name) VALUES (:id,:name)')->execute([':id' => $sid, ':name' => $params[':name']]);
            }
        } catch (Throwable $e) { json_error('Failed to update school: ' . $e->getMessage(), 500); }

        $stmt = $db->prepare('SELECT * FROM schools WHERE id=:id LIMIT 1');
        $stmt->execute([':id' => $sid]);
        json_success($stmt->fetch(), 'School settings saved');
    }

    json_error('Method not allowed', 405);
}

function handle_settings_users(string $method, array $body, ?array $auth, int $sid): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT id,username,full_name,role,is_active,created_at FROM users WHERE school_id=:sid AND is_deleted=0 ORDER BY role,full_name');
        $stmt->execute([':sid' => $sid]);
        json_success($stmt->fetchAll());
    }

    if ($method === 'POST') {
        if (!in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true)) json_error('Super Admin only', 403);
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? 'admin123');
        $role     = $body['role'] ?? 'teacher';
        $name     = $body['full_name'] ?? $username;
        if (!$username) json_error('username is required', 400);

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
        try {
            $db->prepare('INSERT INTO users (school_id,username,password_hash,full_name,role,is_active,created_at,updated_at) VALUES (:sid,:u,:h,:n,:r,1,NOW(),NOW())')
               ->execute([':sid' => $sid, ':u' => $username, ':h' => $hash, ':n' => $name, ':r' => $role]);
        } catch (Throwable $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) json_error("Username '{$username}' already exists", 409);
            json_error('Failed to create user: ' . $e->getMessage(), 500);
        }
        json_success(['username' => $username, 'role' => $role], 'User created');
    }

    json_error('Method not allowed', 405);
}


// ─────────────────────────────────────────────────────────────────────────────
// DATA / {collection} — generic CRUD handler
// ─────────────────────────────────────────────────────────────────────────────
function handle_data_collection(string $method, string $collection, array $body, ?array $auth, int $sid, ?string $id): void {
    if (!$auth) json_error('Authentication required', 401);

    // Whitelist to prevent SQL injection via collection name
    $allowedTables = [
        'students', 'staff', 'fee_receipts', 'fees_plan', 'fee_heads',
        'attendance', 'routes', 'pickup_points', 'student_transport',
        'student_discounts', 'classes', 'sections', 'subjects',
        'homework', 'expenses', 'expense_heads', 'inventory_items',
        'inventory_purchases', 'inventory_sales', 'payroll_setup',
        'payslips', 'biometric_devices', 'alumni', 'sessions',
        'accounts', 'notifications', 'users', 'schools',
        'teacher_subjects', 'class_subject_mapping', 'timetables',
        'chat_messages', 'chat_conversations',
    ];

    if (!in_array($collection, $allowedTables, true)) {
        json_error("Unknown collection: {$collection}", 404);
    }

    $db = getDB();

    // GET list or single record
    if ($method === 'GET') {
        if ($id !== null) {
            $stmt = $db->prepare("SELECT * FROM `{$collection}` WHERE id=:id AND school_id=:sid AND is_deleted=0 LIMIT 1");
            $stmt->execute([':id' => $id, ':sid' => $sid]);
            $row = $stmt->fetch();
            if (!$row) json_error('Record not found', 404);
            json_success($row);
        } else {
            $limit  = min((int)($_GET['limit'] ?? 500), 2000);
            $offset = max((int)($_GET['offset'] ?? 0), 0);
            $stmt   = $db->prepare("SELECT * FROM `{$collection}` WHERE school_id=:sid AND is_deleted=0 ORDER BY updated_at DESC LIMIT {$limit} OFFSET {$offset}");
            $stmt->execute([':sid' => $sid]);
            json_success($stmt->fetchAll());
        }
    }

    // POST — create or upsert
    if ($method === 'POST') {
        $body['school_id']  = $sid;
        $body['is_deleted'] = 0;
        if (empty($body['created_at'])) $body['created_at'] = now_str();
        $body['updated_at'] = now_str();

        $body     = array_filter($body, fn($v) => is_scalar($v) || is_null($v));
        $cols     = array_keys($body);
        $safeCols = array_values(array_filter($cols, fn($c) => (bool)preg_match('/^[a-zA-Z0-9_]+$/', $c)));
        if (empty($safeCols)) json_error('No valid fields provided', 400);

        $colList    = implode(',', array_map(fn($c) => "`{$c}`", $safeCols));
        $valList    = implode(',', array_map(fn($c) => ":{$c}", $safeCols));
        $updateList = implode(',', array_map(fn($c) => "`{$c}`=:{$c}", array_filter($safeCols, fn($c) => $c !== 'id')));
        $params     = [];
        foreach ($safeCols as $c) $params[":{$c}"] = $body[$c];

        $sql = "INSERT INTO `{$collection}` ({$colList}) VALUES ({$valList})";
        if ($updateList) $sql .= " ON DUPLICATE KEY UPDATE {$updateList}";

        try {
            $db->prepare($sql)->execute($params);
            $newId = $body['id'] ?? $db->lastInsertId();
            $stmt  = $db->prepare("SELECT * FROM `{$collection}` WHERE id=:id LIMIT 1");
            $stmt->execute([':id' => $newId]);
            json_success($stmt->fetch(), 'Saved', 201);
        } catch (Throwable $e) {
            json_error('Failed to save: ' . $e->getMessage(), 500);
        }
    }

    // PUT — update specific record
    if ($method === 'PUT') {
        if (!$id) json_error('Record ID required', 400);

        $body['updated_at'] = now_str();
        unset($body['id'], $body['school_id'], $body['created_at']);

        $body     = array_filter($body, fn($v) => is_scalar($v) || is_null($v));
        $cols     = array_keys($body);
        $safeCols = array_values(array_filter($cols, fn($c) => (bool)preg_match('/^[a-zA-Z0-9_]+$/', $c)));
        if (empty($safeCols)) json_error('No valid fields provided', 400);

        $setList = implode(',', array_map(fn($c) => "`{$c}`=:{$c}", $safeCols));
        $params  = [];
        foreach ($safeCols as $c) $params[":{$c}"] = $body[$c];
        $params[':id']  = $id;
        $params[':sid'] = $sid;

        try {
            $db->prepare("UPDATE `{$collection}` SET {$setList} WHERE id=:id AND school_id=:sid")->execute($params);
            $stmt = $db->prepare("SELECT * FROM `{$collection}` WHERE id=:id LIMIT 1");
            $stmt->execute([':id' => $id]);
            json_success($stmt->fetch(), 'Updated');
        } catch (Throwable $e) {
            json_error('Failed to update: ' . $e->getMessage(), 500);
        }
    }

    // DELETE — soft delete
    if ($method === 'DELETE') {
        if (!$id) json_error('Record ID required', 400);
        try {
            $db->prepare("UPDATE `{$collection}` SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid")
               ->execute([':id' => $id, ':sid' => $sid]);
            json_success(null, 'Deleted');
        } catch (Throwable $e) {
            json_error('Failed to delete: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}


// =============================================================================
// MIGRATIONS — ALL 28 TABLES, idempotent (CREATE TABLE IF NOT EXISTS)
// =============================================================================
function get_migrations(): array {
    return [
        [
            'name' => 'core_tables',
            'sql'  => "
CREATE TABLE IF NOT EXISTS schools (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(200) NOT NULL,
  address           TEXT,
  phone             VARCHAR(20),
  email             VARCHAR(100),
  logo_url          TEXT,
  background_url    TEXT,
  whatsapp_app_key  VARCHAR(200),
  whatsapp_auth_key VARCHAR(200),
  whatsapp_enabled  TINYINT(1) DEFAULT 0,
  rcs_enabled       TINYINT(1) DEFAULT 0,
  gpay_enabled      TINYINT(1) DEFAULT 0,
  razorpay_enabled  TINYINT(1) DEFAULT 0,
  payu_enabled      TINYINT(1) DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL DEFAULT 1,
  username        VARCHAR(100) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(200),
  role            VARCHAR(50) NOT NULL DEFAULT 'teacher',
  reference_id    INT UNSIGNED,
  refresh_token   VARCHAR(500),
  is_active       TINYINT(1) DEFAULT 1,
  last_login      TIMESTAMP NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      INT UNSIGNED,
  is_deleted      TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_school_username (school_id, username),
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  name        VARCHAR(50) NOT NULL,
  start_date  DATE,
  end_date    DATE,
  is_current  TINYINT(1) DEFAULT 0,
  is_archived TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ],
        [
            'name' => 'student_tables',
            'sql'  => "
CREATE TABLE IF NOT EXISTS classes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id  INT UNSIGNED NOT NULL,
  name       VARCHAR(50) NOT NULL,
  order_num  INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT UNSIGNED,
  is_deleted TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sections (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id  INT UNSIGNED NOT NULL,
  class_id   INT UNSIGNED NOT NULL,
  name       VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT UNSIGNED,
  is_deleted TINYINT(1) DEFAULT 0,
  INDEX idx_school_class (school_id, class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS students (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        INT UNSIGNED NOT NULL,
  session_id       INT UNSIGNED,
  admission_no     VARCHAR(50) NOT NULL,
  full_name        VARCHAR(200) NOT NULL,
  dob              DATE,
  gender           ENUM('Male','Female','Other'),
  category         VARCHAR(50),
  religion         VARCHAR(50),
  blood_group      VARCHAR(10),
  photo_url        TEXT,
  father_name      VARCHAR(200),
  mother_name      VARCHAR(200),
  guardian_name    VARCHAR(200),
  primary_mobile   VARCHAR(20),
  secondary_mobile VARCHAR(20),
  email            VARCHAR(100),
  address          TEXT,
  village          VARCHAR(100),
  district         VARCHAR(100),
  state            VARCHAR(100),
  pincode          VARCHAR(10),
  aadhaar_no       VARCHAR(20),
  sr_no            VARCHAR(50),
  pen_no           VARCHAR(50),
  apaar_no         VARCHAR(50),
  previous_school  VARCHAR(200),
  admission_date   DATE,
  class_id         INT UNSIGNED,
  section_id       INT UNSIGNED,
  roll_no          VARCHAR(20),
  rfid_tag         VARCHAR(100),
  caste            VARCHAR(50),
  status           ENUM('Active','Inactive','Discontinued','Passed Out') DEFAULT 'Active',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by       INT UNSIGNED,
  is_deleted       TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_primary_mobile (primary_mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_transport (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  session_id      INT UNSIGNED,
  student_id      INT UNSIGNED NOT NULL,
  route_id        INT UNSIGNED,
  pickup_point_id INT UNSIGNED,
  bus_no          VARCHAR(50),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted      TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_discounts (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id      INT UNSIGNED NOT NULL,
  session_id     INT UNSIGNED,
  student_id     INT UNSIGNED NOT NULL,
  monthly_amount DECIMAL(10,2) DEFAULT 0,
  applies_to     TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted     TINYINT(1) DEFAULT 0,
  INDEX idx_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ],
        [
            'name' => 'fee_tables',
            'sql'  => "
CREATE TABLE IF NOT EXISTS fee_heads (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id         INT UNSIGNED NOT NULL,
  session_id        INT UNSIGNED,
  name              VARCHAR(200) NOT NULL,
  applicable_months TEXT,
  sort_order        INT DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by        INT UNSIGNED,
  is_deleted        TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fees_plan (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id      INT UNSIGNED NOT NULL,
  session_id     INT UNSIGNED,
  class_id       INT UNSIGNED NOT NULL,
  section_id     INT UNSIGNED,
  fee_head_id    INT UNSIGNED NOT NULL,
  monthly_amount DECIMAL(10,2) DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by     INT UNSIGNED,
  is_deleted     TINYINT(1) DEFAULT 0,
  INDEX idx_class_section (class_id, section_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accounts (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fee_receipts (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        INT UNSIGNED NOT NULL,
  session_id       INT UNSIGNED,
  student_id       INT UNSIGNED NOT NULL,
  receipt_no       VARCHAR(50) NOT NULL,
  payment_date     DATE NOT NULL,
  months_paid      TEXT,
  net_fee          DECIMAL(10,2) DEFAULT 0,
  paid_amount      DECIMAL(10,2) DEFAULT 0,
  old_balance      DECIMAL(10,2) DEFAULT 0,
  balance_after    DECIMAL(10,2) DEFAULT 0,
  payment_mode     VARCHAR(50) DEFAULT 'Cash',
  account_id       INT UNSIGNED,
  other_fee_amount DECIMAL(10,2) DEFAULT 0,
  other_fee_desc   VARCHAR(200),
  received_by      INT UNSIGNED,
  received_by_name VARCHAR(200),
  received_by_role VARCHAR(50),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted       TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ],
        [
            'name' => 'hr_tables',
            'sql'  => "
CREATE TABLE IF NOT EXISTS staff (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  employee_id     VARCHAR(50),
  full_name       VARCHAR(200) NOT NULL,
  designation     VARCHAR(100),
  department      VARCHAR(100),
  dob             DATE,
  gender          ENUM('Male','Female','Other'),
  mobile          VARCHAR(20),
  email           VARCHAR(100),
  address         TEXT,
  qualification   VARCHAR(200),
  date_of_joining DATE,
  gross_salary    DECIMAL(10,2) DEFAULT 0,
  photo_url       TEXT,
  rfid_tag        VARCHAR(100),
  aadhaar_no      VARCHAR(20),
  pan_no          VARCHAR(20),
  bank_account    VARCHAR(30),
  bank_name       VARCHAR(100),
  ifsc            VARCHAR(20),
  is_active       TINYINT(1) DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      INT UNSIGNED,
  is_deleted      TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_subjects (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED,
  staff_id    INT UNSIGNED NOT NULL,
  subject_id  INT UNSIGNED NOT NULL,
  class_from  INT DEFAULT 1,
  class_to    INT DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_staff (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payroll_setup (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        INT UNSIGNED NOT NULL,
  session_id       INT UNSIGNED,
  staff_id         INT UNSIGNED NOT NULL,
  basic_salary     DECIMAL(10,2) DEFAULT 0,
  hra              DECIMAL(10,2) DEFAULT 0,
  da               DECIMAL(10,2) DEFAULT 0,
  ta               DECIMAL(10,2) DEFAULT 0,
  other_allowances DECIMAL(10,2) DEFAULT 0,
  pf_deduction     DECIMAL(10,2) DEFAULT 0,
  esi_deduction    DECIMAL(10,2) DEFAULT 0,
  tds_deduction    DECIMAL(10,2) DEFAULT 0,
  other_deductions DECIMAL(10,2) DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by       INT UNSIGNED,
  is_deleted       TINYINT(1) DEFAULT 0,
  INDEX idx_staff (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payslips (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        INT UNSIGNED NOT NULL,
  session_id       INT UNSIGNED,
  staff_id         INT UNSIGNED NOT NULL,
  pay_month        VARCHAR(10),
  pay_year         SMALLINT UNSIGNED,
  gross_salary     DECIMAL(10,2) DEFAULT 0,
  net_salary       DECIMAL(10,2) DEFAULT 0,
  total_deductions DECIMAL(10,2) DEFAULT 0,
  net_pay          DECIMAL(10,2) DEFAULT 0,
  working_days     TINYINT UNSIGNED DEFAULT 26,
  present_days     TINYINT UNSIGNED DEFAULT 26,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by       INT UNSIGNED,
  is_deleted       TINYINT(1) DEFAULT 0,
  INDEX idx_staff (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ],
        [
            'name' => 'academics_tables',
            'sql'  => "
CREATE TABLE IF NOT EXISTS subjects (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(20),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_subject_mapping (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED,
  class_id    INT UNSIGNED NOT NULL,
  subject_id  INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timetables (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED,
  type        ENUM('exam','teacher') NOT NULL DEFAULT 'exam',
  class_id    INT UNSIGNED,
  section_id  INT UNSIGNED,
  staff_id    INT UNSIGNED,
  data_json   LONGTEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ],
        [
            'name' => 'transport_tables',
            'sql'  => "
CREATE TABLE IF NOT EXISTS routes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id     INT UNSIGNED NOT NULL,
  session_id    INT UNSIGNED,
  name          VARCHAR(200) NOT NULL,
  bus_no        VARCHAR(50),
  driver_name   VARCHAR(200),
  driver_mobile VARCHAR(20),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by    INT UNSIGNED,
  is_deleted    TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pickup_points (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  route_id     INT UNSIGNED NOT NULL,
  name         VARCHAR(200) NOT NULL,
  monthly_fare DECIMAL(10,2) DEFAULT 0,
  order_num    INT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_route (school_id, route_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ],
        [
            'name' => 'attendance_tables',
            'sql'  => "
CREATE TABLE IF NOT EXISTS attendance (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  entity_type     ENUM('student','staff') NOT NULL,
  entity_id       INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  check_in_time   TIME,
  check_out_time  TIME,
  mark_type       VARCHAR(50) DEFAULT 'manual',
  device_id       INT UNSIGNED,
  marked_by       INT UNSIGNED,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted      TINYINT(1) DEFAULT 0,
  INDEX idx_school_date (school_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS biometric_devices (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  name        VARCHAR(100) NOT NULL,
  device_type VARCHAR(50),
  ip_address  VARCHAR(50),
  port        SMALLINT UNSIGNED DEFAULT 4370,
  is_active   TINYINT(1) DEFAULT 1,
  last_sync   TIMESTAMP NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ],
        [
            'name' => 'inventory_tables',
            'sql'  => "
CREATE TABLE IF NOT EXISTS inventory_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  session_id      INT UNSIGNED,
  name            VARCHAR(200) NOT NULL,
  category        VARCHAR(100),
  unit            VARCHAR(50),
  sell_price      DECIMAL(10,2) DEFAULT 0,
  current_stock   INT DEFAULT 0,
  low_stock_alert INT DEFAULT 5,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      INT UNSIGNED,
  is_deleted      TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_purchases (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id      INT UNSIGNED NOT NULL,
  session_id     INT UNSIGNED,
  item_id        INT UNSIGNED NOT NULL,
  quantity       INT NOT NULL,
  purchase_price DECIMAL(10,2),
  vendor         VARCHAR(200),
  purchase_date  DATE,
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by     INT UNSIGNED,
  is_deleted     TINYINT(1) DEFAULT 0,
  INDEX idx_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_sales (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED,
  item_id     INT UNSIGNED NOT NULL,
  student_id  INT UNSIGNED,
  quantity    INT NOT NULL,
  sell_price  DECIMAL(10,2),
  sale_date   DATE,
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ],
        [
            'name' => 'misc_tables',
            'sql'  => "
CREATE TABLE IF NOT EXISTS expense_heads (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED,
  name        VARCHAR(200) NOT NULL,
  type        ENUM('Income','Expense') DEFAULT 'Expense',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expenses (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED,
  head_id      INT UNSIGNED,
  amount       DECIMAL(10,2) NOT NULL,
  description  TEXT,
  expense_date DATE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS homework (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED,
  class_id    INT UNSIGNED NOT NULL,
  section_id  INT UNSIGNED,
  subject_id  INT UNSIGNED,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  due_date    DATE,
  staff_id    INT UNSIGNED,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alumni (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id     INT UNSIGNED NOT NULL,
  student_id    INT UNSIGNED,
  name          VARCHAR(200) NOT NULL,
  pass_out_year YEAR,
  mobile        VARCHAR(20),
  email         VARCHAR(100),
  occupation    VARCHAR(200),
  address       TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by    INT UNSIGNED,
  is_deleted    TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED,
  type        VARCHAR(100),
  title       VARCHAR(500),
  message     TEXT,
  is_read     TINYINT(1) DEFAULT 0,
  channel     VARCHAR(50) DEFAULT 'App',
  entity_type VARCHAR(50),
  entity_id   INT UNSIGNED,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_user (school_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS backup_history (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  filename    VARCHAR(500) NOT NULL,
  size_bytes  BIGINT UNSIGNED,
  created_by  INT UNSIGNED,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ],
        [
            'name' => 'chat_tables',
            'sql'  => "
CREATE TABLE IF NOT EXISTS chat_conversations (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id  INT UNSIGNED NOT NULL,
  type       ENUM('direct','class_group','route_group') NOT NULL DEFAULT 'direct',
  name       VARCHAR(255) NULL,
  class_id   INT UNSIGNED NULL,
  section_id INT UNSIGNED NULL,
  route_id   INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL DEFAULT 1,
  conversation_id INT UNSIGNED NOT NULL,
  sender_user_id  INT UNSIGNED NOT NULL,
  content         TEXT NOT NULL,
  sent_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted      TINYINT(1) DEFAULT 0,
  INDEX idx_conversation (conversation_id),
  INDEX idx_sender (sender_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ],
    ];
}
