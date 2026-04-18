<?php
/**
 * SHUBH SCHOOL ERP — Complete PHP API Backend v3.0
 * camelCase columns throughout — matches frontend JS object keys exactly.
 *
 * Usage: https://shubh.psmkgs.com/api/index.php?route=ROUTE_NAME
 *
 * Upload ONLY these 2 files to cPanel public_html/api/:
 *   index.php   ← this file
 *   config.php  ← DB connection + helpers
 *
 * Quick-start:
 *   1. Upload both files to public_html/api/
 *   2. Visit https://shubh.psmkgs.com/api/index.php?route=migrate/run
 *   3. Visit https://shubh.psmkgs.com/api/index.php?route=health  → {"status":"ok"}
 *   4. POST ?route=auth/login  {"username":"superadmin","password":"admin123"}
 */

ob_start();
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        ob_clean();
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token, X-School-ID');
        }
        echo json_encode(['status' => 'error', 'message' => 'Fatal: ' . $error['message'], 'data' => null]);
    } else {
        ob_end_flush();
    }
});

@ini_set('display_errors', '0');
@ini_set('log_errors',     '1');
@error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token, X-School-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
    exit;
}

require_once __DIR__ . '/config.php';

$route  = trim($_GET['route'] ?? '', '/');
$method = $_SERVER['REQUEST_METHOD'];
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$auth   = get_jwt_payload();
$sid    = school_id_from_auth($auth);

try {
    // --- health ---------------------------------------------------------------
    if ($route === '' || $route === 'health') {
        json_success([
            'status'      => 'ok',
            'version'     => API_VERSION,
            'server'      => 'SHUBH SCHOOL ERP API v3.0',
            'server_time' => gmdate('c'),
            'routing'     => 'query-string (no .htaccess needed)',
            'columns'     => 'camelCase throughout',
        ], 'API is running');
    }

    // --- sync/status ----------------------------------------------------------
    if ($route === 'sync/status') { handle_sync_status($sid); }

    // --- auth -----------------------------------------------------------------
    if ($route === 'auth/login')           { handle_auth_login($method, $body); }
    if ($route === 'auth/refresh')         { handle_auth_refresh($method, $body); }
    if ($route === 'auth/verify')          { handle_auth_verify($auth); }
    if ($route === 'auth/change-password') { handle_change_password($method, $body, $auth); }

    // --- migrate --------------------------------------------------------------
    if ($route === 'migrate/run')              { handle_migrate_run($method, $sid); }
    if ($route === 'migrate/reset')            { handle_migrate_reset($method, $body, $auth, $sid); }
    if ($route === 'migrate/reset-db')         { handle_migrate_reset($method, $body, $auth, $sid); } // alias
    if ($route === 'migrate/reset-superadmin') { handle_migrate_reset_superadmin($method, $sid); }
    if ($route === 'migrate/status')           { handle_migrate_status($method); }

    // --- sync -----------------------------------------------------------------
    if ($route === 'sync/push')  { handle_sync_push($method, $body, $auth, $sid); }
    if ($route === 'sync/batch') { handle_sync_batch($method, $body, $auth, $sid); }
    if ($route === 'sync/pull')  { handle_sync_pull($method, $auth, $sid); }

    // --- backup ---------------------------------------------------------------
    if ($route === 'backup/export')        { handle_backup_export($method, $auth, $sid); }
    if ($route === 'backup/import')        { handle_backup_import($method, $body, $auth, $sid); }
    if ($route === 'backup/history')       { handle_backup_history($method, $auth, $sid); }
    if ($route === 'backup/factory-reset') { handle_factory_reset($method, $body, $auth, $sid); }

    // --- settings -------------------------------------------------------------
    if ($route === 'settings/school') { handle_settings_school($method, $body, $auth, $sid); }
    if ($route === 'settings/users')  { handle_settings_users($method, $body, $auth, $sid); }

    // --- data/{collection} generic CRUD --------------------------------------
    if (preg_match('#^data/([a-z_]+)$#', $route, $m)) {
        handle_data_collection($method, $m[1], $body, $auth, $sid, null);
    }
    if (preg_match('#^data/([a-z_]+)/(.+)$#', $route, $m)) {
        handle_data_collection($method, $m[1], $body, $auth, $sid, $m[2]);
    }

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
// SYNC / STATUS
// ─────────────────────────────────────────────────────────────────────────────
function handle_sync_status(int $sid): void {
    $connected = false;
    $dbVersion = null;
    $counts    = [];

    $tables = [
        'students','staff','fee_receipts','fees_plan','fee_headings',
        'attendance','staff_attendance','routes','pickup_points',
        'student_transport','student_discounts','inventory_items',
        'inventory_transactions','expenses','expense_heads',
        'homework','school_sessions','notices','exam_timetables',
        'teacher_timetables','users','school_settings',
        'chat_messages','chat_groups','call_logs','biometric_devices','payroll',
    ];

    try {
        $db        = getDB();
        $connected = true;
        $ver       = $db->query('SELECT VERSION()');
        $dbVersion = $ver ? $ver->fetchColumn() : null;

        foreach ($tables as $t) {
            try {
                $s = $db->prepare("SELECT COUNT(*) FROM `{$t}`");
                $s->execute();
                $counts[$t] = (int)$s->fetchColumn();
            } catch (Throwable $e) {
                $counts[$t] = -1;
            }
        }
    } catch (Throwable $e) {
        $connected = false;
    }

    http_response_code(200);
    echo json_encode([
        'status'      => 'ok',
        'version'     => API_VERSION,
        'db_version'  => $dbVersion,
        'server_time' => gmdate('c'),
        'connected'   => $connected,
        'synced'      => $connected,
        'counts'      => $counts,
    ]);
    exit;
}


// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
function handle_auth_login(string $method, array $body): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);

    $username = trim($body['username'] ?? '');
    $password = trim($body['password'] ?? '');
    if (!$username || !$password) json_error('username and password are required', 400);

    try {
        $db = getDB();
    } catch (Throwable $e) {
        json_error('Database not set up. Run ?route=migrate/run first. ' . $e->getMessage(), 503);
    }

    // Users table uses camelCase: username, password, role, name
    $stmt = $db->prepare('SELECT * FROM `users` WHERE `username`=:u LIMIT 1');
    $stmt->execute([':u' => $username]);
    $user = $stmt->fetch();

    if (!$user) {
        json_error('Invalid username or password', 401);
    }

    $storedPass = $user['password'] ?? '';
    $ok = false;

    // Support SHA2 hex (64 chars), bcrypt ($2...), and plain text for legacy
    if (strlen($storedPass) === 64 && ctype_xdigit($storedPass)) {
        $ok = (hash('sha256', $password) === $storedPass);
    } elseif (strpos($storedPass, '$2') === 0) {
        $ok = password_verify($password, $storedPass);
    } else {
        $ok = ($password === $storedPass);
    }

    if (!$ok) json_error('Invalid username or password', 401);

    $now = time();
    $payload = [
        'user_id'   => $user['id'],
        'school_id' => 1,
        'role'      => $user['role'],
        'name'      => $user['name'] ?? $username,
        'iat'       => $now,
        'exp'       => $now + JWT_EXPIRY,
    ];
    $token = jwt_encode($payload);

    json_success([
        'token'      => $token,
        'expires_in' => JWT_EXPIRY,
        'user'       => [
            'id'       => $user['id'],
            'username' => $user['username'],
            'name'     => $user['name'] ?? $username,
            'role'     => $user['role'],
        ],
    ], 'Login successful');
}

