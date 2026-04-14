<?php
/**
 * SHUBH SCHOOL ERP — HR / Payroll API
 * /hr/staff[/:id]         GET list / GET detail / POST create / PUT update / DELETE
 * /hr/teacher-subjects    GET list / POST save / DELETE/:id
 * /hr/payroll[/:id]       GET / POST / PUT
 * /hr/payslips[/:id]      GET / POST generate
 */

require_once __DIR__ . '/config.php';

$route    = $GLOBALS['route'];
$method   = $route['method'];
$body     = $route['body'];
$schoolId = $route['schoolId'];
$segments = $route['segments'];
$action   = $segments[1] ?? '';   // staff | teacher-subjects | payroll | payslips
$actionId = $segments[2] ?? null; // numeric ID or sub-action
$db       = DB::get();

match ($action) {
    'staff'            => hr_staff($method, $actionId, $schoolId, $body, $route),
    'teacher-subjects' => hr_teacher_subjects($method, $actionId, $schoolId, $body, $route),
    'payroll'          => hr_payroll($method, $actionId, $schoolId, $body, $route),
    'payslips'         => hr_payslips($method, $actionId, $schoolId, $body, $route),
    default            => json_error("Unknown HR action: $action", 404),
};

// ─────────────────────────────────────────────────────────────────────────────
function hr_staff(string $method, ?string $staffId, int $schoolId, array $body, array $route): void {
    $db = DB::get();

    // GET /hr/staff/:id
    if ($method === 'GET' && $staffId) {
        $stmt = $db->prepare('SELECT * FROM staff WHERE id=:id AND school_id=:sid AND is_deleted=0 LIMIT 1');
        $stmt->execute([':id' => (int)$staffId, ':sid' => $schoolId]);
        $staff = $stmt->fetch();
        if (!$staff) json_error('Staff not found', 404);
        $subj = $db->prepare('SELECT ts.*, sub.name AS subject_name FROM teacher_subjects ts LEFT JOIN subjects sub ON sub.id=ts.subject_id WHERE ts.staff_id=:id AND ts.is_deleted=0');
        $subj->execute([':id' => (int)$staffId]);
        $staff['subjects'] = $subj->fetchAll();
        json_success($staff);
    }

    // GET /hr/staff — list
    if ($method === 'GET') {
        $p      = pagination();
        $where  = ['s.school_id=:sid', 's.is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['search'])) { $where[] = '(s.full_name LIKE :q OR s.mobile LIKE :q OR s.employee_id LIKE :q)'; $params[':q'] = '%' . $_GET['search'] . '%'; }
        if (!empty($_GET['designation'])) { $where[] = 's.designation=:des'; $params[':des'] = $_GET['designation']; }
        if (!empty($_GET['status']))      { $where[] = 's.is_active=:act';   $params[':act'] = (int)$_GET['status']; }

        $wc = implode(' AND ', $where);
        $cStmt = $db->prepare("SELECT COUNT(*) FROM staff s WHERE $wc");
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $params[':lim'] = $p['limit']; $params[':off'] = $p['offset'];
        $stmt = $db->prepare("SELECT s.* FROM staff s WHERE $wc ORDER BY s.full_name LIMIT :lim OFFSET :off");
        $stmt->execute($params);
        json_success(['staff' => $stmt->fetchAll(), 'total' => $total]);
    }

    // POST /hr/staff — create
    if ($method === 'POST') {
        $name = trim($body['full_name'] ?? '');
        if (!$name) json_error('full_name is required', 400);

        $db->prepare(
            'INSERT INTO staff (school_id, employee_id, full_name, designation, department, dob, gender, mobile, email,
             address, qualification, date_of_joining, gross_salary, photo_url, rfid_tag, aadhaar_no, pan_no,
             bank_account, bank_name, ifsc, is_active, is_deleted, created_by, created_at, updated_at)
             VALUES (:sid,:eid,:name,:des,:dept,:dob,:gender,:mob,:email,:addr,:qual,:doj,:salary,:photo,:rfid,:aadhaar,:pan,:bank,:bname,:ifsc,1,0,:by,NOW(),NOW())'
        )->execute([
            ':sid'    => $schoolId, ':eid' => $body['employee_id'] ?? null, ':name' => $name,
            ':des'    => $body['designation']  ?? null, ':dept' => $body['department'] ?? null,
            ':dob'    => date_or_null($body['dob'] ?? ''),
            ':gender' => $body['gender']       ?? null, ':mob'  => $body['mobile']     ?? null,
            ':email'  => $body['email']        ?? null, ':addr' => $body['address']    ?? null,
            ':qual'   => $body['qualification']?? null,
            ':doj'    => date_or_null($body['date_of_joining'] ?? ''),
            ':salary' => (float)($body['gross_salary'] ?? 0),
            ':photo'  => $body['photo_url']    ?? null, ':rfid' => $body['rfid_tag']   ?? null,
            ':aadhaar'=> $body['aadhaar_no']   ?? null, ':pan'  => $body['pan_no']     ?? null,
            ':bank'   => $body['bank_account'] ?? null, ':bname'=> $body['bank_name']  ?? null,
            ':ifsc'   => $body['ifsc']         ?? null, ':by'   => $route['userId'],
        ]);
        $newId = (int)$db->lastInsertId();

        // Auto-create teacher/driver login (mobile=username, dob_ddmmyyyy=password)
        auto_create_staff_user($db, $schoolId, $newId, $body);

        // Save teacher subjects if provided
        if (!empty($body['subjects']) && is_array($body['subjects'])) {
            save_teacher_subjects($db, $schoolId, $body['session_id'] ?? null, $newId, $body['subjects'], $route['userId']);
        }

        json_success(['id' => $newId], 'Staff created', 201);
    }

    // PUT /hr/staff/:id
    if ($method === 'PUT' && $staffId) {
        $fields = ['full_name','designation','department','dob','gender','mobile','email','address','qualification',
                   'date_of_joining','gross_salary','photo_url','rfid_tag','aadhaar_no','pan_no','bank_account','bank_name','ifsc'];
        $sets = []; $params = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $body)) {
                $sets[] = "$f=:$f";
                $params[":$f"] = in_array($f, ['dob','date_of_joining']) ? date_or_null($body[$f]) : $body[$f];
            }
        }
        if (!empty($sets)) {
            $params[':id'] = (int)$staffId; $params[':sid'] = $schoolId;
            $db->prepare('UPDATE staff SET ' . implode(',', $sets) . ', updated_at=NOW() WHERE id=:id AND school_id=:sid AND is_deleted=0')->execute($params);
        }
        if (!empty($body['subjects']) && is_array($body['subjects'])) {
            save_teacher_subjects($db, $schoolId, $body['session_id'] ?? null, (int)$staffId, $body['subjects'], $route['userId']);
        }
        json_success(null, 'Staff updated');
    }

    // DELETE /hr/staff/:id
    if ($method === 'DELETE' && $staffId) {
        if (!in_array($route['role'], ['super_admin','admin'])) json_error('Forbidden', 403);
        $db->prepare('UPDATE staff SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid')->execute([':id' => (int)$staffId, ':sid' => $schoolId]);
        json_success(null, 'Staff deleted');
    }

    json_error('Not found', 404);
}

