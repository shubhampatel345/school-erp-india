<?php
/**
 * SHUBH SCHOOL ERP — Complete PHP API Backend v4.0
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
@ini_set('log_errors', '1');
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

try {

    // ── health ──────────────────────────────────────────────────────────────────
    if ($route === '' || $route === 'health') {
        $dbOk = false;
        try { getDB(); $dbOk = true; } catch (Throwable $e) {}
        json_success([
            'status'      => 'ok',
            'version'     => API_VERSION,
            'server'      => 'SHUBH SCHOOL ERP API v4.0',
            'server_time' => gmdate('c'),
            'dbConnected' => $dbOk,
            'routing'     => 'query-string (no .htaccess needed)',
            'columns'     => 'camelCase throughout',
        ], 'API is running');
    }

    // ── sync/status (no auth required) ─────────────────────────────────────────
    if ($route === 'sync/status') { handle_sync_status(); }

    // ── auth ────────────────────────────────────────────────────────────────────
    if ($route === 'auth/login')           { handle_auth_login($method, $body); }
    if ($route === 'auth/logout')          { json_success(null, 'Logged out'); }
    if ($route === 'auth/refresh')         { handle_auth_refresh($method, $body); }
    if ($route === 'auth/verify')          { handle_auth_verify($auth); }
    if ($route === 'auth/change-password') { handle_change_password($method, $body, $auth); }

    // ── migrate ──────────────────────────────────────────────────────────────────
    if ($route === 'migrate/run')              { handle_migrate_run($method); }
    if ($route === 'migrate/reset')            { handle_migrate_reset($method, $body, $auth); }
    if ($route === 'migrate/reset-db')         { handle_migrate_reset($method, $body, $auth); }
    if ($route === 'migrate/reset-superadmin') { handle_migrate_reset_superadmin($method); }
    if ($route === 'migrate/status')           { handle_migrate_status($method); }

    // ── sync ─────────────────────────────────────────────────────────────────────
    if ($route === 'sync/all')        { handle_sync_all($method, $auth); }
    if ($route === 'sync/push')       { handle_sync_push($method, $body, $auth); }
    if ($route === 'sync/push-batch') { handle_sync_push($method, $body, $auth); } // alias
    if ($route === 'sync/batch')      { handle_sync_single_batch($method, $body, $auth); }
    if ($route === 'sync/pull')       { handle_sync_pull($method, $auth); }

    // ── backup ───────────────────────────────────────────────────────────────────
    if ($route === 'backup/export')        { handle_backup_export($method, $auth); }
    if ($route === 'backup/import')        { handle_backup_import($method, $body, $auth); }
    if ($route === 'backup/history')       { handle_backup_history($method, $auth); }
    if ($route === 'backup/factory-reset') { handle_factory_reset($method, $body, $auth); }

    // ── changelog ────────────────────────────────────────────────────────────────
    if ($route === 'changelog/list')  { handle_changelog_list($method, $auth); }

    // ── users ────────────────────────────────────────────────────────────────────
    if ($route === 'users/list')           { handle_users_list($method, $auth); }
    if ($route === 'users/create')         { handle_users_create($method, $body, $auth); }
    if ($route === 'users/update')         { handle_users_update($method, $body, $auth); }
    if ($route === 'users/delete')         { handle_users_delete($method, $body, $auth); }
    if ($route === 'users/reset-password') { handle_users_reset_password($method, $body, $auth); }

    // ── permissions ──────────────────────────────────────────────────────────────
    if ($route === 'permissions/get')    { handle_permissions_get($method, $auth); }
    if ($route === 'permissions/update') { handle_permissions_update($method, $body, $auth); }

    // ── settings ─────────────────────────────────────────────────────────────────
    if ($route === 'settings/school') { handle_settings_school($method, $body, $auth); }

    // ── stats / counts (no auth for dashboard widgets) ───────────────────────────
    if ($route === 'stats')           { handle_stats(); }
    if ($route === 'staff/count')     { handle_staff_count(); }
    if ($route === 'students/count')  { handle_students_count(); }

    // ── files/upload ─────────────────────────────────────────────────────────────
    if ($route === 'files/upload') { handle_files_upload($method, $auth); }

    // ── collection CRUD: {collection}/list|get|save|create|update|delete|batch ──
    $collectionMap = collection_table_map();
    foreach (array_keys($collectionMap) as $col) {
        // exact: students/list, students/get, students/save ...
        if ($route === "{$col}/list")   { handle_col_list($method, $col, $auth); }
        if ($route === "{$col}/get")    { handle_col_get($method, $col, $auth); }
        if ($route === "{$col}/save")   { handle_col_save($method, $col, $body, $auth); }
        if ($route === "{$col}/create") { handle_col_create($method, $col, $body, $auth); }
        if ($route === "{$col}/update") { handle_col_update($method, $col, $body, $auth); }
        if ($route === "{$col}/delete") { handle_col_delete($method, $col, $auth); }
        if ($route === "{$col}/batch")  { handle_col_batch($method, $col, $body, $auth); }
    }

    // ── face recognition attendance ──────────────────────────────────────────────
    if ($route === 'face_descriptors')       { handle_face_descriptors($method, $body, $auth); }
    if ($route === 'face_attendance')        { handle_face_attendance($method, $body, $auth); }

    // ── library ──────────────────────────────────────────────────────────────────
    if ($route === 'library_books')          { handle_library_books($method, $body, $auth); }
    if ($route === 'book_issues')            { handle_book_issues($method, $body, $auth); }

    // ── online exams ─────────────────────────────────────────────────────────────
    if ($route === 'online_exams')           { handle_online_exams($method, $body, $auth); }
    if ($route === 'exam_attempts')          { handle_exam_attempts($method, $body, $auth); }

    // ── GPS transport tracking ───────────────────────────────────────────────────
    if ($route === 'driver_location')        { handle_driver_location($method, $body, $auth); }
    if ($route === 'transport_trips')        { handle_transport_trips($method, $body, $auth); }

    // ── broadcast ────────────────────────────────────────────────────────────────
    if ($route === 'broadcast_campaigns')    { handle_broadcast_campaigns($method, $body, $auth); }
    if ($route === 'broadcast/send')         { handle_broadcast_send($method, $body, $auth); }

    // ── push notifications ───────────────────────────────────────────────────────
    if ($route === 'push_subscriptions')     { handle_push_subscriptions($method, $body, $auth); }
    if ($route === 'push_notifications/send'){ handle_push_notifications_send($method, $body, $auth); }

    // ── student analytics ────────────────────────────────────────────────────────
    if ($route === 'analytics/student')      { handle_analytics_student($method, $auth); }

    // ── legacy data/{collection} generic CRUD ────────────────────────────────────
    if (preg_match('#^data/([a-zA-Z0-9_]+)$#', $route, $m)) {
        handle_data_collection($method, $m[1], $body, $auth, null);
    }
    if (preg_match('#^data/([a-zA-Z0-9_]+)/(.+)$#', $route, $m)) {
        handle_data_collection($method, $m[1], $body, $auth, $m[2]);
    }

    json_error('Route not found: ' . $route, 404);

} catch (PDOException $e) {
    json_error('Database error: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    json_error('Server error: ' . $e->getMessage(), 500);
}


// =============================================================================
// SYNC / STATUS — no auth required
// =============================================================================
function handle_sync_status(): void {
    $connected = false;
    $dbVersion = null;
    $counts    = [];

    $tables = array_values(array_unique(array_values(collection_table_map())));

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

    json_success([
        'version'     => API_VERSION,
        'db_version'  => $dbVersion,
        'server_time' => gmdate('c'),
        'connected'   => $connected,
        'synced'      => $connected,
        'counts'      => $counts,
        // camelCase aliases used by frontend
        'students'    => $counts['students'] ?? 0,
        'staff'       => $counts['staff'] ?? 0,
        'classes'     => $counts['classes'] ?? 0,
        'sessions'    => $counts['school_sessions'] ?? 0,
    ]);
}


// =============================================================================
// AUTH
// =============================================================================
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

    $stmt = $db->prepare('SELECT * FROM `users` WHERE `username`=:u LIMIT 1');
    $stmt->execute([':u' => $username]);
    $user = $stmt->fetch();

    if (!$user) json_error('Invalid username or password', 401);

    if (!verify_password($password, $user['password'] ?? '')) {
        json_error('Invalid username or password', 401);
    }

    $now     = time();
    $payload = [
        'user_id'   => $user['id'],
        'school_id' => 1,
        'role'      => $user['role'],
        'name'      => $user['fullName'] ?? $user['name'] ?? $username,
        'username'  => $user['username'],
        'iat'       => $now,
        'exp'       => $now + JWT_EXPIRY,
    ];
    $token        = jwt_encode($payload);
    $refreshPayload = array_merge($payload, ['exp' => $now + JWT_REFRESH, 'is_refresh' => true]);
    $refreshToken = jwt_encode($refreshPayload);

    json_success([
        'token'        => $token,
        'refreshToken' => $refreshToken,
        'expires_in'   => JWT_EXPIRY,
        'user'         => [
            'id'       => $user['id'],
            'username' => $user['username'],
            'name'     => $user['fullName'] ?? $user['name'] ?? $username,
            'fullName' => $user['fullName'] ?? $user['name'] ?? $username,
            'role'     => $user['role'],
            'mobile'   => $user['mobile'] ?? '',
            'email'    => $user['email'] ?? '',
        ],
    ], 'Login successful');
}

function handle_auth_refresh(string $method, array $body): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    $rt = $body['refreshToken'] ?? $body['refresh_token'] ?? $body['token'] ?? '';
    if (!$rt) json_error('refreshToken is required', 400);

    $payload = jwt_verify($rt);
    if (!$payload) json_error('Invalid or expired token', 401);

    $now = time();
    $np  = array_merge($payload, ['iat' => $now, 'exp' => $now + JWT_EXPIRY]);
    unset($np['is_refresh']);
    json_success(['token' => jwt_encode($np), 'expires_in' => JWT_EXPIRY], 'Token refreshed');
}

function handle_auth_verify(?array $auth): void {
    if (!$auth) json_error('Token invalid or expired', 401);

    try {
        $db   = getDB();
        $stmt = $db->prepare('SELECT `id`,`username`,`role`,`name`,`fullName`,`mobile`,`email` FROM `users` WHERE `id`=:id LIMIT 1');
        $stmt->execute([':id' => $auth['user_id'] ?? '']);
        $user = $stmt->fetch();
        if (!$user) json_error('User not found', 401);
        $user['fullName'] = $user['fullName'] ?? $user['name'] ?? '';
        json_success(['valid' => true, 'user' => $user]);
    } catch (Throwable $e) {
        json_success(['valid' => true, 'user' => [
            'id'   => $auth['user_id'] ?? '',
            'role' => $auth['role'] ?? '',
        ]]);
    }
}

function handle_change_password(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $newPassword = $body['newPassword'] ?? $body['new_password'] ?? '';
    $oldPassword = $body['oldPassword'] ?? $body['old_password'] ?? '';
    if (strlen($newPassword) < 6) json_error('New password must be at least 6 characters', 400);

    $targetId     = $body['userId'] ?? $body['user_id'] ?? ($auth['user_id'] ?? '');
    $isSuperAdmin = is_superadmin($auth);
    $isSelf       = ($auth['user_id'] ?? '') == $targetId;

    if (!$isSuperAdmin && !$isSelf) json_error('Forbidden', 403);

    $db = getDB();

    // If changing own password, verify old password
    if ($isSelf && !$isSuperAdmin && $oldPassword) {
        $stmt = $db->prepare('SELECT `password` FROM `users` WHERE `id`=:id LIMIT 1');
        $stmt->execute([':id' => $targetId]);
        $row = $stmt->fetch();
        if ($row && !verify_password($oldPassword, $row['password'] ?? '')) {
            json_error('Current password is incorrect', 401);
        }
    }

    $hash = hash_password($newPassword);
    try {
        $db->prepare('UPDATE `users` SET `password`=:h WHERE `id`=:id')
           ->execute([':h' => $hash, ':id' => $targetId]);
    } catch (Throwable $e) {
        json_error('Failed to update password: ' . $e->getMessage(), 500);
    }
    json_success(null, 'Password changed successfully');
}


// =============================================================================
// MIGRATE
// =============================================================================
function handle_migrate_run(string $method): void {
    if (!in_array($method, ['GET', 'POST'], true)) json_error('Method not allowed', 405);

    try {
        $db = getDB();
    } catch (Throwable $e) {
        json_error('Database connection failed: ' . $e->getMessage() . '. Check config.php.', 503);
    }

    $applied = [];
    $errors  = [];

    foreach (get_table_definitions() as $tableName => $createSql) {
        $safeSql = str_replace(
            "CREATE TABLE `{$tableName}`",
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

    $seedResult = seed_superadmin_user($db);
    seed_default_settings($db);
    seed_default_session($db);
    seed_default_permissions($db);

    json_success([
        'applied'  => $applied,
        'errors'   => $errors,
        'seeded'   => $seedResult,
        'message'  => count($applied) . ' tables ensured. Login: superadmin / admin123',
    ], 'Migration complete. Login with superadmin / admin123');
}

function handle_migrate_reset(string $method, array $body, ?array $auth): void {
    if (!in_array($method, ['GET', 'POST'], true)) json_error('Method not allowed', 405);

    $isAuthed        = is_superadmin($auth);
    $hasConfirmation = ($body['confirmation'] ?? '') === 'RESET_DB_TABLES';

    if (!$isAuthed && !$hasConfirmation && $method !== 'GET') {
        json_error_coded(
            'Authentication required OR provide confirmation=RESET_DB_TABLES in body.',
            401, 'AUTH_REQUIRED'
        );
    }

    try {
        $db = getDB();
    } catch (Throwable $e) {
        json_error('Database connection failed: ' . $e->getMessage(), 503);
    }

    $dropped = [];
    $created = [];
    $errors  = [];

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

    $seedResult = seed_superadmin_user($db, true);
    seed_default_settings($db);
    seed_default_session($db);
    seed_default_permissions($db);

    json_success([
        'dropped' => $dropped,
        'created' => $created,
        'errors'  => $errors,
        'seeded'  => $seedResult,
        'note'    => 'All tables rebuilt with camelCase columns. Login: superadmin / admin123',
    ], count($created) . ' tables reset. Login: superadmin / admin123');
}

function handle_migrate_reset_superadmin(string $method): void {
    if (!in_array($method, ['GET', 'POST'], true)) json_error('Method not allowed', 405);

    try {
        $db = getDB();
    } catch (Throwable $e) {
        json_error('Run ?route=migrate/run first.', 503);
    }

    try {
        $db->prepare("DELETE FROM `users` WHERE `username`='superadmin'")->execute();
    } catch (Throwable $e) {}

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

function seed_superadmin_user(PDO $db, bool $force = false): string {
    $hash = hash_password('admin123');

    try {
        $db->exec("CREATE TABLE IF NOT EXISTS `users` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `username`    VARCHAR(255) UNIQUE,
            `password`    VARCHAR(255),
            `role`        VARCHAR(100),
            `fullName`    VARCHAR(255),
            `name`        VARCHAR(255),
            `mobile`      VARCHAR(50),
            `email`       VARCHAR(255),
            `session`     VARCHAR(100),
            `permissions` TEXT,
            `linkedId`    VARCHAR(36),
            `createdAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updatedAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $e) {}

    $stmt = $db->prepare("SELECT `id` FROM `users` WHERE `username`='superadmin' LIMIT 1");
    $stmt->execute();
    $existing = $stmt->fetch();
    $id       = 'superadmin-' . date('Y');

    if (!$existing) {
        try {
            $db->prepare("INSERT INTO `users` (`id`,`username`,`password`,`role`,`fullName`,`name`) VALUES (:id,'superadmin',:pw,'superadmin','Super Admin','Super Admin')")
               ->execute([':id' => $id, ':pw' => $hash]);
            return 'superadmin created';
        } catch (Throwable $e) {
            return 'superadmin insert failed: ' . $e->getMessage();
        }
    }

    if ($force) {
        try {
            $db->prepare("UPDATE `users` SET `password`=:pw, `role`='superadmin', `fullName`='Super Admin', `name`='Super Admin' WHERE `username`='superadmin'")
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
                ['key' => 'school_name', 'value' => 'SHUBH SCHOOL ERP'],
                ['key' => 'session',     'value' => date('Y') . '-' . substr((string)(date('Y') + 1), 2)],
                ['key' => 'currency',    'value' => 'INR'],
            ];
            $ins = $db->prepare("INSERT IGNORE INTO `school_settings` (`id`,`key`,`value`) VALUES (UUID(),:k,:v)");
            foreach ($defaults as $d) {
                $ins->execute([':k' => $d['key'], ':v' => $d['value']]);
            }
        }
    } catch (Throwable $e) {}
}

function seed_default_session(PDO $db): void {
    try {
        $check = $db->query("SELECT COUNT(*) FROM `school_sessions`");
        if ($check && (int)$check->fetchColumn() === 0) {
            $year  = (int)date('Y');
            $label = $year . '-' . substr((string)($year + 1), 2);
            $id    = 'sess-' . $year;
            $db->prepare("INSERT IGNORE INTO `school_sessions`
                (`id`,`label`,`name`,`startYear`,`endYear`,`isActive`,`isCurrent`,`isArchived`,`createdAt`)
                VALUES (:id,:label,:name,:sy,:ey,1,1,0,:ca)")
               ->execute([':id'=>$id, ':label'=>$label, ':name'=>$label, ':sy'=>$year, ':ey'=>$year+1, ':ca'=>now_str()]);
        }
    } catch (Throwable $e) {}
}

function seed_default_permissions(PDO $db): void {
    try {
        $check = $db->query("SELECT COUNT(*) FROM `permissions`");
        if ($check && (int)$check->fetchColumn() === 0) {
            $modules = [
                'students','fees','attendance','staff','transport','inventory',
                'expenses','homework','alumni','reports','settings','users',
                'classes','subjects','notices','exams','payroll','chat',
            ];
            $roles = [
                'superadmin' => [1,1,1,1],
                'admin'      => [1,1,1,1],
                'teacher'    => [1,0,1,0],
                'receptionist'=>[1,1,1,0],
                'accountant' => [1,1,1,0],
                'parent'     => [1,0,0,0],
                'student'    => [1,0,0,0],
            ];
            $ins = $db->prepare("INSERT IGNORE INTO `permissions`
                (`id`,`role`,`module`,`canRead`,`canWrite`,`canAdd`,`canDelete`)
                VALUES (UUID(),:role,:module,:read,:write,:add,:delete)");
            foreach ($roles as $role => [$r,$w,$a,$d]) {
                foreach ($modules as $mod) {
                    $ins->execute([':role'=>$role, ':module'=>$mod, ':read'=>$r, ':write'=>$w, ':add'=>$a, ':delete'=>$d]);
                }
            }
        }
    } catch (Throwable $e) {}
}


// =============================================================================
// SYNC / ALL — returns every collection in one request
// =============================================================================
function handle_sync_all(string $method, ?array $auth): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $db     = getDB();
    $result = [];

    // changelog: last 1000 entries only
    $collectionMap = collection_table_map();
    foreach ($collectionMap as $key => $table) {
        // Deduplicate by table (multiple keys may map to same table)
        if (isset($result[$key])) continue;
        try {
            if ($key === 'changelog') {
                $stmt = $db->query("SELECT * FROM `{$table}` ORDER BY `createdAt` DESC LIMIT 1000");
            } else {
                $stmt = $db->query("SELECT * FROM `{$table}`");
            }
            $rows = $stmt ? $stmt->fetchAll() : [];
            // Post-process
            $rows = post_process_rows($rows, $table);
            $result[$key] = $rows;
        } catch (Throwable $e) {
            $result[$key] = [];
        }
    }

    // Ensure expected keys exist (frontend may expect them even if empty)
    $expected = [
        'students','staff','classes','feeHeadings','feesPlans','feeReceipts',
        'attendanceRecords','routes','sessions','subjects','inventory',
        'expenses','homework','alumni','users','permissions',
        'chatMessages','chatGroups','calls','notifications','changelog',
    ];
    foreach ($expected as $k) {
        if (!isset($result[$k])) $result[$k] = [];
    }

    json_success($result, 'All collections fetched');
}

// Post-process rows for specific tables (decode JSON fields, add aliases)
function post_process_rows(array $rows, string $table): array {
    if (empty($rows)) return $rows;

    foreach ($rows as &$row) {
        if ($table === 'classes') {
            if (isset($row['sections']) && is_string($row['sections'])) {
                $d = json_decode($row['sections'], true);
                if (is_array($d)) $row['sections'] = $d;
            }
            if (empty($row['className']) && !empty($row['name'])) $row['className'] = $row['name'];
            if (empty($row['name']) && !empty($row['className']))  $row['name'] = $row['className'];
        }
        if ($table === 'school_sessions') {
            if (empty($row['label']))      $row['label']      = $row['name'] ?? '';
            if (!isset($row['isActive']))  $row['isActive']   = (bool)($row['isCurrent'] ?? 0);
            if (!isset($row['isArchived']))$row['isArchived']  = (bool)($row['archived'] ?? 0);
        }
        if ($table === 'students') {
            if (empty($row['fullName']) && !empty($row['name'])) $row['fullName'] = $row['name'];
            if (empty($row['name']) && !empty($row['fullName'])) $row['name'] = $row['fullName'];
        }
        if ($table === 'staff') {
            if (empty($row['fullName']) && !empty($row['name'])) $row['fullName'] = $row['name'];
            if (empty($row['name']) && !empty($row['fullName'])) $row['name'] = $row['fullName'];
        }
        if ($table === 'fees_plan') {
            // Decode amounts JSON → object so frontend parseAmounts() receives a real object
            if (isset($row['amounts']) && is_string($row['amounts']) && $row['amounts'] !== '') {
                $decoded = json_decode($row['amounts'], true);
                if (is_array($decoded)) $row['amounts'] = $decoded;
            }
            // Ensure classId / sectionId aliases are populated
            if (empty($row['classId'])   && !empty($row['class']))   $row['classId']   = $row['class'];
            if (empty($row['class'])     && !empty($row['classId'])) $row['class']     = $row['classId'];
            if (empty($row['sectionId']) && !empty($row['section'])) $row['sectionId'] = $row['section'];
            if (empty($row['section'])   && !empty($row['sectionId'])) $row['section'] = $row['sectionId'];
        }
        if ($table === 'fee_headings') {
            // Decode JSON array fields
            foreach (['months', 'applicableClasses'] as $field) {
                if (isset($row[$field]) && is_string($row[$field]) && $row[$field] !== '') {
                    $d = json_decode($row[$field], true);
                    if (is_array($d)) $row[$field] = $d;
                }
            }
            // Default isActive to true if column not present in older tables
            if (!array_key_exists('isActive', $row)) $row['isActive'] = true;
            else $row['isActive'] = (bool)$row['isActive'];
            $row['displayOrder'] = (int)($row['displayOrder'] ?? 0);
        }
    }
    unset($row);
    return $rows;
}


// =============================================================================
// SYNC / PUSH — bulk upsert, all collections or single collection
// =============================================================================
function handle_sync_push(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error_coded('Token expired or missing. Please re-authenticate.', 401, 'TOKEN_EXPIRED');
    if (!is_superadmin($auth)) json_error_coded('Super Admin access required.', 403, 'FORBIDDEN');

    // Single-collection format: { collection, items }
    if (isset($body['collection']) && isset($body['items'])) {
        handle_sync_single_batch($method, $body, $auth);
        return;
    }

    $db         = getDB();
    $tableMap   = collection_table_map();
    $results    = [];

    foreach ($tableMap as $key => $table) {
        $records = $body[$key] ?? [];
        if (empty($records) || !is_array($records)) continue;
        $result           = batchUpsert($db, $table, $records, $auth);
        $results[$key]    = [
            'pushed' => $result['pushed'],
            'failed' => $result['failed'],
            'errors' => $result['errors'],
        ];
    }

    json_success(['results' => $results], 'Push complete');
}

function handle_sync_single_batch(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error_coded('Token expired or missing. Please re-authenticate.', 401, 'TOKEN_EXPIRED');
    if (!is_superadmin($auth)) json_error_coded('Super Admin access required.', 403, 'FORBIDDEN');

    $collection = trim($body['collection'] ?? '');
    $items      = $body['items'] ?? $body['records'] ?? [];
    if ($collection === '') json_error('collection is required', 400);
    if (!is_array($items))  json_error('items must be an array', 400);

    $tableMap = collection_table_map();
    if (!isset($tableMap[$collection])) json_error("Unknown collection: {$collection}", 400);

    $table  = $tableMap[$collection];
    $db     = getDB();
    $result = batchUpsert($db, $table, $items, $auth);

    json_success([
        'pushed'     => $result['pushed'],
        'failed'     => $result['failed'],
        'total'      => count($items),
        'errors'     => $result['errors'],
        'collection' => $collection,
    ], "{$result['pushed']} of " . count($items) . " records saved");
}

function handle_sync_pull(string $method, ?array $auth): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $db    = getDB();
    $since = $_GET['since'] ?? null;
    $pull  = [];

    foreach (array_unique(array_values(collection_table_map())) as $table) {
        try {
            $stmt = $db->prepare("SELECT * FROM `{$table}`");
            $stmt->execute();
            $rows = $stmt->fetchAll();
            if (!empty($rows)) $pull[$table] = post_process_rows($rows, $table);
        } catch (Throwable $e) {}
    }

    json_success(['pulled_at' => gmdate('c'), 'since' => $since, 'tables' => $pull]);
}


// =============================================================================
// BATCH UPSERT — positional ? params — no HY093 possible
// =============================================================================
function batchUpsert(PDO $pdo, string $table, array $rows, ?array $auth = null): array {
    if (empty($rows)) return ['pushed' => 0, 'failed' => 0, 'errors' => []];

    $pushed = 0;
    $failed = 0;
    $errors = [];

    // Normalize field names before touching the DB
    $rows = normalize_rows($table, $rows);

    // Get live column list to skip unknown fields
    $tableColumns = [];
    try {
        $stmt = $pdo->query("DESCRIBE `{$table}`");
        $tableColumns = $stmt ? $stmt->fetchAll(PDO::FETCH_COLUMN, 0) : [];
    } catch (Throwable $e) {}

    foreach ($rows as $idx => $row) {
        if (!is_array($row)) {
            $failed++;
            $errors[] = "Row {$idx}: not an object";
            continue;
        }

        $filteredRow = [];
        foreach ($row as $k => $v) {
            if (!preg_match('/^[a-zA-Z0-9_]+$/', (string)$k)) continue;
            if (!empty($tableColumns) && !in_array($k, $tableColumns, true)) continue;
            if (is_array($v) || is_object($v)) {
                $filteredRow[$k] = json_encode($v, JSON_UNESCAPED_UNICODE);
            } elseif ($v === 'undefined' || $v === 'null') {
                // JS serialized undefined/null → store as empty string, never as NULL
                $filteredRow[$k] = '';
            } elseif (is_scalar($v) || is_null($v)) {
                // Keep real NULL only if it is PHP null (not a string)
                $filteredRow[$k] = $v;
            }
        }

        if (empty($filteredRow)) {
            $failed++;
            $errors[] = "Row {$idx}: no valid columns for table '{$table}'";
            continue;
        }

        $columns      = array_keys($filteredRow);
        $values       = array_values($filteredRow);
        $colList      = implode(', ', array_map(fn($c) => "`{$c}`", $columns));
        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        $updateParts  = array_map(fn($c) => "`{$c}` = VALUES(`{$c}`)", $columns);
        $updateClause = implode(', ', $updateParts);

        $sql = "INSERT INTO `{$table}` ({$colList}) VALUES ({$placeholders}) ON DUPLICATE KEY UPDATE {$updateClause}";

        try {
            $pdo->prepare($sql)->execute($values);
            $pushed++;
            // Changelog auto-write for non-changelog tables
            if ($table !== 'changelog' && $auth) {
                write_changelog($pdo, $auth, $table, 'upsert', $filteredRow['id'] ?? null, null, $filteredRow);
            }
        } catch (PDOException $e) {
            $failed++;
            $msg = $e->getMessage();
            if (strpos($msg, "doesn't exist") !== false) {
                $errors[] = "Row {$idx}: Table '{$table}' missing — run ?route=migrate/run";
            } elseif (strpos($msg, '42S22') !== false || stripos($msg, 'Unknown column') !== false) {
                $errors[] = "Row {$idx}: Column mismatch in '{$table}' — run ?route=migrate/reset-db";
            } else {
                $errors[] = "Row {$idx}: {$msg}";
            }
        }
    }

    return ['pushed' => $pushed, 'failed' => $failed, 'errors' => $errors];
}

// Normalize rows: fix field aliases, JSON-encode arrays, sanitize undefined strings
function normalize_rows(string $table, array $rows): array {
    foreach ($rows as &$row) {
        if (!is_array($row)) continue;

        // Convert the string "undefined" / "null" from JS serialization → empty string
        foreach ($row as $k => &$v) {
            if ($v === 'undefined' || $v === 'null' || $v === null) {
                $v = '';
            }
        }
        unset($v);

        if ($table === 'students') {
            // Always sync fullName ↔ name regardless of which side has a value
            $fn = !empty($row['fullName']) ? $row['fullName'] : ($row['name'] ?? '');
            $row['fullName'] = $fn;
            $row['name']     = $fn;
            if (!empty($row['sessionId']) && empty($row['session'])) $row['session'] = $row['sessionId'];
            if (!empty($row['session'])   && empty($row['sessionId'])) $row['sessionId'] = $row['session'];
            // father_mobile → fatherMobile alias
            if (empty($row['fatherMobile']) && !empty($row['father_mobile'])) {
                $row['fatherMobile'] = $row['father_mobile'];
            }
        }
        if ($table === 'staff') {
            $n = !empty($row['fullName']) ? $row['fullName'] : ($row['name'] ?? '');
            $row['fullName'] = $n;
            $row['name']     = $n;
        }
        if ($table === 'classes') {
            if (!empty($row['className']) && empty($row['name'])) $row['name'] = $row['className'];
            if (!empty($row['name']) && empty($row['className'])) $row['className'] = $row['name'];
            if (isset($row['sections']) && is_array($row['sections'])) {
                $row['sections'] = json_encode($row['sections'], JSON_UNESCAPED_UNICODE);
            }
        }
        if ($table === 'school_sessions') {
            if (!empty($row['label']) && empty($row['name'])) $row['name'] = $row['label'];
            if (isset($row['isActive']))   $row['isCurrent']  = $row['isActive']  ? 1 : 0;
            if (isset($row['isArchived'])) $row['archived']   = $row['isArchived'] ? 1 : 0;
        }
        if ($table === 'fees_plan') {
            // Ensure classId / class aliases are both set
            if (!empty($row['classId'])   && empty($row['class']))    $row['class']    = $row['classId'];
            if (!empty($row['class'])     && empty($row['classId']))  $row['classId']  = $row['class'];
            if (!empty($row['className']) && empty($row['classId']))  $row['classId']  = $row['className'];
            if (!empty($row['sectionId']) && empty($row['section']))  $row['section']  = $row['sectionId'];
            if (!empty($row['section'])   && empty($row['sectionId']))$row['sectionId']= $row['section'];
            // sessionId ↔ session
            if (!empty($row['sessionId']) && empty($row['session']))  $row['session']  = $row['sessionId'];
            if (!empty($row['session'])   && empty($row['sessionId']))$row['sessionId']= $row['session'];
        }
        if ($table === 'fee_headings') {
            // sessionId ↔ session
            if (!empty($row['sessionId']) && empty($row['session']))  $row['session']  = $row['sessionId'];
            if (!empty($row['session'])   && empty($row['sessionId']))$row['sessionId']= $row['session'];
        }
        // Generic: JSON-encode any remaining array values
        foreach ($row as $k => &$v) {
            if (is_array($v) || is_object($v)) {
                $v = json_encode($v, JSON_UNESCAPED_UNICODE);
            }
        }
        unset($v);
    }
    unset($row);
    return $rows;
}


// =============================================================================
// CHANGELOG
// =============================================================================
function write_changelog(PDO $db, ?array $auth, string $module, string $action, ?string $recordId, $oldValue, $newValue): void {
    try {
        $db->prepare("INSERT IGNORE INTO `changelog`
            (`id`,`userId`,`username`,`role`,`module`,`action`,`recordId`,`oldValue`,`newValue`,`createdAt`)
            VALUES (UUID(),:uid,:uname,:role,:module,:action,:rid,:old,:new,:ca)")
           ->execute([
               ':uid'    => $auth['user_id'] ?? 'system',
               ':uname'  => $auth['username'] ?? $auth['name'] ?? 'system',
               ':role'   => $auth['role'] ?? 'system',
               ':module' => $module,
               ':action' => $action,
               ':rid'    => $recordId,
               ':old'    => $oldValue ? json_encode($oldValue) : null,
               ':new'    => $newValue ? json_encode($newValue) : null,
               ':ca'     => now_str(),
           ]);
    } catch (Throwable $e) {}
}

function handle_changelog_list(string $method, ?array $auth): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $limit = min((int)($_GET['limit'] ?? 500), 1000);
    try {
        $db   = getDB();
        $stmt = $db->prepare("SELECT * FROM `changelog` ORDER BY `createdAt` DESC LIMIT {$limit}");
        $stmt->execute();
        json_success($stmt->fetchAll());
    } catch (Throwable $e) {
        json_success([]);
    }
}


// =============================================================================
// USERS (Super Admin only for write operations)
// =============================================================================
function handle_users_list(string $method, ?array $auth): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!is_superadmin($auth)) json_error('Super Admin only', 403);

    try {
        $db   = getDB();
        $stmt = $db->query("SELECT `id`,`username`,`role`,`fullName`,`name`,`mobile`,`email`,`linkedId`,`createdAt` FROM `users`");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['fullName'] = $r['fullName'] ?? $r['name'] ?? '';
            unset($r['password']);
        }
        unset($r);
        json_success($rows);
    } catch (Throwable $e) {
        json_success([]);
    }
}

function handle_users_create(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!is_superadmin($auth)) json_error('Super Admin only', 403);

    $username = trim($body['username'] ?? '');
    $password = trim($body['password'] ?? 'admin123');
    $role     = $body['role'] ?? 'teacher';
    $fullName = $body['fullName'] ?? $body['name'] ?? $username;
    $mobile   = $body['mobile'] ?? '';
    $email    = $body['email'] ?? '';
    $linkedId = $body['linkedId'] ?? null;

    if (!$username) json_error('username is required', 400);
    if (strlen($password) < 6) json_error('Password must be at least 6 characters', 400);

    $hash = hash_password($password);
    $id   = gen_uuid();

    $db = getDB();
    try {
        $db->prepare("INSERT INTO `users` (`id`,`username`,`password`,`role`,`fullName`,`name`,`mobile`,`email`,`linkedId`,`createdAt`)
            VALUES (:id,:u,:h,:r,:fn,:fn2,:mob,:email,:lid,NOW())")
           ->execute([
               ':id'=>$id, ':u'=>$username, ':h'=>$hash, ':r'=>$role,
               ':fn'=>$fullName, ':fn2'=>$fullName, ':mob'=>$mobile,
               ':email'=>$email, ':lid'=>$linkedId,
           ]);
    } catch (Throwable $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            json_error("Username '{$username}' already exists", 409);
        }
        json_error('Failed to create user: ' . $e->getMessage(), 500);
    }

    write_changelog($db, $auth, 'users', 'create', $id, null, ['username'=>$username,'role'=>$role]);
    json_success(['id' => $id, 'username' => $username, 'role' => $role], 'User created', 201);
}

function handle_users_update(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!is_superadmin($auth)) json_error('Super Admin only', 403);

    $id = $body['id'] ?? '';
    if (!$id) json_error('id is required', 400);

    $db   = getDB();
    $sets = [];
    $vals = [];

    $allowed = ['role','fullName','name','mobile','email','linkedId'];
    foreach ($allowed as $field) {
        if (isset($body[$field])) {
            $sets[] = "`{$field}`=?";
            $vals[] = $body[$field];
        }
    }
    // Sync fullName ↔ name
    if (isset($body['fullName']) && !isset($body['name'])) {
        $sets[] = '`name`=?'; $vals[] = $body['fullName'];
    }
    if (isset($body['name']) && !isset($body['fullName'])) {
        $sets[] = '`fullName`=?'; $vals[] = $body['name'];
    }
    if (!empty($body['password'])) {
        $sets[] = '`password`=?';
        $vals[] = hash_password($body['password']);
    }

    if (empty($sets)) json_error('No valid fields to update', 400);

    $vals[] = $id;
    try {
        $db->prepare("UPDATE `users` SET " . implode(',', $sets) . " WHERE `id`=?")->execute($vals);
    } catch (Throwable $e) {
        json_error('Update failed: ' . $e->getMessage(), 500);
    }

    write_changelog($db, $auth, 'users', 'update', $id, null, $body);
    json_success(['id' => $id], 'User updated');
}

function handle_users_delete(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!is_superadmin($auth)) json_error('Super Admin only', 403);

    $id = $body['id'] ?? $_GET['id'] ?? '';
    if (!$id) json_error('id is required', 400);

    // Prevent deleting superadmin
    $db   = getDB();
    $stmt = $db->prepare("SELECT `username` FROM `users` WHERE `id`=:id LIMIT 1");
    $stmt->execute([':id' => $id]);
    $u = $stmt->fetch();
    if ($u && $u['username'] === 'superadmin') json_error('Cannot delete the superadmin account', 403);

    try {
        $db->prepare("DELETE FROM `users` WHERE `id`=:id")->execute([':id' => $id]);
    } catch (Throwable $e) {
        json_error('Delete failed: ' . $e->getMessage(), 500);
    }

    write_changelog($db, $auth, 'users', 'delete', $id, null, null);
    json_success(null, 'User deleted');
}

function handle_users_reset_password(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!is_superadmin($auth)) json_error('Super Admin only', 403);

    $id          = $body['id'] ?? $body['userId'] ?? '';
    $newPassword = $body['newPassword'] ?? $body['password'] ?? 'admin123';
    if (!$id) json_error('id is required', 400);

    $hash = hash_password($newPassword);
    $db   = getDB();
    try {
        $db->prepare("UPDATE `users` SET `password`=? WHERE `id`=?")->execute([$hash, $id]);
    } catch (Throwable $e) {
        json_error('Failed: ' . $e->getMessage(), 500);
    }

    write_changelog($db, $auth, 'users', 'reset_password', $id, null, null);
    json_success(null, 'Password reset successfully');
}


// =============================================================================
// PERMISSIONS
// =============================================================================
function handle_permissions_get(string $method, ?array $auth): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $role = $_GET['role'] ?? ($auth['role'] ?? '');
    try {
        $db   = getDB();
        $stmt = $db->prepare("SELECT * FROM `permissions` WHERE `role`=:role");
        $stmt->execute([':role' => $role]);
        $rows = $stmt->fetchAll();
        // Convert to {module: {canRead,canWrite,canAdd,canDelete}} map
        $matrix = [];
        foreach ($rows as $r) {
            $matrix[$r['module']] = [
                'canRead'   => (bool)$r['canRead'],
                'canWrite'  => (bool)$r['canWrite'],
                'canAdd'    => (bool)$r['canAdd'],
                'canDelete' => (bool)$r['canDelete'],
            ];
        }
        json_success(['role' => $role, 'permissions' => $matrix]);
    } catch (Throwable $e) {
        json_success(['role' => $role, 'permissions' => []]);
    }
}

function handle_permissions_update(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!is_superadmin($auth)) json_error('Super Admin only', 403);

    $role        = $body['role'] ?? '';
    $permissions = $body['permissions'] ?? [];
    if (!$role) json_error('role is required', 400);

    $db  = getDB();
    $ins = $db->prepare("INSERT INTO `permissions`
        (`id`,`role`,`module`,`canRead`,`canWrite`,`canAdd`,`canDelete`)
        VALUES (UUID(),:role,:module,:read,:write,:add,:delete)
        ON DUPLICATE KEY UPDATE `canRead`=VALUES(`canRead`),`canWrite`=VALUES(`canWrite`),`canAdd`=VALUES(`canAdd`),`canDelete`=VALUES(`canDelete`)");

    foreach ($permissions as $module => $perms) {
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $module)) continue;
        try {
            $ins->execute([
                ':role'   => $role,
                ':module' => $module,
                ':read'   => (int)($perms['canRead'] ?? 0),
                ':write'  => (int)($perms['canWrite'] ?? 0),
                ':add'    => (int)($perms['canAdd'] ?? 0),
                ':delete' => (int)($perms['canDelete'] ?? 0),
            ]);
        } catch (Throwable $e) {}
    }

    write_changelog($db, $auth, 'permissions', 'update', $role, null, $body);
    json_success(null, 'Permissions updated');
}


// =============================================================================
// BACKUP
// =============================================================================
function handle_backup_export(string $method, ?array $auth): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $db     = getDB();
    $tables = array_unique(array_values(collection_table_map()));
    $export = ['version' => API_VERSION, 'exported_at' => gmdate('c'), 'tables' => []];

    foreach ($tables as $table) {
        try {
            $stmt = $db->prepare("SELECT * FROM `{$table}`");
            $stmt->execute();
            $export['tables'][$table] = $stmt->fetchAll();
        } catch (Throwable $e) {
            $export['tables'][$table] = [];
        }
    }

    json_success($export, 'Backup ready');
}

function handle_backup_import(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!is_superadmin($auth)) json_error('Super Admin only', 403);

    $data = $body['data'] ?? null;
    if (!$data || !isset($data['tables'])) json_error('Invalid backup — missing tables key', 400);

    $db       = getDB();
    $imported = [];

    $db->beginTransaction();
    try {
        foreach ($data['tables'] as $table => $rows) {
            if (!is_array($rows) || empty($rows)) { $imported[$table] = 0; continue; }
            $result = batchUpsert($db, $table, $rows, $auth);
            $imported[$table] = $result['pushed'];
        }
        $db->commit();
        json_success(['imported' => $imported], 'Backup restored');
    } catch (Throwable $e) {
        $db->rollBack();
        json_error('Restore failed: ' . $e->getMessage(), 500);
    }
}

function handle_backup_history(string $method, ?array $auth): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);
    json_success([], 'No backup history tracked server-side');
}

function handle_factory_reset(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!is_superadmin($auth)) json_error('Super Admin only', 403);
    if (($body['confirmation'] ?? '') !== 'DELETE_ALL_DATA') {
        json_error('confirmation must equal "DELETE_ALL_DATA"', 400);
    }

    $db     = getDB();
    $tables = array_unique(array_values(collection_table_map()));
    $db->beginTransaction();
    try {
        foreach ($tables as $table) {
            try { $db->exec("DELETE FROM `{$table}`"); } catch (Throwable $e) {}
        }
        seed_superadmin_user($db, false);
        $db->commit();
        json_success(null, 'Factory reset complete. All data wiped.');
    } catch (Throwable $e) {
        $db->rollBack();
        json_error('Factory reset failed: ' . $e->getMessage(), 500);
    }
}


// =============================================================================
// SETTINGS
// =============================================================================
function handle_settings_school(string $method, array $body, ?array $auth): void {
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
        if (!is_superadmin($auth)) json_error('Super Admin only', 403);
        try {
            $ins = $db->prepare("INSERT INTO `school_settings` (`id`,`key`,`value`) VALUES (UUID(),:k,:v) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)");
            foreach ($body as $key => $value) {
                if (is_scalar($value) && preg_match('/^[a-zA-Z0-9_]+$/', $key)) {
                    $ins->execute([':k' => $key, ':v' => (string)$value]);
                }
            }
            json_success(null, 'Settings saved');
        } catch (Throwable $e) {
            json_error('Failed to save settings: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}


// =============================================================================
// STATS / COUNTS (no auth required for dashboard)
// =============================================================================
function handle_stats(): void {
    try {
        $db     = getDB();
        $counts = [];

        $queries = [
            'students' => "SELECT COUNT(*) FROM `students`",
            'staff'    => "SELECT COUNT(*) FROM `staff`",
            'teachers' => "SELECT COUNT(*) FROM `staff` WHERE LOWER(`designation`) LIKE '%teacher%' OR LOWER(`designation`) IN ('pgt','tgt','prt')",
            'fees'     => "SELECT COUNT(*) FROM `fee_receipts`",
            'attendance'=> "SELECT COUNT(*) FROM `attendance`",
            'classes'  => "SELECT COUNT(*) FROM `classes`",
        ];

        foreach ($queries as $key => $sql) {
            try {
                $stmt = $db->query($sql);
                $counts[$key] = $stmt ? (int)$stmt->fetchColumn() : 0;
            } catch (Throwable $e) {
                $counts[$key] = 0;
            }
        }

        json_success($counts, 'Stats fetched');
    } catch (Throwable $e) {
        json_error('Database not available', 503);
    }
}

function handle_staff_count(): void {
    try {
        $db    = getDB();
        $total = (int)$db->query("SELECT COUNT(*) FROM `staff`")->fetchColumn();
        $teach = (int)$db->query(
            "SELECT COUNT(*) FROM `staff` WHERE LOWER(`designation`) LIKE '%teacher%' OR LOWER(`designation`) IN ('pgt','tgt','prt')"
        )->fetchColumn();
        json_success(['total' => $total, 'teachers' => $teach]);
    } catch (Throwable $e) {
        json_success(['total' => 0, 'teachers' => 0]);
    }
}

function handle_students_count(): void {
    try {
        $db    = getDB();
        $count = (int)$db->query("SELECT COUNT(*) FROM `students`")->fetchColumn();
        json_success(['count' => $count]);
    } catch (Throwable $e) {
        json_success(['count' => 0]);
    }
}


// =============================================================================
// FILES / UPLOAD
// =============================================================================
function handle_files_upload(string $method, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth)             json_error('Authentication required', 401);

    if (empty($_FILES['file'])) json_error('No file uploaded (field: file)', 400);
    $file = $_FILES['file'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        json_error('Upload error code: ' . $file['error'], 400);
    }
    if ($file['size'] > MAX_FILE_SIZE) {
        json_error('File exceeds maximum size of 5 MB', 400);
    }

    $uploadDir = UPLOAD_DIR;
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0755, true);
    }

    $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed  = ['jpg','jpeg','png','gif','pdf','doc','docx','xls','xlsx','csv','txt','zip'];
    if (!in_array($ext, $allowed, true)) {
        json_error('File type not allowed: ' . $ext, 400);
    }

    $filename = uniqid('upload_', true) . '.' . $ext;
    $dest     = $uploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        json_error('Failed to save uploaded file', 500);
    }

    // Build public URL — derive from REQUEST_URI or use default API_URL base
    $apiBase  = rtrim(API_URL, '/index.php');
    $url      = $apiBase . '/uploads/' . $filename;

    json_success(['url' => $url, 'filename' => $filename, 'size' => $file['size']], 'File uploaded', 201);
}


// =============================================================================
// COLLECTION CRUD HANDLERS
// =============================================================================

/**
 * save = upsert (INSERT ... ON DUPLICATE KEY UPDATE)
 * If body contains `id` matching an existing record → update
 * Otherwise → insert with generated UUID
 */
