<?php
/**
 * SHUBH SCHOOL ERP — Sync / Status API
 * GET  /sync/status    Health check + version + DB stats (PUBLIC — no JWT required)
 * POST /sync/push      Bulk upsert from localStorage migration (super_admin only)
 * GET  /sync/pull      Pull all changed records since a timestamp
 */

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/config.php';

$route    = $GLOBALS['route'];
$method   = $route['method'];
$body     = $route['body'];
$schoolId = $route['schoolId'] ?? 1;
$segments = $route['segments'];
$action   = $segments[1] ?? 'status';

// For status, try to get DB but never fail hard — it's a health check
match ($action) {
    'status' => sync_status($method, $schoolId),
    'push'   => sync_push($method, $schoolId, $body, $route),
    'pull'   => sync_pull($method, $schoolId),
    default  => json_error("Unknown sync action: $action", 404),
};

// ── Status / Health (always returns JSON, never throws) ───────────────────────
function sync_status(string $method, int $schoolId): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);

    $counts    = [];
    $connected = false;
    $school    = null;
    $dbVersion = null;

    try {
        $db = DB::get();
        $connected = true;

        // Get MySQL version
        $verStmt = $db->query('SELECT VERSION()');
        $dbVersion = $verStmt ? $verStmt->fetchColumn() : null;

        $tables = ['students', 'staff', 'fee_receipts', 'attendance', 'sessions'];
        foreach ($tables as $t) {
            try {
                $s = $db->prepare("SELECT COUNT(*) FROM `$t` WHERE school_id=:sid AND is_deleted=0");
                $s->execute([':sid' => $schoolId]);
                $counts[$t] = (int)$s->fetchColumn();
            } catch (PDOException $e) {
                $counts[$t] = -1; // table not yet created
            }
        }

        try {
            $schoolStmt = $db->prepare('SELECT name, updated_at FROM schools WHERE id=:id LIMIT 1');
            $schoolStmt->execute([':id' => $schoolId]);
            $school = $schoolStmt->fetch() ?: null;
        } catch (PDOException $e) {
            $school = null;
        }
    } catch (Throwable $e) {
        // DB connection failed — still return JSON with connected=false
        $connected = false;
    }

    // Always return 200 with JSON — never error on status check
    http_response_code(200);
    echo json_encode([
        'status'      => 'ok',
        'version'     => APP_VERSION,
        'db_version'  => $dbVersion,
        'server_time' => gmdate('c'),
        'connected'   => $connected,
        'school'      => $school,
        'counts'      => $counts,
        'synced'      => $connected,
    ]);
    exit;
}

// ── Bulk Push (localStorage → MySQL migration) ────────────────────────────────
function sync_push(string $method, int $schoolId, array $body, array $route): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if ($route['role'] !== 'super_admin') json_error('Super Admin only', 403);

    $db = DB::get();

    $tableMap = [
        'students'        => 'students',
        'staff'           => 'staff',
        'sessions'        => 'sessions',
        'classes'         => 'classes',
        'sections'        => 'sections',
        'subjects'        => 'subjects',
        'routes'          => 'routes',
        'pickup_points'   => 'pickup_points',
        'fee_heads'       => 'fee_heads',
        'fee_plans'       => 'fees_plan',
        'fee_receipts'    => 'fee_receipts',
        'attendance'      => 'attendance',
        'inventory_items' => 'inventory_items',
        'expenses'        => 'expenses',
        'homework'        => 'homework',
        'alumni'          => 'alumni',
        'notifications'   => 'notifications',
    ];

    $results = [];
    $db->beginTransaction();
    try {
        foreach ($tableMap as $key => $table) {
            $rows = $body[$key] ?? [];
            if (empty($rows) || !is_array($rows)) { $results[$table] = 0; continue; }

            $count = 0;
            foreach ($rows as $row) {
                $row['school_id'] = $schoolId;
                $row['is_deleted'] = $row['is_deleted'] ?? 0;
                if (!isset($row['created_at'])) $row['created_at'] = now();
                if (!isset($row['updated_at'])) $row['updated_at'] = now();

                $row = array_filter($row, fn($v) => is_scalar($v) || is_null($v));
                $cols = array_keys($row);
                $safeCols = array_filter($cols, fn($c) => preg_match('/^[a-zA-Z0-9_]+$/', $c));
                if (count($safeCols) !== count($cols)) continue;

                $colList    = implode(',', $safeCols);
                $valList    = implode(',', array_map(fn($c) => ":$c", $safeCols));
                $updateList = implode(',', array_map(fn($c) => "$c=:$c", array_filter($safeCols, fn($c) => $c !== 'id')));
                $ps = [];
                foreach ($safeCols as $c) $ps[":$c"] = $row[$c];

                try {
                    $db->prepare("INSERT INTO `$table` ($colList) VALUES ($valList) ON DUPLICATE KEY UPDATE $updateList")->execute($ps);
                    $count++;
                } catch (PDOException $e) {
                    continue;
                }
            }
            $results[$table] = $count;
        }
        $db->commit();
        json_success(['pushed' => $results], 'Sync push complete');
    } catch (Throwable $e) {
        $db->rollBack();
        json_error('Sync push failed: ' . $e->getMessage(), 500);
    }
}

// ── Pull Changed Records ──────────────────────────────────────────────────────
function sync_pull(string $method, int $schoolId): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);

    $db    = DB::get();
    $since = $_GET['since'] ?? null;
    $tables = [
        'sessions', 'classes', 'sections', 'subjects',
        'students', 'staff',
        'routes', 'pickup_points', 'student_transport',
        'fee_heads', 'fees_plan', 'fee_receipts',
        'attendance', 'inventory_items',
    ];

    $pull = [];
    foreach ($tables as $table) {
        $where  = ['school_id=:sid'];
        $params = [':sid' => $schoolId];
        if ($since) {
            $where[]          = 'updated_at > :since';
            $params[':since'] = $since;
        }
        $wc = implode(' AND ', $where);
        try {
            $stmt = $db->prepare("SELECT * FROM `$table` WHERE $wc ORDER BY updated_at ASC LIMIT 500");
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            if (!empty($rows)) $pull[$table] = $rows;
        } catch (PDOException $e) {
            // skip missing tables
        }
    }

    json_success([
        'pulled_at' => gmdate('c'),
        'since'     => $since,
        'tables'    => $pull,
    ]);
}