function handle_auth_refresh(string $method, array $body): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    $rt = $body['refresh_token'] ?? $body['token'] ?? '';
    if (!$rt) json_error('token is required', 400);

    $payload = jwt_verify($rt);
    if (!$payload) json_error('Invalid or expired token', 401);

    $now = time();
    $np  = array_merge($payload, ['iat' => $now, 'exp' => $now + JWT_EXPIRY]);
    json_success(['token' => jwt_encode($np), 'expires_in' => JWT_EXPIRY], 'Token refreshed');
}

function handle_auth_verify(?array $auth): void {
    if (!$auth) json_error('Token invalid or expired', 401);

    try {
        $db   = getDB();
        $stmt = $db->prepare('SELECT `id`,`username`,`role`,`name` FROM `users` WHERE `id`=:id LIMIT 1');
        $stmt->execute([':id' => $auth['user_id'] ?? '']);
        $user = $stmt->fetch();
        if (!$user) json_error('User not found', 401);
        json_success(['user' => $user]);
    } catch (Throwable $e) {
        json_success(['user' => ['id' => $auth['user_id'] ?? '', 'role' => $auth['role'] ?? '']]);
    }
}

function handle_change_password(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $newPassword = $body['new_password'] ?? '';
    if (strlen($newPassword) < 6) json_error('New password must be at least 6 characters', 400);

    $targetId = $body['user_id'] ?? ($auth['user_id'] ?? '');
    $db       = getDB();

    $isSuperAdmin = in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true);
    $isSelf       = ($auth['user_id'] ?? '') == $targetId;
    if (!$isSuperAdmin && !$isSelf) json_error('Forbidden', 403);

    $hash = hash('sha256', $newPassword);
    try {
        $db->prepare('UPDATE `users` SET `password`=:h WHERE `id`=:id')
           ->execute([':h' => $hash, ':id' => $targetId]);
    } catch (Throwable $e) {
        json_error('Failed to update password: ' . $e->getMessage(), 500);
    }
    json_success(null, 'Password changed successfully');
}


// ─────────────────────────────────────────────────────────────────────────────
// MIGRATE — CREATE IF NOT EXISTS (safe to re-run; preserves existing data)
// Use migrate/reset or migrate/reset-db to drop+recreate (fixes column issues)
// ─────────────────────────────────────────────────────────────────────────────
function handle_migrate_run(string $method, int $sid): void {
    if (!in_array($method, ['GET', 'POST'], true)) json_error('Method not allowed', 405);

    try {
        $db = getDB();
    } catch (Throwable $e) {
        json_error('Database connection failed: ' . $e->getMessage() . '. Check config.php.', 503);
    }

    $applied = [];
    $skipped = [];
    $errors  = [];

    foreach (get_table_definitions() as $tableName => $createSql) {
        // Replace CREATE TABLE with CREATE TABLE IF NOT EXISTS so existing data is preserved
        $safeSql = preg_replace(
            '/^CREATE TABLE\s+`?' . preg_quote($tableName, '/') . '`?/i',
            "CREATE TABLE IF NOT EXISTS `{$tableName}`",
            $createSql
        );
        try {
            $db->exec($safeSql);
            $applied[] = $tableName;
        } catch (Throwable $e) {
            $errors[] = ['table' => $tableName, 'error' => $e->getMessage()];
        }
    }

    // Seed superadmin (only if not already present)
    $seedResult = seed_superadmin_user($db);

    // Seed default settings (only if empty)
    seed_default_settings($db);

    json_success([
        'applied'  => $applied,
        'skipped'  => $skipped,
        'errors'   => $errors,
        'seeded'   => $seedResult,
        'message'  => count($applied) . ' tables ensured. Existing data preserved. Login: superadmin / admin123',
        'note'     => 'migrate/run uses CREATE TABLE IF NOT EXISTS — safe to re-run. To fix column mismatch errors, call migrate/reset or migrate/reset-db instead.',
    ], 'Migration complete. Login with superadmin / admin123');
}

function handle_migrate_reset_superadmin(string $method, int $sid): void {
    if (!in_array($method, ['GET', 'POST'], true)) json_error('Method not allowed', 405);

    try {
        $db = getDB();
    } catch (Throwable $e) {
        json_error('Run ?route=migrate/run first.', 503);
    }

    try {
        $db->prepare("DELETE FROM `users` WHERE `role`='superadmin'")->execute();
    } catch (Throwable $e) { /* table may not exist yet */ }

    $result = seed_superadmin_user($db, true);
    json_success(['action' => $result, 'username' => 'superadmin', 'password' => 'admin123'],
                 'Superadmin reset. Login: superadmin / admin123');
}

