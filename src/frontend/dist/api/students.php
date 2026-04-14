<?php
/**
 * SHUBH SCHOOL ERP — Students API
 * GET    /students                  list (paginated + filters)
 * POST   /students                  create
 * GET    /students/:id              full detail
 * PUT    /students/:id              update
 * DELETE /students/:id              soft delete
 * GET    /students/:id/transport    transport assignment + months
 * PUT    /students/:id/transport    update transport
 * GET    /students/:id/discounts    discount settings
 * PUT    /students/:id/discounts    update discounts
 * GET    /students/:id/old-fees     old fee entries
 * POST   /students/:id/old-fees     add old fee
 * PUT    /students/:id/old-fees/:fid update old fee
 * DELETE /students/:id/old-fees/:fid delete old fee
 */

require_once __DIR__ . '/config.php';

$route     = $GLOBALS['route'];
$method    = $route['method'];
$body      = $route['body'];
$schoolId  = $route['schoolId'];
$segments  = $route['segments'];

// segments: [students, :id, sub-resource, :sub-id]
$studentId = isset($segments[1]) && is_numeric($segments[1]) ? (int)$segments[1] : null;
$subRes    = $segments[2] ?? null;
$subId     = isset($segments[3]) && is_numeric($segments[3]) ? (int)$segments[3] : null;

$db = DB::get();

// ── Sub-resource dispatch ─────────────────────────────────────────────────────
if ($studentId && $subRes) {
    match ($subRes) {
        'transport' => students_transport($method, $studentId, $schoolId, $body, $route),
        'discounts' => students_discounts($method, $studentId, $schoolId, $body, $route),
        'old-fees'  => students_old_fees($method, $studentId, $subId, $schoolId, $body, $route),
        default     => json_error("Unknown sub-resource: $subRes", 404),
    };
    exit;
}

// ── LIST ──────────────────────────────────────────────────────────────────────
if ($method === 'GET' && !$studentId) {
    $p      = pagination();
    $where  = ['s.school_id=:sid', 's.is_deleted=0'];
    $params = [':sid' => $schoolId];

    if (!empty($_GET['session_id']))  { $where[] = 's.session_id=:sess';    $params[':sess']  = (int)$_GET['session_id']; }
    if (!empty($_GET['class_id']))    { $where[] = 's.class_id=:cid';       $params[':cid']   = (int)$_GET['class_id']; }
    if (!empty($_GET['section_id']))  { $where[] = 's.section_id=:secid';   $params[':secid'] = (int)$_GET['section_id']; }
    if (!empty($_GET['status']))      { $where[] = 's.status=:status';      $params[':status']= $_GET['status']; }
    if (!empty($_GET['gender']))      { $where[] = 's.gender=:gender';      $params[':gender']= $_GET['gender']; }
    if (!empty($_GET['category']))    { $where[] = 's.category=:cat';       $params[':cat']   = $_GET['category']; }
    if (!empty($_GET['route_id']))    { $where[] = 'st.route_id=:route';    $params[':route'] = (int)$_GET['route_id']; }
    if (!empty($_GET['search'])) {
        $q = '%' . $_GET['search'] . '%';
        $where[] = '(s.full_name LIKE :q OR s.admission_no LIKE :q OR s.father_name LIKE :q OR s.mother_name LIKE :q OR s.primary_mobile LIKE :q OR s.village LIKE :q)';
        $params[':q'] = $q;
    }

    $wc = implode(' AND ', $where);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM students s LEFT JOIN student_transport st ON st.student_id=s.id AND st.is_deleted=0 WHERE $wc");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $params[':lim'] = $p['limit'];
    $params[':off'] = $p['offset'];
    $listStmt = $db->prepare(
        "SELECT s.*, c.name AS class_name, sec.name AS section_name,
                r.name AS route_name, pp.name AS pickup_point_name, pp.monthly_fare
         FROM students s
         LEFT JOIN classes c   ON c.id=s.class_id
         LEFT JOIN sections sec ON sec.id=s.section_id
         LEFT JOIN student_transport st ON st.student_id=s.id AND st.is_deleted=0
         LEFT JOIN routes r   ON r.id=st.route_id
         LEFT JOIN pickup_points pp ON pp.id=st.pickup_point_id
         WHERE $wc ORDER BY s.admission_no LIMIT :lim OFFSET :off"
    );
    $listStmt->execute($params);

    json_success([
        'students' => $listStmt->fetchAll(),
        'total'    => $total,
        'limit'    => $p['limit'],
        'offset'   => $p['offset'],
    ]);
}

