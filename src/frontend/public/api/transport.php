<?php
/**
 * SHUBH SCHOOL ERP — Transport API
 * /transport/routes[/:id]           CRUD routes
 * /transport/pickup-points[/:id]    CRUD pickup points (per route, with monthly_fare)
 * /transport/assignments[/:id]      GET/POST/PUT/DELETE student transport assignments
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
    'routes'        => transport_routes($method, $actionId, $schoolId, $body, $route),
    'pickup-points' => transport_pickup_points($method, $actionId, $schoolId, $body, $route),
    'assignments'   => transport_assignments($method, $actionId, $schoolId, $body, $route),
    default         => json_error("Unknown transport action: $action", 404),
};

function transport_routes(string $method, ?string $routeId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $where  = ['school_id=:sid', 'is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['session_id'])) { $where[] = 'session_id=:sess'; $params[':sess'] = (int)$_GET['session_id']; }
        $wc = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT r.*, (SELECT COUNT(*) FROM pickup_points pp WHERE pp.route_id=r.id AND pp.is_deleted=0) AS stop_count FROM routes r WHERE $wc ORDER BY name");
        $stmt->execute($params);
        $routes = $stmt->fetchAll();

        // Attach pickup points to each route
        foreach ($routes as &$r) {
            $ppStmt = $db->prepare('SELECT * FROM pickup_points WHERE route_id=:rid AND is_deleted=0 ORDER BY order_num, name');
            $ppStmt->execute([':rid' => $r['id']]);
            $r['pickup_points'] = $ppStmt->fetchAll();
        }
        json_success($routes);
    }
    if ($method === 'POST') {
        if (empty($body['name'])) json_error('name is required', 400);
        $db->prepare('INSERT INTO routes (school_id, session_id, name, bus_no, driver_name, driver_mobile, is_deleted, created_by, created_at, updated_at) VALUES (:sid,:sess,:name,:bus,:drv,:mob,0,:by,NOW(),NOW())')
           ->execute([':sid' => $schoolId, ':sess' => $body['session_id'] ?? null, ':name' => $body['name'], ':bus' => $body['bus_no'] ?? null, ':drv' => $body['driver_name'] ?? null, ':mob' => $body['driver_mobile'] ?? null, ':by' => $route['userId']]);
        json_success(['id' => (int)$db->lastInsertId()], 'Route created', 201);
    }
    if ($method === 'PUT' && $routeId) {
        $db->prepare('UPDATE routes SET name=:name, bus_no=:bus, driver_name=:drv, driver_mobile=:mob, updated_at=NOW() WHERE id=:id AND school_id=:sid AND is_deleted=0')
           ->execute([':name' => $body['name'] ?? null, ':bus' => $body['bus_no'] ?? null, ':drv' => $body['driver_name'] ?? null, ':mob' => $body['driver_mobile'] ?? null, ':id' => (int)$routeId, ':sid' => $schoolId]);
        json_success(null, 'Route updated');
    }
    if ($method === 'DELETE' && $routeId) {
        if (!in_array($route['role'], ['super_admin','admin'])) json_error('Forbidden', 403);
        $db->prepare('UPDATE routes SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid')->execute([':id' => (int)$routeId, ':sid' => $schoolId]);
        json_success(null, 'Route deleted');
    }
    json_error('Method not allowed', 405);
}

function transport_pickup_points(string $method, ?string $ppId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $where  = ['school_id=:sid', 'is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['route_id'])) { $where[] = 'route_id=:rid'; $params[':rid'] = (int)$_GET['route_id']; }
        $wc = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT * FROM pickup_points WHERE $wc ORDER BY order_num, name");
        $stmt->execute($params);
        json_success($stmt->fetchAll());
    }
    if ($method === 'POST') {
        if (empty($body['name']) || empty($body['route_id'])) json_error('name and route_id required', 400);
        $db->prepare('INSERT INTO pickup_points (school_id, route_id, name, monthly_fare, order_num, is_deleted, created_by, created_at, updated_at) VALUES (:sid,:rid,:name,:fare,:order,0,:by,NOW(),NOW())')
           ->execute([':sid' => $schoolId, ':rid' => (int)$body['route_id'], ':name' => $body['name'], ':fare' => (float)($body['monthly_fare'] ?? 0), ':order' => (int)($body['order_num'] ?? 0), ':by' => $route['userId']]);
        json_success(['id' => (int)$db->lastInsertId()], 'Pickup point created', 201);
    }
    if ($method === 'PUT' && $ppId) {
        $db->prepare('UPDATE pickup_points SET name=:name, monthly_fare=:fare, order_num=:order, updated_at=NOW() WHERE id=:id AND school_id=:sid AND is_deleted=0')
           ->execute([':name' => $body['name'] ?? null, ':fare' => (float)($body['monthly_fare'] ?? 0), ':order' => (int)($body['order_num'] ?? 0), ':id' => (int)$ppId, ':sid' => $schoolId]);
        json_success(null, 'Pickup point updated');
    }
    if ($method === 'DELETE' && $ppId) {
        $db->prepare('UPDATE pickup_points SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid')->execute([':id' => (int)$ppId, ':sid' => $schoolId]);
        json_success(null, 'Pickup point deleted');
    }
    json_error('Method not allowed', 405);
}

function transport_assignments(string $method, ?string $assId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $p      = pagination();
        $where  = ['st.school_id=:sid', 'st.is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['session_id'])) { $where[] = 'st.session_id=:sess'; $params[':sess'] = (int)$_GET['session_id']; }
        if (!empty($_GET['route_id']))   { $where[] = 'st.route_id=:rid';    $params[':rid']  = (int)$_GET['route_id']; }
        $wc = implode(' AND ', $where);
        $cStmt = $db->prepare("SELECT COUNT(*) FROM student_transport st WHERE $wc");
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();
        $params[':lim'] = $p['limit']; $params[':off'] = $p['offset'];
        $stmt = $db->prepare("SELECT st.*, s.full_name, s.admission_no, r.name AS route_name, r.bus_no, pp.name AS pickup_point_name, pp.monthly_fare FROM student_transport st LEFT JOIN students s ON s.id=st.student_id LEFT JOIN routes r ON r.id=st.route_id LEFT JOIN pickup_points pp ON pp.id=st.pickup_point_id WHERE $wc ORDER BY s.full_name LIMIT :lim OFFSET :off");
        $stmt->execute($params);
        json_success(['assignments' => $stmt->fetchAll(), 'total' => $total]);
    }
    if ($method === 'POST') {
        if (empty($body['student_id'])) json_error('student_id required', 400);
        $db->prepare('INSERT INTO student_transport (school_id, session_id, student_id, route_id, pickup_point_id, bus_no, is_deleted, created_at, updated_at) VALUES (:sid,:sess,:stu,:rid,:pp,:bus,0,NOW(),NOW()) ON DUPLICATE KEY UPDATE route_id=:rid, pickup_point_id=:pp, bus_no=:bus, is_deleted=0, updated_at=NOW()')
           ->execute([':sid' => $schoolId, ':sess' => $body['session_id'] ?? null, ':stu' => (int)$body['student_id'], ':rid' => $body['route_id'] ?? null, ':pp' => $body['pickup_point_id'] ?? null, ':bus' => $body['bus_no'] ?? null]);
        json_success(null, 'Assignment saved', 201);
    }
    if ($method === 'DELETE' && $assId) {
        $db->prepare('UPDATE student_transport SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid')->execute([':id' => (int)$assId, ':sid' => $schoolId]);
        json_success(null, 'Assignment removed');
    }
    json_error('Method not allowed', 405);
}