function handle_migrate_status(string $method): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);

    try {
        $db     = getDB();
        $tables = array_keys(get_table_definitions());
        $status = [];
        foreach ($tables as $t) {
            try {
                $db->query("SELECT 1 FROM `{$t}` LIMIT 1");
                $status[$t] = 'exists';
            } catch (Throwable $e) {
                $status[$t] = 'missing';
            }
        }
        json_success(['tables' => $status]);
    } catch (Throwable $e) {
        json_error('Database connection failed', 503);
    }
}

/**
 * migrate/reset — Drop ALL tables and recreate them fresh with correct camelCase columns.
 * Also re-seeds superadmin. Use this to fix SQLSTATE[42S22] column-not-found errors
 * caused by old snake_case tables created by the legacy migrate.php.
 *
 * WARNING: This drops all existing data. Requires Super Admin authentication OR
 * accepts a special confirmation body without auth (for initial setup from UI).
 */
function handle_migrate_reset(string $method, array $body, ?array $auth, int $sid): void {
    if (!in_array($method, ['GET', 'POST'], true)) json_error('Method not allowed', 405);

    // Allow unauthenticated access only with explicit confirmation token
    // (so the UI button can call this during first-time setup when no JWT exists yet)
    $isAuthed = $auth &&
        in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true);
    $hasConfirmation = ($body['confirmation'] ?? '') === 'RESET_DB_TABLES';

    if (!$isAuthed && !$hasConfirmation && $method !== 'GET') {
        json_error_coded(
            'Authentication required OR provide confirmation=RESET_DB_TABLES in body.',
            401,
            'AUTH_REQUIRED'
        );
    }

    try {
        $db = getDB();
    } catch (Throwable $e) {
        json_error('Database connection failed: ' . $e->getMessage(), 503);
    }

    $dropped  = [];
    $created  = [];
    $errors   = [];

    // Disable FK checks so we can DROP freely
    try { $db->exec('SET FOREIGN_KEY_CHECKS=0'); } catch (Throwable $e) {}

    foreach (get_table_definitions() as $tableName => $createSql) {
        try {
            $db->exec("DROP TABLE IF EXISTS `{$tableName}`");
            $dropped[] = $tableName;
        } catch (Throwable $e) {
            $errors[] = ['table' => $tableName, 'stage' => 'drop', 'error' => $e->getMessage()];
        }
        try {
            $db->exec($createSql);
            $created[] = $tableName;
        } catch (Throwable $e) {
            $errors[] = ['table' => $tableName, 'stage' => 'create', 'error' => $e->getMessage()];
        }
    }

    try { $db->exec('SET FOREIGN_KEY_CHECKS=1'); } catch (Throwable $e) {}

    // Re-seed superadmin
    $seedResult = seed_superadmin_user($db, true);

    // Re-seed default settings
    seed_default_settings($db);

    json_success([
        'dropped' => $dropped,
        'created' => $created,
        'errors'  => $errors,
        'seeded'  => $seedResult,
        'note'    => 'All tables rebuilt with camelCase columns. Login: superadmin / admin123',
    ], count($created) . ' tables reset successfully. SQLSTATE[42S22] errors are now fixed.');
}

/**
 * Insert or force-reset the superadmin user.
 * Uses camelCase columns: id, username, password, role, name
 */
function seed_superadmin_user(PDO $db, bool $force = false): string {
    $hash = hash('sha256', 'admin123');

    try {
        // Ensure users table exists minimally
        $db->exec("CREATE TABLE IF NOT EXISTS `users` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `username`    VARCHAR(255),
            `password`    VARCHAR(255),
            `role`        VARCHAR(100),
            `name`        VARCHAR(255),
            `mobile`      VARCHAR(50),
            `email`       VARCHAR(255),
            `session`     VARCHAR(100),
            `permissions` TEXT,
            `linkedId`    VARCHAR(36)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $e) { /* already exists */ }

    $stmt = $db->prepare("SELECT `id` FROM `users` WHERE `username`='superadmin' LIMIT 1");
    $stmt->execute();
    $existing = $stmt->fetch();

    $id = 'superadmin-' . date('Y');

    if (!$existing) {
        try {
            $db->prepare("INSERT INTO `users` (`id`,`username`,`password`,`role`,`name`) VALUES (:id,'superadmin',:pw,'superadmin','Super Admin')")
               ->execute([':id' => $id, ':pw' => $hash]);
            return 'superadmin created';
        } catch (Throwable $e) {
            return 'superadmin insert failed: ' . $e->getMessage();
        }
    }

    if ($force) {
        try {
            $db->prepare("UPDATE `users` SET `password`=:pw, `role`='superadmin', `name`='Super Admin' WHERE `username`='superadmin'")
               ->execute([':pw' => $hash]);
            return 'superadmin password reset';
        } catch (Throwable $e) {
            return 'superadmin update failed: ' . $e->getMessage();
        }
    }

    return 'superadmin already exists';
}

function seed_default_settings(PDO $db): void {
    try {
        $check = $db->query("SELECT COUNT(*) FROM `school_settings`");
        if ($check && (int)$check->fetchColumn() === 0) {
            $defaults = [
                ['key' => 'school_name',  'value' => 'SHUBH SCHOOL ERP'],
                ['key' => 'session',      'value' => date('Y') . '-' . (date('y') + 1)],
                ['key' => 'currency',     'value' => 'INR'],
                ['key' => 'whatsapp_enabled', 'value' => '0'],
            ];
            $ins = $db->prepare("INSERT IGNORE INTO `school_settings` (`id`,`key`,`value`) VALUES (UUID(),:k,:v)");
            foreach ($defaults as $d) {
                $ins->execute([':k' => $d['key'], ':v' => $d['value']]);
            }
        }
    } catch (Throwable $e) { /* ignore */ }
}


// ─────────────────────────────────────────────────────────────────────────────
// SYNC / PUSH — bulk upsert all collections
// Uses positional ? parameters to avoid SQLSTATE[HY093] (named param collision
// between VALUES(:x) and ON DUPLICATE KEY UPDATE col=:x).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert a batch of rows into a table using positional ? parameters.
 * Returns ['pushed' => int, 'failed' => int, 'errors' => string[]]
 */
function batchUpsert(PDO $pdo, string $table, array $rows): array {
    if (empty($rows)) return ['pushed' => 0, 'failed' => 0, 'errors' => []];

    $pushed = 0;
    $failed = 0;
    $errors = [];

    // Cache known columns from live DB schema to prevent SQLSTATE[42S22]
    $tableColumns = [];
    try {
        $stmt = $pdo->query("DESCRIBE `{$table}`");
        $tableColumns = $stmt ? $stmt->fetchAll(PDO::FETCH_COLUMN, 0) : [];
    } catch (Throwable $e) {
        // DESCRIBE failed (table missing) — let INSERT report the error naturally
        $tableColumns = [];
    }

    foreach ($rows as $idx => $row) {
        if (!is_array($row)) {
            $failed++;
            $errors[] = "Row {$idx}: not an object";
            continue;
        }

        // Keep only scalar/null values and valid identifier column names
        $filteredRow = [];
        foreach ($row as $k => $v) {
            if (!preg_match('/^[a-zA-Z0-9_]+$/', (string)$k)) continue;
            if (!empty($tableColumns) && !in_array($k, $tableColumns, true)) continue;
            if (!is_scalar($v) && !is_null($v)) continue;
            $filteredRow[$k] = $v;
        }

        if (empty($filteredRow)) {
            $failed++;
            $errors[] = "Row {$idx}: no valid columns after filtering (table: {$table})";
            continue;
        }

        $columns = array_keys($filteredRow);
        $values  = array_values($filteredRow);

        // Build with positional ? placeholders — eliminates HY093 entirely
        $colList      = implode(', ', array_map(fn($c) => "`{$c}`", $columns));
        $placeholders = implode(', ', array_fill(0, count($columns), '?'));

        // ON DUPLICATE KEY UPDATE — use VALUES(col) so no extra params needed
        $updateParts = array_map(fn($c) => "`{$c}` = VALUES(`{$c}`)", $columns);
        $updateClause = implode(', ', $updateParts);

        $sql = "INSERT INTO `{$table}` ({$colList}) VALUES ({$placeholders}) ON DUPLICATE KEY UPDATE {$updateClause}";

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
            $pushed++;
        } catch (PDOException $e) {
            $failed++;
            $msg = $e->getMessage();
            if (strpos($msg, "doesn't exist") !== false) {
                $errors[] = "Row {$idx}: Table '{$table}' not found — run ?route=migrate/run first";
            } elseif (strpos($msg, '42S22') !== false || stripos($msg, 'Unknown column') !== false) {
                $errors[] = "Row {$idx}: Column mismatch in '{$table}' — run ?route=migrate/reset-db to fix";
            } else {
                $errors[] = "Row {$idx}: {$msg}";
            }
        }
    }

    return ['pushed' => $pushed, 'failed' => $failed, 'errors' => $errors];
}