function hr_teacher_subjects(string $method, ?string $tsId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $where = ['ts.school_id=:sid', 'ts.is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['staff_id']))   { $where[] = 'ts.staff_id=:stf'; $params[':stf'] = (int)$_GET['staff_id']; }
        if (!empty($_GET['subject_id'])) { $where[] = 'ts.subject_id=:sub'; $params[':sub'] = (int)$_GET['subject_id']; }
        $wc = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT ts.*, sub.name AS subject_name, sf.full_name AS staff_name FROM teacher_subjects ts LEFT JOIN subjects sub ON sub.id=ts.subject_id LEFT JOIN staff sf ON sf.id=ts.staff_id WHERE $wc ORDER BY sf.full_name, sub.name");
        $stmt->execute($params);
        json_success($stmt->fetchAll());
    }
    if ($method === 'POST') {
        $items = isset($body[0]) ? $body : [$body]; // support both array and single object
        foreach ($items as $item) {
            $db->prepare('INSERT INTO teacher_subjects (school_id, session_id, staff_id, subject_id, class_from, class_to, is_deleted, created_at) VALUES (:sid,:sess,:stf,:sub,:cfrom,:cto,0,NOW()) ON DUPLICATE KEY UPDATE class_from=:cfrom, class_to=:cto, is_deleted=0, updated_at=NOW()')
               ->execute([':sid' => $schoolId, ':sess' => $item['session_id'] ?? null, ':stf' => (int)($item['staff_id'] ?? 0), ':sub' => (int)($item['subject_id'] ?? 0), ':cfrom' => (int)($item['class_from'] ?? 1), ':cto' => (int)($item['class_to'] ?? 1)]);
        }
        json_success(null, 'Teacher subjects saved', 201);
    }
    if ($method === 'DELETE' && $tsId) {
        $db->prepare('UPDATE teacher_subjects SET is_deleted=1 WHERE id=:id AND school_id=:sid')->execute([':id' => (int)$tsId, ':sid' => $schoolId]);
        json_success(null, 'Assignment removed');
    }
    json_error('Method not allowed', 405);
}

