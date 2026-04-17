<?php
/**
 * SHUBH SCHOOL ERP — Generic Data Handler
 *
 * GET    /data/{collection}       — list all records (JWT required)
 * POST   /data/{collection}       — insert/upsert record (JWT required)
 * PUT    /data/{collection}/{id}  — update record (JWT required)
 * DELETE /data/{collection}/{id}  — delete record (superadmin only)
 *
 * Supported collections: students, staff, attendance, fee_receipts,
 * fees_plan, fee_heads, transport_routes, inventory_items, expenses,
 * homework, alumni, sessions, class_sections, subjects, school_profile
 */

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/config.php';

$route      = $GLOBALS['route'];
$method     = $route['method'];
$body       = $route['body'];
$schoolId   = $route['schoolId'];
$segments   = $route['segments'];
$collection = $segments[1] ?? '';
$recordId   = $segments[2] ?? null;
$role       = $route['role'];

// Allowed table names (whitelist to prevent SQL injection)
$allowed = [
    'students'         => 'students',
    'staff'            => 'staff',
    'attendance'       => 'attendance',
    'fee_receipts'     => 'fee_receipts',
    'fees_plan'        => 'fees_plan',
    'fee_heads'        => 'fee_heads',
    'fee_headings'     => 'fee_heads',
    'transport_routes' => 'routes',
    'routes'           => 'routes',
    'pickup_points'    => 'pickup_points',
    'inventory_items'  => 'inventory_items',
    'expenses'         => 'expenses',
    'homework'         => 'homework',
    'alumni'           => 'alumni',
    'sessions'         => 'sessions',
    'class_sections'   => 'sections',
    'sections'         => 'sections',
    'classes'          => 'classes',
    'subjects'         => 'subjects',
    'notifications'    => 'notifications',
    'biometric_devices'=> 'biometric_devices',
];

if (!isset($allowed[$collection])) {
    json_error("Unknown collection: $collection. Allowed: " . implode(', ', array_keys($allowed)), 404);
}
$table = $allowed[$collection];
$db    = DB::get();

// ── GET: list all records ─────────────────────────────────────────────────────
if ($method === 'GET' && !$recordId) {
    $where  = ['school_id=:sid', 'is_deleted=0'];
    $params = [':sid' => $schoolId];

    // Optional filters from query string
    if (!empty($_GET['session_id'])) { $where[] = 'session_id=:sess'; $params[':sess'] = (int)$_GET['session_id']; }
    if (!empty($_GET['id']))         { $where[] = 'id=:id';           $params[':id']   = (int)$_GET['id']; }
    if (!empty($_GET['since']))      { $where[] = 'updated_at > :since'; $params[':since'] = $_GET['since']; }

    $p       = pagination();
    $wc      = implode(' AND ', $where);
    $orderBy = $_GET['order_by'] ?? 'updated_at';
    $orderBy = preg_replace('/[^a-zA-Z0-9_]/', '', $orderBy); // sanitise
    $dir     = (strtoupper($_GET['dir'] ?? 'ASC') === 'DESC') ? 'DESC' : 'ASC';

    try {
        $cStmt = $db->prepare("SELECT COUNT(*) FROM `$table` WHERE $wc");
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $params[':lim'] = $p['limit'];
        $params[':off'] = $p['offset'];
        $stmt = $db->prepare("SELECT * FROM `$table` WHERE $wc ORDER BY $orderBy $dir LIMIT :lim OFFSET :off");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        json_success(['rows' => $rows, 'total' => $total, 'limit' => $p['limit'], 'offset' => $p['offset']]);
    } catch (PDOException $e) {
        json_error('Query failed: ' . $e->getMessage(), 500);
    }
}

// ── GET by ID ─────────────────────────────────────────────────────────────────
if ($method === 'GET' && $recordId) {
    try {
        $stmt = $db->prepare("SELECT * FROM `$table` WHERE id=:id AND school_id=:sid AND is_deleted=0 LIMIT 1");
        $stmt->execute([':id' => (int)$recordId, ':sid' => $schoolId]);
        $row = $stmt->fetch();
        if (!$row) json_error('Record not found', 404);
        json_success($row);
    } catch (PDOException $e) {
        json_error('Query failed: ' . $e->getMessage(), 500);
    }
}

// ── POST: insert / upsert ─────────────────────────────────────────────────────
if ($method === 'POST') {
    if (empty($body)) json_error('Request body is empty', 400);

    $body['school_id']  = $schoolId;
    $body['is_deleted'] = $body['is_deleted'] ?? 0;
    if (!isset($body['created_at'])) $body['created_at'] = now();
    $body['updated_at'] = now();

    $cols = array_filter(array_keys($body), fn($c) => preg_match('/^[a-zA-Z0-9_]+$/', $c));
    $row  = array_intersect_key($body, array_flip($cols));

    $colList    = implode(',', $cols);
    $valList    = implode(',', array_map(fn($c) => ":$c", $cols));
    $updateList = implode(',', array_map(fn($c) => "$c=:$c", array_filter($cols, fn($c) => $c !== 'id')));
    $ps = [];
    foreach ($cols as $c) $ps[":$c"] = $row[$c];

    try {
        $db->prepare("INSERT INTO `$table` ($colList) VALUES ($valList) ON DUPLICATE KEY UPDATE $updateList")->execute($ps);
        json_success(['id' => (int)$db->lastInsertId()], 'Record saved', 201);
    } catch (PDOException $e) {
        json_error('Insert failed: ' . $e->getMessage(), 500);
    }
}

// ── PUT: update by ID ─────────────────────────────────────────────────────────
if ($method === 'PUT' && $recordId) {
    if (empty($body)) json_error('Request body is empty', 400);

    $body['updated_at'] = now();
    unset($body['id'], $body['school_id'], $body['created_at']);

    $cols = array_filter(array_keys($body), fn($c) => preg_match('/^[a-zA-Z0-9_]+$/', $c));
    $sets = array_map(fn($c) => "$c=:$c", $cols);
    $ps   = [];
    foreach ($cols as $c) $ps[":$c"] = $body[$c];
    $ps[':id']  = (int)$recordId;
    $ps[':sid'] = $schoolId;

    try {
        $stmt = $db->prepare("UPDATE `$table` SET " . implode(',', $sets) . " WHERE id=:id AND school_id=:sid AND is_deleted=0");
        $stmt->execute($ps);
        json_success(null, 'Record updated');
    } catch (PDOException $e) {
        json_error('Update failed: ' . $e->getMessage(), 500);
    }
}

// ── DELETE: soft-delete by ID (superadmin only) ───────────────────────────────
if ($method === 'DELETE' && $recordId) {
    if (!in_array($role, ['superadmin', 'super_admin'], true)) json_error('Super Admin only', 403);
    try {
        $db->prepare("UPDATE `$table` SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid")
           ->execute([':id' => (int)$recordId, ':sid' => $schoolId]);
        json_success(null, 'Record deleted');
    } catch (PDOException $e) {
        json_error('Delete failed: ' . $e->getMessage(), 500);
    }
}

json_error('Method or path not handled', 405);