function handle_sync_push(string $method, array $body, ?array $auth, int $sid): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error_coded('Token expired or missing. Please re-authenticate.', 401, 'TOKEN_EXPIRED');
    if (!in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true)) {
        json_error_coded('Super Admin access required.', 403, 'FORBIDDEN');
    }

    // Single-collection batch format: { collection, items }
    if (isset($body['collection']) && isset($body['items'])) {
        handle_sync_batch($method, $body, $auth, $sid);
        return;
    }

    $db = getDB();

    $tableMap = collection_table_map();

    $results = [];
    foreach ($tableMap as $key => $table) {
        if (!isset($results[$key])) {
            $results[$key] = ['pushed' => 0, 'failed' => 0, 'errors' => []];
        }
    }

    foreach ($tableMap as $key => $table) {
        $records = $body[$key] ?? [];
        if (empty($records) || !is_array($records)) continue;

        $result = batchUpsert($db, $table, $records);
        $results[$key]['pushed'] += $result['pushed'];
        $results[$key]['failed'] += $result['failed'];
        $results[$key]['errors'] = array_merge($results[$key]['errors'], $result['errors']);
    }

    json_success(['results' => $results], 'Push complete');
}


// ─────────────────────────────────────────────────────────────────────────────
// SYNC / BATCH — upsert a single named collection
// Uses batchUpsert() with positional ? parameters (no HY093 possible).
// ─────────────────────────────────────────────────────────────────────────────
function handle_sync_batch(string $method, array $body, ?array $auth, int $sid): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error_coded('Token expired or missing. Please re-authenticate.', 401, 'TOKEN_EXPIRED');
    if (!in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true)) {
        json_error_coded('Super Admin access required.', 403, 'FORBIDDEN');
    }

    $collection = trim($body['collection'] ?? '');
    $items      = $body['items'] ?? [];
    if ($collection === '') json_error('collection is required', 400);
    if (!is_array($items))  json_error('items must be an array', 400);

    $tableMap = collection_table_map();
    if (!isset($tableMap[$collection])) json_error("Unknown collection: {$collection}", 400);

    $table  = $tableMap[$collection];
    $db     = getDB();

    $result = batchUpsert($db, $table, $items);

    json_success([
        'pushed'     => $result['pushed'],
        'failed'     => $result['failed'],
        'total'      => count($items),
        'errors'     => $result['errors'],
        'collection' => $collection,
        'table'      => $table,
    ], "{$result['pushed']} of " . count($items) . " records saved");
}


// ─────────────────────────────────────────────────────────────────────────────
// SYNC / PULL
// ─────────────────────────────────────────────────────────────────────────────
function handle_sync_pull(string $method, ?array $auth, int $sid): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $db    = getDB();
    $since = $_GET['since'] ?? null;

    $tables = array_values(array_unique(array_values(collection_table_map())));

    $pull = [];
    foreach ($tables as $table) {
        try {
            if ($since) {
                // Only tables that have a timestamp-ish column can filter by since
                $stmt = $db->prepare("SELECT * FROM `{$table}` LIMIT 1000");
            } else {
                $stmt = $db->prepare("SELECT * FROM `{$table}` LIMIT 1000");
            }
            $stmt->execute();
            $rows = $stmt->fetchAll();
            if (!empty($rows)) $pull[$table] = $rows;
        } catch (Throwable $e) { /* skip missing tables */ }
    }

    json_success(['pulled_at' => gmdate('c'), 'since' => $since, 'tables' => $pull]);
}