// ── GET one ───────────────────────────────────────────────────────────────────
if ($method === 'GET' && $studentId) {
    $stmt = $db->prepare(
        'SELECT s.*, c.name AS class_name, sec.name AS section_name
         FROM students s
         LEFT JOIN classes c   ON c.id=s.class_id
         LEFT JOIN sections sec ON sec.id=s.section_id
         WHERE s.id=:id AND s.school_id=:sid AND s.is_deleted=0 LIMIT 1'
    );
    $stmt->execute([':id' => $studentId, ':sid' => $schoolId]);
    $student = $stmt->fetch();
    if (!$student) json_error('Student not found', 404);

    // Attach transport
    $tStmt = $db->prepare('SELECT st.*, r.name AS route_name, r.bus_no, pp.name AS pickup_point_name, pp.monthly_fare FROM student_transport st LEFT JOIN routes r ON r.id=st.route_id LEFT JOIN pickup_points pp ON pp.id=st.pickup_point_id WHERE st.student_id=:id AND st.is_deleted=0 LIMIT 1');
    $tStmt->execute([':id' => $studentId]);
    $student['transport'] = $tStmt->fetch() ?: null;

    // Attach transport months
    $mStmt = $db->prepare('SELECT month_name, is_applicable FROM student_transport_months WHERE student_id=:id');
    $mStmt->execute([':id' => $studentId]);
    $student['transport_months'] = $mStmt->fetchAll();

    // Attach discounts
    $dStmt = $db->prepare('SELECT * FROM student_discounts WHERE student_id=:id AND is_deleted=0');
    $dStmt->execute([':id' => $studentId]);
    $student['discounts'] = $dStmt->fetchAll();

    // Old fees
    $oStmt = $db->prepare('SELECT * FROM old_fee_entries WHERE student_id=:id AND is_deleted=0 ORDER BY fee_year, month_num');
    $oStmt->execute([':id' => $studentId]);
    $student['old_fees'] = $oStmt->fetchAll();

    json_success($student);
}

// ── CREATE ────────────────────────────────────────────────────────────────────
if ($method === 'POST' && !$studentId) {
    $name    = trim($body['full_name']    ?? $body['name'] ?? '');
    $admNo   = trim($body['admission_no'] ?? '');
    $sessId  = (int)($body['session_id']  ?? 0);
    $classId = (int)($body['class_id']    ?? 0);

    if (!$name)    json_error('full_name is required', 400);
    if (!$admNo)   json_error('admission_no is required', 400);

    // Duplicate check
    $dup = $db->prepare('SELECT id FROM students WHERE admission_no=:adm AND school_id=:sid AND is_deleted=0 LIMIT 1');
    $dup->execute([':adm' => $admNo, ':sid' => $schoolId]);
    if ($dup->fetch()) json_error('Admission number already exists', 409);

    $stmt = $db->prepare(
        'INSERT INTO students (school_id, session_id, admission_no, full_name, dob, gender, category, religion,
         father_name, mother_name, guardian_name, primary_mobile, secondary_mobile, email,
         address, village, district, state, pincode, aadhaar_no, sr_no, pen_no, apaar_no,
         previous_school, admission_date, class_id, section_id, roll_no, status, photo_url,
         blood_group, caste, created_by, created_at, updated_at)
         VALUES
         (:sid, :sess, :adm, :name, :dob, :gender, :cat, :rel,
          :father, :mother, :guardian, :mob1, :mob2, :email,
          :addr, :village, :dist, :state, :pin, :aadhaar, :sr, :pen, :apaar,
          :prev_school, :adm_date, :cid, :secid, :roll, :status, :photo,
          :blood, :caste, :by, NOW(), NOW())'
    );
    $stmt->execute([
        ':sid'        => $schoolId,            ':sess'       => $sessId ?: null,
        ':adm'        => $admNo,               ':name'       => $name,
        ':dob'        => date_or_null($body['dob'] ?? ''),
        ':gender'     => $body['gender']       ?? null,
        ':cat'        => $body['category']     ?? null,
        ':rel'        => $body['religion']     ?? null,
        ':father'     => $body['father_name']  ?? null,
        ':mother'     => $body['mother_name']  ?? null,
        ':guardian'   => $body['guardian_name']?? null,
        ':mob1'       => $body['primary_mobile']   ?? null,
        ':mob2'       => $body['secondary_mobile'] ?? null,
        ':email'      => $body['email']        ?? null,
        ':addr'       => $body['address']      ?? null,
        ':village'    => $body['village']      ?? null,
        ':dist'       => $body['district']     ?? null,
        ':state'      => $body['state']        ?? null,
        ':pin'        => $body['pincode']      ?? null,
        ':aadhaar'    => $body['aadhaar_no']   ?? null,
        ':sr'         => $body['sr_no']        ?? null,
        ':pen'        => $body['pen_no']       ?? null,
        ':apaar'      => $body['apaar_no']     ?? null,
        ':prev_school'=> $body['previous_school'] ?? null,
        ':adm_date'   => date_or_null($body['admission_date'] ?? ''),
        ':cid'        => $classId ?: null,
        ':secid'      => isset($body['section_id']) ? (int)$body['section_id'] : null,
        ':roll'       => $body['roll_no']      ?? null,
        ':status'     => $body['status']       ?? 'Active',
        ':photo'      => $body['photo_url']    ?? null,
        ':blood'      => $body['blood_group']  ?? null,
        ':caste'      => $body['caste']        ?? null,
        ':by'         => $route['userId'],
    ]);

    $newId = (int)$db->lastInsertId();

    // Auto-create student user credentials (username=admNo, password=DOB ddmmyyyy)
    auto_create_student_user($db, $schoolId, $newId, $admNo, $name, $body['dob'] ?? '');

    // Auto-select transport months (Apr-Mar, June unchecked = month index 2)
    $months = ['April','May','June','July','August','September','October','November','December','January','February','March'];
    $mIns = $db->prepare('INSERT INTO student_transport_months (student_id, month_name, is_applicable) VALUES (:id,:mo,:app)');
    foreach ($months as $mo) {
        $mIns->execute([':id' => $newId, ':mo' => $mo, ':app' => ($mo === 'June') ? 0 : 1]);
    }

    $ret = $db->prepare('SELECT * FROM students WHERE id=?');
    $ret->execute([$newId]);
    json_success($ret->fetch(), 'Student created', 201);
}

