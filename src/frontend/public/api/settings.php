<?php
/**
 * SHUBH SCHOOL ERP — Settings API
 * GET  /settings/school           Get school profile
 * PUT  /settings/school           Update school profile
 * GET  /settings/sessions[/:id]   List / Get sessions
 * POST /settings/sessions         Create session
 * PUT  /settings/sessions/:id     Update session
 * POST /settings/sessions/:id/promote  Promote students to next session
 * GET  /settings/users            List all users
 * POST /settings/users            Create user
 * PUT  /settings/users/:id        Update user
 * DELETE /settings/users/:id      Soft-delete user
 * GET  /settings/whatsapp         Get WhatsApp config
 * PUT  /settings/whatsapp         Update WhatsApp config
 * GET  /settings/scheduler        Get notification scheduler
 * PUT  /settings/scheduler        Update scheduler rules
 * GET  /settings/notifications    List notifications for current user
 * PUT  /settings/notifications/:id/read  Mark read
 * DELETE /settings/notifications  Clear all
 * POST /settings/notifications    Create notification (internal)
 * GET  /settings/whatsapp/logs    WhatsApp send log
 */

require_once __DIR__ . '/config.php';

$route    = $GLOBALS['route'];
$method   = $route['method'];
$body     = $route['body'];
$schoolId = $route['schoolId'];
$segments = $route['segments'];
$action   = $segments[1] ?? '';
$actionId = $segments[2] ?? null;
$subAct   = $segments[3] ?? null;

match ($action) {
    'school'        => settings_school($method, $schoolId, $body, $route),
    'sessions'      => settings_sessions($method, $actionId, $subAct, $schoolId, $body, $route),
    'users'         => settings_users($method, $actionId, $schoolId, $body, $route),
    'whatsapp'      => settings_whatsapp($method, $actionId, $schoolId, $body, $route),
    'scheduler'     => settings_scheduler($method, $schoolId, $body, $route),
    'notifications' => settings_notifications($method, $actionId, $schoolId, $body, $route),
    default         => json_error("Unknown settings action: $action", 404),
};

// ── School Profile ────────────────────────────────────────────────────────────
function settings_school(string $method, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT * FROM schools WHERE id=:id LIMIT 1');
        $stmt->execute([':id' => $schoolId]);
        $school = $stmt->fetch();
        json_success($school ?: new stdClass());
    }
    if ($method === 'PUT') {
        $fields = ['name', 'address', 'phone', 'email', 'logo_url', 'background_url',
                   'whatsapp_app_key', 'whatsapp_auth_key', 'whatsapp_enabled',
                   'rcs_enabled', 'gpay_enabled', 'razorpay_enabled', 'payu_enabled'];
        $sets = []; $params = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $body)) {
                $sets[] = "$f=:$f";
                $params[":$f"] = $body[$f];
            }
        }
        if (empty($sets)) json_error('No fields to update', 400);
        $params[':id'] = $schoolId;
        $db->prepare('UPDATE schools SET ' . implode(',', $sets) . ', updated_at=NOW() WHERE id=:id')
           ->execute($params);
        json_success(null, 'School profile updated');
    }
    json_error('Method not allowed', 405);
}