function handle_col_save(string $method, string $collection, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth)             json_error('Authentication required', 401);

    $table = collection_table_map()[$collection];
    $db    = getDB();

    // Normalize field names
    $normalized = normalize_rows($table, [$body]);
    $body = $normalized[0];

    // Ensure `id` exists
    if (empty($body['id'])) $body['id'] = gen_uuid();

    // Filter to valid columns only
    $tableColumns = [];
    try {
        $stmt = $db->query("DESCRIBE `{$table}`");
        $tableColumns = $stmt ? $stmt->fetchAll(PDO::FETCH_COLUMN, 0) : [];
    } catch (Throwable $e) {}

    $filteredRow = [];
    foreach ($body as $k => $v) {
        if (!preg_match('/^[a-zA-Z0-9_]+$/', (string)$k)) continue;
        if (!empty($tableColumns) && !in_array($k, $tableColumns, true)) continue;
        if (is_array($v) || is_object($v)) {
            $filteredRow[$k] = json_encode($v, JSON_UNESCAPED_UNICODE);
        } elseif (is_scalar($v) || is_null($v)) {
            $filteredRow[$k] = $v;
        }
    }

    if (empty($filteredRow)) json_error('No valid fields provided', 400);

    $columns      = array_keys($filteredRow);
    $values       = array_values($filteredRow);
    $colList      = implode(',', array_map(fn($c) => "`{$c}`", $columns));
    $placeholders = implode(',', array_fill(0, count($columns), '?'));
    $updateParts  = array_map(fn($c) => "`{$c}` = VALUES(`{$c}`)", $columns);
    $updateClause = implode(',', $updateParts);

    try {
        $db->prepare("INSERT INTO `{$table}` ({$colList}) VALUES ({$placeholders}) ON DUPLICATE KEY UPDATE {$updateClause}")
           ->execute($values);
        write_changelog($db, $auth, $table, 'save', $filteredRow['id'] ?? null, null, $filteredRow);
        json_success(['id' => $filteredRow['id']], 'Saved', 200);
    } catch (Throwable $e) {
        json_error('Failed to save: ' . $e->getMessage(), 500);
    }
}

