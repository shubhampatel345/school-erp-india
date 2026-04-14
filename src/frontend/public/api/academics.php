<?php
/**
 * SHUBH SCHOOL ERP — Academics API
 * /academics/classes[/:id]         GET list / POST / PUT / DELETE
 * /academics/sections[/:id]        GET / POST / PUT / DELETE
 * /academics/subjects[/:id]        GET / POST / PUT / DELETE
 * /academics/class-subjects        GET / POST (batch assign subjects to classes)
 * /academics/timetables[/:id]      GET / POST / PUT / DELETE
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
    'classes'       => academics_crud($method, $actionId, 'classes',              'name,order_num',          $schoolId, $body, $route),
    'sections'      => academics_crud($method, $actionId, 'sections',             'name,class_id',           $schoolId, $body, $route),
    'subjects'      => academics_crud($method, $actionId, 'subjects',             'name,code',               $schoolId, $body, $route),
    'class-subjects'=> academics_class_subjects($method, $schoolId, $body, $route),
    'timetables'    => academics_timetables($method, $actionId, $schoolId, $body, $route),
    default         => json_error("Unknown academics action: $action", 404),
};

// ── Generic CRUD for simple tables ───────────────────────────────────────────
function academics_crud(string $method, ?string $rowId, string $table, string $editableFields, int $schoolId, array $body, array $route): void {
    $db = DB::get();

    if ($method === 'GET') {
        $where  = ['school_id=:sid', 'is_deleted=0'];
        $params = [':sid' => $schoolId];
        // Allow filtering by parent (e.g. class_id for sections)
        if ($table === 'sections' && !empty($_GET['class_id'])) { $where[] = 'class_id=:cid'; $params[':cid'] = (int)$_GET['class_id']; }
        $wc   = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT * FROM $table WHERE $wc ORDER BY name");
        $stmt->execute($params);
        json_success($stmt->fetchAll());
    }

    if ($method === 'POST') {
        $fields = array_map('trim', explode(',', $editableFields));
        $cols   = ['school_id']; $vals = [':sid']; $params = [':sid' => $schoolId];
        foreach ($fields as $f) {
            if (array_key_exists($f, $body)) {
                $cols[]       = $f;
                $vals[]       = ":$f";
                $params[":$f"] = $body[$f];
            }
        }
        $cols[] = 'is_deleted'; $vals[] = '0';
        $cols[] = 'created_by'; $vals[] = ':by'; $params[':by'] = $route['userId'];
        $cols[] = 'created_at'; $vals[] = 'NOW()';
        $cols[] = 'updated_at'; $vals[] = 'NOW()';
        $colList = implode(',', $cols);
        $valList = implode(',', $vals);
        $db->prepare("INSERT INTO $table ($colList) VALUES ($valList)")->execute($params);
        json_success(['id' => (int)$db->lastInsertId()], ucfirst(rtrim($table, 's')) . ' created', 201);
    }

    if ($method === 'PUT' && $rowId) {
        $fields = array_map('trim', explode(',', $editableFields));
        $sets = []; $params = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $body)) { $sets[] = "$f=:$f"; $params[":$f"] = $body[$f]; }
        }
        if (empty($sets)) json_error('No fields to update', 400);
        $params[':id'] = (int)$rowId; $params[':sid'] = $schoolId;
        $db->prepare("UPDATE $table SET " . implode(',', $sets) . ", updated_at=NOW() WHERE id=:id AND school_id=:sid AND is_deleted=0")->execute($params);
        json_success(null, ucfirst(rtrim($table, 's')) . ' updated');
    }

    if ($method === 'DELETE' && $rowId) {
        if (!in_array($route['role'], ['super_admin','admin'])) json_error('Forbidden', 403);
        $db->prepare("UPDATE $table SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid")->execute([':id' => (int)$rowId, ':sid' => $schoolId]);
        json_success(null, ucfirst(rtrim($table, 's')) . ' deleted');
    }

    json_error('Method not allowed', 405);
}

function academics_class_subjects(string $method, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $where = ['csm.school_id=:sid', 'csm.is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['class_id']))   { $where[] = 'csm.class_id=:cid';   $params[':cid']  = (int)$_GET['class_id']; }
        if (!empty($_GET['subject_id'])) { $where[] = 'csm.subject_id=:sub'; $params[':sub']  = (int)$_GET['subject_id']; }
        $wc   = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT csm.*, c.name AS class_name, sub.name AS subject_name FROM class_subject_mapping csm LEFT JOIN classes c ON c.id=csm.class_id LEFT JOIN subjects sub ON sub.id=csm.subject_id WHERE $wc ORDER BY c.name, sub.name");
        $stmt->execute($params);
        json_success($stmt->fetchAll());
    }
    if ($method === 'POST') {
        // Batch assign: body = {subject_id, class_ids: [1,2,3...]}
        $subjectId = (int)($body['subject_id'] ?? 0);
        $classIds  = $body['class_ids'] ?? [];
        if (!$subjectId || empty($classIds)) json_error('subject_id and class_ids required', 400);
        $sessId    = $body['session_id'] ?? null;
        $ins = $db->prepare('INSERT INTO class_subject_mapping (school_id, session_id, class_id, subject_id, is_deleted, created_at) VALUES (:sid,:sess,:cid,:sub,0,NOW()) ON DUPLICATE KEY UPDATE is_deleted=0, updated_at=NOW()');
        foreach ($classIds as $cid) {
            $ins->execute([':sid' => $schoolId, ':sess' => $sessId, ':cid' => (int)$cid, ':sub' => $subjectId]);
        }
        json_success(null, 'Class-subject mapping saved', 201);
    }
    if ($method === 'DELETE') {
        $subjectId = (int)($body['subject_id'] ?? 0);
        $classIds  = $body['class_ids'] ?? [];
        if (!$subjectId || empty($classIds)) json_error('subject_id and class_ids required', 400);
        $del = $db->prepare('UPDATE class_subject_mapping SET is_deleted=1 WHERE subject_id=:sub AND class_id=:cid AND school_id=:sid');
        foreach ($classIds as $cid) {
            $del->execute([':sub' => $subjectId, ':cid' => (int)$cid, ':sid' => $schoolId]);
        }
        json_success(null, 'Mapping removed');
    }
    json_error('Method not allowed', 405);
}

function academics_timetables(string $method, ?string $ttId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $where  = ['school_id=:sid', 'is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['type']))       { $where[] = 'type=:type';       $params[':type']  = $_GET['type']; }
        if (!empty($_GET['session_id'])) { $where[] = 'session_id=:sess'; $params[':sess']  = (int)$_GET['session_id']; }
        if (!empty($_GET['class_id']))   { $where[] = 'class_id=:cid';    $params[':cid']   = (int)$_GET['class_id']; }
        $wc = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT * FROM timetables WHERE $wc ORDER BY updated_at DESC");
        $stmt->execute($params);
        json_success($stmt->fetchAll());
    }
    if ($method === 'POST') {
        $db->prepare('INSERT INTO timetables (school_id, session_id, type, class_id, section_id, staff_id, data_json, is_deleted, created_by, created_at, updated_at) VALUES (:sid,:sess,:type,:cid,:secid,:stf,:data,0,:by,NOW(),NOW())')
           ->execute([':sid' => $schoolId, ':sess' => $body['session_id'] ?? null, ':type' => $body['type'] ?? 'exam', ':cid' => $body['class_id'] ?? null, ':secid' => $body['section_id'] ?? null, ':stf' => $body['staff_id'] ?? null, ':data' => json_encode($body['data'] ?? []), ':by' => $route['userId']]);
        json_success(['id' => (int)$db->lastInsertId()], 'Timetable saved', 201);
    }
    if ($method === 'PUT' && $ttId) {
        $db->prepare('UPDATE timetables SET data_json=:data, updated_at=NOW() WHERE id=:id AND school_id=:sid AND is_deleted=0')
           ->execute([':data' => json_encode($body['data'] ?? []), ':id' => (int)$ttId, ':sid' => $schoolId]);
        json_success(null, 'Timetable updated');
    }
    if ($method === 'DELETE' && $ttId) {
        $db->prepare('UPDATE timetables SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid')->execute([':id' => (int)$ttId, ':sid' => $schoolId]);
        json_success(null, 'Timetable deleted');
    }
    json_error('Method not allowed', 405);
}
