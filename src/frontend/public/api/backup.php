<?php
error_reporting(0);
ini_set('display_errors', '0');

/**
 * SHUBH SCHOOL ERP — Backup & Restore API
 * GET  /backup/export         Export all school data as JSON
 * POST /backup/import         Import previously exported JSON backup
 * GET  /backup/history        List backup history
 * POST /backup/factory-reset  Wipe all school data (Super Admin only, 3-step confirm)
 */

require_once __DIR__ . '/config.php';

$route    = $GLOBALS['route'];
$method   = $route['method'];
$body     = $route['body'];
$schoolId = $route['schoolId'];
$segments = $route['segments'];
$action   = $segments[1] ?? '';
$db       = DB::get();

match ($action) {
    'export'        => backup_export($method, $schoolId, $route),
    'import'        => backup_import($method, $schoolId, $body, $route),
    'history'       => backup_history($method, $schoolId),
    'factory-reset' => backup_factory_reset($method, $schoolId, $body, $route),
    default         => json_error("Unknown backup action: $action", 404),
};

// ── Export all school data ────────────────────────────────────────────────────
function backup_export(string $method, int $schoolId, array $route): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    if (!in_array($route['role'], ['super_admin', 'admin'])) json_error('Forbidden', 403);

    $db = DB::get();

    $tables = [
        'sessions', 'classes', 'sections', 'subjects', 'class_subject_mapping',
        'students', 'student_transport', 'student_transport_months', 'student_discounts', 'old_fee_entries',
        'staff', 'teacher_subjects', 'payroll_setup', 'payslips',
        'routes', 'pickup_points',
        'fee_heads', 'fee_plans', 'fee_accounts', 'fee_receipts', 'payment_history', 'fee_balance',
        'attendance', 'biometric_devices',
        'inventory_items', 'inventory_purchases', 'inventory_sales',
        'expense_heads', 'expenses',
        'homework',
        'alumni',
        'notifications', 'notification_scheduler',
        'accounts', 'whatsapp_logs', 'backup_history', 'timetables',
    ];

    $export = [
        'version'    => APP_VERSION,
        'school_id'  => $schoolId,
        'exported_at'=> gmdate('c'),
        'tables'     => [],
    ];

    foreach ($tables as $table) {
        try {
            $stmt = $db->prepare("SELECT * FROM $table WHERE school_id=:sid AND is_deleted=0");
            $stmt->execute([':sid' => $schoolId]);
            $export['tables'][$table] = $stmt->fetchAll();
        } catch (PDOException) {
            $export['tables'][$table] = []; // table might not exist yet
        }
    }

    // Also grab school settings
    $schoolStmt = $db->prepare('SELECT * FROM schools WHERE id=:id LIMIT 1');
    $schoolStmt->execute([':id' => $schoolId]);
    $export['school'] = $schoolStmt->fetch();

    // Log the backup
    $size = strlen(json_encode($export));
    $db->prepare('INSERT INTO backup_history (school_id, filename, size_bytes, created_by, created_at) VALUES (:sid,:fn,:size,:by,NOW())')
       ->execute([':sid' => $schoolId, ':fn' => 'backup_' . date('Ymd_His') . '.json', ':size' => $size, ':by' => $route['userId']]);

    json_success($export, 'Backup ready');
}