function handle_col_list(string $method, string $collection, ?array $auth): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $table  = collection_table_map()[$collection];
    $db     = getDB();
    $limit  = isset($_GET['limit'])  ? min((int)$_GET['limit'], 100000) : PHP_INT_MAX;
    $offset = max((int)($_GET['offset'] ?? 0), 0);
    $page   = max((int)($_GET['page'] ?? 1), 1);
    if (isset($_GET['page']) && !isset($_GET['offset'])) {
        $pageSize = isset($_GET['limit']) ? min((int)$_GET['limit'], 100000) : 50;
        $limit    = $pageSize;
        $offset   = ($page - 1) * $pageSize;
    }
    $since  = $_GET['since'] ?? null;

    $where  = [];
    $params = [];

    // Session filter — supports sessionId, session, or sess query params
    $sessionFilter = $_GET['sessionId'] ?? $_GET['session'] ?? $_GET['sess'] ?? null;
    if ($sessionFilter) {
        // Check which column exists — sessionId or session
        try {
            $cols = $db->query("SHOW COLUMNS FROM `{$table}` LIKE 'sessionId'");
            if ($cols && $cols->rowCount() > 0) {
                $where[] = '`sessionId`=?';
                $params[] = $sessionFilter;
            } else {
                $cols2 = $db->query("SHOW COLUMNS FROM `{$table}` LIKE 'session'");
                if ($cols2 && $cols2->rowCount() > 0) {
                    $where[] = '`session`=?';
                    $params[] = $sessionFilter;
                }
            }
        } catch (Throwable $e) {}
    }

    // Common filters
    if (!empty($_GET['search'])) {
        $s = '%' . $_GET['search'] . '%';
        if ($table === 'students') {
            $where[]  = "(`fullName` LIKE ? OR `name` LIKE ? OR `admNo` LIKE ? OR `fatherName` LIKE ? OR `motherName` LIKE ? OR `mobile` LIKE ?)";
            $params   = array_merge($params, [$s,$s,$s,$s,$s,$s]);
        } elseif ($table === 'staff') {
            $where[]  = "(`fullName` LIKE ? OR `name` LIKE ? OR `empId` LIKE ? OR `mobile` LIKE ?)";
            $params   = array_merge($params, [$s,$s,$s,$s]);
        } else {
            $where[]  = "(`name` LIKE ? OR `id` LIKE ?)";
            $params   = array_merge($params, [$s,$s]);
        }
    }
    if (!empty($_GET['class']))     { $where[] = '`class`=?';     $params[] = $_GET['class']; }
    if (!empty($_GET['section']))   { $where[] = '`section`=?';   $params[] = $_GET['section']; }
    if (!empty($_GET['classId']))   { $where[] = '`classId`=?';   $params[] = $_GET['classId']; }
    if (!empty($_GET['sectionId'])) { $where[] = '`sectionId`=?'; $params[] = $_GET['sectionId']; }
    if (!empty($_GET['status']))    { $where[] = '`status`=?';    $params[] = $_GET['status']; }
    if (!empty($_GET['studentId'])) { $where[] = '`studentId`=?'; $params[] = $_GET['studentId']; }
    if (!empty($_GET['staffId']))   { $where[] = '`staffId`=?';   $params[] = $_GET['staffId']; }

    if ($since) {
        try {
            $col = $db->query("SHOW COLUMNS FROM `{$table}` LIKE 'updatedAt'");
            if ($col && $col->rowCount() > 0) {
                $where[] = '`updatedAt` > ?';
                $params[] = $since;
            }
        } catch (Throwable $e) {}
    }

    $whereClause = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $limitClause = $limit === PHP_INT_MAX ? '' : " LIMIT {$limit} OFFSET {$offset}";

    try {
        // Get total count for pagination
        $countSql  = "SELECT COUNT(*) FROM `{$table}`{$whereClause}";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $db->prepare("SELECT * FROM `{$table}`{$whereClause}{$limitClause}");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        $rows = post_process_rows($rows, $table);
        json_success(['data' => $rows, 'total' => $total, 'page' => $page, 'limit' => $limit === PHP_INT_MAX ? $total : $limit]);
    } catch (Throwable $e) {
        json_success(['data' => [], 'total' => 0, 'page' => 1, 'limit' => 50]);
    }
}