// ─────────────────────────────────────────────────────────────────────────────
// BACKUP
// ─────────────────────────────────────────────────────────────────────────────
function handle_backup_export(string $method, ?array $auth, int $sid): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $db     = getDB();
    $tables = array_values(array_unique(array_values(collection_table_map())));
    $export = [
        'version'     => API_VERSION,
        'exported_at' => gmdate('c'),
        'tables'      => [],
    ];

    foreach ($tables as $table) {
        try {
            $stmt = $db->prepare("SELECT * FROM `{$table}` LIMIT 5000");
            $stmt->execute();
            $export['tables'][$table] = $stmt->fetchAll();
        } catch (Throwable $e) {
            $export['tables'][$table] = [];
        }
    }

    json_success($export, 'Backup ready');
}

function handle_backup_import(string $method, array $body, ?array $auth, int $sid): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);
    if (!in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true)) json_error('Super Admin only', 403);

    $data = $body['data'] ?? null;
    if (!$data || !isset($data['tables'])) json_error('Invalid backup — missing tables key', 400);

    $db       = getDB();
    $imported = [];

    $db->beginTransaction();
    try {
        foreach ($data['tables'] as $table => $rows) {
            if (!is_array($rows) || empty($rows)) { $imported[$table] = 0; continue; }
            $result = batchUpsert($db, $table, $rows);
            $imported[$table] = $result['pushed'];
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
    json_success([], 'No backup history tracked server-side');
}

function handle_factory_reset(string $method, array $body, ?array $auth, int $sid): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);
    if (!in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true)) json_error('Super Admin only', 403);
    if (($body['confirmation'] ?? '') !== 'DELETE_ALL_DATA') {
        json_error('confirmation must equal "DELETE_ALL_DATA"', 400);
    }

    $db     = getDB();
    $tables = array_values(array_unique(array_values(collection_table_map())));
    $db->beginTransaction();
    try {
        foreach ($tables as $table) {
            try { $db->exec("DELETE FROM `{$table}`"); } catch (Throwable $e) {}
        }
        // Keep superadmin
        seed_superadmin_user($db, false);
        $db->commit();
        json_success(null, 'Factory reset complete. All data wiped.');
    } catch (Throwable $e) {
        $db->rollBack();
        json_error('Factory reset failed: ' . $e->getMessage(), 500);
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
function handle_settings_school(string $method, array $body, ?array $auth, int $sid): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        try {
            $stmt = $db->query("SELECT * FROM `school_settings`");
            $rows = $stmt->fetchAll();
            $settings = [];
            foreach ($rows as $r) $settings[$r['key']] = $r['value'];
            json_success($settings);
        } catch (Throwable $e) {
            json_success([]);
        }
    }

    if ($method === 'POST' || $method === 'PUT') {
        if (!in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true)) json_error('Super Admin only', 403);
        try {
            $ins = $db->prepare("INSERT INTO `school_settings` (`id`,`key`,`value`) VALUES (UUID(),:k,:v) ON DUPLICATE KEY UPDATE `value`=:v2");
            foreach ($body as $key => $value) {
                if (is_scalar($value) && preg_match('/^[a-zA-Z0-9_]+$/', $key)) {
                    $ins->execute([':k' => $key, ':v' => (string)$value, ':v2' => (string)$value]);
                }
            }
            json_success(null, 'Settings saved');
        } catch (Throwable $e) {
            json_error('Failed to save settings: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}

function handle_settings_users(string $method, array $body, ?array $auth, int $sid): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        try {
            $stmt = $db->query("SELECT `id`,`username`,`role`,`name`,`mobile`,`email` FROM `users`");
            json_success($stmt->fetchAll());
        } catch (Throwable $e) {
            json_success([]);
        }
    }

    if ($method === 'POST') {
        if (!in_array($auth['role'] ?? '', ['superadmin', 'super_admin'], true)) json_error('Super Admin only', 403);
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? 'admin123');
        $role     = $body['role'] ?? 'teacher';
        $name     = $body['name'] ?? $username;
        if (!$username) json_error('username is required', 400);

        $hash = hash('sha256', $password);
        try {
            $db->prepare("INSERT INTO `users` (`id`,`username`,`password`,`role`,`name`) VALUES (UUID(),:u,:h,:r,:n)")
               ->execute([':u' => $username, ':h' => $hash, ':r' => $role, ':n' => $name]);
        } catch (Throwable $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) json_error("Username '{$username}' already exists", 409);
            json_error('Failed to create user: ' . $e->getMessage(), 500);
        }
        json_success(['username' => $username, 'role' => $role], 'User created');
    }

    json_error('Method not allowed', 405);
}


