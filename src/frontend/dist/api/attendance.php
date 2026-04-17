<?php
error_reporting(0);
ini_set('display_errors', '0');

/**
 * SHUBH SCHOOL ERP — Attendance API
 * POST /attendance/mark             — RFID/QR/manual mark attendance
 * GET  /attendance/logs             — list (date, class, section, route filters)
 * GET  /attendance/summary          — present/total + class-wise + route-wise
 * POST /attendance/biometric-sync   — bulk import from IP-based device
 * GET  /attendance/devices          — list biometric devices
 * POST /attendance/devices          — add device
 * PUT  /attendance/devices/:id      — edit device
 * DELETE /attendance/devices/:id    — delete device
 */

require_once __DIR__ . '/config.php';

$route    = $GLOBALS['route'];
$method   = $route['method'];
$body     = $route['body'];
$schoolId = $route['schoolId'];
$segments = $route['segments'];
$action   = $segments[1] ?? '';
$actionId = $segments[2] ?? null;
$db       = DB::get();

match ($action) {
    'mark'           => att_mark($method, $schoolId, $body, $route),
    'logs'           => att_logs($method, $schoolId),
    'summary'        => att_summary($method, $schoolId),
    'biometric-sync' => att_biometric_sync($method, $schoolId, $body, $route),
    'devices'        => att_devices($method, $actionId, $schoolId, $body, $route),
    default          => json_error("Unknown attendance action: $action", 404),
};

function att_mark(string $method, int $schoolId, array $body, array $route): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);

    $db     = DB::get();
    $source = trim($body['source'] ?? ''); // admission_no or rfid_tag
    $type   = $body['type']  ?? 'manual';  // rfid | qr | manual
    $date   = $body['date']  ?? date('Y-m-d');
    $time   = $body['time']  ?? date('H:i:s');

    if (!$source) json_error('source (admission_no / RFID tag) required', 400);

    // Resolve entity
    $stu = $db->prepare('SELECT id, full_name, father_name, class_id, section_id, photo_url FROM students WHERE (admission_no=:src OR rfid_tag=:src) AND school_id=:sid AND is_deleted=0 LIMIT 1');
    $stu->execute([':src' => $source, ':sid' => $schoolId]);
    $student = $stu->fetch();

    $staff = null;
    if (!$student) {
        $stf = $db->prepare('SELECT id, full_name, designation, photo_url FROM staff WHERE (employee_id=:src OR rfid_tag=:src) AND school_id=:sid AND is_deleted=0 LIMIT 1');
        $stf->execute([':src' => $source, ':sid' => $schoolId]);
        $staff = $stf->fetch();
    }

    if (!$student && !$staff) json_error('No student or staff found for this source', 404);

    $entityType = $student ? 'student' : 'staff';
    $entityId   = $student ? (int)$student['id'] : (int)$staff['id'];

    // Duplicate today check
    $dup = $db->prepare('SELECT id FROM attendance WHERE entity_type=:et AND entity_id=:eid AND attendance_date=:dt AND school_id=:sid LIMIT 1');
    $dup->execute([':et' => $entityType, ':eid' => $entityId, ':dt' => $date, ':sid' => $schoolId]);
    if ($dup->fetch()) {
        json_success(['already_marked' => true, 'name' => $student['full_name'] ?? $staff['full_name']], 'Already marked today');
    }

    $db->prepare('INSERT INTO attendance (school_id, entity_type, entity_id, attendance_date, check_in_time, mark_type, marked_by, created_at) VALUES (:sid,:et,:eid,:dt,:time,:type,:by,NOW())')
       ->execute([':sid' => $schoolId, ':et' => $entityType, ':eid' => $entityId, ':dt' => $date, ':time' => $time, ':type' => $type, ':by' => $route['userId']]);

    $person = $student ?? $staff;
    json_success([
        'entity_type' => $entityType,
        'entity_id'   => $entityId,
        'name'        => $person['full_name'],
        'father_name' => $student['father_name'] ?? null,
        'class_id'    => $student['class_id']    ?? null,
        'section_id'  => $student['section_id']  ?? null,
        'designation' => $staff['designation']   ?? null,
        'photo_url'   => $person['photo_url']    ?? null,
        'check_in'    => $time,
        'date'        => $date,
    ], 'Attendance marked', 201);
}