function hr_payroll(string $method, ?string $prId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $where = ['ps.school_id=:sid', 'ps.is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['session_id'])) { $where[] = 'ps.session_id=:sess'; $params[':sess'] = (int)$_GET['session_id']; }
        if (!empty($_GET['staff_id']))   { $where[] = 'ps.staff_id=:stf';    $params[':stf']  = (int)$_GET['staff_id']; }
        $wc = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT ps.*, sf.full_name, sf.designation FROM payroll_setup ps LEFT JOIN staff sf ON sf.id=ps.staff_id WHERE $wc ORDER BY sf.full_name");
        $stmt->execute($params);
        json_success($stmt->fetchAll());
    }
    if ($method === 'POST') {
        $db->prepare('INSERT INTO payroll_setup (school_id, session_id, staff_id, basic_salary, hra, da, ta, other_allowances, pf_deduction, esi_deduction, tds_deduction, other_deductions, is_deleted, created_by, created_at, updated_at) VALUES (:sid,:sess,:stf,:basic,:hra,:da,:ta,:other_allow,:pf,:esi,:tds,:other_ded,0,:by,NOW(),NOW()) ON DUPLICATE KEY UPDATE basic_salary=:basic, hra=:hra, da=:da, ta=:ta, other_allowances=:other_allow, pf_deduction=:pf, esi_deduction=:esi, tds_deduction=:tds, other_deductions=:other_ded, updated_at=NOW()')
           ->execute([':sid' => $schoolId, ':sess' => $body['session_id'] ?? null, ':stf' => (int)($body['staff_id'] ?? 0), ':basic' => (float)($body['basic_salary'] ?? 0), ':hra' => (float)($body['hra'] ?? 0), ':da' => (float)($body['da'] ?? 0), ':ta' => (float)($body['ta'] ?? 0), ':other_allow' => (float)($body['other_allowances'] ?? 0), ':pf' => (float)($body['pf_deduction'] ?? 0), ':esi' => (float)($body['esi_deduction'] ?? 0), ':tds' => (float)($body['tds_deduction'] ?? 0), ':other_ded' => (float)($body['other_deductions'] ?? 0), ':by' => $route['userId']]);
        json_success(null, 'Payroll setup saved');
    }
    if ($method === 'PUT' && $prId) {
        $fields = ['basic_salary','hra','da','ta','other_allowances','pf_deduction','esi_deduction','tds_deduction','other_deductions'];
        $sets = []; $params = [];
        foreach ($fields as $f) { if (array_key_exists($f, $body)) { $sets[] = "$f=:$f"; $params[":$f"] = (float)$body[$f]; } }
        if (!empty($sets)) {
            $params[':id'] = (int)$prId; $params[':sid'] = $schoolId;
            $db->prepare('UPDATE payroll_setup SET ' . implode(',', $sets) . ', updated_at=NOW() WHERE id=:id AND school_id=:sid AND is_deleted=0')->execute($params);
        }
        json_success(null, 'Payroll updated');
    }
    json_error('Method not allowed', 405);
}