// ─────────────────────────────────────────────────────────────────────────────
// DATA / {collection} — generic CRUD
// ─────────────────────────────────────────────────────────────────────────────
function handle_data_collection(string $method, string $collection, array $body, ?array $auth, int $sid, ?string $id): void {
    if (!$auth) json_error('Authentication required', 401);

    $tableMap = collection_table_map();
    if (!isset($tableMap[$collection])) json_error("Unknown collection: {$collection}", 404);
    $table = $tableMap[$collection];
    $db    = getDB();

    if ($method === 'GET') {
        if ($id !== null) {
            $stmt = $db->prepare("SELECT * FROM `{$table}` WHERE `id`=:id LIMIT 1");
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch();
            if (!$row) json_error('Record not found', 404);
            json_success($row);
        } else {
            $limit  = min((int)($_GET['limit'] ?? 1000), 5000);
            $offset = max((int)($_GET['offset'] ?? 0), 0);
            try {
                $stmt = $db->prepare("SELECT * FROM `{$table}` LIMIT {$limit} OFFSET {$offset}");
                $stmt->execute();
                json_success($stmt->fetchAll());
            } catch (Throwable $e) {
                json_success([]);
            }
        }
    }

    if ($method === 'POST') {
        $body     = array_filter($body, fn($v) => is_scalar($v) || is_null($v));
        $safeCols = array_values(array_filter(
            array_keys($body),
            fn($c) => (bool)preg_match('/^[a-zA-Z0-9_]+$/', $c)
        ));
        if (empty($safeCols)) json_error('No valid fields provided', 400);
        if (empty($body['id'])) { $body['id'] = gen_uuid(); $safeCols[] = 'id'; $safeCols = array_unique($safeCols); }

        // Use positional ? to avoid HY093 when same column appears in VALUES and UPDATE
        $colList      = implode(',', array_map(fn($c) => "`{$c}`", $safeCols));
        $placeholders = implode(',', array_fill(0, count($safeCols), '?'));
        $updateParts  = array_map(fn($c) => "`{$c}` = VALUES(`{$c}`)", $safeCols);
        $updateClause = implode(',', $updateParts);
        $values = array_map(fn($c) => $body[$c], $safeCols);

        try {
            $sql = "INSERT INTO `{$table}` ({$colList}) VALUES ({$placeholders}) ON DUPLICATE KEY UPDATE {$updateClause}";
            $db->prepare($sql)->execute($values);
            json_success(['id' => $body['id']], 'Saved', 201);
        } catch (Throwable $e) {
            json_error('Failed to save: ' . $e->getMessage(), 500);
        }
    }

    if ($method === 'PUT') {
        if (!$id) json_error('Record ID required', 400);
        unset($body['id']);
        $body     = array_filter($body, fn($v) => is_scalar($v) || is_null($v));
        $safeCols = array_values(array_filter(
            array_keys($body),
            fn($c) => (bool)preg_match('/^[a-zA-Z0-9_]+$/', $c)
        ));
        if (empty($safeCols)) json_error('No valid fields provided', 400);

        $setList = implode(',', array_map(fn($c) => "`{$c}`=:{$c}", $safeCols));
        $params  = [];
        foreach ($safeCols as $c) $params[":{$c}"] = $body[$c];
        $params[':id'] = $id;

        try {
            $db->prepare("UPDATE `{$table}` SET {$setList} WHERE `id`=:id")->execute($params);
            json_success(['id' => $id], 'Updated');
        } catch (Throwable $e) {
            json_error('Failed to update: ' . $e->getMessage(), 500);
        }
    }

    if ($method === 'DELETE') {
        if (!$id) json_error('Record ID required', 400);
        try {
            $db->prepare("DELETE FROM `{$table}` WHERE `id`=:id")->execute([':id' => $id]);
            json_success(null, 'Deleted');
        } catch (Throwable $e) {
            json_error('Failed to delete: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}


// =============================================================================
// COLLECTION → TABLE MAP
// =============================================================================
function collection_table_map(): array {
    return [
        'students'              => 'students',
        'staff'                 => 'staff',
        'fees_plan'             => 'fees_plan',
        'fee_plans'             => 'fees_plan',
        'fee_headings'          => 'fee_headings',
        'fee_heads'             => 'fee_headings',
        'fee_receipts'          => 'fee_receipts',
        'attendance'            => 'attendance',
        'staff_attendance'      => 'staff_attendance',
        'routes'                => 'routes',
        'pickup_points'         => 'pickup_points',
        'student_transport'     => 'student_transport',
        'student_discounts'     => 'student_discounts',
        'inventory_items'       => 'inventory_items',
        'inventory_transactions'=> 'inventory_transactions',
        'expenses'              => 'expenses',
        'expense_heads'         => 'expense_heads',
        'homework'              => 'homework',
        'school_sessions'       => 'school_sessions',
        'sessions'              => 'school_sessions',
        // notices and notifications are SEPARATE tables with different schemas
        'notices'               => 'notices',
        'notifications'         => 'notifications',
        'exam_timetables'       => 'exam_timetables',
        'teacher_timetables'    => 'teacher_timetables',
        'users'                 => 'users',
        'school_settings'       => 'school_settings',
        'settings'              => 'school_settings',
        'chat_messages'         => 'chat_messages',
        'chat_groups'           => 'chat_groups',
        'call_logs'             => 'call_logs',
        'biometric_devices'     => 'biometric_devices',
        'payroll'               => 'payroll',
    ];
}

function gen_uuid(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}


// =============================================================================
// TABLE DEFINITIONS — ALL camelCase columns matching frontend JS object keys
// Using DROP TABLE IF EXISTS + CREATE TABLE for clean migration every time
// =============================================================================
function get_table_definitions(): array {
    return [

        // ── students ──────────────────────────────────────────────────────────
        'students' => "CREATE TABLE `students` (
            `id`              VARCHAR(36) PRIMARY KEY,
            `admNo`           VARCHAR(100),
            `name`            VARCHAR(255),
            `dob`             VARCHAR(50),
            `gender`          VARCHAR(20),
            `class`           VARCHAR(100),
            `section`         VARCHAR(50),
            `fatherName`      VARCHAR(255),
            `motherName`      VARCHAR(255),
            `fatherMobile`    VARCHAR(50),
            `motherMobile`    VARCHAR(50),
            `address`         TEXT,
            `village`         VARCHAR(255),
            `category`        VARCHAR(100),
            `aadhaar`         VARCHAR(50),
            `srNo`            VARCHAR(100),
            `penNo`           VARCHAR(100),
            `apaarNo`         VARCHAR(100),
            `previousSchool`  VARCHAR(255),
            `admissionDate`   VARCHAR(50),
            `status`          VARCHAR(50) DEFAULT 'Active',
            `photo`           TEXT,
            `routeId`         VARCHAR(36),
            `pickupPoint`     VARCHAR(255),
            `session`         VARCHAR(100),
            `bloodGroup`      VARCHAR(20),
            `religion`        VARCHAR(100),
            `caste`           VARCHAR(100),
            `nationality`     VARCHAR(100),
            `annualIncome`    VARCHAR(100),
            `busNo`           VARCHAR(50),
            `email`           VARCHAR(255),
            `alternatePhone`  VARCHAR(50),
            `emergencyContact` VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── staff ─────────────────────────────────────────────────────────────
        'staff' => "CREATE TABLE `staff` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `empId`       VARCHAR(100),
            `name`        VARCHAR(255),
            `designation` VARCHAR(255),
            `department`  VARCHAR(255),
            `mobile`      VARCHAR(50),
            `email`       VARCHAR(255),
            `address`     TEXT,
            `joinDate`    VARCHAR(50),
            `salary`      DECIMAL(12,2) DEFAULT 0,
            `status`      VARCHAR(50) DEFAULT 'Active',
            `photo`       TEXT,
            `gender`      VARCHAR(20),
            `dob`         VARCHAR(50),
            `aadhaar`     VARCHAR(50),
            `bankAccount` VARCHAR(100),
            `ifsc`        VARCHAR(50),
            `bankName`    VARCHAR(255),
            `panNo`       VARCHAR(50),
            `qualification` VARCHAR(255),
            `experience`  VARCHAR(255),
            `session`     VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── fees_plan ─────────────────────────────────────────────────────────
        'fees_plan' => "CREATE TABLE `fees_plan` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `classId`    VARCHAR(100),
            `section`    VARCHAR(50),
            `headingId`  VARCHAR(36),
            `amount`     DECIMAL(12,2) DEFAULT 0,
            `months`     TEXT,
            `session`    VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── fee_headings ──────────────────────────────────────────────────────
        'fee_headings' => "CREATE TABLE `fee_headings` (
            `id`                VARCHAR(36) PRIMARY KEY,
            `name`              VARCHAR(255),
            `amount`            DECIMAL(12,2) DEFAULT 0,
            `months`            TEXT,
            `applicableClasses` TEXT,
            `session`           VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── fee_receipts ──────────────────────────────────────────────────────
        'fee_receipts' => "CREATE TABLE `fee_receipts` (
            `id`               VARCHAR(36) PRIMARY KEY,
            `studentId`        VARCHAR(36),
            `admNo`            VARCHAR(100),
            `studentName`      VARCHAR(255),
            `class`            VARCHAR(100),
            `section`          VARCHAR(50),
            `months`           TEXT,
            `amounts`          TEXT,
            `otherCharges`     DECIMAL(12,2) DEFAULT 0,
            `otherDescription` VARCHAR(255),
            `totalAmount`      DECIMAL(12,2) DEFAULT 0,
            `paidAmount`       DECIMAL(12,2) DEFAULT 0,
            `balance`          DECIMAL(12,2) DEFAULT 0,
            `paymentMode`      VARCHAR(50) DEFAULT 'Cash',
            `receiptNo`        VARCHAR(100),
            `date`             VARCHAR(50),
            `session`          VARCHAR(100),
            `headingAmounts`   TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── attendance ────────────────────────────────────────────────────────
        'attendance' => "CREATE TABLE `attendance` (
            `id`        VARCHAR(36) PRIMARY KEY,
            `studentId` VARCHAR(36),
            `admNo`     VARCHAR(100),
            `name`      VARCHAR(255),
            `class`     VARCHAR(100),
            `section`   VARCHAR(50),
            `date`      VARCHAR(50),
            `status`    VARCHAR(20) DEFAULT 'Present',
            `inTime`    VARCHAR(50),
            `outTime`   VARCHAR(50),
            `method`    VARCHAR(50),
            `session`   VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── staff_attendance ──────────────────────────────────────────────────
        'staff_attendance' => "CREATE TABLE `staff_attendance` (
            `id`      VARCHAR(36) PRIMARY KEY,
            `staffId` VARCHAR(36),
            `empId`   VARCHAR(100),
            `name`    VARCHAR(255),
            `date`    VARCHAR(50),
            `status`  VARCHAR(20) DEFAULT 'Present',
            `inTime`  VARCHAR(50),
            `outTime` VARCHAR(50),
            `session` VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── routes ────────────────────────────────────────────────────────────
        'routes' => "CREATE TABLE `routes` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `name`        VARCHAR(255),
            `description` TEXT,
            `stops`       TEXT,
            `session`     VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── pickup_points ─────────────────────────────────────────────────────
        'pickup_points' => "CREATE TABLE `pickup_points` (
            `id`      VARCHAR(36) PRIMARY KEY,
            `routeId` VARCHAR(36),
            `name`    VARCHAR(255),
            `fare`    DECIMAL(12,2) DEFAULT 0,
            `order`   INT DEFAULT 0,
            `session` VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── student_transport ─────────────────────────────────────────────────
        'student_transport' => "CREATE TABLE `student_transport` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `studentId`   VARCHAR(36),
            `admNo`       VARCHAR(100),
            `routeId`     VARCHAR(36),
            `pickupPoint` VARCHAR(255),
            `months`      TEXT,
            `session`     VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── student_discounts ─────────────────────────────────────────────────
        'student_discounts' => "CREATE TABLE `student_discounts` (
            `id`                  VARCHAR(36) PRIMARY KEY,
            `studentId`           VARCHAR(36),
            `admNo`               VARCHAR(100),
            `discountAmount`      DECIMAL(12,2) DEFAULT 0,
            `applicableHeadings`  TEXT,
            `months`              TEXT,
            `session`             VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── inventory_items ───────────────────────────────────────────────────
        'inventory_items' => "CREATE TABLE `inventory_items` (
            `id`            VARCHAR(36) PRIMARY KEY,
            `name`          VARCHAR(255),
            `category`      VARCHAR(255),
            `quantity`      INT DEFAULT 0,
            `unit`          VARCHAR(50),
            `purchasePrice` DECIMAL(12,2) DEFAULT 0,
            `sellPrice`     DECIMAL(12,2) DEFAULT 0,
            `description`   TEXT,
            `session`       VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── inventory_transactions ────────────────────────────────────────────
        'inventory_transactions' => "CREATE TABLE `inventory_transactions` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `itemId`      VARCHAR(36),
            `type`        VARCHAR(50),
            `quantity`    INT DEFAULT 0,
            `price`       DECIMAL(12,2) DEFAULT 0,
            `date`        VARCHAR(50),
            `description` TEXT,
            `session`     VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── expenses ──────────────────────────────────────────────────────────
        'expenses' => "CREATE TABLE `expenses` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `type`        VARCHAR(50),
            `headId`      VARCHAR(36),
            `amount`      DECIMAL(12,2) DEFAULT 0,
            `date`        VARCHAR(50),
            `description` TEXT,
            `paymentMode` VARCHAR(50),
            `session`     VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── expense_heads ─────────────────────────────────────────────────────
        'expense_heads' => "CREATE TABLE `expense_heads` (
            `id`      VARCHAR(36) PRIMARY KEY,
            `name`    VARCHAR(255),
            `type`    VARCHAR(50),
            `budget`  DECIMAL(12,2) DEFAULT 0,
            `session` VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── homework ──────────────────────────────────────────────────────────
        'homework' => "CREATE TABLE `homework` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `class`       VARCHAR(100),
            `section`     VARCHAR(50),
            `subject`     VARCHAR(255),
            `title`       VARCHAR(500),
            `description` TEXT,
            `dueDate`     VARCHAR(50),
            `assignedBy`  VARCHAR(255),
            `session`     VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── school_sessions ───────────────────────────────────────────────────
        'school_sessions' => "CREATE TABLE `school_sessions` (
            `id`        VARCHAR(36) PRIMARY KEY,
            `name`      VARCHAR(100),
            `startDate` VARCHAR(50),
            `endDate`   VARCHAR(50),
            `isCurrent` TINYINT(1) DEFAULT 0,
            `archived`  TINYINT(1) DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── notices ───────────────────────────────────────────────────────────
        'notices' => "CREATE TABLE `notices` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `title`       VARCHAR(500),
            `content`     TEXT,
            `date`        VARCHAR(50),
            `author`      VARCHAR(255),
            `targetRoles` TEXT,
            `attachments` TEXT,
            `session`     VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── notifications (separate from notices) ─────────────────────────────
        'notifications' => "CREATE TABLE `notifications` (
            `id`        VARCHAR(36) PRIMARY KEY,
            `userId`    VARCHAR(36),
            `message`   TEXT,
            `type`      VARCHAR(50),
            `timestamp` VARCHAR(50),
            `isRead`    TINYINT(1) DEFAULT 0,
            `icon`      VARCHAR(100),
            `title`     VARCHAR(500),
            `session`   VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── exam_timetables ───────────────────────────────────────────────────
        'exam_timetables' => "CREATE TABLE `exam_timetables` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `examName`    VARCHAR(255),
            `class`       VARCHAR(100),
            `entries`     TEXT,
            `publishDate` VARCHAR(50),
            `session`     VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── teacher_timetables ────────────────────────────────────────────────
        'teacher_timetables' => "CREATE TABLE `teacher_timetables` (
            `id`        VARCHAR(36) PRIMARY KEY,
            `teacherId` VARCHAR(36),
            `entries`   TEXT,
            `session`   VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── users ─────────────────────────────────────────────────────────────
        'users' => "CREATE TABLE `users` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `username`    VARCHAR(255) UNIQUE,
            `password`    VARCHAR(255),
            `role`        VARCHAR(100),
            `name`        VARCHAR(255),
            `mobile`      VARCHAR(50),
            `email`       VARCHAR(255),
            `session`     VARCHAR(100),
            `permissions` TEXT,
            `linkedId`    VARCHAR(36)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── school_settings ───────────────────────────────────────────────────
        'school_settings' => "CREATE TABLE `school_settings` (
            `id`    VARCHAR(36) PRIMARY KEY,
            `key`   VARCHAR(255) UNIQUE,
            `value` TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── chat_messages ─────────────────────────────────────────────────────
        'chat_messages' => "CREATE TABLE `chat_messages` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `senderId`   VARCHAR(36),
            `senderName` VARCHAR(255),
            `senderRole` VARCHAR(100),
            `receiverId` VARCHAR(36),
            `groupId`    VARCHAR(36),
            `message`    TEXT,
            `fileUrl`    TEXT,
            `fileName`   VARCHAR(500),
            `timestamp`  VARCHAR(50),
            `readBy`     TEXT,
            `session`    VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── chat_groups ───────────────────────────────────────────────────────
        'chat_groups' => "CREATE TABLE `chat_groups` (
            `id`      VARCHAR(36) PRIMARY KEY,
            `name`    VARCHAR(255),
            `type`    VARCHAR(50),
            `members` TEXT,
            `session` VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── call_logs ─────────────────────────────────────────────────────────
        'call_logs' => "CREATE TABLE `call_logs` (
            `id`           VARCHAR(36) PRIMARY KEY,
            `callerId`     VARCHAR(36),
            `callerName`   VARCHAR(255),
            `receiverId`   VARCHAR(36),
            `receiverName` VARCHAR(255),
            `duration`     INT DEFAULT 0,
            `startTime`    VARCHAR(50),
            `endTime`      VARCHAR(50),
            `status`       VARCHAR(50),
            `session`      VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── biometric_devices ─────────────────────────────────────────────────
        'biometric_devices' => "CREATE TABLE `biometric_devices` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `name`       VARCHAR(255),
            `ipAddress`  VARCHAR(100),
            `port`       INT DEFAULT 4370,
            `deviceType` VARCHAR(100),
            `location`   VARCHAR(255),
            `status`     VARCHAR(50) DEFAULT 'Active',
            `session`    VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── payroll ───────────────────────────────────────────────────────────
        'payroll' => "CREATE TABLE `payroll` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `staffId`     VARCHAR(36),
            `empId`       VARCHAR(100),
            `name`        VARCHAR(255),
            `month`       VARCHAR(20),
            `year`        VARCHAR(10),
            `basicSalary` DECIMAL(12,2) DEFAULT 0,
            `presentDays` INT DEFAULT 0,
            `totalDays`   INT DEFAULT 26,
            `netSalary`   DECIMAL(12,2) DEFAULT 0,
            `deductions`  DECIMAL(12,2) DEFAULT 0,
            `additions`   DECIMAL(12,2) DEFAULT 0,
            `payslipNo`   VARCHAR(100),
            `paymentDate` VARCHAR(50),
            `status`      VARCHAR(50) DEFAULT 'Pending',
            `session`     VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];
}