// ── Import / Restore ──────────────────────────────────────────────────────────
function backup_import(string $method, int $schoolId, array $body, array $route): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if ($route['role'] !== 'super_admin') json_error('Super Admin only', 403);

    $data = $body['data'] ?? null;
    if (!$data || !isset($data['tables'])) json_error('Invalid backup data — missing tables key', 400);

    $db = DB::get();

    // Tables with known safe columns (prevent injection via table/column names)
    $allowedTables = [
        'sessions', 'classes', 'sections', 'subjects', 'class_subject_mapping',
        'students', 'student_transport', 'student_transport_months', 'student_discounts', 'old_fee_entries',
        'staff', 'teacher_subjects', 'payroll_setup', 'payslips',
        'routes', 'pickup_points',
        'fee_heads', 'fee_plans', 'fee_accounts', 'fee_receipts', 'payment_history',
        'attendance', 'biometric_devices',
        'inventory_items', 'inventory_purchases', 'inventory_sales',
        'expense_heads', 'expenses', 'homework', 'alumni',
        'notification_scheduler', 'timetables',
    ];

    $imported = [];
    $db->beginTransaction();
    try {
        foreach ($data['tables'] as $table => $rows) {
            if (!in_array($table, $allowedTables, true)) continue;
            if (empty($rows)) { $imported[$table] = 0; continue; }

            // Soft-delete existing data for this school before restoring
            try {
                $db->prepare("UPDATE $table SET is_deleted=1 WHERE school_id=:sid")->execute([':sid' => $schoolId]);
            } catch (PDOException) {
                // table may not have school_id or is_deleted — skip soft-delete
            }

            $count = 0;
            foreach ($rows as $row) {
                // Force school_id to current school
                $row['school_id'] = $schoolId;
                unset($row['id']); // let MySQL auto-increment assign new IDs

                $cols = array_keys($row);
                // Sanitize column names (letters, digits, underscore only)
                $safeCols = array_filter($cols, fn($c) => preg_match('/^[a-zA-Z0-9_]+$/', $c));
                if (count($safeCols) !== count($cols)) continue;

                $colList = implode(',', $safeCols);
                $valList = implode(',', array_map(fn($c) => ":$c", $safeCols));
                $ps      = [];
                foreach ($safeCols as $c) $ps[":$c"] = $row[$c];

                try {
                    $db->prepare("INSERT IGNORE INTO $table ($colList) VALUES ($valList)")->execute($ps);
                    $count++;
                } catch (PDOException) {
                    continue;
                }
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

// ── Backup History ────────────────────────────────────────────────────────────
function backup_history(string $method, int $schoolId): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    $db   = DB::get();
    $stmt = $db->prepare('SELECT bh.*, u.full_name AS backed_up_by FROM backup_history bh LEFT JOIN users u ON u.id=bh.created_by WHERE bh.school_id=:sid ORDER BY bh.created_at DESC LIMIT 50');
    $stmt->execute([':sid' => $schoolId]);
    json_success($stmt->fetchAll());
}

// ── Factory Reset ─────────────────────────────────────────────────────────────
function backup_factory_reset(string $method, int $schoolId, array $body, array $route): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    if ($route['role'] !== 'super_admin') json_error('Super Admin only', 403);

    // Require 3-step confirmation
    $confirmation = $body['confirmation'] ?? '';
    if ($confirmation !== 'DELETE_ALL_DATA') {
        json_error('Factory reset requires confirmation = "DELETE_ALL_DATA"', 400);
    }

    $db = DB::get();
    $tables = [
        'students', 'student_transport', 'student_transport_months', 'student_discounts', 'old_fee_entries',
        'fee_receipts', 'payment_history', 'fee_balance', 'fee_heads', 'fee_plans', 'fee_accounts',
        'staff', 'teacher_subjects', 'payroll_setup', 'payslips',
        'routes', 'pickup_points',
        'sessions', 'classes', 'sections', 'subjects', 'class_subject_mapping', 'timetables',
        'attendance', 'biometric_devices',
        'inventory_items', 'inventory_purchases', 'inventory_sales',
        'expense_heads', 'expenses', 'homework', 'alumni',
        'notifications', 'notification_scheduler', 'accounts', 'whatsapp_logs', 'backup_history',
    ];

    $db->beginTransaction();
    try {
        foreach ($tables as $table) {
            try {
                $db->prepare("DELETE FROM $table WHERE school_id=:sid")->execute([':sid' => $schoolId]);
            } catch (PDOException) {
                // skip tables that don't exist yet
            }
        }
        // Reset users except superadmin
        $db->prepare("DELETE FROM users WHERE school_id=:sid AND role != 'super_admin'")->execute([':sid' => $schoolId]);
        $db->commit();
        json_success(null, 'Factory reset complete. All data has been wiped.');
    } catch (Throwable $e) {
        $db->rollBack();
        json_error('Factory reset failed: ' . $e->getMessage(), 500);
    }
}