function hr_payslips(string $method, ?string $psId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $where = ['p.school_id=:sid', 'p.is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['staff_id'])) { $where[] = 'p.staff_id=:stf'; $params[':stf'] = (int)$_GET['staff_id']; }
        if (!empty($_GET['month']))    { $where[] = 'p.pay_month=:mo';  $params[':mo']  = $_GET['month']; }
        if (!empty($_GET['year']))     { $where[] = 'p.pay_year=:yr';   $params[':yr']  = (int)$_GET['year']; }
        $wc = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT p.*, sf.full_name, sf.designation FROM payslips p LEFT JOIN staff sf ON sf.id=p.staff_id WHERE $wc ORDER BY p.pay_year DESC, p.pay_month DESC");
        $stmt->execute($params);
        json_success($stmt->fetchAll());
    }
    if ($method === 'POST') {
        $staffId = (int)($body['staff_id'] ?? 0);
        if (!$staffId) json_error('staff_id required', 400);

        // Get payroll setup
        $setup = $db->prepare('SELECT * FROM payroll_setup WHERE staff_id=:stf AND school_id=:sid AND is_deleted=0 LIMIT 1');
        $setup->execute([':stf' => $staffId, ':sid' => $schoolId]);
        $pr = $setup->fetch();
        if (!$pr) json_error('Payroll setup not found for this staff', 404);

        $workingDays = (int)($body['working_days'] ?? 26);
        $presentDays = (int)($body['present_days'] ?? $workingDays);
        $gross  = (float)$pr['basic_salary'] + (float)$pr['hra'] + (float)$pr['da'] + (float)$pr['ta'] + (float)$pr['other_allowances'];
        $netSal = $workingDays > 0 ? ($gross / $workingDays) * $presentDays : $gross;
        $deductions = (float)$pr['pf_deduction'] + (float)$pr['esi_deduction'] + (float)$pr['tds_deduction'] + (float)$pr['other_deductions'];
        $netPay = $netSal - $deductions;

        $db->prepare('INSERT INTO payslips (school_id, session_id, staff_id, pay_month, pay_year, gross_salary, net_salary, total_deductions, net_pay, working_days, present_days, is_deleted, created_by, created_at, updated_at) VALUES (:sid,:sess,:stf,:mo,:yr,:gross,:net_sal,:ded,:pay,:wdays,:pdays,0,:by,NOW(),NOW())')
           ->execute([':sid' => $schoolId, ':sess' => $body['session_id'] ?? null, ':stf' => $staffId, ':mo' => $body['pay_month'] ?? date('m'), ':yr' => (int)($body['pay_year'] ?? date('Y')), ':gross' => round($gross, 2), ':net_sal' => round($netSal, 2), ':ded' => round($deductions, 2), ':pay' => round($netPay, 2), ':wdays' => $workingDays, ':pdays' => $presentDays, ':by' => $route['userId']]);
        json_success(['id' => (int)$db->lastInsertId(), 'net_pay' => round($netPay, 2)], 'Payslip generated', 201);
    }
    json_error('Method not allowed', 405);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function auto_create_staff_user(PDO $db, int $schoolId, int $staffId, array $body): void {
    $mobile = trim($body['mobile'] ?? '');
    $dob    = $body['dob'] ?? '';
    if (!$mobile) return;
    $chk = $db->prepare('SELECT id FROM users WHERE username=:u AND school_id=:s AND is_deleted=0 LIMIT 1');
    $chk->execute([':u' => $mobile, ':s' => $schoolId]);
    if ($chk->fetch()) return;

    $parts   = explode('-', $dob);
    $passRaw = count($parts) === 3 ? $parts[2] . $parts[1] . $parts[0] : $mobile;
    $hash    = password_hash($passRaw, PASSWORD_BCRYPT, ['cost' => 12]);
    $role    = strtolower($body['designation'] ?? 'teacher') === 'driver' ? 'driver' : 'teacher';
    $db->prepare('INSERT INTO users (school_id,username,password_hash,full_name,role,reference_id,is_active,created_at,updated_at) VALUES (:sid,:u,:h,:n,:role,:ref,1,NOW(),NOW())')->execute([':sid' => $schoolId, ':u' => $mobile, ':h' => $hash, ':n' => $body['full_name'] ?? '', ':role' => $role, ':ref' => $staffId]);
}

function save_teacher_subjects(PDO $db, int $schoolId, ?int $sessionId, int $staffId, array $subjects, int $createdBy): void {
    $db->prepare('UPDATE teacher_subjects SET is_deleted=1 WHERE staff_id=:stf AND school_id=:sid AND (:sess IS NULL OR session_id=:sess)')->execute([':stf' => $staffId, ':sid' => $schoolId, ':sess' => $sessionId]);
    $ins = $db->prepare('INSERT INTO teacher_subjects (school_id, session_id, staff_id, subject_id, class_from, class_to, is_deleted, created_at) VALUES (:sid,:sess,:stf,:sub,:cfrom,:cto,0,NOW())');
    foreach ($subjects as $s) {
        if (empty($s['subject_id'])) continue;
        $ins->execute([':sid' => $schoolId, ':sess' => $sessionId, ':stf' => $staffId, ':sub' => (int)$s['subject_id'], ':cfrom' => (int)($s['class_from'] ?? 1), ':cto' => (int)($s['class_to'] ?? 1)]);
    }
}