function handle_col_get(string $method, string $collection, ?array $auth): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $id = $_GET['id'] ?? '';
    if (!$id) json_error('id is required', 400);

    $table = collection_table_map()[$collection];
    $db    = getDB();

    try {
        $stmt = $db->prepare("SELECT * FROM `{$table}` WHERE `id`=? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) json_error('Record not found', 404);
        $rows = post_process_rows([$row], $table);
        json_success($rows[0]);
    } catch (Throwable $e) {
        json_error('Fetch failed: ' . $e->getMessage(), 500);
    }
}

function handle_col_create(string $method, string $collection, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $table = collection_table_map()[$collection];
    $db    = getDB();

    // Normalize
    $normalized = normalize_rows($table, [$body]);
    $body = $normalized[0];

    if (empty($body['id'])) $body['id'] = gen_uuid();

    // Filter to valid scalar values only
    $tableColumns = [];
    try {
        $stmt = $db->query("DESCRIBE `{$table}`");
        $tableColumns = $stmt ? $stmt->fetchAll(PDO::FETCH_COLUMN, 0) : [];
    } catch (Throwable $e) {}

    $filteredRow = [];
    foreach ($body as $k => $v) {
        if (!preg_match('/^[a-zA-Z0-9_]+$/', (string)$k)) continue;
        if (!empty($tableColumns) && !in_array($k, $tableColumns, true)) continue;
        if (is_array($v) || is_object($v)) {
            $filteredRow[$k] = json_encode($v, JSON_UNESCAPED_UNICODE);
        } elseif (is_scalar($v) || is_null($v)) {
            $filteredRow[$k] = $v;
        }
    }

    if (empty($filteredRow)) json_error('No valid fields provided', 400);

    $columns      = array_keys($filteredRow);
    $values       = array_values($filteredRow);
    $colList      = implode(',', array_map(fn($c) => "`{$c}`", $columns));
    $placeholders = implode(',', array_fill(0, count($columns), '?'));
    $updateParts  = array_map(fn($c) => "`{$c}` = VALUES(`{$c}`)", $columns);
    $updateClause = implode(',', $updateParts);

    try {
        $db->prepare("INSERT INTO `{$table}` ({$colList}) VALUES ({$placeholders}) ON DUPLICATE KEY UPDATE {$updateClause}")
           ->execute($values);
        write_changelog($db, $auth, $table, 'create', $filteredRow['id'] ?? null, null, $filteredRow);
        json_success(['id' => $filteredRow['id']], 'Created', 201);
    } catch (Throwable $e) {
        json_error('Failed to create: ' . $e->getMessage(), 500);
    }
}

function handle_col_update(string $method, string $collection, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $id = $body['id'] ?? $_GET['id'] ?? '';
    if (!$id) json_error('id is required', 400);

    $table = collection_table_map()[$collection];
    $db    = getDB();

    $normalized = normalize_rows($table, [$body]);
    $body = $normalized[0];
    unset($body['id']);

    $tableColumns = [];
    try {
        $stmt = $db->query("DESCRIBE `{$table}`");
        $tableColumns = $stmt ? $stmt->fetchAll(PDO::FETCH_COLUMN, 0) : [];
    } catch (Throwable $e) {}

    $sets   = [];
    $values = [];
    foreach ($body as $k => $v) {
        if (!preg_match('/^[a-zA-Z0-9_]+$/', (string)$k)) continue;
        if (!empty($tableColumns) && !in_array($k, $tableColumns, true)) continue;
        if (is_array($v) || is_object($v)) {
            $sets[]   = "`{$k}`=?";
            $values[] = json_encode($v, JSON_UNESCAPED_UNICODE);
        } elseif (is_scalar($v) || is_null($v)) {
            $sets[]   = "`{$k}`=?";
            $values[] = $v;
        }
    }

    if (empty($sets)) json_error('No valid fields to update', 400);

    $values[] = $id;
    try {
        $db->prepare("UPDATE `{$table}` SET " . implode(',', $sets) . " WHERE `id`=?")->execute($values);
        write_changelog($db, $auth, $table, 'update', $id, null, $body);
        json_success(['id' => $id], 'Updated');
    } catch (Throwable $e) {
        json_error('Update failed: ' . $e->getMessage(), 500);
    }
}

function handle_col_delete(string $method, string $collection, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id   = $body['id'] ?? $_GET['id'] ?? '';
    if (!$id) json_error('id is required', 400);

    $table = collection_table_map()[$collection];
    $db    = getDB();

    try {
        $db->prepare("DELETE FROM `{$table}` WHERE `id`=?")->execute([$id]);
        write_changelog($db, $auth, $table, 'delete', $id, null, null);
        json_success(null, 'Deleted');
    } catch (Throwable $e) {
        json_error('Delete failed: ' . $e->getMessage(), 500);
    }
}

function handle_col_batch(string $method, string $collection, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $records = $body['records'] ?? $body['items'] ?? $body;
    if (!is_array($records)) json_error('Body must be an array of records', 400);

    $table  = collection_table_map()[$collection];
    $db     = getDB();
    $result = batchUpsert($db, $table, $records, $auth);

    json_success([
        'pushed' => $result['pushed'],
        'failed' => $result['failed'],
        'errors' => $result['errors'],
    ], "{$result['pushed']} records saved");
}


