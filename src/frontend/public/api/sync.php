<?php
/**
 * SHUBH SCHOOL ERP — Sync / Status API
 * GET  /sync/status    Health check + version + DB stats
 * POST /sync/push      Bulk upsert from localStorage migration (one-time import)
 * GET  /sync/pull      Pull all changed records since a timestamp
 */

require_once __DIR__ . '/config.php';

$route    = $GLOBALS['route'];
$method   = $route['method'];
$body     = $route['body'];
$schoolId = $route['schoolId'];
$segments = $route['segments'];
$action   = $segments[1] ?? 'status';
$db       = DB::get();

match ($action) {
    'status' => sync_status($method, $schoolId, $db),
    'push'   => sync_push($method, $schoolId, $body, $route, $db),
    'pull'   => sync_pull($method, $schoolId, $db),
    default  => json_error("Unknown sync action: $action", 404),
};

// ── Status / Health ───────────────────────────────────────────────────────────
function sync_status(string $method, int $schoolId, PDO $db): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);

    $counts = [];
    $tables = ['students', 'staff', 'fee_receipts', 'attendance', 'sessions'];
    foreach ($tables as $t) {
        try {
            $s = $db->prepare("SELECT COUNT(*) FROM $t WHERE school_id=:sid AND is_deleted=0");
            $s->execute([':sid' => $schoolId]);
            $counts[$t] = (int)$s->fetchColumn();
        } catch (PDOException) {
            $counts[$t] = -1; // table not yet created
        }
    }

    $schoolStmt = $db->prepare('SELECT name, updated_at FROM schools WHERE id=:id LIMIT 1');
    $schoolStmt->execute([':id' => $schoolId]);
    $school = $schoolStmt->fetch();

    json_success([
        'status'      => 'ok',
        'version'     => APP_VERSION,
        'server_time' => gmdate('c'),
        'school'      => $school ?: null,
        'counts'      => $counts,
        'synced'      => true,
    ]);
}

// ── Bulk Push (localStorage → MySQL migration) ────────────────────────────────
function sync_push(string $method, int $schoolId, array $body, array $route, PDO $db): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if ($route['role'] !== 'super_admin') json_error('Super Admin only', 403);

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
        'fee_plans'          => 'fee_plans',
        'fee_receipts'       => 'fee_receipts',
        'attendance'         => 'attendance',
        'inventory_items'    => 'inventory_items',
        'expenses'           => 'expenses',
        'homework'           => 'homework',
        'alumni'             => 'alumni',
        'notifications'      => 'notifications',
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

                // Strip non-scalar values (objects/arrays would break INSERT)
                $row = array_filter($row, fn($v) => is_scalar($v) || is_null($v));
                $cols = array_keys($row);
                $safeCols = array_filter($cols, fn($c) => preg_match('/^[a-zA-Z0-9_]+$/', $c));
                if (count($safeCols) !== count($cols)) continue;

                $colList = implode(',', $safeCols);
                $valList = implode(',', array_map(fn($c) => ":$c", $safeCols));
                $updateList = implode(',', array_map(fn($c) => "$c=:$c", array_filter($safeCols, fn($c) => $c !== 'id')));
                $ps = [];
                foreach ($safeCols as $c) $ps[":$c"] = $row[$c];

                try {
                    $db->prepare("INSERT INTO $table ($colList) VALUES ($valList) ON DUPLICATE KEY UPDATE $updateList")->execute($ps);
                    $count++;
                } catch (PDOException) {
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
function sync_pull(string $method, int $schoolId, PDO $db): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);

    $since  = $_GET['since'] ?? null; // ISO timestamp
    $tables = [
        'sessions', 'classes', 'sections', 'subjects',
        'students', 'staff',
        'routes', 'pickup_points', 'student_transport',
        'fee_heads', 'fee_plans', 'fee_receipts',
        'attendance',
        'inventory_items',
    ];

    $pull = [];
    foreach ($tables as $table) {
        $where  = ['school_id=:sid'];
        $params = [':sid' => $schoolId];
        if ($since) {
            $where[] = 'updated_at > :since';
            $params[':since'] = $since;
        }
        $wc = implode(' AND ', $where);
        try {
            $stmt = $db->prepare("SELECT * FROM $table WHERE $wc ORDER BY updated_at ASC LIMIT 500");
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            if (!empty($rows)) $pull[$table] = $rows;
        } catch (PDOException) {
            // skip missing tables
        }
    }

    json_success([
        'pulled_at' => gmdate('c'),
        'since'     => $since,
        'tables'    => $pull,
    ]);
}