// ── Sessions (Academic Year) ──────────────────────────────────────────────────
function settings_sessions(string $method, ?string $sessId, ?string $subAct, int $schoolId, array $body, array $route): void {
    $db = DB::get();

    // POST /settings/sessions/:id/promote
    if ($method === 'POST' && $sessId && $subAct === 'promote') {
        if (!in_array($route['role'], ['super_admin'])) json_error('Only Super Admin can promote sessions', 403);

        $fromSessId = (int)$sessId;
        $toSessId   = (int)($body['to_session_id'] ?? 0);
        $classIds   = $body['class_ids'] ?? [];

        if (!$toSessId) json_error('to_session_id required', 400);

        $db->prepare('UPDATE sessions SET is_current=0 WHERE school_id=:sid')->execute([':sid' => $schoolId]);
        $db->prepare('UPDATE sessions SET is_current=1, is_archived=0, updated_at=NOW() WHERE id=:id AND school_id=:sid')
           ->execute([':id' => $toSessId, ':sid' => $schoolId]);
        $db->prepare('UPDATE sessions SET is_archived=1, updated_at=NOW() WHERE id=:id AND school_id=:sid')
           ->execute([':id' => $fromSessId, ':sid' => $schoolId]);

        // Promote students
        $where  = ['s.school_id=:sid', 's.session_id=:from_sess', 's.is_deleted=0', 's.status="Active"'];
        $params = [':sid' => $schoolId, ':from_sess' => $fromSessId];
        if (!empty($classIds)) {
            $ph = implode(',', array_fill(0, count($classIds), '?'));
            $where[] = "s.class_id IN ($ph)";
        }
        $wc   = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT s.* FROM students s WHERE $wc");
        $execParams = array_merge(array_values($params), array_map('intval', $classIds));
        $stmt->execute($execParams);
        $students = $stmt->fetchAll();

        $promoted = 0;
        foreach ($students as $stu) {
            // Check if already exists in new session
            $chk = $db->prepare('SELECT id FROM students WHERE admission_no=:adm AND school_id=:sid AND session_id=:sess AND is_deleted=0 LIMIT 1');
            $chk->execute([':adm' => $stu['admission_no'], ':sid' => $schoolId, ':sess' => $toSessId]);
            if ($chk->fetch()) continue;

            $newStu = array_diff_key($stu, array_flip(['id', 'created_at', 'updated_at']));
            $newStu['session_id'] = $toSessId;
            $cols = implode(',', array_keys($newStu));
            $vals = implode(',', array_map(fn($k) => ":$k", array_keys($newStu)));
            $ps   = [];
            foreach ($newStu as $k => $v) $ps[":$k"] = $v;
            $db->prepare("INSERT INTO students ($cols, created_at, updated_at) VALUES ($vals, NOW(), NOW())")->execute($ps);
            $promoted++;
        }

        json_success(['promoted' => $promoted], "Session promoted: $promoted students moved");
    }

    if ($method === 'GET') {
        $where = ['school_id=:sid', 'is_deleted=0'];
        $params = [':sid' => $schoolId];
        if ($sessId && is_numeric($sessId)) { $where[] = 'id=:id'; $params[':id'] = (int)$sessId; }
        $wc = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT * FROM sessions WHERE $wc ORDER BY start_date DESC");
        $stmt->execute($params);
        $results = $sessId ? $stmt->fetch() : $stmt->fetchAll();
        if ($sessId && !$results) json_error('Session not found', 404);
        json_success($results);
    }
    if ($method === 'POST') {
        if (empty($body['name'])) json_error('name is required', 400);
        $db->prepare('INSERT INTO sessions (school_id, name, start_date, end_date, is_current, is_archived, is_deleted, created_by, created_at, updated_at) VALUES (:sid,:name,:start,:end,:curr,0,0,:by,NOW(),NOW())')
           ->execute([
               ':sid'   => $schoolId,
               ':name'  => $body['name'],
               ':start' => date_or_null($body['start_date'] ?? ''),
               ':end'   => date_or_null($body['end_date'] ?? ''),
               ':curr'  => (int)($body['is_current'] ?? 0),
               ':by'    => $route['userId'],
           ]);
        json_success(['id' => (int)$db->lastInsertId()], 'Session created', 201);
    }
    if ($method === 'PUT' && $sessId) {
        $fields = ['name', 'start_date', 'end_date', 'is_current', 'is_archived'];
        $sets = []; $params = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $body)) {
                $sets[] = "$f=:$f";
                $params[":$f"] = in_array($f, ['start_date','end_date']) ? date_or_null($body[$f]) : $body[$f];
            }
        }
        if (empty($sets)) json_error('No fields to update', 400);
        // If setting this session as current, unset others
        if (isset($body['is_current']) && (int)$body['is_current'] === 1) {
            $db->prepare('UPDATE sessions SET is_current=0 WHERE school_id=:sid')->execute([':sid' => $schoolId]);
        }
        $params[':id'] = (int)$sessId; $params[':sid'] = $schoolId;
        $db->prepare('UPDATE sessions SET ' . implode(',', $sets) . ', updated_at=NOW() WHERE id=:id AND school_id=:sid AND is_deleted=0')->execute($params);
        json_success(null, 'Session updated');
    }
    if ($method === 'DELETE' && $sessId) {
        if ($route['role'] !== 'super_admin') json_error('Forbidden', 403);
        $db->prepare('UPDATE sessions SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid')->execute([':id' => (int)$sessId, ':sid' => $schoolId]);
        json_success(null, 'Session deleted');
    }
    json_error('Method not allowed', 405);
}