// ── UPDATE ────────────────────────────────────────────────────────────────────
if ($method === 'PUT' && $studentId) {
    $fields = ['full_name','dob','gender','category','religion','father_name','mother_name','guardian_name',
               'primary_mobile','secondary_mobile','email','address','village','district','state','pincode',
               'aadhaar_no','sr_no','pen_no','apaar_no','previous_school','admission_date','class_id',
               'section_id','roll_no','status','photo_url','blood_group','caste'];
    $sets = []; $params = [];
    foreach ($fields as $f) {
        if (array_key_exists($f, $body)) {
            $sets[] = "$f=:$f";
            $params[":$f"] = in_array($f, ['dob','admission_date']) ? date_or_null($body[$f]) : $body[$f];
        }
    }
    if (empty($sets)) json_error('No fields to update', 400);
    $params[':id']  = $studentId;
    $params[':sid'] = $schoolId;
    $db->prepare('UPDATE students SET ' . implode(',', $sets) . ', updated_at=NOW() WHERE id=:id AND school_id=:sid AND is_deleted=0')
       ->execute($params);
    json_success(null, 'Student updated');
}

// ── DELETE ────────────────────────────────────────────────────────────────────
if ($method === 'DELETE' && $studentId) {
    if (!in_array($route['role'], ['super_admin','admin'])) json_error('Forbidden', 403);
    $db->prepare('UPDATE students SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid')
       ->execute([':id' => $studentId, ':sid' => $schoolId]);
    json_success(null, 'Student deleted');
}

json_error('Not found', 404);

// ── Helpers ───────────────────────────────────────────────────────────────────

function auto_create_student_user(PDO $db, int $schoolId, int $studentId, string $admNo, string $name, string $dob): void {
    $chk = $db->prepare('SELECT id FROM users WHERE username=:u AND school_id=:s AND is_deleted=0 LIMIT 1');
    $chk->execute([':u' => $admNo, ':s' => $schoolId]);
    if ($chk->fetch()) return;

    $parts   = explode('-', $dob); // YYYY-MM-DD
    $passRaw = count($parts) === 3 ? $parts[2] . $parts[1] . $parts[0] : $admNo;
    $hash    = password_hash($passRaw, PASSWORD_BCRYPT, ['cost' => 12]);

    $db->prepare('INSERT INTO users (school_id,username,password_hash,full_name,role,reference_id,is_active,created_at,updated_at) VALUES (:sid,:u,:h,:n,"student",:ref,1,NOW(),NOW())')
       ->execute([':sid' => $schoolId, ':u' => $admNo, ':h' => $hash, ':n' => $name, ':ref' => $studentId]);
}