function att_logs(string $method, int $schoolId): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);

    $p      = pagination();
    $db     = DB::get();
    $where  = ['a.school_id=:sid'];
    $params = [':sid' => $schoolId];

    if (!empty($_GET['date']))        { $where[] = 'a.attendance_date=:dt';        $params[':dt']    = $_GET['date']; }
    if (!empty($_GET['from_date']))   { $where[] = 'a.attendance_date>=:dfrom';    $params[':dfrom'] = $_GET['from_date']; }
    if (!empty($_GET['to_date']))     { $where[] = 'a.attendance_date<=:dto';      $params[':dto']   = $_GET['to_date']; }
    if (!empty($_GET['entity_type'])) { $where[] = 'a.entity_type=:et';           $params[':et']    = $_GET['entity_type']; }
    if (!empty($_GET['class_id']))    { $where[] = 's.class_id=:cid';             $params[':cid']   = (int)$_GET['class_id']; }
    if (!empty($_GET['section_id'])) { $where[] = 's.section_id=:secid';         $params[':secid'] = (int)$_GET['section_id']; }

    $wc   = implode(' AND ', $where);
    $cStmt = $db->prepare("SELECT COUNT(*) FROM attendance a LEFT JOIN students s ON s.id=a.entity_id AND a.entity_type='student' WHERE $wc");
    $cStmt->execute($params);
    $total = (int)$cStmt->fetchColumn();

    $params[':lim'] = $p['limit']; $params[':off'] = $p['offset'];
    $stmt = $db->prepare(
        "SELECT a.*, s.full_name AS student_name, s.admission_no, s.photo_url AS student_photo, s.father_name,
                c.name AS class_name, sec.name AS section_name,
                sf.full_name AS staff_name
         FROM attendance a
         LEFT JOIN students s  ON s.id=a.entity_id AND a.entity_type='student'
         LEFT JOIN staff sf    ON sf.id=a.entity_id AND a.entity_type='staff'
         LEFT JOIN classes c   ON c.id=s.class_id
         LEFT JOIN sections sec ON sec.id=s.section_id
         WHERE $wc ORDER BY a.attendance_date DESC, a.check_in_time ASC LIMIT :lim OFFSET :off"
    );
    $stmt->execute($params);
    json_success(['logs' => $stmt->fetchAll(), 'total' => $total]);
}

function att_summary(string $method, int $schoolId): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);

    $db   = DB::get();
    $date = $_GET['date'] ?? date('Y-m-d');
    $sessId = (int)($_GET['session_id'] ?? 0);

    $totalStmt = $db->prepare('SELECT COUNT(*) FROM students WHERE school_id=:sid AND is_deleted=0 AND status="Active"' . ($sessId ? ' AND session_id=:sess' : ''));
    $params = [':sid' => $schoolId];
    if ($sessId) $params[':sess'] = $sessId;
    $totalStmt->execute($params);
    $total = (int)$totalStmt->fetchColumn();

    $presStmt = $db->prepare("SELECT COUNT(*) FROM attendance WHERE school_id=:sid AND entity_type='student' AND attendance_date=:dt");
    $presStmt->execute([':sid' => $schoolId, ':dt' => $date]);
    $present = (int)$presStmt->fetchColumn();

    // Class-wise
    $cwStmt = $db->prepare(
        "SELECT c.id, c.name AS class_name,
                COUNT(s.id) AS total,
                SUM(CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END) AS present
         FROM classes c
         LEFT JOIN students s ON s.class_id=c.id AND s.school_id=:sid AND s.is_deleted=0 AND s.status='Active'" . ($sessId ? " AND s.session_id=:sess" : "") . "
         LEFT JOIN attendance a ON a.entity_id=s.id AND a.entity_type='student' AND a.attendance_date=:dt AND a.school_id=:sid2
         WHERE c.school_id=:sid3
         GROUP BY c.id ORDER BY c.name"
    );
    $cwParams = [':sid' => $schoolId, ':dt' => $date, ':sid2' => $schoolId, ':sid3' => $schoolId];
    if ($sessId) $cwParams[':sess'] = $sessId;
    $cwStmt->execute($cwParams);
    $classWise = $cwStmt->fetchAll();

    json_success([
        'date'    => $date,
        'total'   => $total,
        'present' => $present,
        'absent'  => $total - $present,
        'class_wise' => $classWise,
    ]);
}