// =============================================================================
// LEGACY: data/{collection} generic CRUD
// =============================================================================
function handle_data_collection(string $method, string $collection, array $body, ?array $auth, ?string $id): void {
    if (!$auth) json_error('Authentication required', 401);

    $tableMap = collection_table_map();
    if (!isset($tableMap[$collection])) json_error("Unknown collection: {$collection}", 404);
    $table = $tableMap[$collection];
    $db    = getDB();

    if ($method === 'GET') {
        if ($id !== null) {
            $stmt = $db->prepare("SELECT * FROM `{$table}` WHERE `id`=? LIMIT 1");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) json_error('Record not found', 404);
            $rows = post_process_rows([$row], $table);
            json_success($rows[0]);
        } else {
            $limit  = isset($_GET['limit']) ? min((int)$_GET['limit'], 100000) : PHP_INT_MAX;
            $offset = max((int)($_GET['offset'] ?? 0), 0);
            try {
                $limitClause = $limit === PHP_INT_MAX ? '' : " LIMIT {$limit} OFFSET {$offset}";
                $stmt = $db->prepare("SELECT * FROM `{$table}`{$limitClause}");
                $stmt->execute();
                $rows = post_process_rows($stmt->fetchAll(), $table);
                json_success($rows);
            } catch (Throwable $e) {
                json_success([]);
            }
        }
    }

    if ($method === 'POST') {
        $normalized = normalize_rows($table, [$body]);
        $body = $normalized[0];
        $body = array_filter($body, fn($v) => is_scalar($v) || is_null($v));
        $safeCols = array_values(array_filter(array_keys($body), fn($c) => (bool)preg_match('/^[a-zA-Z0-9_]+$/', $c)));
        if (empty($safeCols)) json_error('No valid fields provided', 400);
        if (empty($body['id'])) { $body['id'] = gen_uuid(); $safeCols[] = 'id'; $safeCols = array_unique($safeCols); }

        $colList      = implode(',', array_map(fn($c) => "`{$c}`", $safeCols));
        $placeholders = implode(',', array_fill(0, count($safeCols), '?'));
        $updateParts  = array_map(fn($c) => "`{$c}` = VALUES(`{$c}`)", $safeCols);
        $updateClause = implode(',', $updateParts);
        $values = array_map(fn($c) => $body[$c], $safeCols);

        try {
            $db->prepare("INSERT INTO `{$table}` ({$colList}) VALUES ({$placeholders}) ON DUPLICATE KEY UPDATE {$updateClause}")
               ->execute($values);
            write_changelog($db, $auth, $table, 'create', $body['id'], null, $body);
            json_success(['id' => $body['id']], 'Saved', 201);
        } catch (Throwable $e) {
            json_error('Failed to save: ' . $e->getMessage(), 500);
        }
    }

    if ($method === 'PUT') {
        if (!$id) json_error('Record ID required', 400);
        unset($body['id']);
        $normalized = normalize_rows($table, [$body]);
        $body = $normalized[0];
        $body = array_filter($body, fn($v) => is_scalar($v) || is_null($v));
        $safeCols = array_values(array_filter(array_keys($body), fn($c) => (bool)preg_match('/^[a-zA-Z0-9_]+$/', $c)));
        if (empty($safeCols)) json_error('No valid fields provided', 400);

        $sets   = array_map(fn($c) => "`{$c}`=?", $safeCols);
        $values = array_map(fn($c) => $body[$c], $safeCols);
        $values[] = $id;

        try {
            $db->prepare("UPDATE `{$table}` SET " . implode(',', $sets) . " WHERE `id`=?")->execute($values);
            write_changelog($db, $auth, $table, 'update', $id, null, $body);
            json_success(['id' => $id], 'Updated');
        } catch (Throwable $e) {
            json_error('Failed to update: ' . $e->getMessage(), 500);
        }
    }

    if ($method === 'DELETE') {
        if (!$id) json_error('Record ID required', 400);
        try {
            $db->prepare("DELETE FROM `{$table}` WHERE `id`=?")->execute([$id]);
            write_changelog($db, $auth, $table, 'delete', $id, null, null);
            json_success(null, 'Deleted');
        } catch (Throwable $e) {
            json_error('Failed to delete: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}


// =============================================================================
// FACE RECOGNITION ATTENDANCE
// =============================================================================
function handle_face_descriptors(string $method, array $body, ?array $auth): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        try {
            $stmt = $db->query("SELECT * FROM `face_descriptors`");
            json_success($stmt->fetchAll(), 'Face descriptors fetched');
        } catch (Throwable $e) {
            json_success([], 'No data');
        }
    }

    if ($method === 'POST') {
        $id             = $body['id'] ?? gen_uuid();
        $studentId      = $body['studentId'] ?? '';
        $descriptorData = is_array($body['descriptorData'] ?? null)
            ? json_encode($body['descriptorData'], JSON_UNESCAPED_UNICODE)
            : ($body['descriptorData'] ?? '');
        $enrolledAt     = $body['enrolledAt'] ?? now_str();
        if (!$studentId) json_error('studentId is required', 400);
        try {
            $db->prepare("INSERT INTO `face_descriptors` (`id`,`studentId`,`descriptorData`,`enrolledAt`)
                VALUES (?,?,?,?)
                ON DUPLICATE KEY UPDATE `descriptorData`=VALUES(`descriptorData`), `enrolledAt`=VALUES(`enrolledAt`)")
               ->execute([$id, $studentId, $descriptorData, $enrolledAt]);
            write_changelog($db, $auth, 'face_descriptors', 'save', $id, null, ['studentId' => $studentId]);
            json_success(['id' => $id], 'Descriptor saved');
        } catch (Throwable $e) {
            json_error('Failed: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}

function handle_face_attendance(string $method, array $body, ?array $auth): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        $where  = [];
        $params = [];
        if (!empty($_GET['studentId'])) { $where[] = '`studentId`=?'; $params[] = $_GET['studentId']; }
        if (!empty($_GET['date']))      { $where[] = '`attendanceDate`=?'; $params[] = $_GET['date']; }
        if (!empty($_GET['startDate'])) { $where[] = '`attendanceDate`>=?'; $params[] = $_GET['startDate']; }
        if (!empty($_GET['endDate']))   { $where[] = '`attendanceDate`<=?'; $params[] = $_GET['endDate']; }
        $limit  = min((int)($_GET['limit'] ?? 500), 5000);
        $offset = max((int)($_GET['offset'] ?? 0), 0);
        $wc     = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        try {
            $total = (int)$db->prepare("SELECT COUNT(*) FROM `face_attendance`{$wc}")->execute($params) ? 0 : 0;
            $cStmt = $db->prepare("SELECT COUNT(*) FROM `face_attendance`{$wc}");
            $cStmt->execute($params);
            $total = (int)$cStmt->fetchColumn();
            $stmt  = $db->prepare("SELECT * FROM `face_attendance`{$wc} ORDER BY `timestamp` DESC LIMIT {$limit} OFFSET {$offset}");
            $stmt->execute($params);
            json_success(['data' => $stmt->fetchAll(), 'total' => $total]);
        } catch (Throwable $e) {
            json_success(['data' => [], 'total' => 0]);
        }
    }

    if ($method === 'POST') {
        $id             = $body['id'] ?? gen_uuid();
        $studentId      = $body['studentId'] ?? '';
        $confidence     = (float)($body['confidence'] ?? 0);
        $mth            = $body['method'] ?? 'face_recognition';
        $attDate        = $body['attendanceDate'] ?? date('Y-m-d');
        $ts             = $body['timestamp'] ?? now_str();
        $sessionId      = $body['sessionId'] ?? '';
        if (!$studentId) json_error('studentId is required', 400);
        try {
            $db->prepare("INSERT INTO `face_attendance` (`id`,`studentId`,`confidence`,`method`,`attendanceDate`,`timestamp`,`sessionId`)
                VALUES (?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE `confidence`=VALUES(`confidence`), `method`=VALUES(`method`), `timestamp`=VALUES(`timestamp`)")
               ->execute([$id, $studentId, $confidence, $mth, $attDate, $ts, $sessionId]);
            write_changelog($db, $auth, 'face_attendance', 'create', $id, null, ['studentId' => $studentId, 'date' => $attDate]);
            json_success(['id' => $id], 'Attendance recorded', 201);
        } catch (Throwable $e) {
            json_error('Failed: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}


// =============================================================================
// LIBRARY
// =============================================================================
function handle_library_books(string $method, array $body, ?array $auth): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        $where  = [];
        $params = [];
        if (!empty($_GET['search'])) {
            $s = '%' . $_GET['search'] . '%';
            $where[]  = "(`title` LIKE ? OR `author` LIKE ? OR `isbn` LIKE ? OR `category` LIKE ?)";
            $params   = array_merge($params, [$s,$s,$s,$s]);
        }
        if (!empty($_GET['category'])) { $where[] = '`category`=?'; $params[] = $_GET['category']; }
        $limit  = min((int)($_GET['limit'] ?? 500), 10000);
        $offset = max((int)($_GET['offset'] ?? 0), 0);
        $wc     = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        try {
            $cStmt = $db->prepare("SELECT COUNT(*) FROM `library_books`{$wc}");
            $cStmt->execute($params);
            $total = (int)$cStmt->fetchColumn();
            $stmt  = $db->prepare("SELECT * FROM `library_books`{$wc} ORDER BY `title` ASC LIMIT {$limit} OFFSET {$offset}");
            $stmt->execute($params);
            json_success(['data' => $stmt->fetchAll(), 'total' => $total]);
        } catch (Throwable $e) {
            json_success(['data' => [], 'total' => 0]);
        }
    }

    if ($method === 'POST') {
        $id           = $body['id'] ?? gen_uuid();
        $isbn         = $body['isbn'] ?? '';
        $title        = $body['title'] ?? '';
        $author       = $body['author'] ?? '';
        $publisher    = $body['publisher'] ?? '';
        $category     = $body['category'] ?? '';
        $totalQty     = (int)($body['totalQty'] ?? 1);
        $availableQty = (int)($body['availableQty'] ?? $totalQty);
        $location     = $body['location'] ?? '';
        $addedAt      = $body['addedAt'] ?? now_str();
        if (!$title) json_error('title is required', 400);
        try {
            $db->prepare("INSERT INTO `library_books` (`id`,`isbn`,`title`,`author`,`publisher`,`category`,`totalQty`,`availableQty`,`location`,`addedAt`)
                VALUES (?,?,?,?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE `isbn`=VALUES(`isbn`),`title`=VALUES(`title`),`author`=VALUES(`author`),
                `publisher`=VALUES(`publisher`),`category`=VALUES(`category`),`totalQty`=VALUES(`totalQty`),
                `availableQty`=VALUES(`availableQty`),`location`=VALUES(`location`)")
               ->execute([$id,$isbn,$title,$author,$publisher,$category,$totalQty,$availableQty,$location,$addedAt]);
            write_changelog($db, $auth, 'library_books', 'save', $id, null, ['title' => $title]);
            json_success(['id' => $id], 'Book saved');
        } catch (Throwable $e) {
            json_error('Failed: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}

function handle_book_issues(string $method, array $body, ?array $auth): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        $where  = [];
        $params = [];
        if (!empty($_GET['studentId'])) { $where[] = '`studentId`=?'; $params[] = $_GET['studentId']; }
        if (!empty($_GET['bookId']))    { $where[] = '`bookId`=?'; $params[] = $_GET['bookId']; }
        if (!empty($_GET['status']))    { $where[] = '`status`=?'; $params[] = $_GET['status']; }
        $limit  = min((int)($_GET['limit'] ?? 500), 10000);
        $offset = max((int)($_GET['offset'] ?? 0), 0);
        $wc     = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        try {
            $cStmt = $db->prepare("SELECT COUNT(*) FROM `book_issues`{$wc}");
            $cStmt->execute($params);
            $total = (int)$cStmt->fetchColumn();
            $stmt  = $db->prepare("SELECT * FROM `book_issues`{$wc} ORDER BY `issueDate` DESC LIMIT {$limit} OFFSET {$offset}");
            $stmt->execute($params);
            json_success(['data' => $stmt->fetchAll(), 'total' => $total]);
        } catch (Throwable $e) {
            json_success(['data' => [], 'total' => 0]);
        }
    }

    if ($method === 'POST') {
        $id         = $body['id'] ?? gen_uuid();
        $bookId     = $body['bookId'] ?? '';
        $studentId  = $body['studentId'] ?? '';
        $issueDate  = $body['issueDate'] ?? date('Y-m-d');
        $dueDate    = $body['dueDate'] ?? date('Y-m-d', strtotime('+14 days'));
        $returnDate = $body['returnDate'] ?? null;
        $fine       = (float)($body['fine'] ?? 0);
        $status     = $body['status'] ?? 'issued';
        if (!$bookId || !$studentId) json_error('bookId and studentId are required', 400);
        try {
            $db->prepare("INSERT INTO `book_issues` (`id`,`bookId`,`studentId`,`issueDate`,`dueDate`,`returnDate`,`fine`,`status`)
                VALUES (?,?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE `returnDate`=VALUES(`returnDate`),`fine`=VALUES(`fine`),`status`=VALUES(`status`)")
               ->execute([$id,$bookId,$studentId,$issueDate,$dueDate,$returnDate,$fine,$status]);
            // Update available qty if returning
            if ($status === 'returned') {
                $db->prepare("UPDATE `library_books` SET `availableQty`=`availableQty`+1 WHERE `id`=?")->execute([$bookId]);
            } elseif ($status === 'issued') {
                $db->prepare("UPDATE `library_books` SET `availableQty`=GREATEST(0,`availableQty`-1) WHERE `id`=?")->execute([$bookId]);
            }
            write_changelog($db, $auth, 'book_issues', 'save', $id, null, ['bookId' => $bookId, 'studentId' => $studentId, 'status' => $status]);
            json_success(['id' => $id], 'Book issue saved');
        } catch (Throwable $e) {
            json_error('Failed: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}


// =============================================================================
// ONLINE EXAMS
// =============================================================================
function handle_online_exams(string $method, array $body, ?array $auth): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        $where  = [];
        $params = [];
        if (!empty($_GET['classId']))  { $where[] = '`classId`=?'; $params[] = $_GET['classId']; }
        if (!empty($_GET['status']))   { $where[] = '`status`=?'; $params[] = $_GET['status']; }
        if (!empty($_GET['session']))  { $where[] = '`session`=?'; $params[] = $_GET['session']; }
        $wc    = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $limit = min((int)($_GET['limit'] ?? 200), 5000);
        $off   = max((int)($_GET['offset'] ?? 0), 0);
        try {
            $stmt = $db->prepare("SELECT `id`,`title`,`subject`,`classId`,`sections`,`duration`,`totalMarks`,`passPercentage`,`startTime`,`endTime`,`status`,`createdBy` FROM `online_exams`{$wc} ORDER BY `startTime` DESC LIMIT {$limit} OFFSET {$off}");
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                if (isset($r['sections']) && is_string($r['sections'])) {
                    $d = json_decode($r['sections'], true);
                    if (is_array($d)) $r['sections'] = $d;
                }
            }
            unset($r);
            json_success($rows);
        } catch (Throwable $e) {
            json_success([]);
        }
    }

    if ($method === 'POST') {
        $id             = $body['id'] ?? gen_uuid();
        $title          = $body['title'] ?? '';
        $subject        = $body['subject'] ?? '';
        $classId        = $body['classId'] ?? '';
        $sections       = is_array($body['sections'] ?? null) ? json_encode($body['sections']) : ($body['sections'] ?? '');
        $duration       = (int)($body['duration'] ?? 60);
        $totalMarks     = (int)($body['totalMarks'] ?? 100);
        $passPercent    = (int)($body['passPercentage'] ?? 33);
        $startTime      = $body['startTime'] ?? now_str();
        $endTime        = $body['endTime'] ?? now_str();
        $questionsData  = is_array($body['questionsData'] ?? null) ? json_encode($body['questionsData'], JSON_UNESCAPED_UNICODE) : ($body['questionsData'] ?? '[]');
        $status         = $body['status'] ?? 'draft';
        $createdBy      = $body['createdBy'] ?? ($auth['username'] ?? '');
        $session        = $body['session'] ?? ($body['sessionId'] ?? '');
        if (!$title) json_error('title is required', 400);
        try {
            $db->prepare("INSERT INTO `online_exams` (`id`,`title`,`subject`,`classId`,`sections`,`duration`,`totalMarks`,`passPercentage`,`startTime`,`endTime`,`questionsData`,`status`,`createdBy`,`session`)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE `title`=VALUES(`title`),`subject`=VALUES(`subject`),`sections`=VALUES(`sections`),
                `duration`=VALUES(`duration`),`totalMarks`=VALUES(`totalMarks`),`passPercentage`=VALUES(`passPercentage`),
                `startTime`=VALUES(`startTime`),`endTime`=VALUES(`endTime`),`questionsData`=VALUES(`questionsData`),`status`=VALUES(`status`)")
               ->execute([$id,$title,$subject,$classId,$sections,$duration,$totalMarks,$passPercent,$startTime,$endTime,$questionsData,$status,$createdBy,$session]);
            write_changelog($db, $auth, 'online_exams', 'save', $id, null, ['title' => $title, 'classId' => $classId]);
            json_success(['id' => $id], 'Exam saved');
        } catch (Throwable $e) {
            json_error('Failed: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}

function handle_exam_attempts(string $method, array $body, ?array $auth): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        $where  = [];
        $params = [];
        if (!empty($_GET['examId']))    { $where[] = '`examId`=?'; $params[] = $_GET['examId']; }
        if (!empty($_GET['studentId'])) { $where[] = '`studentId`=?'; $params[] = $_GET['studentId']; }
        $wc   = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $lim  = min((int)($_GET['limit'] ?? 500), 10000);
        $off  = max((int)($_GET['offset'] ?? 0), 0);
        try {
            $stmt = $db->prepare("SELECT `id`,`examId`,`studentId`,`score`,`totalMarks`,`percentage`,`passed`,`startedAt`,`submittedAt`,`timeTaken` FROM `exam_attempts`{$wc} ORDER BY `submittedAt` DESC LIMIT {$lim} OFFSET {$off}");
            $stmt->execute($params);
            json_success($stmt->fetchAll());
        } catch (Throwable $e) {
            json_success([]);
        }
    }

    if ($method === 'POST') {
        // Auto-grade: calculate score from answers vs questionsData
        $id          = $body['id'] ?? gen_uuid();
        $examId      = $body['examId'] ?? '';
        $studentId   = $body['studentId'] ?? '';
        $answersData = is_array($body['answersData'] ?? null) ? json_encode($body['answersData'], JSON_UNESCAPED_UNICODE) : ($body['answersData'] ?? '{}');
        $startedAt   = $body['startedAt'] ?? now_str();
        $submittedAt = $body['submittedAt'] ?? now_str();
        $timeTaken   = (int)($body['timeTaken'] ?? 0);
        if (!$examId || !$studentId) json_error('examId and studentId are required', 400);

        // Fetch exam for auto-grading
        $score      = (float)($body['score'] ?? 0);
        $totalMarks = (int)($body['totalMarks'] ?? 0);
        $percent    = 0.0;
        $passed     = 0;
        try {
            $examStmt = $db->prepare("SELECT `questionsData`,`totalMarks`,`passPercentage` FROM `online_exams` WHERE `id`=? LIMIT 1");
            $examStmt->execute([$examId]);
            $exam = $examStmt->fetch();
            if ($exam) {
                $totalMarks  = (int)$exam['totalMarks'];
                $questions   = json_decode($exam['questionsData'] ?? '[]', true) ?: [];
                $answers     = json_decode($answersData, true) ?: [];
                // Auto-grade MCQ: each correct = (totalMarks / questionCount) points
                if (!empty($questions)) {
                    $perQ  = $totalMarks / count($questions);
                    $score = 0;
                    foreach ($questions as $q) {
                        $qId     = $q['id'] ?? $q['qid'] ?? '';
                        $correct = $q['correctAnswer'] ?? $q['correct'] ?? '';
                        $given   = $answers[$qId] ?? $answers[(string)$qId] ?? '';
                        if ($given !== '' && (string)$given === (string)$correct) {
                            $score += $perQ;
                        }
                    }
                }
                $percent = $totalMarks > 0 ? round(($score / $totalMarks) * 100, 2) : 0;
                $passed  = $percent >= (int)$exam['passPercentage'] ? 1 : 0;
            }
        } catch (Throwable $e) {}

        try {
            $db->prepare("INSERT INTO `exam_attempts` (`id`,`examId`,`studentId`,`answersData`,`score`,`totalMarks`,`percentage`,`passed`,`startedAt`,`submittedAt`,`timeTaken`)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE `answersData`=VALUES(`answersData`),`score`=VALUES(`score`),
                `percentage`=VALUES(`percentage`),`passed`=VALUES(`passed`),`submittedAt`=VALUES(`submittedAt`),`timeTaken`=VALUES(`timeTaken`)")
               ->execute([$id,$examId,$studentId,$answersData,$score,$totalMarks,$percent,$passed,$startedAt,$submittedAt,$timeTaken]);
            write_changelog($db, $auth, 'exam_attempts', 'submit', $id, null, ['examId' => $examId, 'studentId' => $studentId, 'score' => $score]);
            json_success(['id' => $id, 'score' => $score, 'totalMarks' => $totalMarks, 'percentage' => $percent, 'passed' => (bool)$passed], 'Attempt submitted');
        } catch (Throwable $e) {
            json_error('Failed: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}


// =============================================================================
// GPS TRANSPORT TRACKING
// =============================================================================
function handle_driver_location(string $method, array $body, ?array $auth): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        $routeId = $_GET['routeId'] ?? '';
        try {
            if ($routeId) {
                $stmt = $db->prepare("SELECT * FROM `driver_locations` WHERE `routeId`=? AND `isActive`=1 ORDER BY `timestamp` DESC LIMIT 1");
                $stmt->execute([$routeId]);
            } else {
                $stmt = $db->query("SELECT * FROM `driver_locations` WHERE `isActive`=1 ORDER BY `timestamp` DESC LIMIT 50");
            }
            $rows = $stmt ? $stmt->fetchAll() : [];
            json_success($rows);
        } catch (Throwable $e) {
            json_success([]);
        }
    }

    if ($method === 'POST') {
        $driverId  = $body['driverId'] ?? ($auth['user_id'] ?? '');
        $routeId   = $body['routeId'] ?? '';
        $lat       = (float)($body['latitude'] ?? 0);
        $lng       = (float)($body['longitude'] ?? 0);
        $accuracy  = (float)($body['accuracy'] ?? 0);
        $ts        = $body['timestamp'] ?? now_str();
        $isActive  = isset($body['isActive']) ? (int)(bool)$body['isActive'] : 1;
        if (!$routeId) json_error('routeId is required', 400);
        $id = gen_uuid();
        try {
            // Deactivate previous locations for this driver/route
            $db->prepare("UPDATE `driver_locations` SET `isActive`=0 WHERE `driverId`=? AND `routeId`=?")
               ->execute([$driverId, $routeId]);
            $db->prepare("INSERT INTO `driver_locations` (`id`,`driverId`,`routeId`,`latitude`,`longitude`,`accuracy`,`timestamp`,`isActive`)
                VALUES (?,?,?,?,?,?,?,?)")
               ->execute([$id,$driverId,$routeId,$lat,$lng,$accuracy,$ts,$isActive]);
            json_success(['id' => $id, 'latitude' => $lat, 'longitude' => $lng], 'Location updated');
        } catch (Throwable $e) {
            json_error('Failed: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}

function handle_transport_trips(string $method, array $body, ?array $auth): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        $where  = [];
        $params = [];
        if (!empty($_GET['routeId']))   { $where[] = '`routeId`=?'; $params[] = $_GET['routeId']; }
        if (!empty($_GET['driverId']))  { $where[] = '`driverId`=?'; $params[] = $_GET['driverId']; }
        if (!empty($_GET['status']))    { $where[] = '`status`=?'; $params[] = $_GET['status']; }
        $wc   = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $lim  = min((int)($_GET['limit'] ?? 100), 5000);
        $off  = max((int)($_GET['offset'] ?? 0), 0);
        try {
            $stmt = $db->prepare("SELECT * FROM `transport_trips`{$wc} ORDER BY `startTime` DESC LIMIT {$lim} OFFSET {$off}");
            $stmt->execute($params);
            json_success($stmt->fetchAll());
        } catch (Throwable $e) {
            json_success([]);
        }
    }

    if ($method === 'POST') {
        $id        = $body['id'] ?? gen_uuid();
        $routeId   = $body['routeId'] ?? '';
        $driverId  = $body['driverId'] ?? ($auth['user_id'] ?? '');
        $startTime = $body['startTime'] ?? now_str();
        $endTime   = $body['endTime'] ?? null;
        $status    = $body['status'] ?? 'active';
        if (!$routeId) json_error('routeId is required', 400);
        try {
            $db->prepare("INSERT INTO `transport_trips` (`id`,`routeId`,`driverId`,`startTime`,`endTime`,`status`)
                VALUES (?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE `endTime`=VALUES(`endTime`),`status`=VALUES(`status`)")
               ->execute([$id,$routeId,$driverId,$startTime,$endTime,$status]);
            write_changelog($db, $auth, 'transport_trips', 'save', $id, null, ['routeId' => $routeId, 'status' => $status]);
            json_success(['id' => $id], 'Trip saved');
        } catch (Throwable $e) {
            json_error('Failed: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}


// =============================================================================
// BROADCAST CAMPAIGNS
// =============================================================================
function handle_broadcast_campaigns(string $method, array $body, ?array $auth): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        $limit = min((int)($_GET['limit'] ?? 100), 5000);
        $off   = max((int)($_GET['offset'] ?? 0), 0);
        try {
            $stmt = $db->prepare("SELECT * FROM `broadcast_campaigns` ORDER BY `createdAt` DESC LIMIT {$limit} OFFSET {$off}");
            $stmt->execute();
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                if (isset($r['recipientsData']) && is_string($r['recipientsData'])) {
                    $d = json_decode($r['recipientsData'], true);
                    if (is_array($d)) $r['recipientsData'] = $d;
                }
            }
            unset($r);
            json_success($rows);
        } catch (Throwable $e) {
            json_success([]);
        }
    }

    if ($method === 'POST') {
        $id               = $body['id'] ?? gen_uuid();
        $title            = $body['title'] ?? '';
        $channel          = $body['channel'] ?? 'whatsapp';
        $recipientsData   = is_array($body['recipientsData'] ?? null) ? json_encode($body['recipientsData']) : ($body['recipientsData'] ?? '[]');
        $template         = $body['template'] ?? '';
        $message          = $body['message'] ?? '';
        $scheduledAt      = $body['scheduledAt'] ?? null;
        $status           = $body['status'] ?? 'draft';
        $totalRecipients  = (int)($body['totalRecipients'] ?? 0);
        $createdBy        = $body['createdBy'] ?? ($auth['username'] ?? '');
        if (!$title) json_error('title is required', 400);
        try {
            $db->prepare("INSERT INTO `broadcast_campaigns` (`id`,`title`,`channel`,`recipientsData`,`template`,`message`,`scheduledAt`,`status`,`totalRecipients`,`delivered`,`failed`,`createdBy`)
                VALUES (?,?,?,?,?,?,?,?,?,0,0,?)
                ON DUPLICATE KEY UPDATE `title`=VALUES(`title`),`channel`=VALUES(`channel`),`recipientsData`=VALUES(`recipientsData`),
                `template`=VALUES(`template`),`message`=VALUES(`message`),`scheduledAt`=VALUES(`scheduledAt`),`status`=VALUES(`status`),`totalRecipients`=VALUES(`totalRecipients`)")
               ->execute([$id,$title,$channel,$recipientsData,$template,$message,$scheduledAt,$status,$totalRecipients,$createdBy]);
            write_changelog($db, $auth, 'broadcast_campaigns', 'save', $id, null, ['title' => $title, 'channel' => $channel]);
            json_success(['id' => $id], 'Campaign saved');
        } catch (Throwable $e) {
            json_error('Failed: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}

function handle_broadcast_send(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $campaignId = $body['campaignId'] ?? '';
    $message    = $body['message'] ?? '';
    $recipients = $body['recipients'] ?? [];
    $channel    = $body['channel'] ?? 'whatsapp';
    if (!$message) json_error('message is required', 400);
    if (empty($recipients)) json_error('recipients array is required', 400);

    $db = getDB();

    // Fetch WhatsApp credentials from school_settings
    $waApiUrl  = '';
    $waApiKey  = '';
    try {
        $s = $db->query("SELECT `key`,`value` FROM `school_settings` WHERE `key` IN ('wa_api_url','wa_api_key','whatsapp_api_url','whatsapp_api_key')");
        if ($s) {
            foreach ($s->fetchAll() as $row) {
                if (in_array($row['key'], ['wa_api_url', 'whatsapp_api_url'], true)) $waApiUrl = $row['value'];
                if (in_array($row['key'], ['wa_api_key', 'whatsapp_api_key'], true)) $waApiKey = $row['value'];
            }
        }
    } catch (Throwable $e) {}

    $delivered = 0;
    $failed    = 0;
    $errors    = [];

    if ($channel === 'whatsapp' && $waApiUrl) {
        // Rate-limited WhatsApp sends: max 1 per 0.5s to avoid API throttle
        foreach ($recipients as $i => $recipient) {
            $mobile = is_array($recipient) ? ($recipient['mobile'] ?? $recipient['phone'] ?? '') : $recipient;
            if (!$mobile) { $failed++; continue; }
            // Strip non-digits, ensure 91 prefix for India
            $mobile = preg_replace('/[^0-9]/', '', $mobile);
            if (strlen($mobile) === 10) $mobile = '91' . $mobile;
            try {
                $ctx = stream_context_create(['http' => [
                    'method'  => 'POST',
                    'header'  => "Content-Type: application/json\r\nAuthorization: Bearer {$waApiKey}\r\n",
                    'content' => json_encode(['number' => $mobile, 'message' => $message]),
                    'timeout' => 5,
                ]]);
                $resp = @file_get_contents($waApiUrl . '/send', false, $ctx);
                if ($resp !== false) {
                    $respData = json_decode($resp, true);
                    if (isset($respData['status']) && $respData['status'] === 'success') {
                        $delivered++;
                    } else {
                        $failed++;
                        if (count($errors) < 5) $errors[] = "Mobile {$mobile}: " . ($respData['message'] ?? 'Send failed');
                    }
                } else {
                    $failed++;
                }
            } catch (Throwable $e) {
                $failed++;
            }
            // Rate limit: 500ms between messages
            if (($i + 1) < count($recipients)) usleep(500000);
        }
    } else {
        // In-app notifications fallback when no WhatsApp config
        foreach ($recipients as $recipient) {
            $userId = is_array($recipient) ? ($recipient['userId'] ?? $recipient['id'] ?? '') : $recipient;
            if (!$userId) { $failed++; continue; }
            try {
                $db->prepare("INSERT INTO `notifications` (`id`,`userId`,`title`,`message`,`type`,`isRead`,`timestamp`)
                    VALUES (UUID(),?,'Broadcast',?,?,0,?)")
                   ->execute([$userId, $message, $channel, now_str()]);
                $delivered++;
            } catch (Throwable $e) {
                $failed++;
            }
        }
    }

    // Update campaign stats if campaignId provided
    if ($campaignId) {
        try {
            $db->prepare("UPDATE `broadcast_campaigns` SET `delivered`=?,`failed`=?,`sentAt`=?,`status`='sent' WHERE `id`=?")
               ->execute([$delivered, $failed, now_str(), $campaignId]);
        } catch (Throwable $e) {}
    }

    write_changelog($db, $auth, 'broadcast_campaigns', 'send', $campaignId ?: gen_uuid(), null, ['channel' => $channel, 'delivered' => $delivered, 'failed' => $failed]);
    json_success(['delivered' => $delivered, 'failed' => $failed, 'total' => count($recipients), 'errors' => $errors], "Broadcast sent: {$delivered} delivered, {$failed} failed");
}


// =============================================================================
// PUSH SUBSCRIPTIONS & PUSH NOTIFICATIONS
// =============================================================================
function handle_push_subscriptions(string $method, array $body, ?array $auth): void {
    if (!$auth) json_error('Authentication required', 401);
    $db = getDB();

    if ($method === 'GET') {
        $userId = $_GET['userId'] ?? ($auth['user_id'] ?? '');
        try {
            $stmt = $db->prepare("SELECT * FROM `push_subscriptions` WHERE `userId`=?");
            $stmt->execute([$userId]);
            json_success($stmt->fetchAll());
        } catch (Throwable $e) {
            json_success([]);
        }
    }

    if ($method === 'POST') {
        $id       = $body['id'] ?? gen_uuid();
        $userId   = $body['userId'] ?? ($auth['user_id'] ?? '');
        $endpoint = $body['endpoint'] ?? '';
        $p256dh   = $body['p256dhKey'] ?? $body['p256dh'] ?? '';
        $authKey  = $body['authKey'] ?? $body['auth'] ?? '';
        $role     = $body['role'] ?? ($auth['role'] ?? '');
        if (!$endpoint) json_error('endpoint is required', 400);
        try {
            $db->prepare("INSERT INTO `push_subscriptions` (`id`,`userId`,`endpoint`,`p256dhKey`,`authKey`,`role`,`createdAt`)
                VALUES (?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE `p256dhKey`=VALUES(`p256dhKey`),`authKey`=VALUES(`authKey`),`role`=VALUES(`role`)")
               ->execute([$id, $userId, $endpoint, $p256dh, $authKey, $role, now_str()]);
            json_success(['id' => $id], 'Subscription saved');
        } catch (Throwable $e) {
            json_error('Failed: ' . $e->getMessage(), 500);
        }
    }

    json_error('Method not allowed', 405);
}

function handle_push_notifications_send(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $userId   = $body['userId'] ?? null;
    $role     = $body['role'] ?? null;
    $title    = $body['title'] ?? 'Notification';
    $message  = $body['message'] ?? '';
    $type     = $body['type'] ?? 'info';

    if (!$message) json_error('message is required', 400);

    $db       = getDB();
    $inserted = 0;

    try {
        if ($userId) {
            // Single user
            $db->prepare("INSERT INTO `notifications` (`id`,`userId`,`title`,`message`,`type`,`isRead`,`timestamp`,`createdAt`)
                VALUES (UUID(),?,?,?,?,0,?,?)")
               ->execute([$userId, $title, $message, $type, now_str(), now_str()]);
            $inserted = 1;
        } elseif ($role) {
            // All users with a specific role
            $users = $db->prepare("SELECT `id` FROM `users` WHERE `role`=?");
            $users->execute([$role]);
            $stmt = $db->prepare("INSERT INTO `notifications` (`id`,`userId`,`title`,`message`,`type`,`isRead`,`timestamp`,`createdAt`) VALUES (UUID(),?,?,?,?,0,?,?)");
            foreach ($users->fetchAll() as $u) {
                $stmt->execute([$u['id'], $title, $message, $type, now_str(), now_str()]);
                $inserted++;
            }
        } else {
            // Broadcast to all users
            $users = $db->query("SELECT `id` FROM `users`");
            $stmt  = $db->prepare("INSERT INTO `notifications` (`id`,`userId`,`title`,`message`,`type`,`isRead`,`timestamp`,`createdAt`) VALUES (UUID(),?,?,?,?,0,?,?)");
            foreach ($users->fetchAll() as $u) {
                $stmt->execute([$u['id'], $title, $message, $type, now_str(), now_str()]);
                $inserted++;
            }
        }
    } catch (Throwable $e) {
        json_error('Failed to send notifications: ' . $e->getMessage(), 500);
    }

    json_success(['sent' => $inserted], "Notification sent to {$inserted} user(s)");
}


// =============================================================================
// STUDENT PERFORMANCE ANALYTICS
// =============================================================================
function handle_analytics_student(string $method, ?array $auth): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!$auth) json_error('Authentication required', 401);

    $studentId = $_GET['studentId'] ?? '';
    if (!$studentId) json_error('studentId is required', 400);

    $db = getDB();

    // ── Marks history from exam_attempts ──────────────────────────────────────
    $marksHistory = [];
    try {
        $stmt = $db->prepare("
            SELECT ea.`score`, ea.`totalMarks`, ea.`percentage`, ea.`passed`, ea.`submittedAt`,
                   oe.`title` AS examTitle, oe.`subject`
            FROM `exam_attempts` ea
            LEFT JOIN `online_exams` oe ON oe.`id` = ea.`examId`
            WHERE ea.`studentId` = ?
            ORDER BY ea.`submittedAt` ASC
        ");
        $stmt->execute([$studentId]);
        $marksHistory = $stmt->fetchAll();
    } catch (Throwable $e) {}

    // ── Attendance summary from attendance records ────────────────────────────
    $attendanceSummary = ['total' => 0, 'present' => 0, 'absent' => 0, 'late' => 0, 'percentage' => 0];
    try {
        $stmt = $db->prepare("SELECT `status`, COUNT(*) AS cnt FROM `attendance` WHERE `studentId`=? GROUP BY `status`");
        $stmt->execute([$studentId]);
        $rows  = $stmt->fetchAll();
        $total = 0;
        $pres  = 0;
        foreach ($rows as $r) {
            $total += (int)$r['cnt'];
            $status = strtolower($r['status'] ?? '');
            if ($status === 'present') $pres += (int)$r['cnt'];
            elseif (strpos($status, 'late') !== false) {
                $attendanceSummary['late'] += (int)$r['cnt'];
                $pres += (int)$r['cnt']; // count late as present for %
            } elseif ($status === 'absent') {
                $attendanceSummary['absent'] += (int)$r['cnt'];
            }
        }
        $attendanceSummary['total']      = $total;
        $attendanceSummary['present']    = $pres;
        $attendanceSummary['percentage'] = $total > 0 ? round(($pres / $total) * 100, 1) : 0;
    } catch (Throwable $e) {}

    // ── Fees history from fee_receipts ────────────────────────────────────────
    $feesHistory = [];
    try {
        $stmt = $db->prepare("SELECT `receiptNo`,`totalAmount`,`paidAmount`,`balance`,`paymentMode`,`paymentDate`,`date`,`months`,`session` FROM `fee_receipts` WHERE `studentId`=? ORDER BY `createdAt` DESC LIMIT 50");
        $stmt->execute([$studentId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            if (isset($r['months']) && is_string($r['months'])) {
                $d = json_decode($r['months'], true);
                if (is_array($d)) $r['months'] = $d;
            }
        }
        unset($r);
        $feesHistory = $rows;
    } catch (Throwable $e) {}

    // ── Face-recognition attendance (separate from manual) ───────────────────
    $faceAttendance = [];
    try {
        $stmt = $db->prepare("SELECT `attendanceDate`,`confidence`,`method`,`timestamp` FROM `face_attendance` WHERE `studentId`=? ORDER BY `attendanceDate` DESC LIMIT 100");
        $stmt->execute([$studentId]);
        $faceAttendance = $stmt->fetchAll();
    } catch (Throwable $e) {}

    json_success([
        'studentId'         => $studentId,
        'marksHistory'      => $marksHistory,
        'attendanceSummary' => $attendanceSummary,
        'feesHistory'       => $feesHistory,
        'faceAttendance'    => $faceAttendance,
    ], 'Analytics fetched');
}


// =============================================================================
// COLLECTION → TABLE MAP
// =============================================================================
function collection_table_map(): array {
    return [
        // Students
        'students'               => 'students',
        // Staff
        'staff'                  => 'staff',
        // Classes
        'classes'                => 'classes',
        // Subjects
        'subjects'               => 'subjects',
        // Fees
        'feesPlans'              => 'fees_plan',
        'fees_plan'              => 'fees_plan',
        'fee_plans'              => 'fees_plan',
        'feeHeadings'            => 'fee_headings',
        'fee_headings'           => 'fee_headings',
        'fee_heads'              => 'fee_headings',
        'feeReceipts'            => 'fee_receipts',
        'fee_receipts'           => 'fee_receipts',
        // Attendance
        'attendanceRecords'      => 'attendance',
        'attendance'             => 'attendance',
        'staffAttendance'        => 'staff_attendance',
        'staff_attendance'       => 'staff_attendance',
        // Transport
        'routes'                 => 'routes',
        'pickup_points'          => 'pickup_points',
        'pickupPoints'           => 'pickup_points',
        'student_transport'      => 'student_transport',
        'studentTransport'       => 'student_transport',
        'student_discounts'      => 'student_discounts',
        'studentDiscounts'       => 'student_discounts',
        // Inventory
        'inventory'              => 'inventory_items',
        'inventory_items'        => 'inventory_items',
        'inventoryItems'         => 'inventory_items',
        'inventory_transactions' => 'inventory_transactions',
        'inventoryTransactions'  => 'inventory_transactions',
        // Finance
        'expenses'               => 'expenses',
        'expense_heads'          => 'expense_heads',
        'expenseHeads'           => 'expense_heads',
        // Academic
        'homework'               => 'homework',
        'exam_timetables'        => 'exam_timetables',
        'examTimetables'         => 'exam_timetables',
        'teacher_timetables'     => 'teacher_timetables',
        'teacherTimetables'      => 'teacher_timetables',
        // Sessions
        'sessions'               => 'school_sessions',
        'school_sessions'        => 'school_sessions',
        // Alumni
        'alumni'                 => 'alumni',
        // Communication
        'notices'                => 'notices',
        'notifications'          => 'notifications',
        // Users & Permissions
        'users'                  => 'users',
        'permissions'            => 'permissions',
        // Chat & Calls
        'chatMessages'           => 'chat_messages',
        'chat_messages'          => 'chat_messages',
        'chatGroups'             => 'chat_groups',
        'chat_groups'            => 'chat_groups',
        'calls'                  => 'call_logs',
        'call_logs'              => 'call_logs',
        // HR
        'biometric_devices'      => 'biometric_devices',
        'biometricDevices'       => 'biometric_devices',
        'payroll'                => 'payroll',
        // Settings
        'settings'               => 'school_settings',
        'school_settings'        => 'school_settings',
        // Changelog
        'changelog'              => 'changelog',
        // Face recognition
        'face_descriptors'       => 'face_descriptors',
        'faceDescriptors'        => 'face_descriptors',
        'face_attendance'        => 'face_attendance',
        'faceAttendance'         => 'face_attendance',
        // Library
        'library_books'          => 'library_books',
        'libraryBooks'           => 'library_books',
        'book_issues'            => 'book_issues',
        'bookIssues'             => 'book_issues',
        // Online exams
        'online_exams'           => 'online_exams',
        'onlineExams'            => 'online_exams',
        'exam_attempts'          => 'exam_attempts',
        'examAttempts'           => 'exam_attempts',
        // GPS tracking
        'driver_locations'       => 'driver_locations',
        'driverLocations'        => 'driver_locations',
        'transport_trips'        => 'transport_trips',
        'transportTrips'         => 'transport_trips',
        // Broadcast
        'broadcast_campaigns'    => 'broadcast_campaigns',
        'broadcastCampaigns'     => 'broadcast_campaigns',
        // Push subscriptions
        'push_subscriptions'     => 'push_subscriptions',
        'pushSubscriptions'      => 'push_subscriptions',
    ];
}


// =============================================================================
// TABLE DEFINITIONS — ALL camelCase columns matching frontend JS keys
// =============================================================================
function get_table_definitions(): array {
    return [

        'students' => "CREATE TABLE `students` (
            `id`               VARCHAR(36) PRIMARY KEY,
            `admNo`            VARCHAR(100),
            `name`             VARCHAR(255),
            `fullName`         VARCHAR(255),
            `dob`              VARCHAR(50),
            `gender`           VARCHAR(20),
            `class`            VARCHAR(100),
            `section`          VARCHAR(50),
            `fatherName`       VARCHAR(255),
            `motherName`       VARCHAR(255),
            `fatherMobile`     VARCHAR(50),
            `motherMobile`     VARCHAR(50),
            `mobile`           VARCHAR(50),
            `guardianMobile`   VARCHAR(50),
            `address`          TEXT,
            `village`          VARCHAR(255),
            `category`         VARCHAR(100),
            `photo`            TEXT,
            `aadhaarNo`        VARCHAR(50),
            `aadharNo`         VARCHAR(50),
            `srNo`             VARCHAR(100),
            `penNo`            VARCHAR(100),
            `apaarNo`          VARCHAR(100),
            `previousSchool`   VARCHAR(255),
            `admissionDate`    VARCHAR(50),
            `status`           VARCHAR(50) DEFAULT 'active',
            `sessionId`        VARCHAR(100),
            `session`          VARCHAR(100),
            `routeId`          VARCHAR(36),
            `pickupPointId`    VARCHAR(36),
            `busNo`            VARCHAR(50),
            `transportMonths`  TEXT,
            `discount`         DECIMAL(12,2) DEFAULT 0,
            `discountAppliedTo` TEXT,
            `primaryMobile`    VARCHAR(50),
            `siblingGroup`     VARCHAR(36),
            `bloodGroup`       VARCHAR(20),
            `religion`         VARCHAR(100),
            `caste`            VARCHAR(100),
            `nationality`      VARCHAR(100),
            `annualIncome`     VARCHAR(100),
            `email`            VARCHAR(255),
            `alternatePhone`   VARCHAR(50),
            `emergencyContact` VARCHAR(50),
            `leavingDate`      VARCHAR(50),
            `leavingReason`    TEXT,
            `remarks`          TEXT,
            `updatedAt`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `createdAt`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'staff' => "CREATE TABLE `staff` (
            `id`            VARCHAR(36) PRIMARY KEY,
            `empId`         VARCHAR(100),
            `fullName`      VARCHAR(255),
            `name`          VARCHAR(255),
            `designation`   VARCHAR(255),
            `department`    VARCHAR(255),
            `mobile`        VARCHAR(50),
            `email`         VARCHAR(255),
            `address`       TEXT,
            `joiningDate`   VARCHAR(50),
            `joinDate`      VARCHAR(50),
            `salary`        DECIMAL(12,2) DEFAULT 0,
            `status`        VARCHAR(50) DEFAULT 'Active',
            `photo`         TEXT,
            `gender`        VARCHAR(20),
            `dob`           VARCHAR(50),
            `aadhaarNo`     VARCHAR(50),
            `aadharNo`      VARCHAR(50),
            `bankAccount`   VARCHAR(100),
            `ifscCode`      VARCHAR(50),
            `bankName`      VARCHAR(255),
            `panNo`         VARCHAR(50),
            `subject`       VARCHAR(255),
            `qualification` VARCHAR(255),
            `experience`    VARCHAR(255),
            `session`       VARCHAR(100),
            `updatedAt`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `createdAt`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'classes' => "CREATE TABLE `classes` (
            `id`        VARCHAR(36) PRIMARY KEY,
            `name`      VARCHAR(255),
            `className` VARCHAR(255),
            `sections`  TEXT,
            `session`   VARCHAR(100),
            `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'subjects' => "CREATE TABLE `subjects` (
            `id`        VARCHAR(36) PRIMARY KEY,
            `name`      VARCHAR(255),
            `code`      VARCHAR(100),
            `classes`   TEXT,
            `session`   VARCHAR(100),
            `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'fees_plan' => "CREATE TABLE `fees_plan` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `classId`     VARCHAR(100),
            `class`       VARCHAR(100),
            `className`   VARCHAR(100),
            `sectionId`   VARCHAR(50),
            `section`     VARCHAR(50),
            `sectionName` VARCHAR(50),
            `headingId`   VARCHAR(36),
            `headingName` VARCHAR(255),
            `amounts`     TEXT,
            `amount`      DECIMAL(12,2) DEFAULT 0,
            `months`      TEXT,
            `sessionId`   VARCHAR(100),
            `session`     VARCHAR(100),
            `updatedAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `createdAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'fee_headings' => "CREATE TABLE `fee_headings` (
            `id`                VARCHAR(36) PRIMARY KEY,
            `name`              VARCHAR(255),
            `type`              VARCHAR(100),
            `description`       TEXT,
            `amount`            DECIMAL(12,2) DEFAULT 0,
            `months`            TEXT,
            `applicableClasses` TEXT,
            `isActive`          TINYINT(1) DEFAULT 1,
            `displayOrder`      INT DEFAULT 0,
            `accountId`         VARCHAR(36),
            `accountName`       VARCHAR(255),
            `headType`          VARCHAR(50),
            `sessionId`         VARCHAR(100),
            `session`           VARCHAR(100),
            `createdAt`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updatedAt`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'fee_receipts' => "CREATE TABLE `fee_receipts` (
            `id`               VARCHAR(36) PRIMARY KEY,
            `receiptNo`        VARCHAR(100),
            `studentId`        VARCHAR(36),
            `admNo`            VARCHAR(100),
            `studentName`      VARCHAR(255),
            `class`            VARCHAR(100),
            `section`          VARCHAR(50),
            `session`          VARCHAR(100),
            `months`           TEXT,
            `headings`         TEXT,
            `amounts`          TEXT,
            `headingAmounts`   TEXT,
            `otherCharges`     DECIMAL(12,2) DEFAULT 0,
            `otherDescription` VARCHAR(255),
            `totalAmount`      DECIMAL(12,2) DEFAULT 0,
            `paidAmount`       DECIMAL(12,2) DEFAULT 0,
            `balance`          DECIMAL(12,2) DEFAULT 0,
            `paymentMode`      VARCHAR(50) DEFAULT 'Cash',
            `paymentDate`      VARCHAR(50),
            `date`             VARCHAR(50),
            `notes`            TEXT,
            `createdAt`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updatedAt`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'attendance' => "CREATE TABLE `attendance` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `studentId`   VARCHAR(36),
            `admNo`       VARCHAR(100),
            `name`        VARCHAR(255),
            `class`       VARCHAR(100),
            `section`     VARCHAR(50),
            `date`        VARCHAR(50),
            `status`      VARCHAR(20) DEFAULT 'Present',
            `checkInTime` VARCHAR(50),
            `checkOutTime`VARCHAR(50),
            `inTime`      VARCHAR(50),
            `outTime`     VARCHAR(50),
            `markedBy`    VARCHAR(255),
            `method`      VARCHAR(50),
            `session`     VARCHAR(100),
            `createdAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'staff_attendance' => "CREATE TABLE `staff_attendance` (
            `id`      VARCHAR(36) PRIMARY KEY,
            `staffId` VARCHAR(36),
            `empId`   VARCHAR(100),
            `name`    VARCHAR(255),
            `date`    VARCHAR(50),
            `status`  VARCHAR(20) DEFAULT 'Present',
            `inTime`  VARCHAR(50),
            `outTime` VARCHAR(50),
            `session` VARCHAR(100),
            `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'routes' => "CREATE TABLE `routes` (
            `id`           VARCHAR(36) PRIMARY KEY,
            `name`         VARCHAR(255),
            `description`  TEXT,
            `driver`       VARCHAR(255),
            `stops`        TEXT,
            `pickupPoints` TEXT,
            `session`      VARCHAR(100),
            `createdAt`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updatedAt`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'pickup_points' => "CREATE TABLE `pickup_points` (
            `id`      VARCHAR(36) PRIMARY KEY,
            `routeId` VARCHAR(36),
            `name`    VARCHAR(255),
            `fare`    DECIMAL(12,2) DEFAULT 0,
            `order`   INT DEFAULT 0,
            `session` VARCHAR(100),
            `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'student_transport' => "CREATE TABLE `student_transport` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `studentId`   VARCHAR(36),
            `admNo`       VARCHAR(100),
            `routeId`     VARCHAR(36),
            `pickupPoint` VARCHAR(255),
            `months`      TEXT,
            `session`     VARCHAR(100),
            `createdAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'student_discounts' => "CREATE TABLE `student_discounts` (
            `id`                 VARCHAR(36) PRIMARY KEY,
            `studentId`          VARCHAR(36),
            `admNo`              VARCHAR(100),
            `discountAmount`     DECIMAL(12,2) DEFAULT 0,
            `applicableHeadings` TEXT,
            `months`             TEXT,
            `session`            VARCHAR(100),
            `createdAt`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'inventory_items' => "CREATE TABLE `inventory_items` (
            `id`            VARCHAR(36) PRIMARY KEY,
            `name`          VARCHAR(255),
            `category`      VARCHAR(255),
            `quantity`      INT DEFAULT 0,
            `stock`         INT DEFAULT 0,
            `unit`          VARCHAR(50),
            `price`         DECIMAL(12,2) DEFAULT 0,
            `purchasePrice` DECIMAL(12,2) DEFAULT 0,
            `sellPrice`     DECIMAL(12,2) DEFAULT 0,
            `description`   TEXT,
            `session`       VARCHAR(100),
            `createdAt`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updatedAt`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'inventory_transactions' => "CREATE TABLE `inventory_transactions` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `itemId`      VARCHAR(36),
            `type`        VARCHAR(50),
            `quantity`    INT DEFAULT 0,
            `price`       DECIMAL(12,2) DEFAULT 0,
            `date`        VARCHAR(50),
            `description` TEXT,
            `session`     VARCHAR(100),
            `createdAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'expenses' => "CREATE TABLE `expenses` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `type`        VARCHAR(50),
            `head`        VARCHAR(255),
            `headId`      VARCHAR(36),
            `amount`      DECIMAL(12,2) DEFAULT 0,
            `date`        VARCHAR(50),
            `description` TEXT,
            `paymentMode` VARCHAR(50),
            `session`     VARCHAR(100),
            `createdAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updatedAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'expense_heads' => "CREATE TABLE `expense_heads` (
            `id`      VARCHAR(36) PRIMARY KEY,
            `name`    VARCHAR(255),
            `type`    VARCHAR(50),
            `budget`  DECIMAL(12,2) DEFAULT 0,
            `session` VARCHAR(100),
            `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'homework' => "CREATE TABLE `homework` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `class`       VARCHAR(100),
            `section`     VARCHAR(50),
            `subject`     VARCHAR(255),
            `title`       VARCHAR(500),
            `description` TEXT,
            `dueDate`     VARCHAR(50),
            `assignedBy`  VARCHAR(255),
            `submittedBy` TEXT,
            `session`     VARCHAR(100),
            `createdAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updatedAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'school_sessions' => "CREATE TABLE `school_sessions` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `label`      VARCHAR(100),
            `name`       VARCHAR(100),
            `startYear`  INT DEFAULT 0,
            `endYear`    INT DEFAULT 0,
            `startDate`  VARCHAR(50),
            `endDate`    VARCHAR(50),
            `isActive`   TINYINT(1) DEFAULT 0,
            `isCurrent`  TINYINT(1) DEFAULT 0,
            `isArchived` TINYINT(1) DEFAULT 0,
            `archived`   TINYINT(1) DEFAULT 0,
            `createdAt`  VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'alumni' => "CREATE TABLE `alumni` (
            `id`            VARCHAR(36) PRIMARY KEY,
            `fullName`      VARCHAR(255),
            `name`          VARCHAR(255),
            `admNo`         VARCHAR(100),
            `yearOfPassing` VARCHAR(10),
            `class`         VARCHAR(100),
            `mobile`        VARCHAR(50),
            `email`         VARCHAR(255),
            `occupation`    VARCHAR(255),
            `session`       VARCHAR(100),
            `createdAt`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updatedAt`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'notices' => "CREATE TABLE `notices` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `title`       VARCHAR(500),
            `content`     TEXT,
            `date`        VARCHAR(50),
            `author`      VARCHAR(255),
            `targetRoles` TEXT,
            `attachments` TEXT,
            `session`     VARCHAR(100),
            `createdAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'notifications' => "CREATE TABLE `notifications` (
            `id`        VARCHAR(36) PRIMARY KEY,
            `userId`    VARCHAR(36),
            `title`     VARCHAR(500),
            `message`   TEXT,
            `type`      VARCHAR(50),
            `isRead`    TINYINT(1) DEFAULT 0,
            `timestamp` VARCHAR(50),
            `icon`      VARCHAR(100),
            `session`   VARCHAR(100),
            `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'exam_timetables' => "CREATE TABLE `exam_timetables` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `examName`    VARCHAR(255),
            `class`       VARCHAR(100),
            `entries`     TEXT,
            `publishDate` VARCHAR(50),
            `session`     VARCHAR(100),
            `createdAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'teacher_timetables' => "CREATE TABLE `teacher_timetables` (
            `id`        VARCHAR(36) PRIMARY KEY,
            `teacherId` VARCHAR(36),
            `entries`   TEXT,
            `session`   VARCHAR(100),
            `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'users' => "CREATE TABLE `users` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `username`    VARCHAR(255) UNIQUE,
            `password`    VARCHAR(255),
            `role`        VARCHAR(100),
            `fullName`    VARCHAR(255),
            `name`        VARCHAR(255),
            `mobile`      VARCHAR(50),
            `email`       VARCHAR(255),
            `session`     VARCHAR(100),
            `permissions` TEXT,
            `linkedId`    VARCHAR(36),
            `createdAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updatedAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'permissions' => "CREATE TABLE `permissions` (
            `id`        VARCHAR(36) PRIMARY KEY,
            `role`      VARCHAR(100),
            `module`    VARCHAR(100),
            `canRead`   TINYINT(1) DEFAULT 0,
            `canWrite`  TINYINT(1) DEFAULT 0,
            `canAdd`    TINYINT(1) DEFAULT 0,
            `canDelete` TINYINT(1) DEFAULT 0,
            UNIQUE KEY `role_module` (`role`,`module`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'school_settings' => "CREATE TABLE `school_settings` (
            `id`    VARCHAR(36) PRIMARY KEY,
            `key`   VARCHAR(255) UNIQUE,
            `value` TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'chat_messages' => "CREATE TABLE `chat_messages` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `groupId`    VARCHAR(36),
            `senderId`   VARCHAR(36),
            `senderName` VARCHAR(255),
            `senderRole` VARCHAR(100),
            `receiverId` VARCHAR(36),
            `content`    TEXT,
            `message`    TEXT,
            `type`       VARCHAR(50) DEFAULT 'text',
            `fileUrl`    TEXT,
            `fileName`   VARCHAR(500),
            `timestamp`  VARCHAR(50),
            `readBy`     TEXT,
            `session`    VARCHAR(100),
            `createdAt`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'chat_groups' => "CREATE TABLE `chat_groups` (
            `id`      VARCHAR(36) PRIMARY KEY,
            `name`    VARCHAR(255),
            `type`    VARCHAR(50),
            `members` TEXT,
            `session` VARCHAR(100),
            `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'call_logs' => "CREATE TABLE `call_logs` (
            `id`           VARCHAR(36) PRIMARY KEY,
            `callerId`     VARCHAR(36),
            `callerName`   VARCHAR(255),
            `receiverId`   VARCHAR(36),
            `receiverName` VARCHAR(255),
            `duration`     INT DEFAULT 0,
            `status`       VARCHAR(50),
            `startedAt`    VARCHAR(50),
            `endedAt`      VARCHAR(50),
            `startTime`    VARCHAR(50),
            `endTime`      VARCHAR(50),
            `session`      VARCHAR(100),
            `createdAt`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'biometric_devices' => "CREATE TABLE `biometric_devices` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `name`       VARCHAR(255),
            `ipAddress`  VARCHAR(100),
            `port`       INT DEFAULT 4370,
            `deviceType` VARCHAR(100),
            `location`   VARCHAR(255),
            `status`     VARCHAR(50) DEFAULT 'Active',
            `session`    VARCHAR(100),
            `createdAt`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'payroll' => "CREATE TABLE `payroll` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `staffId`     VARCHAR(36),
            `empId`       VARCHAR(100),
            `name`        VARCHAR(255),
            `fullName`    VARCHAR(255),
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
            `session`     VARCHAR(100),
            `createdAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updatedAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'changelog' => "CREATE TABLE `changelog` (
            `id`        VARCHAR(36) PRIMARY KEY,
            `userId`    VARCHAR(36),
            `username`  VARCHAR(255),
            `role`      VARCHAR(100),
            `module`    VARCHAR(100),
            `action`    VARCHAR(50),
            `recordId`  VARCHAR(36),
            `oldValue`  LONGTEXT,
            `newValue`  LONGTEXT,
            `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_module` (`module`),
            INDEX `idx_createdAt` (`createdAt`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // ── NEW v5 feature tables ──────────────────────────────────────────────

        'face_descriptors' => "CREATE TABLE IF NOT EXISTS `face_descriptors` (
            `id`             VARCHAR(50) PRIMARY KEY,
            `studentId`      VARCHAR(50) NOT NULL,
            `descriptorData` LONGTEXT,
            `enrolledAt`     DATETIME,
            INDEX `idx_studentId` (`studentId`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'face_attendance' => "CREATE TABLE IF NOT EXISTS `face_attendance` (
            `id`             VARCHAR(50) PRIMARY KEY,
            `studentId`      VARCHAR(50) NOT NULL,
            `confidence`     DECIMAL(4,3) DEFAULT 0,
            `method`         VARCHAR(20) DEFAULT 'face_recognition',
            `attendanceDate` DATE,
            `timestamp`      DATETIME,
            `sessionId`      VARCHAR(50),
            INDEX `idx_studentId` (`studentId`),
            INDEX `idx_date` (`attendanceDate`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'library_books' => "CREATE TABLE IF NOT EXISTS `library_books` (
            `id`           VARCHAR(50) PRIMARY KEY,
            `isbn`         VARCHAR(50),
            `title`        VARCHAR(255) NOT NULL,
            `author`       VARCHAR(255),
            `publisher`    VARCHAR(255),
            `category`     VARCHAR(100),
            `totalQty`     INT DEFAULT 1,
            `availableQty` INT DEFAULT 1,
            `location`     VARCHAR(100),
            `addedAt`      DATETIME,
            INDEX `idx_isbn` (`isbn`),
            INDEX `idx_category` (`category`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'book_issues' => "CREATE TABLE IF NOT EXISTS `book_issues` (
            `id`         VARCHAR(50) PRIMARY KEY,
            `bookId`     VARCHAR(50) NOT NULL,
            `studentId`  VARCHAR(50) NOT NULL,
            `issueDate`  DATE,
            `dueDate`    DATE,
            `returnDate` DATE,
            `fine`       DECIMAL(10,2) DEFAULT 0,
            `status`     VARCHAR(20) DEFAULT 'issued',
            INDEX `idx_bookId` (`bookId`),
            INDEX `idx_studentId` (`studentId`),
            INDEX `idx_status` (`status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'online_exams' => "CREATE TABLE IF NOT EXISTS `online_exams` (
            `id`             VARCHAR(50) PRIMARY KEY,
            `title`          VARCHAR(255) NOT NULL,
            `subject`        VARCHAR(100),
            `classId`        VARCHAR(50),
            `sections`       TEXT,
            `duration`       INT DEFAULT 60,
            `totalMarks`     INT DEFAULT 100,
            `passPercentage` INT DEFAULT 33,
            `startTime`      DATETIME,
            `endTime`        DATETIME,
            `questionsData`  LONGTEXT,
            `status`         VARCHAR(20) DEFAULT 'draft',
            `createdBy`      VARCHAR(100),
            `session`        VARCHAR(100),
            INDEX `idx_classId` (`classId`),
            INDEX `idx_status` (`status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'exam_attempts' => "CREATE TABLE IF NOT EXISTS `exam_attempts` (
            `id`          VARCHAR(50) PRIMARY KEY,
            `examId`      VARCHAR(50) NOT NULL,
            `studentId`   VARCHAR(50) NOT NULL,
            `answersData` TEXT,
            `score`       DECIMAL(6,2) DEFAULT 0,
            `totalMarks`  INT DEFAULT 0,
            `percentage`  DECIMAL(5,2) DEFAULT 0,
            `passed`      TINYINT(1) DEFAULT 0,
            `startedAt`   DATETIME,
            `submittedAt` DATETIME,
            `timeTaken`   INT DEFAULT 0,
            UNIQUE KEY `uq_exam_student` (`examId`,`studentId`),
            INDEX `idx_examId` (`examId`),
            INDEX `idx_studentId` (`studentId`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'driver_locations' => "CREATE TABLE IF NOT EXISTS `driver_locations` (
            `id`        VARCHAR(50) PRIMARY KEY,
            `driverId`  VARCHAR(50),
            `routeId`   VARCHAR(50),
            `latitude`  DECIMAL(10,8) DEFAULT 0,
            `longitude` DECIMAL(11,8) DEFAULT 0,
            `accuracy`  DECIMAL(8,2) DEFAULT 0,
            `timestamp` DATETIME,
            `isActive`  TINYINT(1) DEFAULT 1,
            INDEX `idx_routeId` (`routeId`),
            INDEX `idx_driverId` (`driverId`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'transport_trips' => "CREATE TABLE IF NOT EXISTS `transport_trips` (
            `id`        VARCHAR(50) PRIMARY KEY,
            `routeId`   VARCHAR(50),
            `driverId`  VARCHAR(50),
            `startTime` DATETIME,
            `endTime`   DATETIME,
            `status`    VARCHAR(20) DEFAULT 'active',
            INDEX `idx_routeId` (`routeId`),
            INDEX `idx_driverId` (`driverId`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'broadcast_campaigns' => "CREATE TABLE IF NOT EXISTS `broadcast_campaigns` (
            `id`               VARCHAR(50) PRIMARY KEY,
            `title`            VARCHAR(255) NOT NULL,
            `channel`          VARCHAR(20) DEFAULT 'whatsapp',
            `recipientsData`   TEXT,
            `template`         VARCHAR(255),
            `message`          TEXT,
            `scheduledAt`      DATETIME,
            `sentAt`           DATETIME,
            `status`           VARCHAR(20) DEFAULT 'draft',
            `totalRecipients`  INT DEFAULT 0,
            `delivered`        INT DEFAULT 0,
            `failed`           INT DEFAULT 0,
            `createdBy`        VARCHAR(100),
            `createdAt`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_status` (`status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'push_subscriptions' => "CREATE TABLE IF NOT EXISTS `push_subscriptions` (
            `id`        VARCHAR(50) PRIMARY KEY,
            `userId`    VARCHAR(50) NOT NULL,
            `endpoint`  TEXT NOT NULL,
            `p256dhKey` TEXT,
            `authKey`   TEXT,
            `role`      VARCHAR(50),
            `createdAt` DATETIME,
            INDEX `idx_userId` (`userId`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];
}