function students_transport(string $method, int $studentId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT st.*, r.name AS route_name, r.bus_no, pp.name AS pickup_point_name, pp.monthly_fare FROM student_transport st LEFT JOIN routes r ON r.id=st.route_id LEFT JOIN pickup_points pp ON pp.id=st.pickup_point_id WHERE st.student_id=:id AND st.is_deleted=0 LIMIT 1');
        $stmt->execute([':id' => $studentId]);
        $transport = $stmt->fetch();

        $months = $db->prepare('SELECT month_name, is_applicable FROM student_transport_months WHERE student_id=:id');
        $months->execute([':id' => $studentId]);

        json_success(['transport' => $transport ?: null, 'months' => $months->fetchAll()]);
    }
    if ($method === 'PUT') {
        // Upsert transport assignment
        $db->prepare(
            'INSERT INTO student_transport (student_id, school_id, route_id, pickup_point_id, bus_no, is_deleted, created_at, updated_at)
             VALUES (:stu, :sch, :route, :pp, :bus, 0, NOW(), NOW())
             ON DUPLICATE KEY UPDATE route_id=:route, pickup_point_id=:pp, bus_no=:bus, is_deleted=0, updated_at=NOW()'
        )->execute([
            ':stu'   => $studentId, ':sch' => $schoolId,
            ':route' => $body['route_id']         ?? null,
            ':pp'    => $body['pickup_point_id']  ?? null,
            ':bus'   => $body['bus_no']           ?? null,
        ]);

        // Update months if provided
        if (!empty($body['months']) && is_array($body['months'])) {
            $db->prepare('DELETE FROM student_transport_months WHERE student_id=:id')->execute([':id' => $studentId]);
            $ins = $db->prepare('INSERT INTO student_transport_months (student_id, month_name, is_applicable) VALUES (:id,:mo,:app)');
            foreach ($body['months'] as $m) {
                $ins->execute([':id' => $studentId, ':mo' => $m['month_name'], ':app' => (int)($m['is_applicable'] ?? 1)]);
            }
        }
        json_success(null, 'Transport updated');
    }
    json_error('Method not allowed', 405);
}

function students_discounts(string $method, int $studentId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT * FROM student_discounts WHERE student_id=:id AND is_deleted=0');
        $stmt->execute([':id' => $studentId]);
        json_success($stmt->fetchAll());
    }
    if ($method === 'PUT') {
        $db->prepare('UPDATE student_discounts SET is_deleted=1 WHERE student_id=:id')->execute([':id' => $studentId]);
        if (!empty($body['discounts']) && is_array($body['discounts'])) {
            $ins = $db->prepare('INSERT INTO student_discounts (student_id, school_id, monthly_amount, applies_to, is_deleted, created_at) VALUES (:stu,:sch,:amt,:applies,0,NOW())');
            foreach ($body['discounts'] as $d) {
                $ins->execute([':stu' => $studentId, ':sch' => $schoolId, ':amt' => (float)($d['monthly_amount'] ?? 0), ':applies' => json_encode($d['applies_to'] ?? [])]);
            }
        }
        json_success(null, 'Discounts updated');
    }
    json_error('Method not allowed', 405);
}

function students_old_fees(string $method, int $studentId, ?int $entryId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT * FROM old_fee_entries WHERE student_id=:id AND is_deleted=0 ORDER BY fee_year, month_num');
        $stmt->execute([':id' => $studentId]);
        json_success($stmt->fetchAll());
    }
    if ($method === 'POST') {
        $db->prepare('INSERT INTO old_fee_entries (student_id, school_id, fee_year, month_num, amount, description, is_deleted, created_at) VALUES (:stu,:sch,:yr,:mo,:amt,:desc,0,NOW())')
           ->execute([':stu' => $studentId, ':sch' => $schoolId, ':yr' => $body['fee_year'] ?? date('Y'), ':mo' => $body['month_num'] ?? 1, ':amt' => (float)($body['amount'] ?? 0), ':desc' => $body['description'] ?? null]);
        json_success(['id' => (int)$db->lastInsertId()], 'Old fee entry added', 201);
    }
    if ($method === 'PUT' && $entryId) {
        $db->prepare('UPDATE old_fee_entries SET fee_year=:yr, month_num=:mo, amount=:amt, description=:desc, updated_at=NOW() WHERE id=:id AND student_id=:stu AND is_deleted=0')
           ->execute([':yr' => $body['fee_year'] ?? null, ':mo' => $body['month_num'] ?? null, ':amt' => (float)($body['amount'] ?? 0), ':desc' => $body['description'] ?? null, ':id' => $entryId, ':stu' => $studentId]);
        json_success(null, 'Old fee entry updated');
    }
    if ($method === 'DELETE' && $entryId) {
        $db->prepare('UPDATE old_fee_entries SET is_deleted=1 WHERE id=:id AND student_id=:stu')->execute([':id' => $entryId, ':stu' => $studentId]);
        json_success(null, 'Old fee entry deleted');
    }
    json_error('Method not allowed', 405);
}