function att_biometric_sync(string $method, int $schoolId, array $body, array $route): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);

    $db       = DB::get();
    $logs     = $body['logs']     ?? [];
    $deviceId = (int)($body['device_id'] ?? 0);
    $date     = $body['date']     ?? date('Y-m-d');
    $matched  = 0;

    if (empty($logs)) json_error('logs array required', 400);

    foreach ($logs as $log) {
        $tag  = $log['rfid_tag'] ?? $log['badge_id'] ?? $log['admission_no'] ?? null;
        if (!$tag) continue;

        $stu = $db->prepare('SELECT id FROM students WHERE (rfid_tag=:tag OR admission_no=:tag) AND school_id=:sid AND is_deleted=0 LIMIT 1');
        $stu->execute([':tag' => $tag, ':sid' => $schoolId]);
        $student = $stu->fetch();
        if (!$student) continue;

        $dup = $db->prepare("SELECT id FROM attendance WHERE entity_type='student' AND entity_id=:eid AND attendance_date=:dt AND school_id=:sid LIMIT 1");
        $dup->execute([':eid' => $student['id'], ':dt' => $date, ':sid' => $schoolId]);
        if ($dup->fetch()) continue;

        $db->prepare("INSERT INTO attendance (school_id, entity_type, entity_id, attendance_date, check_in_time, mark_type, device_id, marked_by, created_at) VALUES (:sid,'student',:eid,:dt,:time,'biometric',:did,:by,NOW())")
           ->execute([':sid' => $schoolId, ':eid' => $student['id'], ':dt' => $date, ':time' => $log['time'] ?? date('H:i:s'), ':did' => $deviceId ?: null, ':by' => $route['userId']]);
        $matched++;
    }

    if ($deviceId) {
        $db->prepare('UPDATE biometric_devices SET last_sync=NOW() WHERE id=:id AND school_id=:sid')->execute([':id' => $deviceId, ':sid' => $schoolId]);
    }

    json_success(['synced' => $matched, 'total' => count($logs)], "$matched records synced");
}

function att_devices(string $method, ?string $devId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT * FROM biometric_devices WHERE school_id=:sid AND is_deleted=0 ORDER BY name');
        $stmt->execute([':sid' => $schoolId]);
        json_success($stmt->fetchAll());
    }
    if ($method === 'POST') {
        if (empty($body['name']) || empty($body['ip_address'])) json_error('name and ip_address required', 400);
        $db->prepare('INSERT INTO biometric_devices (school_id, name, device_type, ip_address, port, is_active, is_deleted, created_at) VALUES (:sid,:name,:type,:ip,:port,1,0,NOW())')->execute([':sid' => $schoolId, ':name' => $body['name'], ':type' => $body['device_type'] ?? 'essl', ':ip' => $body['ip_address'], ':port' => (int)($body['port'] ?? 4370)]);
        json_success(['id' => (int)$db->lastInsertId()], 'Device added', 201);
    }
    if ($method === 'PUT' && $devId) {
        $db->prepare('UPDATE biometric_devices SET name=:name, ip_address=:ip, port=:port, device_type=:type, is_active=:active, updated_at=NOW() WHERE id=:id AND school_id=:sid')->execute([':name' => $body['name'] ?? null, ':ip' => $body['ip_address'] ?? null, ':port' => (int)($body['port'] ?? 4370), ':type' => $body['device_type'] ?? null, ':active' => (int)($body['is_active'] ?? 1), ':id' => (int)$devId, ':sid' => $schoolId]);
        json_success(null, 'Device updated');
    }
    if ($method === 'DELETE' && $devId) {
        if ($route['role'] !== 'super_admin') json_error('Forbidden', 403);
        $db->prepare('UPDATE biometric_devices SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid')->execute([':id' => (int)$devId, ':sid' => $schoolId]);
        json_success(null, 'Device deleted');
    }
    json_error('Method not allowed', 405);
}