// ── User Management ───────────────────────────────────────────────────────────
function settings_users(string $method, ?string $userId, int $schoolId, array $body, array $route): void {
    if ($route['role'] !== 'super_admin') json_error('Super Admin only', 403);
    $db = DB::get();

    if ($method === 'GET') {
        $p      = pagination();
        $where  = ['u.school_id=:sid', 'u.is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['role']))   { $where[] = 'u.role=:role'; $params[':role'] = $_GET['role']; }
        if (!empty($_GET['search'])) { $where[] = '(u.username LIKE :q OR u.full_name LIKE :q)'; $params[':q'] = '%' . $_GET['search'] . '%'; }
        $wc = implode(' AND ', $where);

        $cStmt = $db->prepare("SELECT COUNT(*) FROM users u WHERE $wc");
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $params[':lim'] = $p['limit'];
        $params[':off'] = $p['offset'];
        $stmt = $db->prepare("SELECT u.id, u.username, u.full_name, u.role, u.is_active, u.last_login, u.reference_id, u.created_at FROM users u WHERE $wc ORDER BY u.role, u.full_name LIMIT :lim OFFSET :off");
        $stmt->execute($params);
        json_success(['users' => $stmt->fetchAll(), 'total' => $total]);
    }

    if ($method === 'POST') {
        $username = trim($body['username'] ?? '');
        $password = $body['password']  ?? '';
        $fullName = trim($body['full_name'] ?? '');
        $role     = $body['role'] ?? 'teacher';
        if (!$username || !$password) json_error('username and password required', 400);

        $chk = $db->prepare('SELECT id FROM users WHERE username=:u AND school_id=:sid AND is_deleted=0 LIMIT 1');
        $chk->execute([':u' => $username, ':sid' => $schoolId]);
        if ($chk->fetch()) json_error('Username already exists', 409);

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $db->prepare('INSERT INTO users (school_id, username, password_hash, full_name, role, is_active, created_by, created_at, updated_at) VALUES (:sid,:u,:h,:n,:role,1,:by,NOW(),NOW())')
           ->execute([':sid' => $schoolId, ':u' => $username, ':h' => $hash, ':n' => $fullName, ':role' => $role, ':by' => $route['userId']]);
        json_success(['id' => (int)$db->lastInsertId()], 'User created', 201);
    }

    if ($method === 'PUT' && $userId) {
        $sets = []; $params = [];
        if (array_key_exists('full_name', $body))  { $sets[] = 'full_name=:fn';  $params[':fn']  = $body['full_name']; }
        if (array_key_exists('role', $body))        { $sets[] = 'role=:role';     $params[':role']= $body['role']; }
        if (array_key_exists('is_active', $body))   { $sets[] = 'is_active=:act'; $params[':act'] = (int)$body['is_active']; }
        if (!empty($body['password'])) {
            $sets[] = 'password_hash=:h';
            $params[':h'] = password_hash($body['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        }
        if (empty($sets)) json_error('No fields to update', 400);
        $params[':id'] = (int)$userId; $params[':sid'] = $schoolId;
        $db->prepare('UPDATE users SET ' . implode(',', $sets) . ', updated_at=NOW() WHERE id=:id AND school_id=:sid AND is_deleted=0')->execute($params);
        json_success(null, 'User updated');
    }

    if ($method === 'DELETE' && $userId) {
        $db->prepare('UPDATE users SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid')->execute([':id' => (int)$userId, ':sid' => $schoolId]);
        json_success(null, 'User deleted');
    }

    json_error('Method not allowed', 405);
}

// ── WhatsApp Config + Logs ────────────────────────────────────────────────────
function settings_whatsapp(string $method, ?string $sub, int $schoolId, array $body, array $route): void {
    $db = DB::get();

    // GET /settings/whatsapp/logs
    if ($method === 'GET' && $sub === 'logs') {
        $p      = pagination();
        $stmt   = $db->prepare(
            'SELECT * FROM whatsapp_logs WHERE school_id=:sid ORDER BY sent_at DESC LIMIT :lim OFFSET :off'
        );
        $stmt->execute([':sid' => $schoolId, ':lim' => $p['limit'], ':off' => $p['offset']]);
        json_success($stmt->fetchAll());
    }

    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT whatsapp_app_key, whatsapp_auth_key, whatsapp_enabled FROM schools WHERE id=:id LIMIT 1');
        $stmt->execute([':id' => $schoolId]);
        json_success($stmt->fetch() ?: new stdClass());
    }
    if ($method === 'PUT') {
        if (!in_array($route['role'], ['super_admin'])) json_error('Super Admin only', 403);
        $sets = []; $params = [];
        foreach (['whatsapp_app_key', 'whatsapp_auth_key', 'whatsapp_enabled', 'rcs_enabled'] as $f) {
            if (array_key_exists($f, $body)) { $sets[] = "$f=:$f"; $params[":$f"] = $body[$f]; }
        }
        if (empty($sets)) json_error('No fields to update', 400);
        $params[':id'] = $schoolId;
        $db->prepare('UPDATE schools SET ' . implode(',', $sets) . ', updated_at=NOW() WHERE id=:id')->execute($params);
        json_success(null, 'WhatsApp config updated');
    }
    // POST /settings/whatsapp  → log a send attempt
    if ($method === 'POST') {
        $db->prepare('INSERT INTO whatsapp_logs (school_id, recipient, message, status, response_json, sent_at) VALUES (:sid,:to,:msg,:status,:resp,NOW())')
           ->execute([':sid' => $schoolId, ':to' => $body['recipient'] ?? '', ':msg' => $body['message'] ?? '', ':status' => $body['status'] ?? 'sent', ':resp' => json_encode($body['response'] ?? null)]);
        json_success(['id' => (int)$db->lastInsertId()], 'Log saved', 201);
    }
    json_error('Method not allowed', 405);
}

// ── Notification Scheduler ────────────────────────────────────────────────────
function settings_scheduler(string $method, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT * FROM notification_scheduler WHERE school_id=:sid ORDER BY event_type');
        $stmt->execute([':sid' => $schoolId]);
        json_success($stmt->fetchAll());
    }
    if ($method === 'PUT') {
        // body = array of scheduler rules
        $rules = isset($body[0]) ? $body : [$body];
        $db->prepare('DELETE FROM notification_scheduler WHERE school_id=:sid')->execute([':sid' => $schoolId]);
        $ins = $db->prepare('INSERT INTO notification_scheduler (school_id, event_type, is_enabled, days_before, time_of_day, recipient, channel) VALUES (:sid,:event,:enabled,:days,:time,:recipient,:channel)');
        foreach ($rules as $r) {
            $ins->execute([
                ':sid'       => $schoolId,
                ':event'     => $r['event_type']   ?? '',
                ':enabled'   => (int)($r['is_enabled']  ?? 0),
                ':days'      => (int)($r['days_before']  ?? 0),
                ':time'      => $r['time_of_day']   ?? '08:00:00',
                ':recipient' => $r['recipient']     ?? 'parents',
                ':channel'   => $r['channel']       ?? 'whatsapp',
            ]);
        }
        json_success(null, 'Scheduler updated');
    }
    json_error('Method not allowed', 405);
}

// ── In-App Notifications ──────────────────────────────────────────────────────
function settings_notifications(string $method, ?string $notifId, int $schoolId, array $body, array $route): void {
    $db     = DB::get();
    $userId = $route['userId'];

    if ($method === 'GET') {
        $p      = pagination();
        $where  = ['n.school_id=:sid', 'n.is_deleted=0', '(n.user_id=:uid OR n.user_id IS NULL)'];
        $params = [':sid' => $schoolId, ':uid' => $userId];
        if (isset($_GET['unread_only']) && $_GET['unread_only']) { $where[] = 'n.is_read=0'; }
        $wc   = implode(' AND ', $where);
        $cStmt = $db->prepare("SELECT COUNT(*), SUM(CASE WHEN is_read=0 THEN 1 ELSE 0 END) FROM notifications n WHERE $wc");
        $cStmt->execute($params);
        [$total, $unread] = $cStmt->fetch(PDO::FETCH_NUM);

        $params[':lim'] = $p['limit'];
        $params[':off'] = $p['offset'];
        $stmt = $db->prepare("SELECT * FROM notifications n WHERE $wc ORDER BY n.created_at DESC LIMIT :lim OFFSET :off");
        $stmt->execute($params);
        json_success(['notifications' => $stmt->fetchAll(), 'total' => (int)$total, 'unread' => (int)$unread]);
    }

    if ($method === 'POST') {
        // Internal creation (used by other handlers)
        $db->prepare('INSERT INTO notifications (school_id, user_id, type, title, message, channel, entity_type, entity_id, is_deleted, created_at, updated_at) VALUES (:sid,:uid,:type,:title,:msg,:ch,:et,:eid,0,NOW(),NOW())')
           ->execute([
               ':sid'   => $schoolId,
               ':uid'   => isset($body['user_id']) ? (int)$body['user_id'] : null,
               ':type'  => $body['type']         ?? 'info',
               ':title' => $body['title']        ?? '',
               ':msg'   => $body['message']      ?? '',
               ':ch'    => $body['channel']      ?? 'App',
               ':et'    => $body['entity_type']  ?? null,
               ':eid'   => isset($body['entity_id']) ? (int)$body['entity_id'] : null,
           ]);
        json_success(['id' => (int)$db->lastInsertId()], 'Notification created', 201);
    }

    // PUT /settings/notifications/:id/read  — mark individual as read
    if ($method === 'PUT' && $notifId) {
        $db->prepare('UPDATE notifications SET is_read=1, updated_at=NOW() WHERE id=:id AND school_id=:sid AND (user_id=:uid OR user_id IS NULL)')
           ->execute([':id' => (int)$notifId, ':sid' => $schoolId, ':uid' => $userId]);
        json_success(null, 'Marked as read');
    }

    // DELETE /settings/notifications  — clear all for user
    if ($method === 'DELETE') {
        $db->prepare('UPDATE notifications SET is_deleted=1, updated_at=NOW() WHERE school_id=:sid AND (user_id=:uid OR user_id IS NULL)')
           ->execute([':sid' => $schoolId, ':uid' => $userId]);
        json_success(null, 'Notifications cleared');
    }

    json_error('Method not allowed', 405);
}
