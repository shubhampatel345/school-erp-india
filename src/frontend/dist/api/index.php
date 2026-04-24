<?php
/**
 * SHUBH SCHOOL ERP — Complete PHP API v6.0
 *
 * Single-file router. No .htaccess required.
 * Route via: ?route=ROUTE_NAME
 *
 * Quick-start:
 *   1. Upload index.php + config.php to public_html/api/
 *   2. Edit config.php with your MySQL credentials
 *   3. Visit https://yourdomain.com/api/?route=migrate/run
 *   4. Login: POST ?route=auth/login  {"username":"admin","password":"admin123"}
 */

ob_start();
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        ob_clean();
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
        }
        echo json_encode(['success' => false, 'error' => 'Fatal: ' . $e['message']]);
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
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['success' => true]);
    exit;
}

require_once __DIR__ . '/config.php';

$route  = trim($_GET['route'] ?? '', '/');
$method = $_SERVER['REQUEST_METHOD'];
$body   = (array)(json_decode(file_get_contents('php://input'), true) ?? []);
$body   = sanitizeArray($body);
$auth   = getAuthPayload();

try {

// ── Health ────────────────────────────────────────────────────────────────────
if ($route === '' || $route === 'health') {
    $dbOk = false;
    try { getDB(); $dbOk = true; } catch (Throwable $e) {}
    jsonSuccess([
        'status'     => 'ok',
        'mysql'      => $dbOk ? 'connected' : 'disconnected',
        'version'    => API_VERSION,
        'serverTime' => gmdate('c'),
    ]);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
if ($route === 'auth/login')           { route_auth_login($method, $body); }
if ($route === 'auth/verify')          { route_auth_verify($auth); }
if ($route === 'auth/refresh')         { route_auth_refresh($method, $body); }
if ($route === 'auth/logout')          { jsonSuccess(null, 'Logged out'); }
if ($route === 'auth/change-password') { route_auth_change_password($method, $body, $auth); }

// ── Migrate ───────────────────────────────────────────────────────────────────
if ($route === 'migrate/run')   { route_migrate_run(); }
if ($route === 'migrate/reset') { route_migrate_reset($method, $body, $auth); }
if ($route === 'migrate/status'){ route_migrate_status(); }

// ── Students ──────────────────────────────────────────────────────────────────
if ($route === 'students/list')        { route_students_list($auth); }
if ($route === 'students/add')         { route_students_add($method, $body, $auth); }
if ($route === 'students/update')      { route_students_update($method, $body, $auth); }
if ($route === 'students/delete')      { route_students_delete($method, $body, $auth); }
if ($route === 'students/bulk-import') { route_students_bulk_import($method, $body, $auth); }
if ($route === 'students/count')       { route_students_count(); }

// ── Staff ─────────────────────────────────────────────────────────────────────
if ($route === 'staff/list')   { route_staff_list($auth); }
if ($route === 'staff/add')    { route_staff_add($method, $body, $auth); }
if ($route === 'staff/update') { route_staff_update($method, $body, $auth); }
if ($route === 'staff/delete') { route_staff_delete($method, $body, $auth); }
if ($route === 'staff/count')  { route_staff_count(); }

// ── Classes ───────────────────────────────────────────────────────────────────
if ($route === 'classes/list')   { route_classes_list($auth); }
if ($route === 'classes/add')    { route_classes_add($method, $body, $auth); }
if ($route === 'sections/add')   { route_sections_add($method, $body, $auth); }

// ── Fees ──────────────────────────────────────────────────────────────────────
if ($route === 'fees/headings')      { route_fees_headings_list($auth); }
if ($route === 'fees/headings/add')  { route_fees_headings_add($method, $body, $auth); }
if ($route === 'fees/plan')          { route_fees_plan_get($auth); }
if ($route === 'fees/plan/save')     { route_fees_plan_save($method, $body, $auth); }
if ($route === 'fees/collect')       { route_fees_collect($method, $body, $auth); }
if ($route === 'fees/receipts')      { route_fees_receipts($auth); }
if ($route === 'fees/due')           { route_fees_due($auth); }

// ── Attendance ────────────────────────────────────────────────────────────────
if ($route === 'attendance/mark')    { route_attendance_mark($method, $body, $auth); }
if ($route === 'attendance/list')    { route_attendance_list($auth); }
if ($route === 'attendance/summary') { route_attendance_summary($auth); }

// ── Sessions ──────────────────────────────────────────────────────────────────
if ($route === 'sessions/list')       { route_sessions_list($auth); }
if ($route === 'sessions/create')     { route_sessions_create($method, $body, $auth); }
if ($route === 'sessions/set-active') { route_sessions_set_active($method, $body, $auth); }

// ── Transport ─────────────────────────────────────────────────────────────────
if ($route === 'transport/routes')      { route_transport_routes($auth); }
if ($route === 'transport/routes/add')  { route_transport_routes_add($method, $body, $auth); }
if ($route === 'transport/pickup/add')  { route_transport_pickup_add($method, $body, $auth); }

// ── Library ───────────────────────────────────────────────────────────────────
if ($route === 'library/books')  { route_library_books($auth); }
if ($route === 'library/books/add') { route_library_books_add($method, $body, $auth); }
if ($route === 'library/issue')  { route_library_issue($method, $body, $auth); }
if ($route === 'library/return') { route_library_return($method, $body, $auth); }

// ── Inventory ─────────────────────────────────────────────────────────────────
if ($route === 'inventory/list')   { route_inventory_list($auth); }
if ($route === 'inventory/add')    { route_inventory_add($method, $body, $auth); }
if ($route === 'inventory/update') { route_inventory_update($method, $body, $auth); }

// ── Exams ─────────────────────────────────────────────────────────────────────
if ($route === 'exams/list')    { route_exams_list($auth); }
if ($route === 'exams/create')  { route_exams_create($method, $body, $auth); }
if ($route === 'results/add')   { route_results_add($method, $body, $auth); }
if ($route === 'results/list')  { route_results_list($auth); }

// ── Expenses ──────────────────────────────────────────────────────────────────
if ($route === 'expenses/list') { route_expenses_list($auth); }
if ($route === 'expenses/add')  { route_expenses_add($method, $body, $auth); }

// ── Homework ──────────────────────────────────────────────────────────────────
if ($route === 'homework/list') { route_homework_list($auth); }
if ($route === 'homework/add')  { route_homework_add($method, $body, $auth); }

// ── Chat ──────────────────────────────────────────────────────────────────────
if ($route === 'chat/messages') { route_chat_messages($auth); }
if ($route === 'chat/send')     { route_chat_send($method, $body, $auth); }

// ── Changelog ─────────────────────────────────────────────────────────────────
if ($route === 'changelog/add')  { route_changelog_add($method, $body, $auth); }
if ($route === 'changelog/list') { route_changelog_list($auth); }

// ── Backup ────────────────────────────────────────────────────────────────────
if ($route === 'backup/export') { route_backup_export($auth); }
if ($route === 'backup/import') { route_backup_import($method, $body, $auth); }

// ── Settings ──────────────────────────────────────────────────────────────────
if ($route === 'settings/get')  { route_settings_get($auth); }
if ($route === 'settings/save') { route_settings_save($method, $body, $auth); }

// ── Stats ─────────────────────────────────────────────────────────────────────
if ($route === 'stats') { route_stats(); }

// ── Users ─────────────────────────────────────────────────────────────────────
if ($route === 'users/list')           { route_users_list($auth); }
if ($route === 'users/create')         { route_users_create($method, $body, $auth); }
if ($route === 'users/update')         { route_users_update($method, $body, $auth); }
if ($route === 'users/delete')         { route_users_delete($method, $body, $auth); }
if ($route === 'users/reset-password') { route_users_reset_password($method, $body, $auth); }

// ── Sync (bulk) ───────────────────────────────────────────────────────────────
if ($route === 'sync/all')  { route_sync_all($auth); }
if ($route === 'sync/push') { route_sync_push($method, $body, $auth); }

jsonError('Route not found: ' . $route, 404);

} catch (PDOException $e) {
    jsonError('Database error: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    jsonError('Server error: ' . $e->getMessage(), 500);
}


// =============================================================================
// AUTH
// =============================================================================
function route_auth_login(string $method, array $body): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $username = sanitize($body['username'] ?? '');
    $password = $body['password'] ?? '';
    if (!$username || !$password) jsonError('username and password are required', 400);

    try { $db = getDB(); } catch (Throwable $e) {
        jsonError('Database not ready. Run ?route=migrate/run first.', 503);
    }

    $stmt = $db->prepare('SELECT * FROM `users` WHERE `username`=? LIMIT 1');
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    if (!$user || !verifyPassword($password, $user['password'] ?? '')) {
        jsonError('Invalid username or password', 401);
    }

    $now     = time();
    $payload = [
        'user_id'  => $user['id'],
        'role'     => $user['role'],
        'username' => $user['username'],
        'name'     => $user['fullName'] ?? $user['name'] ?? $username,
        'iat'      => $now,
        'exp'      => $now + JWT_EXPIRY,
    ];
    $token = generateToken($payload);

    // Generate refresh token (longer-lived, separate secret)
    $refreshPayload = [
        'user_id' => $user['id'],
        'iat'     => $now,
        'exp'     => $now + JWT_REFRESH,
    ];
    $rHeader      = b64u(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $rPay         = b64u(json_encode($refreshPayload));
    $rSig         = b64u(hash_hmac('sha256', "$rHeader.$rPay", APP_SECRET . '_refresh', true));
    $refreshToken = "$rHeader.$rPay.$rSig";

    jsonSuccess([
        'token'         => $token,
        'refresh_token' => $refreshToken,
        'expires_in'    => JWT_EXPIRY,
        'user'          => [
            'id'       => $user['id'],
            'username' => $user['username'],
            'fullName' => $user['fullName'] ?? $user['name'] ?? $username,
            'role'     => $user['role'],
            'mobile'   => $user['mobile'] ?? '',
            'email'    => $user['email'] ?? '',
            'permissions' => $user['permissions'] ?? null,
        ],
    ], 'Login successful');
}

function route_auth_verify(?array $auth): void {
    if (!$auth) jsonError('Token invalid or expired', 401);
    try {
        $db   = getDB();
        $stmt = $db->prepare('SELECT `id`,`username`,`role`,`fullName`,`name`,`mobile`,`email` FROM `users` WHERE `id`=? LIMIT 1');
        $stmt->execute([$auth['user_id'] ?? '']);
        $user = $stmt->fetch();
        if (!$user) jsonError('User not found', 401);
        $user['fullName'] = $user['fullName'] ?? $user['name'] ?? '';
        jsonSuccess(['valid' => true, 'user' => $user]);
    } catch (Throwable $e) {
        jsonSuccess(['valid' => true, 'user' => ['id' => $auth['user_id'] ?? '', 'role' => $auth['role'] ?? '']]);
    }
}

function route_auth_refresh(string $method, array $body): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);

    $refreshToken = trim($body['refresh_token'] ?? '');
    if (!$refreshToken) jsonError('refresh_token is required', 400);

    // Verify the refresh token signature and expiry.
    // We use a separate secret derivation so a stolen access token cannot be
    // used as a refresh token.
    $parts = explode('.', $refreshToken);
    if (count($parts) !== 3) jsonError('Invalid refresh token', 401);
    [$h, $p, $s] = $parts;
    $expected = b64u(hash_hmac('sha256', "$h.$p", APP_SECRET . '_refresh', true));
    if (!hash_equals($expected, $s)) jsonError('Invalid refresh token', 401);

    $data = json_decode(b64d($p), true);
    if (!$data || ($data['exp'] ?? 0) < time()) jsonError('Refresh token expired', 401);

    $userId = $data['user_id'] ?? '';
    if (!$userId) jsonError('Invalid refresh token payload', 401);

    // Load the user to issue a fresh access token
    try { $db = getDB(); } catch (Throwable $e) {
        jsonError('Database not ready', 503);
    }
    $stmt = $db->prepare('SELECT * FROM `users` WHERE `id`=? LIMIT 1');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if (!$user) jsonError('User not found', 401);

    $now     = time();
    $payload = [
        'user_id'  => $user['id'],
        'role'     => $user['role'],
        'username' => $user['username'],
        'name'     => $user['fullName'] ?? $user['name'] ?? $user['username'],
        'iat'      => $now,
        'exp'      => $now + JWT_EXPIRY,
    ];
    $newToken = generateToken($payload);

    // Issue a new refresh token as well (sliding window)
    $refreshPayload = [
        'user_id' => $user['id'],
        'iat'     => $now,
        'exp'     => $now + JWT_REFRESH,
    ];
    $rHeader       = b64u(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $rPay          = b64u(json_encode($refreshPayload));
    $rSig          = b64u(hash_hmac('sha256', "$rHeader.$rPay", APP_SECRET . '_refresh', true));
    $newRefreshToken = "$rHeader.$rPay.$rSig";

    jsonSuccess([
        'token'         => $newToken,
        'refresh_token' => $newRefreshToken,
        'expires_in'    => JWT_EXPIRY,
        'user'          => [
            'id'       => $user['id'],
            'username' => $user['username'],
            'fullName' => $user['fullName'] ?? $user['name'] ?? $user['username'],
            'role'     => $user['role'],
        ],
    ], 'Token refreshed');
}

function route_auth_change_password(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireAuth();

    $newPassword = $body['newPassword'] ?? $body['new_password'] ?? '';
    $oldPassword = $body['oldPassword'] ?? $body['old_password'] ?? '';
    $targetId    = $body['userId'] ?? $body['user_id'] ?? ($auth['user_id'] ?? '');

    if (strlen($newPassword) < 6) jsonError('New password must be at least 6 characters', 400);
    $isSelf       = ($auth['user_id'] ?? '') == $targetId;
    $isSuperAdmin = isSuperAdmin($auth);
    if (!$isSuperAdmin && !$isSelf) jsonError('Forbidden', 403);

    $db = getDB();
    if ($isSelf && !$isSuperAdmin && $oldPassword) {
        $s = $db->prepare('SELECT `password` FROM `users` WHERE `id`=? LIMIT 1');
        $s->execute([$targetId]);
        $row = $s->fetch();
        if ($row && !verifyPassword($oldPassword, $row['password'] ?? '')) {
            jsonError('Current password is incorrect', 401);
        }
    }

    $db->prepare('UPDATE `users` SET `password`=? WHERE `id`=?')
       ->execute([hashPassword($newPassword), $targetId]);
    writeChangelog($db, $auth, 'users', 'change_password', $targetId, null, null);
    jsonSuccess(null, 'Password changed successfully');
}


// =============================================================================
// MIGRATE
// =============================================================================
function route_migrate_run(): void {
    try { $db = getDB(); } catch (Throwable $e) {
        jsonError('Database connection failed: ' . $e->getMessage() . '. Check config.php credentials.', 503);
    }

    $applied = [];
    $errors  = [];
    foreach (getTableDefinitions() as $tableName => $sql) {
        try {
            $db->exec($sql);
            $applied[] = $tableName;
        } catch (Throwable $e) {
            $errors[] = ['table' => $tableName, 'error' => $e->getMessage()];
        }
    }

    // Seed default data
    $seeded = [];
    $seeded[] = seed_admin_user($db);
    $seeded[] = seed_default_session($db);
    seed_default_settings($db);
    seed_default_fee_headings($db);

    jsonSuccess([
        'tables_created' => $applied,
        'errors'         => $errors,
        'seeded'         => array_filter($seeded),
        'message'        => count($applied) . ' tables ready. Login: admin / admin123',
    ], 'Migration complete. Login with admin / admin123');
}

function route_migrate_reset(string $method, array $body, ?array $auth): void {
    if (($body['confirmation'] ?? '') !== 'RESET_DB_TABLES' && !isSuperAdmin($auth)) {
        jsonError('Provide confirmation=RESET_DB_TABLES or authenticate as Super Admin', 401);
    }
    try { $db = getDB(); } catch (Throwable $e) {
        jsonError('Database connection failed: ' . $e->getMessage(), 503);
    }

    $dropped = [];
    $created = [];
    try { $db->exec('SET FOREIGN_KEY_CHECKS=0'); } catch (Throwable $e) {}
    foreach (getTableDefinitions() as $t => $sql) {
        try { $db->exec("DROP TABLE IF EXISTS `{$t}`"); $dropped[] = $t; } catch (Throwable $e) {}
        // Remove IF NOT EXISTS for reset
        $createSql = str_replace('CREATE TABLE IF NOT EXISTS', 'CREATE TABLE', $sql);
        try { $db->exec($createSql); $created[] = $t; } catch (Throwable $e) {}
    }
    try { $db->exec('SET FOREIGN_KEY_CHECKS=1'); } catch (Throwable $e) {}

    seed_admin_user($db, true);
    seed_default_session($db);
    seed_default_settings($db);
    seed_default_fee_headings($db);

    jsonSuccess(['dropped' => $dropped, 'created' => $created], 'Database reset. Login: admin / admin123');
}

function route_migrate_status(): void {
    try {
        $db     = getDB();
        $tables = array_keys(getTableDefinitions());
        $status = [];
        foreach ($tables as $t) {
            try { $db->query("SELECT 1 FROM `{$t}` LIMIT 1"); $status[$t] = 'exists'; }
            catch (Throwable $e) { $status[$t] = 'missing'; }
        }
        jsonSuccess(['tables' => $status]);
    } catch (Throwable $e) {
        jsonError('Database connection failed', 503);
    }
}

function seed_admin_user(PDO $db, bool $force = false): string {
    $hash = hashPassword('admin123');
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
            `permissions` TEXT,
            `linkedId`    VARCHAR(36),
            `createdAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updatedAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $e) {}

    $stmt = $db->prepare("SELECT `id` FROM `users` WHERE `username`='admin' LIMIT 1");
    $stmt->execute();
    $existing = $stmt->fetch();
    $id = 'admin-' . date('Y');

    if (!$existing) {
        try {
            $db->prepare("INSERT INTO `users` (`id`,`username`,`password`,`role`,`fullName`,`name`) VALUES (?,'admin',?,'super_admin','Super Admin','Super Admin')")
               ->execute([$id, $hash]);
            return 'admin user created';
        } catch (Throwable $e) {
            return 'admin insert failed: ' . $e->getMessage();
        }
    }
    if ($force) {
        try {
            $db->prepare("UPDATE `users` SET `password`=?, `role`='super_admin', `fullName`='Super Admin' WHERE `username`='admin'")
               ->execute([$hash]);
            return 'admin password reset';
        } catch (Throwable $e) {
            return 'admin update failed: ' . $e->getMessage();
        }
    }
    return 'admin already exists';
}

function seed_default_session(PDO $db): string {
    try {
        $check = $db->query("SELECT COUNT(*) FROM `school_sessions`");
        if ($check && (int)$check->fetchColumn() === 0) {
            $year  = (int)date('Y');
            $label = $year . '-' . substr((string)($year + 1), 2);
            $id    = 'sess-' . $year;
            $db->prepare("INSERT IGNORE INTO `school_sessions`
                (`id`,`label`,`name`,`startYear`,`endYear`,`isActive`,`isCurrent`,`createdAt`)
                VALUES (?,?,?,?,?,1,1,?)")
               ->execute([$id, $label, $label, $year, $year + 1, nowStr()]);
            return 'default session created: ' . $label;
        }
    } catch (Throwable $e) {}
    return '';
}

function seed_default_settings(PDO $db): void {
    try {
        $check = $db->query("SELECT COUNT(*) FROM `school_settings`");
        if ($check && (int)$check->fetchColumn() === 0) {
            $defaults = [
                ['school_name', 'SHUBH SCHOOL ERP'],
                ['currency', 'INR'],
                ['session', date('Y') . '-' . substr((string)(date('Y') + 1), 2)],
            ];
            $ins = $db->prepare("INSERT IGNORE INTO `school_settings` (`id`,`setting_key`,`setting_value`) VALUES (UUID(),?,?)");
            foreach ($defaults as [$k, $v]) $ins->execute([$k, $v]);
        }
    } catch (Throwable $e) {}
}

function seed_default_fee_headings(PDO $db): void {
    try {
        $check = $db->query("SELECT COUNT(*) FROM `fee_headings`");
        if ($check && (int)$check->fetchColumn() === 0) {
            $heads = ['Tuition Fee', 'Exam Fee', 'Development Fee', 'Sports Fee', 'Computer Fee'];
            $ins = $db->prepare("INSERT IGNORE INTO `fee_headings` (`id`,`name`,`created_at`) VALUES (UUID(),?,NOW())");
            foreach ($heads as $h) $ins->execute([$h]);
        }
    } catch (Throwable $e) {}
}


// =============================================================================
// STUDENTS
// =============================================================================
function route_students_list(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $page    = max(1, (int)($_GET['page'] ?? 1));
    $limit   = min((int)($_GET['limit'] ?? 50), 500);
    $offset  = ($page - 1) * $limit;
    $where   = ['s.is_deleted = 0'];
    $params  = [];

    if (!empty($_GET['class']))   { $where[] = 's.class=?';   $params[] = $_GET['class']; }
    if (!empty($_GET['section'])) { $where[] = 's.section=?'; $params[] = $_GET['section']; }
    if (!empty($_GET['session'])) { $where[] = 's.session=?'; $params[] = $_GET['session']; }
    if (!empty($_GET['search'])) {
        $s = '%' . $_GET['search'] . '%';
        $where[] = '(s.fullName LIKE ? OR s.admNo LIKE ? OR s.fatherMobile LIKE ?)';
        $params  = array_merge($params, [$s, $s, $s]);
    }

    $wc      = 'WHERE ' . implode(' AND ', $where);
    $cStmt   = $db->prepare("SELECT COUNT(*) FROM `students` s $wc");
    $cStmt->execute($params);
    $total = (int)$cStmt->fetchColumn();

    $stmt = $db->prepare("SELECT * FROM `students` s $wc ORDER BY s.fullName ASC LIMIT $limit OFFSET $offset");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    jsonSuccess(['data' => $rows, 'total' => $total, 'page' => $page, 'limit' => $limit]);
}

function route_students_add(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireAuth();

    $fullName = sanitize($body['fullName'] ?? $body['name'] ?? '');
    if (!$fullName) jsonError('fullName is required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();
    $admNo = sanitize($body['admNo'] ?? '');

    $stmt = $db->prepare("INSERT INTO `students`
        (`id`,`admNo`,`fullName`,`fatherName`,`motherName`,`fatherMobile`,`motherMobile`,
         `address`,`dob`,`class`,`section`,`session`,`transportBus`,`transportRoute`,
         `transportPickup`,`transportFare`,`photoPath`,`is_deleted`,`created_at`,`updated_at`)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,NOW(),NOW())
        ON DUPLICATE KEY UPDATE
            `fullName`=VALUES(`fullName`),`fatherName`=VALUES(`fatherName`),
            `motherName`=VALUES(`motherName`),`fatherMobile`=VALUES(`fatherMobile`),
            `motherMobile`=VALUES(`motherMobile`),`address`=VALUES(`address`),
            `dob`=VALUES(`dob`),`class`=VALUES(`class`),`section`=VALUES(`section`),
            `session`=VALUES(`session`),`transportBus`=VALUES(`transportBus`),
            `transportRoute`=VALUES(`transportRoute`),`transportPickup`=VALUES(`transportPickup`),
            `transportFare`=VALUES(`transportFare`),`photoPath`=VALUES(`photoPath`),
            `updated_at`=NOW()");

    $stmt->execute([
        $id,
        $admNo ?: null,
        $fullName,
        sanitize($body['fatherName'] ?? ''),
        sanitize($body['motherName'] ?? ''),
        sanitize($body['fatherMobile'] ?? ''),
        sanitize($body['motherMobile'] ?? ''),
        sanitize($body['address'] ?? ''),
        $body['dob'] ?? null,
        sanitize($body['class'] ?? ''),
        sanitize($body['section'] ?? ''),
        sanitize($body['session'] ?? ''),
        sanitize($body['transportBus'] ?? ''),
        sanitize($body['transportRoute'] ?? ''),
        sanitize($body['transportPickup'] ?? ''),
        isset($body['transportFare']) ? (float)$body['transportFare'] : null,
        sanitize($body['photoPath'] ?? ''),
    ]);

    writeChangelog($db, $auth, 'students', 'add', $id, null, ['fullName' => $fullName]);
    jsonSuccess(['success' => true, 'id' => $id], 'Student added', 201);
}

function route_students_update(string $method, array $body, ?array $auth): void {
    if ($method !== 'PUT') jsonError('Method not allowed', 405);
    $auth = requireAuth();
    $id   = $body['id'] ?? '';
    if (!$id) jsonError('id is required', 400);

    $db   = getDB();
    $sets = [];
    $vals = [];

    $fields = [
        'admNo','fullName','fatherName','motherName','fatherMobile','motherMobile',
        'address','dob','class','section','session','transportBus','transportRoute',
        'transportPickup','transportFare','photoPath',
    ];
    foreach ($fields as $f) {
        if (array_key_exists($f, $body)) {
            $sets[] = "`{$f}`=?";
            $vals[] = $f === 'transportFare' ? (float)$body[$f] : sanitize((string)($body[$f] ?? ''));
        }
    }
    if (empty($sets)) jsonError('No valid fields to update', 400);
    $sets[] = '`updated_at`=NOW()';
    $vals[] = $id;

    $db->prepare("UPDATE `students` SET " . implode(',', $sets) . " WHERE `id`=?")->execute($vals);
    writeChangelog($db, $auth, 'students', 'update', $id, null, $body);
    jsonSuccess(['success' => true]);
}

function route_students_delete(string $method, array $body, ?array $auth): void {
    if ($method !== 'DELETE') jsonError('Method not allowed', 405);
    $auth = requireAuth();
    $id   = $body['id'] ?? $_GET['id'] ?? '';
    if (!$id) jsonError('id is required', 400);

    $db = getDB();
    $db->prepare("UPDATE `students` SET `is_deleted`=1, `updated_at`=NOW() WHERE `id`=?")->execute([$id]);
    writeChangelog($db, $auth, 'students', 'delete', $id, null, null);
    jsonSuccess(['success' => true]);
}

function route_students_bulk_import(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth    = requireAuth();
    $records = $body['students'] ?? $body['records'] ?? $body;
    if (!is_array($records)) jsonError('Provide students array', 400);

    $db     = getDB();
    $count  = 0;
    $errors = [];

    $stmt = $db->prepare("INSERT INTO `students`
        (`id`,`admNo`,`fullName`,`fatherName`,`motherName`,`fatherMobile`,`motherMobile`,
         `address`,`dob`,`class`,`section`,`session`,`transportBus`,`transportRoute`,
         `transportPickup`,`transportFare`,`photoPath`,`is_deleted`,`created_at`,`updated_at`)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,NOW(),NOW())
        ON DUPLICATE KEY UPDATE
            `fullName`=VALUES(`fullName`),`fatherName`=VALUES(`fatherName`),
            `motherName`=VALUES(`motherName`),`fatherMobile`=VALUES(`fatherMobile`),
            `motherMobile`=VALUES(`motherMobile`),`class`=VALUES(`class`),
            `section`=VALUES(`section`),`session`=VALUES(`session`),`updated_at`=NOW()");

    foreach ($records as $idx => $row) {
        if (!is_array($row)) { $errors[] = "Row {$idx}: not an object"; continue; }
        $fullName = sanitize($row['fullName'] ?? $row['name'] ?? '');
        if (!$fullName) { $errors[] = "Row {$idx}: fullName is required"; continue; }
        try {
            $id = $row['id'] ?? genUuid();
            $stmt->execute([
                $id,
                sanitize($row['admNo'] ?? ''),
                $fullName,
                sanitize($row['fatherName'] ?? ''),
                sanitize($row['motherName'] ?? ''),
                sanitize($row['fatherMobile'] ?? ''),
                sanitize($row['motherMobile'] ?? ''),
                sanitize($row['address'] ?? ''),
                $row['dob'] ?? null,
                sanitize($row['class'] ?? ''),
                sanitize($row['section'] ?? ''),
                sanitize($row['session'] ?? ''),
                sanitize($row['transportBus'] ?? ''),
                sanitize($row['transportRoute'] ?? ''),
                sanitize($row['transportPickup'] ?? ''),
                isset($row['transportFare']) ? (float)$row['transportFare'] : null,
                sanitize($row['photoPath'] ?? ''),
            ]);
            $count++;
        } catch (Throwable $e) {
            $errors[] = "Row {$idx}: " . $e->getMessage();
        }
    }

    writeChangelog($db, $auth, 'students', 'bulk_import', null, null, ['count' => $count]);
    jsonSuccess(['success' => true, 'count' => $count, 'errors' => $errors]);
}

function route_students_count(): void {
    try {
        $db    = getDB();
        $count = (int)$db->query("SELECT COUNT(*) FROM `students` WHERE is_deleted=0")->fetchColumn();
        jsonSuccess(['count' => $count]);
    } catch (Throwable $e) {
        jsonSuccess(['count' => 0]);
    }
}


// =============================================================================
// STAFF
// =============================================================================
function route_staff_list(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $where  = ['is_deleted = 0'];
    $params = [];
    if (!empty($_GET['session'])) { $where[] = 'session=?'; $params[] = $_GET['session']; }
    if (!empty($_GET['search'])) {
        $s = '%' . $_GET['search'] . '%';
        $where[] = '(name LIKE ? OR position LIKE ? OR contact LIKE ?)';
        $params  = array_merge($params, [$s, $s, $s]);
    }

    $wc   = 'WHERE ' . implode(' AND ', $where);
    $stmt = $db->prepare("SELECT * FROM `staff` $wc ORDER BY name ASC");
    $stmt->execute($params);
    jsonSuccess($stmt->fetchAll());
}

function route_staff_add(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireAuth();
    $name = sanitize($body['name'] ?? '');
    if (!$name) jsonError('name is required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `staff`
        (`id`,`name`,`position`,`subject`,`assignedClasses`,`salary`,`contact`,`email`,
         `is_deleted`,`created_at`,`updated_at`)
        VALUES (?,?,?,?,?,?,?,?,0,NOW(),NOW())
        ON DUPLICATE KEY UPDATE `name`=VALUES(`name`),`position`=VALUES(`position`),
            `subject`=VALUES(`subject`),`salary`=VALUES(`salary`),`contact`=VALUES(`contact`),
            `email`=VALUES(`email`),`updated_at`=NOW()")
       ->execute([
           $id,
           $name,
           sanitize($body['position'] ?? ''),
           sanitize($body['subject'] ?? ''),
           is_array($body['assignedClasses'] ?? null)
               ? json_encode($body['assignedClasses'])
               : sanitize($body['assignedClasses'] ?? ''),
           isset($body['salary']) ? (float)$body['salary'] : 0,
           sanitize($body['contact'] ?? ''),
           sanitize($body['email'] ?? ''),
       ]);

    writeChangelog($db, $auth, 'staff', 'add', $id, null, ['name' => $name]);
    jsonSuccess(['success' => true, 'id' => $id], 'Staff added', 201);
}

function route_staff_update(string $method, array $body, ?array $auth): void {
    if ($method !== 'PUT') jsonError('Method not allowed', 405);
    $auth = requireAuth();
    $id   = $body['id'] ?? '';
    if (!$id) jsonError('id is required', 400);

    $db   = getDB();
    $sets = [];
    $vals = [];

    foreach (['name','position','subject','contact','email'] as $f) {
        if (array_key_exists($f, $body)) {
            $sets[] = "`{$f}`=?";
            $vals[] = sanitize($body[$f] ?? '');
        }
    }
    if (isset($body['salary'])) { $sets[] = '`salary`=?'; $vals[] = (float)$body['salary']; }
    if (isset($body['assignedClasses'])) {
        $sets[] = '`assignedClasses`=?';
        $vals[] = is_array($body['assignedClasses']) ? json_encode($body['assignedClasses']) : sanitize($body['assignedClasses']);
    }
    if (empty($sets)) jsonError('No valid fields to update', 400);
    $sets[] = '`updated_at`=NOW()';
    $vals[] = $id;

    $db->prepare("UPDATE `staff` SET " . implode(',', $sets) . " WHERE `id`=?")->execute($vals);
    writeChangelog($db, $auth, 'staff', 'update', $id, null, $body);
    jsonSuccess(['success' => true]);
}

function route_staff_delete(string $method, array $body, ?array $auth): void {
    if ($method !== 'DELETE') jsonError('Method not allowed', 405);
    $auth = requireAuth();
    $id   = $body['id'] ?? $_GET['id'] ?? '';
    if (!$id) jsonError('id is required', 400);

    $db = getDB();
    $db->prepare("UPDATE `staff` SET `is_deleted`=1, `updated_at`=NOW() WHERE `id`=?")->execute([$id]);
    writeChangelog($db, $auth, 'staff', 'delete', $id, null, null);
    jsonSuccess(['success' => true]);
}

function route_staff_count(): void {
    try {
        $db    = getDB();
        $count = (int)$db->query("SELECT COUNT(*) FROM `staff` WHERE is_deleted=0")->fetchColumn();
        jsonSuccess(['count' => $count]);
    } catch (Throwable $e) {
        jsonSuccess(['count' => 0]);
    }
}


// =============================================================================
// CLASSES
// =============================================================================
function route_classes_list(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $stmt    = $db->query("SELECT * FROM `classes` ORDER BY `sort_order` ASC, `name` ASC");
    $classes = $stmt->fetchAll();

    foreach ($classes as &$cls) {
        // Attach sections
        $sStmt = $db->prepare("SELECT * FROM `sections` WHERE `class_id`=? ORDER BY `name` ASC");
        $sStmt->execute([$cls['id']]);
        $cls['sections'] = $sStmt->fetchAll();
    }
    unset($cls);

    jsonSuccess($classes);
}

function route_classes_add(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireAuth();
    $name = sanitize($body['name'] ?? '');
    if (!$name) jsonError('name is required', 400);

    $db         = getDB();
    $id         = $body['id'] ?? genUuid();
    $sortOrder  = classSortOrder($name);

    $db->prepare("INSERT INTO `classes` (`id`,`name`,`sort_order`,`created_at`)
        VALUES (?,?,?,NOW())
        ON DUPLICATE KEY UPDATE `name`=VALUES(`name`),`sort_order`=VALUES(`sort_order`)")
       ->execute([$id, $name, $sortOrder]);

    writeChangelog($db, $auth, 'classes', 'add', $id, null, ['name' => $name]);
    jsonSuccess(['success' => true, 'id' => $id]);
}

function route_sections_add(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth    = requireAuth();
    $classId = $body['class_id'] ?? $body['classId'] ?? '';
    $name    = sanitize($body['name'] ?? '');
    if (!$classId || !$name) jsonError('class_id and name are required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `sections` (`id`,`class_id`,`name`,`created_at`)
        VALUES (?,?,?,NOW())
        ON DUPLICATE KEY UPDATE `name`=VALUES(`name`)")
       ->execute([$id, $classId, $name]);

    writeChangelog($db, $auth, 'sections', 'add', $id, null, ['class_id' => $classId, 'name' => $name]);
    jsonSuccess(['success' => true, 'id' => $id]);
}


// =============================================================================
// FEES
// =============================================================================
function route_fees_headings_list(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();
    $stmt = $db->query("SELECT * FROM `fee_headings` ORDER BY `name` ASC");
    jsonSuccess($stmt->fetchAll());
}

function route_fees_headings_add(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireAuth();
    $name = sanitize($body['name'] ?? '');
    if (!$name) jsonError('name is required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `fee_headings` (`id`,`name`,`created_at`) VALUES (?,?,NOW())
        ON DUPLICATE KEY UPDATE `name`=VALUES(`name`)")
       ->execute([$id, $name]);

    writeChangelog($db, $auth, 'fee_headings', 'add', $id, null, ['name' => $name]);
    jsonSuccess(['success' => true, 'id' => $id]);
}

function route_fees_plan_get(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $where  = [];
    $params = [];
    if (!empty($_GET['class_name']))   { $where[] = 'class_name=?';   $params[] = $_GET['class_name']; }
    if (!empty($_GET['section_name'])) { $where[] = 'section_name=?'; $params[] = $_GET['section_name']; }

    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $db->prepare("SELECT fp.*, fh.name AS heading_name
        FROM `fee_plan` fp
        LEFT JOIN `fee_headings` fh ON fh.id = fp.fee_heading_id
        $wc ORDER BY fh.name ASC");
    $stmt->execute($params);
    jsonSuccess($stmt->fetchAll());
}

function route_fees_plan_save(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireAuth();

    $className   = sanitize($body['class_name'] ?? $body['className'] ?? '');
    $sectionName = sanitize($body['section_name'] ?? $body['sectionName'] ?? '');
    $headingId   = sanitize($body['fee_heading_id'] ?? $body['feeHeadingId'] ?? '');
    $amount      = (float)($body['monthly_amount'] ?? $body['monthlyAmount'] ?? 0);

    if (!$className || !$headingId) jsonError('class_name and fee_heading_id are required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `fee_plan`
        (`id`,`class_name`,`section_name`,`fee_heading_id`,`monthly_amount`,`updated_at`)
        VALUES (?,?,?,?,?,NOW())
        ON DUPLICATE KEY UPDATE `monthly_amount`=VALUES(`monthly_amount`), `updated_at`=NOW()")
       ->execute([$id, $className, $sectionName, $headingId, $amount]);

    writeChangelog($db, $auth, 'fee_plan', 'save', $id, null, $body);
    jsonSuccess(['success' => true, 'id' => $id]);
}

function route_fees_collect(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireAuth();

    $studentId     = $body['studentId'] ?? '';
    $month         = sanitize($body['month'] ?? '');
    $amounts       = $body['amounts'] ?? [];
    $totalAmount   = (float)($body['totalAmount'] ?? 0);
    $paymentMethod = sanitize($body['paymentMethod'] ?? 'Cash');
    $receiptNumber = sanitize($body['receiptNumber'] ?? '');
    $qrData        = $body['qrData'] ?? '';

    if (!$studentId || !$month) jsonError('studentId and month are required', 400);
    if ($totalAmount <= 0) jsonError('totalAmount must be greater than 0', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `fee_receipts`
        (`id`,`student_id`,`student_name`,`class`,`section`,`month`,`amounts`,
         `total_amount`,`payment_method`,`reference_id`,`receipt_number`,`qr_data`,`created_at`)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW())")
       ->execute([
           $id,
           $studentId,
           sanitize($body['studentName'] ?? ''),
           sanitize($body['class'] ?? ''),
           sanitize($body['section'] ?? ''),
           $month,
           json_encode($amounts),
           $totalAmount,
           $paymentMethod,
           sanitize($body['referenceId'] ?? ''),
           $receiptNumber ?: ('RCP-' . date('ymd') . '-' . strtoupper(substr($id, 0, 4))),
           is_array($qrData) ? json_encode($qrData) : $qrData,
       ]);

    writeChangelog($db, $auth, 'fee_receipts', 'collect', $id, null, ['studentId' => $studentId, 'month' => $month, 'total' => $totalAmount]);
    jsonSuccess(['success' => true, 'receiptId' => $id]);
}

function route_fees_receipts(?array $auth): void {
    $auth      = requireAuth();
    $db        = getDB();
    $studentId = $_GET['studentId'] ?? '';

    $where  = [];
    $params = [];
    if ($studentId) { $where[] = 'student_id=?'; $params[] = $studentId; }
    if (!empty($_GET['month'])) { $where[] = 'month=?'; $params[] = $_GET['month']; }

    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $db->prepare("SELECT * FROM `fee_receipts` $wc ORDER BY `created_at` DESC LIMIT 200");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        if (isset($r['amounts']) && is_string($r['amounts'])) {
            $d = json_decode($r['amounts'], true);
            if (is_array($d)) $r['amounts'] = $d;
        }
    }
    unset($r);
    jsonSuccess($rows);
}

function route_fees_due(?array $auth): void {
    $auth    = requireAuth();
    $db      = getDB();
    $month   = $_GET['month'] ?? date('Y-m');
    $class   = $_GET['class'] ?? '';

    $where  = ['s.is_deleted=0'];
    $params = [];
    if ($class) { $where[] = 's.class=?'; $params[] = $class; }

    $wc   = 'WHERE ' . implode(' AND ', $where);
    $stmt = $db->prepare("
        SELECT s.id, s.admNo, s.fullName, s.class, s.section,
               COALESCE(SUM(fp.monthly_amount), 0) AS due_amount
        FROM `students` s
        LEFT JOIN `fee_plan` fp ON fp.class_name = s.class AND (fp.section_name = s.section OR fp.section_name = '')
        LEFT JOIN `fee_receipts` fr ON fr.student_id = s.id AND fr.month = ?
        $wc AND fr.id IS NULL
        GROUP BY s.id
        ORDER BY s.fullName ASC
        LIMIT 500");
    $stmt->execute(array_merge([$month], $params));
    jsonSuccess($stmt->fetchAll());
}


// =============================================================================
// ATTENDANCE
// =============================================================================
function route_attendance_mark(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireAuth();
    $db   = getDB();

    $records = $body['records'] ?? $body;
    if (!is_array($records)) jsonError('records array required', 400);
    if (isset($records['studentId'])) $records = [$records]; // single record

    $stmt = $db->prepare("INSERT INTO `attendance`
        (`id`,`student_id`,`date`,`status`,`marked_by`)
        VALUES (?,?,?,?,?)
        ON DUPLICATE KEY UPDATE `status`=VALUES(`status`),`marked_by`=VALUES(`marked_by`)");

    $count = 0;
    foreach ($records as $r) {
        if (!is_array($r)) continue;
        $studentId = $r['studentId'] ?? '';
        $date      = $r['date'] ?? date('Y-m-d');
        $status    = sanitize($r['status'] ?? 'present');
        $markedBy  = sanitize($r['markedBy'] ?? ($auth['username'] ?? ''));
        if (!$studentId) continue;
        $id = genUuid();
        $stmt->execute([$id, $studentId, $date, $status, $markedBy]);
        $count++;
    }

    jsonSuccess(['success' => true, 'count' => $count]);
}

function route_attendance_list(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $where  = [];
    $params = [];
    if (!empty($_GET['class']))     { $where[] = 's.class=?';     $params[] = $_GET['class']; }
    if (!empty($_GET['date']))      { $where[] = 'a.date=?';      $params[] = $_GET['date']; }
    if (!empty($_GET['studentId'])) { $where[] = 'a.student_id=?'; $params[] = $_GET['studentId']; }

    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $db->prepare("SELECT a.*, s.fullName, s.admNo, s.class, s.section
        FROM `attendance` a
        LEFT JOIN `students` s ON s.id = a.student_id
        $wc ORDER BY a.date DESC LIMIT 500");
    $stmt->execute($params);
    jsonSuccess($stmt->fetchAll());
}

function route_attendance_summary(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $date   = $_GET['date'] ?? date('Y-m-d');
    $stmt   = $db->prepare("
        SELECT s.class, s.section,
               COUNT(s.id) AS total_students,
               SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS present_count,
               SUM(CASE WHEN a.status='absent' OR a.status IS NULL THEN 1 ELSE 0 END) AS absent_count
        FROM `students` s
        LEFT JOIN `attendance` a ON a.student_id=s.id AND a.date=?
        WHERE s.is_deleted=0
        GROUP BY s.class, s.section
        ORDER BY s.class ASC, s.section ASC");
    $stmt->execute([$date]);
    jsonSuccess($stmt->fetchAll());
}


// =============================================================================
// SESSIONS
// =============================================================================
function route_sessions_list(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();
    $stmt = $db->query("SELECT * FROM `school_sessions` ORDER BY `startYear` DESC");
    jsonSuccess($stmt->fetchAll());
}

function route_sessions_create(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth  = requireAuth();
    $label = sanitize($body['label'] ?? $body['name'] ?? '');
    if (!$label) jsonError('label is required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `school_sessions`
        (`id`,`label`,`name`,`startYear`,`endYear`,`isActive`,`isCurrent`,`createdAt`)
        VALUES (?,?,?,?,?,?,?,?)")
       ->execute([
           $id, $label, $label,
           (int)($body['startYear'] ?? date('Y')),
           (int)($body['endYear'] ?? date('Y') + 1),
           (int)($body['isActive'] ?? 0),
           (int)($body['isCurrent'] ?? 0),
           nowStr(),
       ]);

    writeChangelog($db, $auth, 'school_sessions', 'create', $id, null, ['label' => $label]);
    jsonSuccess(['success' => true, 'id' => $id]);
}

function route_sessions_set_active(string $method, array $body, ?array $auth): void {
    if ($method !== 'PUT') jsonError('Method not allowed', 405);
    $auth = requireSuperAdmin();
    $id   = $body['id'] ?? '';
    if (!$id) jsonError('id is required', 400);

    $db = getDB();
    $db->exec("UPDATE `school_sessions` SET `isActive`=0, `isCurrent`=0");
    $db->prepare("UPDATE `school_sessions` SET `isActive`=1, `isCurrent`=1 WHERE `id`=?")->execute([$id]);
    writeChangelog($db, $auth, 'school_sessions', 'set_active', $id, null, null);
    jsonSuccess(['success' => true]);
}


// =============================================================================
// TRANSPORT
// =============================================================================
function route_transport_routes(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $stmt   = $db->query("SELECT * FROM `transport_routes` ORDER BY `routeName` ASC");
    $routes = $stmt->fetchAll();
    foreach ($routes as &$route) {
        $pp = $db->prepare("SELECT * FROM `transport_pickup_points` WHERE `route_id`=? ORDER BY `pickupPointName` ASC");
        $pp->execute([$route['id']]);
        $route['pickupPoints'] = $pp->fetchAll();
    }
    unset($route);
    jsonSuccess($routes);
}

function route_transport_routes_add(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth      = requireAuth();
    $routeName = sanitize($body['routeName'] ?? $body['name'] ?? '');
    if (!$routeName) jsonError('routeName is required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `transport_routes`
        (`id`,`busNumber`,`routeName`,`driverName`,`driverContact`,`created_at`)
        VALUES (?,?,?,?,?,NOW())
        ON DUPLICATE KEY UPDATE `routeName`=VALUES(`routeName`),`busNumber`=VALUES(`busNumber`)")
       ->execute([
           $id,
           sanitize($body['busNumber'] ?? ''),
           $routeName,
           sanitize($body['driverName'] ?? ''),
           sanitize($body['driverContact'] ?? ''),
       ]);

    writeChangelog($db, $auth, 'transport_routes', 'add', $id, null, ['routeName' => $routeName]);
    jsonSuccess(['success' => true, 'id' => $id]);
}

function route_transport_pickup_add(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth    = requireAuth();
    $routeId = $body['route_id'] ?? $body['routeId'] ?? '';
    $name    = sanitize($body['pickupPointName'] ?? $body['name'] ?? '');
    if (!$routeId || !$name) jsonError('route_id and pickupPointName are required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `transport_pickup_points`
        (`id`,`route_id`,`pickupPointName`,`monthlyFare`,`created_at`)
        VALUES (?,?,?,?,NOW())
        ON DUPLICATE KEY UPDATE `pickupPointName`=VALUES(`pickupPointName`),`monthlyFare`=VALUES(`monthlyFare`)")
       ->execute([$id, $routeId, $name, (float)($body['monthlyFare'] ?? 0)]);

    jsonSuccess(['success' => true, 'id' => $id]);
}


// =============================================================================
// LIBRARY
// =============================================================================
function route_library_books(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $where  = [];
    $params = [];
    if (!empty($_GET['search'])) {
        $s = '%' . $_GET['search'] . '%';
        $where[] = '(title LIKE ? OR isbn LIKE ? OR author LIKE ?)';
        $params  = array_merge($params, [$s, $s, $s]);
    }
    if (!empty($_GET['status'])) { $where[] = 'status=?'; $params[] = $_GET['status']; }

    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $db->prepare("SELECT * FROM `library_books` $wc ORDER BY `title` ASC LIMIT 500");
    $stmt->execute($params);
    jsonSuccess($stmt->fetchAll());
}

function route_library_books_add(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth  = requireAuth();
    $title = sanitize($body['title'] ?? '');
    if (!$title) jsonError('title is required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `library_books`
        (`id`,`title`,`isbn`,`category`,`author`,`quantity`,`status`,`created_at`)
        VALUES (?,?,?,?,?,?,?,NOW())
        ON DUPLICATE KEY UPDATE `title`=VALUES(`title`),`isbn`=VALUES(`isbn`),
            `quantity`=VALUES(`quantity`)")
       ->execute([
           $id, $title,
           sanitize($body['isbn'] ?? ''),
           sanitize($body['category'] ?? ''),
           sanitize($body['author'] ?? ''),
           (int)($body['quantity'] ?? 1),
           sanitize($body['status'] ?? 'available'),
       ]);

    writeChangelog($db, $auth, 'library_books', 'add', $id, null, ['title' => $title]);
    jsonSuccess(['success' => true, 'id' => $id]);
}

function route_library_issue(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth      = requireAuth();
    $bookId    = $body['bookId'] ?? '';
    $studentId = $body['studentId'] ?? '';
    if (!$bookId || !$studentId) jsonError('bookId and studentId are required', 400);

    $db = getDB();
    $db->prepare("UPDATE `library_books` SET `issued_to_student_id`=?, `issue_date`=?, `due_date`=?, `status`='issued'
        WHERE `id`=?")
       ->execute([
           $studentId,
           $body['issueDate'] ?? date('Y-m-d'),
           $body['dueDate'] ?? date('Y-m-d', strtotime('+14 days')),
           $bookId,
       ]);

    writeChangelog($db, $auth, 'library_books', 'issue', $bookId, null, ['studentId' => $studentId]);
    jsonSuccess(['success' => true]);
}

function route_library_return(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth   = requireAuth();
    $bookId = $body['bookId'] ?? '';
    if (!$bookId) jsonError('bookId is required', 400);

    $db = getDB();
    $db->prepare("UPDATE `library_books` SET `issued_to_student_id`=NULL, `issue_date`=NULL, `due_date`=NULL, `status`='available' WHERE `id`=?")
       ->execute([$bookId]);

    writeChangelog($db, $auth, 'library_books', 'return', $bookId, null, null);
    jsonSuccess(['success' => true]);
}


// =============================================================================
// INVENTORY
// =============================================================================
function route_inventory_list(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $where  = [];
    $params = [];
    if (!empty($_GET['category'])) { $where[] = 'category=?'; $params[] = $_GET['category']; }
    if (!empty($_GET['search'])) {
        $s = '%' . $_GET['search'] . '%';
        $where[] = '(itemName LIKE ? OR category LIKE ?)';
        $params  = array_merge($params, [$s, $s]);
    }

    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $db->prepare("SELECT * FROM `inventory` $wc ORDER BY `itemName` ASC");
    $stmt->execute($params);
    jsonSuccess($stmt->fetchAll());
}

function route_inventory_add(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth     = requireAuth();
    $itemName = sanitize($body['itemName'] ?? $body['name'] ?? '');
    if (!$itemName) jsonError('itemName is required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `inventory`
        (`id`,`itemName`,`category`,`quantityInStock`,`price`,`supplier`,`lastUpdated`)
        VALUES (?,?,?,?,?,?,NOW())
        ON DUPLICATE KEY UPDATE `itemName`=VALUES(`itemName`),`quantityInStock`=VALUES(`quantityInStock`),
            `price`=VALUES(`price`),`lastUpdated`=NOW()")
       ->execute([
           $id, $itemName,
           sanitize($body['category'] ?? ''),
           (int)($body['quantityInStock'] ?? $body['quantity'] ?? 0),
           (float)($body['price'] ?? 0),
           sanitize($body['supplier'] ?? ''),
       ]);

    writeChangelog($db, $auth, 'inventory', 'add', $id, null, ['itemName' => $itemName]);
    jsonSuccess(['success' => true, 'id' => $id]);
}

function route_inventory_update(string $method, array $body, ?array $auth): void {
    if ($method !== 'PUT') jsonError('Method not allowed', 405);
    $auth = requireAuth();
    $id   = $body['id'] ?? '';
    if (!$id) jsonError('id is required', 400);

    $db   = getDB();
    $sets = [];
    $vals = [];

    if (isset($body['quantityInStock'])) { $sets[] = '`quantityInStock`=?'; $vals[] = (int)$body['quantityInStock']; }
    if (isset($body['quantity']))        { $sets[] = '`quantityInStock`=?'; $vals[] = (int)$body['quantity']; }
    if (isset($body['price']))           { $sets[] = '`price`=?';           $vals[] = (float)$body['price']; }
    if (isset($body['itemName']))        { $sets[] = '`itemName`=?';         $vals[] = sanitize($body['itemName']); }
    if (isset($body['supplier']))        { $sets[] = '`supplier`=?';         $vals[] = sanitize($body['supplier']); }

    if (empty($sets)) jsonError('No valid fields to update', 400);
    $sets[] = '`lastUpdated`=NOW()';
    $vals[] = $id;

    $db->prepare("UPDATE `inventory` SET " . implode(',', $sets) . " WHERE `id`=?")->execute($vals);
    writeChangelog($db, $auth, 'inventory', 'update', $id, null, $body);
    jsonSuccess(['success' => true]);
}


// =============================================================================
// EXAMS
// =============================================================================
function route_exams_list(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $where  = [];
    $params = [];
    if (!empty($_GET['className'])) { $where[] = 'className=?'; $params[] = $_GET['className']; }

    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $db->prepare("SELECT `id`,`examName`,`className`,`timetable`,`created_at` FROM `exams` $wc ORDER BY `created_at` DESC LIMIT 200");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        if (isset($r['timetable']) && is_string($r['timetable'])) {
            $d = json_decode($r['timetable'], true);
            if (is_array($d)) $r['timetable'] = $d;
        }
    }
    unset($r);
    jsonSuccess($rows);
}

function route_exams_create(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth     = requireAuth();
    $examName = sanitize($body['examName'] ?? $body['name'] ?? '');
    if (!$examName) jsonError('examName is required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `exams`
        (`id`,`examName`,`className`,`timetable`,`questions`,`created_at`)
        VALUES (?,?,?,?,?,NOW())
        ON DUPLICATE KEY UPDATE `examName`=VALUES(`examName`),`className`=VALUES(`className`),
            `timetable`=VALUES(`timetable`)")
       ->execute([
           $id, $examName,
           sanitize($body['className'] ?? ''),
           is_array($body['timetable'] ?? null) ? json_encode($body['timetable']) : ($body['timetable'] ?? '[]'),
           is_array($body['questions'] ?? null) ? json_encode($body['questions']) : ($body['questions'] ?? '[]'),
       ]);

    writeChangelog($db, $auth, 'exams', 'create', $id, null, ['examName' => $examName]);
    jsonSuccess(['success' => true, 'id' => $id]);
}

function route_results_add(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth      = requireAuth();
    $studentId = $body['studentId'] ?? '';
    $examId    = $body['examId'] ?? '';
    if (!$studentId || !$examId) jsonError('studentId and examId are required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `exam_results`
        (`id`,`student_id`,`exam_id`,`subject`,`marks`,`grade`,`created_at`)
        VALUES (?,?,?,?,?,?,NOW())
        ON DUPLICATE KEY UPDATE `marks`=VALUES(`marks`),`grade`=VALUES(`grade`)")
       ->execute([
           $id, $studentId, $examId,
           sanitize($body['subject'] ?? ''),
           (float)($body['marks'] ?? 0),
           sanitize($body['grade'] ?? ''),
       ]);

    writeChangelog($db, $auth, 'exam_results', 'add', $id, null, ['studentId' => $studentId, 'examId' => $examId]);
    jsonSuccess(['success' => true, 'id' => $id]);
}

function route_results_list(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $where  = [];
    $params = [];
    if (!empty($_GET['studentId'])) { $where[] = 'er.student_id=?'; $params[] = $_GET['studentId']; }
    if (!empty($_GET['examId']))    { $where[] = 'er.exam_id=?';    $params[] = $_GET['examId']; }
    if (!empty($_GET['className'])) {
        $where[] = 'e.className=?';
        $params[] = $_GET['className'];
    }

    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $db->prepare("SELECT er.*, s.fullName AS studentName, e.examName
        FROM `exam_results` er
        LEFT JOIN `students` s ON s.id = er.student_id
        LEFT JOIN `exams` e ON e.id = er.exam_id
        $wc ORDER BY er.created_at DESC LIMIT 500");
    $stmt->execute($params);
    jsonSuccess($stmt->fetchAll());
}


// =============================================================================
// EXPENSES
// =============================================================================
function route_expenses_list(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $where  = [];
    $params = [];
    if (!empty($_GET['type']))      { $where[] = 'type=?';       $params[] = $_GET['type']; }
    if (!empty($_GET['headName'])) { $where[] = 'headName=?';   $params[] = $_GET['headName']; }
    if (!empty($_GET['startDate'])){ $where[] = 'expense_date>=?'; $params[] = $_GET['startDate']; }
    if (!empty($_GET['endDate']))  { $where[] = 'expense_date<=?'; $params[] = $_GET['endDate']; }

    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $db->prepare("SELECT * FROM `expenses` $wc ORDER BY `expense_date` DESC LIMIT 1000");
    $stmt->execute($params);
    jsonSuccess($stmt->fetchAll());
}

function route_expenses_add(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth   = requireAuth();
    $amount = (float)($body['amount'] ?? 0);
    $type   = sanitize($body['type'] ?? 'expense');
    if ($amount <= 0) jsonError('amount must be greater than 0', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `expenses`
        (`id`,`type`,`headName`,`amount`,`description`,`expense_date`,`created_at`)
        VALUES (?,?,?,?,?,?,NOW())")
       ->execute([
           $id, $type,
           sanitize($body['headName'] ?? ''),
           $amount,
           sanitize($body['description'] ?? ''),
           $body['expense_date'] ?? $body['date'] ?? date('Y-m-d'),
       ]);

    writeChangelog($db, $auth, 'expenses', 'add', $id, null, ['type' => $type, 'amount' => $amount]);
    jsonSuccess(['success' => true, 'id' => $id]);
}


// =============================================================================
// HOMEWORK
// =============================================================================
function route_homework_list(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $where  = [];
    $params = [];
    if (!empty($_GET['className'])) { $where[] = 'class_name=?'; $params[] = $_GET['className']; }
    if (!empty($_GET['subject']))   { $where[] = 'subject=?';    $params[] = $_GET['subject']; }

    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $db->prepare("SELECT * FROM `homework` $wc ORDER BY `due_date` DESC LIMIT 500");
    $stmt->execute($params);
    jsonSuccess($stmt->fetchAll());
}

function route_homework_add(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth        = requireAuth();
    $description = sanitize($body['description'] ?? '');
    if (!$description) jsonError('description is required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `homework`
        (`id`,`teacher_id`,`class_name`,`subject`,`description`,`due_date`,`created_at`)
        VALUES (?,?,?,?,?,?,NOW())")
       ->execute([
           $id,
           $auth['user_id'] ?? '',
           sanitize($body['className'] ?? $body['class_name'] ?? ''),
           sanitize($body['subject'] ?? ''),
           $description,
           $body['due_date'] ?? $body['dueDate'] ?? null,
       ]);

    writeChangelog($db, $auth, 'homework', 'add', $id, null, ['description' => $description]);
    jsonSuccess(['success' => true, 'id' => $id]);
}


// =============================================================================
// CHAT
// =============================================================================
function route_chat_messages(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $where  = [];
    $params = [];
    if (!empty($_GET['groupId']))    { $where[] = 'group_id=?';     $params[] = $_GET['groupId']; }
    if (!empty($_GET['senderId']))   { $where[] = 'sender_id=?';    $params[] = $_GET['senderId']; }
    if (!empty($_GET['recipientId'])){ $where[] = '(sender_id=? OR recipient_id=?)';
                                       $params[] = $_GET['recipientId']; $params[] = $_GET['recipientId']; }

    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $db->prepare("SELECT * FROM `chat_messages` $wc ORDER BY `created_at` DESC LIMIT 50");
    $stmt->execute($params);
    $rows = array_reverse($stmt->fetchAll()); // oldest first
    jsonSuccess($rows);
}

function route_chat_send(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth    = requireAuth();
    $message = sanitize($body['message'] ?? '');
    if (!$message) jsonError('message is required', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    $db->prepare("INSERT INTO `chat_messages`
        (`id`,`sender_id`,`sender_name`,`recipient_id`,`group_id`,`message`,`attachment_path`,`created_at`)
        VALUES (?,?,?,?,?,?,?,NOW())")
       ->execute([
           $id,
           $auth['user_id'] ?? '',
           sanitize($auth['name'] ?? $auth['username'] ?? ''),
           $body['recipientId'] ?? null,
           $body['groupId'] ?? null,
           $message,
           sanitize($body['attachmentPath'] ?? ''),
       ]);

    jsonSuccess(['success' => true, 'id' => $id]);
}


// =============================================================================
// CHANGELOG
// =============================================================================
function route_changelog_add(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireAuth();
    $db   = getDB();

    $db->prepare("INSERT INTO `changelog`
        (`id`,`userId`,`username`,`role`,`module`,`action`,`recordId`,`oldValue`,`newValue`,`createdAt`)
        VALUES (UUID(),?,?,?,?,?,?,?,?,NOW())")
       ->execute([
           $auth['user_id'] ?? '',
           $auth['username'] ?? '',
           $auth['role'] ?? '',
           sanitize($body['tableName'] ?? $body['module'] ?? ''),
           sanitize($body['action'] ?? ''),
           $body['recordId'] ?? null,
           is_array($body['oldValues'] ?? null) ? json_encode($body['oldValues']) : null,
           is_array($body['newValues'] ?? null) ? json_encode($body['newValues']) : null,
       ]);

    jsonSuccess(['success' => true]);
}

function route_changelog_list(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $limit = min((int)($_GET['limit'] ?? 100), 1000);
    try {
        $stmt = $db->prepare("SELECT * FROM `changelog` ORDER BY `createdAt` DESC LIMIT $limit");
        $stmt->execute();
        jsonSuccess($stmt->fetchAll());
    } catch (Throwable $e) {
        jsonSuccess([]);
    }
}


// =============================================================================
// BACKUP
// =============================================================================
function route_backup_export(?array $auth): void {
    $auth   = requireAuth();
    $db     = getDB();
    $tables = array_keys(getTableDefinitions());
    $export = ['version' => API_VERSION, 'exported_at' => gmdate('c'), 'tables' => []];

    foreach ($tables as $table) {
        try {
            $stmt = $db->query("SELECT * FROM `{$table}`");
            $export['tables'][$table] = $stmt ? $stmt->fetchAll() : [];
        } catch (Throwable $e) {
            $export['tables'][$table] = [];
        }
    }

    jsonSuccess($export);
}

function route_backup_import(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireSuperAdmin();

    $data = $body['data'] ?? null;
    if (!$data || !isset($data['tables'])) jsonError('Invalid backup — missing tables key', 400);

    $db       = getDB();
    $imported = [];

    $db->beginTransaction();
    try {
        foreach ($data['tables'] as $table => $rows) {
            if (!is_array($rows) || empty($rows)) { $imported[$table] = 0; continue; }
            $count = 0;
            foreach ($rows as $row) {
                if (!is_array($row)) continue;
                try { upsertRow($db, $table, $row); $count++; } catch (Throwable $e) {}
            }
            $imported[$table] = $count;
        }
        $db->commit();
        jsonSuccess(['imported' => $imported], 'Backup restored');
    } catch (Throwable $e) {
        $db->rollBack();
        jsonError('Restore failed: ' . $e->getMessage(), 500);
    }
}


// =============================================================================
// SETTINGS
// =============================================================================
function route_settings_get(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();
    try {
        $stmt = $db->query("SELECT `setting_key`, `setting_value` FROM `school_settings`");
        $rows = $stmt->fetchAll();
        $out  = [];
        foreach ($rows as $r) $out[$r['setting_key']] = $r['setting_value'];
        jsonSuccess($out);
    } catch (Throwable $e) {
        jsonSuccess([]);
    }
}

function route_settings_save(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireSuperAdmin();
    $db   = getDB();

    $ins = $db->prepare("INSERT INTO `school_settings` (`id`,`setting_key`,`setting_value`)
        VALUES (UUID(),?,?)
        ON DUPLICATE KEY UPDATE `setting_value`=VALUES(`setting_value`), `updated_at`=NOW()");

    foreach ($body as $key => $value) {
        if (preg_match('/^[a-zA-Z0-9_]+$/', $key) && is_scalar($value)) {
            $ins->execute([sanitize($key), (string)$value]);
        }
    }

    writeChangelog($db, $auth, 'school_settings', 'save', null, null, $body);
    jsonSuccess(null, 'Settings saved');
}


// =============================================================================
// STATS
// =============================================================================
function route_stats(): void {
    try {
        $db = getDB();
        jsonSuccess([
            'students'   => (int)$db->query("SELECT COUNT(*) FROM `students` WHERE is_deleted=0")->fetchColumn(),
            'staff'      => (int)$db->query("SELECT COUNT(*) FROM `staff` WHERE is_deleted=0")->fetchColumn(),
            'classes'    => (int)$db->query("SELECT COUNT(*) FROM `classes`")->fetchColumn(),
            'feeReceipts'=> (int)$db->query("SELECT COUNT(*) FROM `fee_receipts`")->fetchColumn(),
        ]);
    } catch (Throwable $e) {
        jsonSuccess(['students' => 0, 'staff' => 0, 'classes' => 0, 'feeReceipts' => 0]);
    }
}


// =============================================================================
// USERS
// =============================================================================
function route_users_list(?array $auth): void {
    $auth = requireSuperAdmin();
    $db   = getDB();

    $stmt = $db->query("SELECT `id`,`username`,`role`,`fullName`,`name`,`mobile`,`email`,`linkedId`,`createdAt` FROM `users`");
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['fullName'] = $r['fullName'] ?? $r['name'] ?? '';
    }
    unset($r);
    jsonSuccess($rows);
}

function route_users_create(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth     = requireSuperAdmin();
    $username = sanitize($body['username'] ?? '');
    $password = $body['password'] ?? 'admin123';
    $role     = sanitize($body['role'] ?? 'teacher');
    $fullName = sanitize($body['fullName'] ?? $body['name'] ?? $username);

    if (!$username) jsonError('username is required', 400);
    if (strlen($password) < 6) jsonError('Password must be at least 6 characters', 400);

    $db = getDB();
    $id = $body['id'] ?? genUuid();

    try {
        $db->prepare("INSERT INTO `users` (`id`,`username`,`password`,`role`,`fullName`,`name`,`mobile`,`email`,`linkedId`,`createdAt`)
            VALUES (?,?,?,?,?,?,?,?,?,NOW())")
           ->execute([
               $id, $username, hashPassword($password), $role, $fullName, $fullName,
               sanitize($body['mobile'] ?? ''),
               sanitize($body['email'] ?? ''),
               $body['linkedId'] ?? null,
           ]);
    } catch (Throwable $e) {
        if (str_contains($e->getMessage(), 'Duplicate')) jsonError("Username '$username' already exists", 409);
        jsonError('Failed to create user: ' . $e->getMessage(), 500);
    }

    writeChangelog($db, $auth, 'users', 'create', $id, null, ['username' => $username, 'role' => $role]);
    jsonSuccess(['success' => true, 'id' => $id]);
}

function route_users_update(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireSuperAdmin();
    $id   = $body['id'] ?? '';
    if (!$id) jsonError('id is required', 400);

    $db   = getDB();
    $sets = [];
    $vals = [];

    foreach (['role','fullName','name','mobile','email','linkedId'] as $f) {
        if (isset($body[$f])) { $sets[] = "`{$f}`=?"; $vals[] = sanitize($body[$f]); }
    }
    if (!empty($body['password'])) { $sets[] = '`password`=?'; $vals[] = hashPassword($body['password']); }
    if (empty($sets)) jsonError('No valid fields to update', 400);
    $vals[] = $id;

    $db->prepare("UPDATE `users` SET " . implode(',', $sets) . " WHERE `id`=?")->execute($vals);
    writeChangelog($db, $auth, 'users', 'update', $id, null, $body);
    jsonSuccess(['success' => true]);
}

function route_users_delete(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireSuperAdmin();
    $id   = $body['id'] ?? '';
    if (!$id) jsonError('id is required', 400);

    $db   = getDB();
    $stmt = $db->prepare("SELECT `username` FROM `users` WHERE `id`=? LIMIT 1");
    $stmt->execute([$id]);
    $u = $stmt->fetch();
    if ($u && $u['username'] === 'admin') jsonError('Cannot delete the admin account', 403);

    $db->prepare("DELETE FROM `users` WHERE `id`=?")->execute([$id]);
    writeChangelog($db, $auth, 'users', 'delete', $id, null, null);
    jsonSuccess(['success' => true]);
}

function route_users_reset_password(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth        = requireSuperAdmin();
    $id          = $body['id'] ?? $body['userId'] ?? '';
    $newPassword = $body['newPassword'] ?? $body['password'] ?? 'admin123';
    if (!$id) jsonError('id is required', 400);

    $db = getDB();
    $db->prepare("UPDATE `users` SET `password`=? WHERE `id`=?")->execute([hashPassword($newPassword), $id]);
    writeChangelog($db, $auth, 'users', 'reset_password', $id, null, null);
    jsonSuccess(null, 'Password reset successfully');
}


// =============================================================================
// SYNC (bulk GET all / bulk POST push)
// =============================================================================
function route_sync_all(?array $auth): void {
    $auth = requireAuth();
    $db   = getDB();

    $collections = [
        'students'         => "SELECT * FROM `students` WHERE is_deleted=0",
        'staff'            => "SELECT * FROM `staff` WHERE is_deleted=0",
        'classes'          => "SELECT * FROM `classes` ORDER BY sort_order ASC",
        'sections'         => "SELECT * FROM `sections`",
        'fee_headings'     => "SELECT * FROM `fee_headings`",
        'fee_plan'         => "SELECT * FROM `fee_plan`",
        'fee_receipts'     => "SELECT * FROM `fee_receipts` ORDER BY created_at DESC LIMIT 1000",
        'attendance'       => "SELECT * FROM `attendance` ORDER BY date DESC LIMIT 5000",
        'school_sessions'  => "SELECT * FROM `school_sessions` ORDER BY startYear DESC",
        'transport_routes' => "SELECT * FROM `transport_routes`",
        'transport_pickup_points' => "SELECT * FROM `transport_pickup_points`",
        'library_books'    => "SELECT * FROM `library_books`",
        'inventory'        => "SELECT * FROM `inventory`",
        'exams'            => "SELECT * FROM `exams` ORDER BY created_at DESC LIMIT 200",
        'exam_results'     => "SELECT * FROM `exam_results` ORDER BY created_at DESC LIMIT 1000",
        'expenses'         => "SELECT * FROM `expenses` ORDER BY expense_date DESC LIMIT 1000",
        'homework'         => "SELECT * FROM `homework` ORDER BY due_date DESC LIMIT 500",
        'chat_messages'    => "SELECT * FROM `chat_messages` ORDER BY created_at DESC LIMIT 200",
        'changelog'        => "SELECT * FROM `changelog` ORDER BY createdAt DESC LIMIT 500",
        'users'            => "SELECT id,username,role,fullName,name,mobile,email,linkedId,createdAt FROM `users`",
        'school_settings'  => "SELECT * FROM `school_settings`",
    ];

    $result = [];
    foreach ($collections as $key => $sql) {
        try {
            $stmt = $db->query($sql);
            $result[$key] = $stmt ? $stmt->fetchAll() : [];
        } catch (Throwable $e) {
            $result[$key] = [];
        }
    }

    jsonSuccess($result, 'All data synced');
}

function route_sync_push(string $method, array $body, ?array $auth): void {
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $auth = requireSuperAdmin();
    $db   = getDB();

    $tableMap = [
        'students'     => 'students',
        'staff'        => 'staff',
        'classes'      => 'classes',
        'fee_headings' => 'fee_headings',
        'fee_plan'     => 'fee_plan',
        'fee_receipts' => 'fee_receipts',
        'attendance'   => 'attendance',
    ];

    $results = [];
    foreach ($tableMap as $key => $table) {
        $records = $body[$key] ?? [];
        if (empty($records) || !is_array($records)) continue;
        $pushed = 0;
        $errors = [];
        foreach ($records as $idx => $row) {
            if (!is_array($row)) continue;
            try { upsertRow($db, $table, $row, $auth); $pushed++; }
            catch (Throwable $e) { $errors[] = "Row $idx: " . $e->getMessage(); }
        }
        $results[$key] = ['pushed' => $pushed, 'errors' => $errors];
    }

    jsonSuccess(['results' => $results], 'Push complete');
}


// =============================================================================
// TABLE DEFINITIONS
// =============================================================================
function getTableDefinitions(): array {
    return [

        'users' => "CREATE TABLE IF NOT EXISTS `users` (
            `id`          VARCHAR(36) PRIMARY KEY,
            `username`    VARCHAR(255) UNIQUE,
            `password`    VARCHAR(255),
            `role`        ENUM('super_admin','admin','teacher','accountant','parent','student','driver') DEFAULT 'teacher',
            `fullName`    VARCHAR(255),
            `name`        VARCHAR(255),
            `mobile`      VARCHAR(50),
            `email`       VARCHAR(255),
            `permissions` JSON,
            `linkedId`    VARCHAR(36),
            `createdAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updatedAt`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'school_sessions' => "CREATE TABLE IF NOT EXISTS `school_sessions` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `label`      VARCHAR(20),
            `name`       VARCHAR(20),
            `startYear`  INT,
            `endYear`    INT,
            `isActive`   TINYINT(1) DEFAULT 0,
            `isCurrent`  TINYINT(1) DEFAULT 0,
            `isArchived` TINYINT(1) DEFAULT 0,
            `createdAt`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'classes' => "CREATE TABLE IF NOT EXISTS `classes` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `name`       VARCHAR(50),
            `sort_order` INT DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'sections' => "CREATE TABLE IF NOT EXISTS `sections` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `class_id`   VARCHAR(36),
            `name`       VARCHAR(10),
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'students' => "CREATE TABLE IF NOT EXISTS `students` (
            `id`             VARCHAR(36) PRIMARY KEY,
            `admNo`          VARCHAR(50),
            `fullName`       VARCHAR(255) NOT NULL,
            `fatherName`     VARCHAR(255),
            `motherName`     VARCHAR(255),
            `fatherMobile`   VARCHAR(20),
            `motherMobile`   VARCHAR(20),
            `address`        TEXT,
            `dob`            DATE,
            `class`          VARCHAR(50),
            `section`        VARCHAR(10),
            `session`        VARCHAR(20),
            `transportBus`   VARCHAR(50),
            `transportRoute` VARCHAR(100),
            `transportPickup`VARCHAR(100),
            `transportFare`  DECIMAL(10,2),
            `photoPath`      VARCHAR(500),
            `is_deleted`     TINYINT(1) DEFAULT 0,
            `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'staff' => "CREATE TABLE IF NOT EXISTS `staff` (
            `id`             VARCHAR(36) PRIMARY KEY,
            `name`           VARCHAR(255) NOT NULL,
            `position`       VARCHAR(100),
            `subject`        VARCHAR(255),
            `assignedClasses`TEXT,
            `salary`         DECIMAL(10,2) DEFAULT 0,
            `contact`        VARCHAR(20),
            `email`          VARCHAR(255),
            `is_deleted`     TINYINT(1) DEFAULT 0,
            `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'fee_headings' => "CREATE TABLE IF NOT EXISTS `fee_headings` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `name`       VARCHAR(100) NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'fee_plan' => "CREATE TABLE IF NOT EXISTS `fee_plan` (
            `id`             VARCHAR(36) PRIMARY KEY,
            `class_name`     VARCHAR(50),
            `section_name`   VARCHAR(10),
            `fee_heading_id` VARCHAR(36),
            `monthly_amount` DECIMAL(10,2) DEFAULT 0,
            `updated_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `unique_plan` (`class_name`,`section_name`,`fee_heading_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'fee_receipts' => "CREATE TABLE IF NOT EXISTS `fee_receipts` (
            `id`             VARCHAR(36) PRIMARY KEY,
            `student_id`     VARCHAR(36),
            `student_name`   VARCHAR(255),
            `class`          VARCHAR(50),
            `section`        VARCHAR(10),
            `month`          VARCHAR(20),
            `amounts`        JSON,
            `total_amount`   DECIMAL(10,2),
            `payment_method` VARCHAR(50),
            `reference_id`   VARCHAR(100),
            `receipt_number` VARCHAR(50),
            `qr_data`        TEXT,
            `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'attendance' => "CREATE TABLE IF NOT EXISTS `attendance` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `student_id` VARCHAR(36),
            `date`       DATE,
            `status`     ENUM('present','absent','leave') DEFAULT 'absent',
            `marked_by`  VARCHAR(255),
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `unique_att` (`student_id`,`date`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'changelog' => "CREATE TABLE IF NOT EXISTS `changelog` (
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
            INDEX `idx_created` (`createdAt`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'transport_routes' => "CREATE TABLE IF NOT EXISTS `transport_routes` (
            `id`            VARCHAR(36) PRIMARY KEY,
            `busNumber`     VARCHAR(50),
            `routeName`     VARCHAR(100),
            `driverName`    VARCHAR(255),
            `driverContact` VARCHAR(20),
            `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'transport_pickup_points' => "CREATE TABLE IF NOT EXISTS `transport_pickup_points` (
            `id`              VARCHAR(36) PRIMARY KEY,
            `route_id`        VARCHAR(36),
            `pickupPointName` VARCHAR(100),
            `monthlyFare`     DECIMAL(10,2),
            `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'library_books' => "CREATE TABLE IF NOT EXISTS `library_books` (
            `id`                  VARCHAR(36) PRIMARY KEY,
            `title`               VARCHAR(255) NOT NULL,
            `isbn`                VARCHAR(50),
            `category`            VARCHAR(100),
            `author`              VARCHAR(255),
            `quantity`            INT DEFAULT 0,
            `issued_to_student_id`VARCHAR(36),
            `issue_date`          DATE,
            `due_date`            DATE,
            `status`              ENUM('available','issued','overdue') DEFAULT 'available',
            `created_at`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'inventory' => "CREATE TABLE IF NOT EXISTS `inventory` (
            `id`              VARCHAR(36) PRIMARY KEY,
            `itemName`        VARCHAR(255),
            `category`        VARCHAR(100),
            `quantityInStock` INT DEFAULT 0,
            `price`           DECIMAL(10,2),
            `supplier`        VARCHAR(255),
            `lastUpdated`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'exams' => "CREATE TABLE IF NOT EXISTS `exams` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `examName`   VARCHAR(255) NOT NULL,
            `className`  VARCHAR(50),
            `timetable`  JSON,
            `questions`  JSON,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'exam_results' => "CREATE TABLE IF NOT EXISTS `exam_results` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `student_id` VARCHAR(36),
            `exam_id`    VARCHAR(36),
            `subject`    VARCHAR(100),
            `marks`      DECIMAL(5,2),
            `grade`      VARCHAR(5),
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'expenses' => "CREATE TABLE IF NOT EXISTS `expenses` (
            `id`           VARCHAR(36) PRIMARY KEY,
            `type`         ENUM('income','expense'),
            `headName`     VARCHAR(100),
            `amount`       DECIMAL(10,2),
            `description`  TEXT,
            `expense_date` DATE,
            `created_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'homework' => "CREATE TABLE IF NOT EXISTS `homework` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `teacher_id` VARCHAR(36),
            `class_name` VARCHAR(50),
            `subject`    VARCHAR(100),
            `description`TEXT,
            `due_date`   DATE,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'chat_messages' => "CREATE TABLE IF NOT EXISTS `chat_messages` (
            `id`              VARCHAR(36) PRIMARY KEY,
            `sender_id`       VARCHAR(36),
            `sender_name`     VARCHAR(255),
            `recipient_id`    VARCHAR(36),
            `group_id`        VARCHAR(100),
            `message`         TEXT,
            `attachment_path` VARCHAR(500),
            `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'notifications' => "CREATE TABLE IF NOT EXISTS `notifications` (
            `id`         VARCHAR(36) PRIMARY KEY,
            `title`      VARCHAR(255),
            `message`    TEXT,
            `target_role`VARCHAR(50),
            `is_read`    TINYINT(1) DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'alumni' => "CREATE TABLE IF NOT EXISTS `alumni` (
            `id`            VARCHAR(36) PRIMARY KEY,
            `fullName`      VARCHAR(255),
            `admNo`         VARCHAR(100),
            `yearOfPassing` VARCHAR(10),
            `class`         VARCHAR(100),
            `mobile`        VARCHAR(50),
            `email`         VARCHAR(255),
            `occupation`    VARCHAR(255),
            `session`       VARCHAR(100),
            `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'certificates' => "CREATE TABLE IF NOT EXISTS `certificates` (
            `id`              VARCHAR(36) PRIMARY KEY,
            `student_id`      VARCHAR(36),
            `certificate_type`VARCHAR(100),
            `issued_date`     DATE,
            `issued_by`       VARCHAR(255),
            `remarks`         TEXT,
            `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'school_settings' => "CREATE TABLE IF NOT EXISTS `school_settings` (
            `id`            VARCHAR(36) PRIMARY KEY,
            `setting_key`   VARCHAR(100) UNIQUE,
            `setting_value` TEXT,
            `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    ];
}
