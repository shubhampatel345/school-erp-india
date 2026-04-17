<?php
error_reporting(0);
ini_set('display_errors', '0');

/**
 * SHUBH SCHOOL ERP — Fees API
 * /fees/headings[/:id]     GET list / POST create / PUT update / DELETE soft-delete
 * /fees/plan               GET list / POST upsert
 * /fees/collect            POST record payment
 * /fees/receipt/:id        GET / PUT (admin) / DELETE (super_admin)
 * /fees/register           GET ledger
 * /fees/due                GET dues wizard
 * /fees/accounts[/:id]     CRUD fee accounts
 * /fees/balance/:student_id GET current balance
 */

require_once __DIR__ . '/config.php';

$route    = $GLOBALS['route'];
$method   = $route['method'];
$body     = $route['body'];
$schoolId = $route['schoolId'];
$segments = $route['segments'];
$action   = $segments[1] ?? ''; // headings | plan | collect | receipt | register | due | accounts | balance
$actionId = $segments[2] ?? null;
$db       = DB::get();

match ($action) {
    'headings' => fees_headings($method, $actionId, $schoolId, $body, $route),
    'plan'     => fees_plan($method, $actionId, $schoolId, $body, $route),
    'collect'  => fees_collect($method, $schoolId, $body, $route),
    'receipt'  => fees_receipt($method, $actionId, $schoolId, $body, $route),
    'register' => fees_register($method, $schoolId),
    'due'      => fees_due($method, $schoolId),
    'accounts' => fees_accounts($method, $actionId, $schoolId, $body, $route),
    'balance'  => fees_balance($method, $actionId, $schoolId),
    default    => json_error("Unknown fees action: $action", 404),
};

// ─────────────────────────────────────────────────────────────────────────────
function fees_headings(string $method, ?string $hId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT * FROM fee_heads WHERE school_id=:sid AND is_deleted=0 ORDER BY sort_order, name');
        $stmt->execute([':sid' => $schoolId]);
        json_success($stmt->fetchAll());
    }
    if ($method === 'POST') {
        if (empty($body['name'])) json_error('name is required', 400);
        $db->prepare('INSERT INTO fee_heads (school_id, session_id, name, applicable_months, sort_order, is_deleted, created_by, created_at, updated_at) VALUES (:sid,:sess,:name,:months,:sort,0,:by,NOW(),NOW())')
           ->execute([':sid' => $schoolId, ':sess' => $body['session_id'] ?? null, ':name' => $body['name'], ':months' => json_encode($body['applicable_months'] ?? []), ':sort' => (int)($body['sort_order'] ?? 0), ':by' => $route['userId']]);
        json_success(['id' => (int)$db->lastInsertId()], 'Fee heading created', 201);
    }
    if ($method === 'PUT' && $hId) {
        $db->prepare('UPDATE fee_heads SET name=:name, applicable_months=:months, sort_order=:sort, updated_at=NOW() WHERE id=:id AND school_id=:sid AND is_deleted=0')
           ->execute([':name' => $body['name'] ?? null, ':months' => json_encode($body['applicable_months'] ?? []), ':sort' => (int)($body['sort_order'] ?? 0), ':id' => (int)$hId, ':sid' => $schoolId]);
        json_success(null, 'Fee heading updated');
    }
    if ($method === 'DELETE' && $hId) {
        if ($route['role'] !== 'super_admin') json_error('Forbidden', 403);
        $db->prepare('UPDATE fee_heads SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid')->execute([':id' => (int)$hId, ':sid' => $schoolId]);
        json_success(null, 'Fee heading deleted');
    }
    json_error('Method not allowed', 405);
}

function fees_plan(string $method, ?string $planId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $where = ['fp.school_id=:sid', 'fp.is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['session_id'])) { $where[] = 'fp.session_id=:sess'; $params[':sess'] = (int)$_GET['session_id']; }
        if (!empty($_GET['class_id']))   { $where[] = 'fp.class_id=:cid';   $params[':cid']  = (int)$_GET['class_id']; }
        $wc = implode(' AND ', $where);
        $stmt = $db->prepare("SELECT fp.*, fh.name AS head_name, c.name AS class_name, sec.name AS section_name FROM fees_plan fp LEFT JOIN fee_heads fh ON fh.id=fp.fee_head_id LEFT JOIN classes c ON c.id=fp.class_id LEFT JOIN sections sec ON sec.id=fp.section_id WHERE $wc ORDER BY fp.class_id, fh.sort_order");
        $stmt->execute($params);
        json_success($stmt->fetchAll());
    }
    if (in_array($method, ['POST','PUT'])) {
        if ($route['role'] !== 'super_admin') json_error('Only Super Admin can edit fee plans', 403);
        $db->prepare('INSERT INTO fees_plan (school_id, session_id, class_id, section_id, fee_head_id, monthly_amount, is_deleted, created_by, created_at, updated_at) VALUES (:sid,:sess,:cid,:secid,:fhid,:amt,0,:by,NOW(),NOW()) ON DUPLICATE KEY UPDATE monthly_amount=:amt, is_deleted=0, updated_at=NOW()')
           ->execute([':sid' => $schoolId, ':sess' => $body['session_id'] ?? null, ':cid' => (int)($body['class_id'] ?? 0), ':secid' => isset($body['section_id']) ? (int)$body['section_id'] : null, ':fhid' => (int)($body['fee_head_id'] ?? 0), ':amt' => (float)($body['monthly_amount'] ?? 0), ':by' => $route['userId']]);
        json_success(null, 'Fee plan saved');
    }
    json_error('Method not allowed', 405);
}

function fees_collect(string $method, int $schoolId, array $body, array $route): void {
    if ($method !== 'POST') json_error('Method not allowed', 405);

    $db        = DB::get();
    $studentId = (int)($body['student_id'] ?? 0);
    $months    = $body['months']           ?? [];
    $items     = $body['items']            ?? [];     // [{fee_head_id, amount}]
    $paidAmt   = (float)($body['paid_amount']   ?? 0);
    $otherAmt  = (float)($body['other_fee_amount'] ?? 0);
    $otherDesc = $body['other_fee_desc']   ?? null;
    $payMode   = $body['payment_mode']     ?? 'Cash';
    $payDate   = $body['payment_date']     ?? date('Y-m-d');
    $sessId    = (int)($body['session_id'] ?? 0);
    $accountId = isset($body['account_id']) ? (int)$body['account_id'] : null;

    if (!$studentId) json_error('student_id is required', 400);
    if (empty($months)) json_error('months is required', 400);
    $netFee = array_sum(array_column($items, 'amount')) + $otherAmt;
    if ($netFee <= 0 && $paidAmt <= 0) json_error('Net fee amount cannot be zero', 400);

    // Get current running balance (positive = owed, negative = credit)
    $balStmt = $db->prepare('SELECT running_balance FROM fee_balance WHERE student_id=:id AND school_id=:sid AND session_id=:sess LIMIT 1');
    $balStmt->execute([':id' => $studentId, ':sid' => $schoolId, ':sess' => $sessId]);
    $balRow     = $balStmt->fetch();
    $oldBalance = $balRow ? (float)$balRow['running_balance'] : 0.0;

    // Total due = fees + carried-over balance (positive=owed); negative balance is credit
    $totalDue   = $netFee + ($oldBalance > 0 ? $oldBalance : 0);
    // Amount credit/owed from this transaction
    $newBalance = $oldBalance + $netFee - $paidAmt; // positive=still owed, negative=credit

    // Generate receipt number
    $cntStmt = $db->prepare('SELECT COUNT(*) FROM fee_receipts WHERE school_id=:sid AND session_id=:sess');
    $cntStmt->execute([':sid' => $schoolId, ':sess' => $sessId]);
    $rcptNo = 'RCP-' . date('Ym') . '-' . str_pad((string)((int)$cntStmt->fetchColumn() + 1), 5, '0', STR_PAD_LEFT);

    $db->beginTransaction();
    try {
        // Insert receipt header
        $db->prepare(
            'INSERT INTO fee_receipts (school_id, session_id, student_id, receipt_no, payment_date, months_paid,
             net_fee, paid_amount, old_balance, balance_after, payment_mode, account_id, other_fee_amount,
             other_fee_desc, received_by, received_by_name, received_by_role, is_deleted, created_at, updated_at)
             VALUES (:sch,:sess,:stu,:rcpt,:pdate,:months,:net,:paid,:old_bal,:new_bal,:mode,:acc,:other_amt,:other_desc,:by,:by_name,:by_role,0,NOW(),NOW())'
        )->execute([
            ':sch'       => $schoolId, ':sess' => $sessId,  ':stu'   => $studentId,
            ':rcpt'      => $rcptNo,   ':pdate'=> $payDate,
            ':months'    => json_encode($months),
            ':net'       => $netFee,   ':paid' => $paidAmt,
            ':old_bal'   => $oldBalance, ':new_bal' => $newBalance,
            ':mode'      => $payMode,  ':acc'  => $accountId,
            ':other_amt' => $otherAmt, ':other_desc' => $otherDesc,
            ':by'        => $route['userId'],
            ':by_name'   => $route['auth']['name'] ?? '',
            ':by_role'   => $route['role'],
        ]);
        $receiptId = (int)$db->lastInsertId();

        // Insert line items
        $lineIns = $db->prepare('INSERT INTO payment_history (school_id, receipt_id, student_id, fee_head_id, months_paid, amount, created_at) VALUES (:sch,:rcpt,:stu,:fhid,:months,:amt,NOW())');
        foreach ($items as $item) {
            $lineIns->execute([':sch' => $schoolId, ':rcpt' => $receiptId, ':stu' => $studentId, ':fhid' => $item['fee_head_id'] ?? null, ':months' => json_encode($months), ':amt' => (float)($item['amount'] ?? 0)]);
        }

        // Update running balance
        $db->prepare('INSERT INTO fee_balance (school_id, session_id, student_id, running_balance, updated_at) VALUES (:sch,:sess,:stu,:bal,NOW()) ON DUPLICATE KEY UPDATE running_balance=:bal, updated_at=NOW()')
           ->execute([':sch' => $schoolId, ':sess' => $sessId, ':stu' => $studentId, ':bal' => $newBalance]);

        $db->commit();
        json_success(['receipt_id' => $receiptId, 'receipt_no' => $rcptNo, 'balance' => $newBalance, 'net_fee' => $netFee], 'Payment recorded', 201);
    } catch (Throwable $e) {
        $db->rollBack();
        json_error('Failed to save payment: ' . $e->getMessage(), 500);
    }
}

function fees_receipt(string $method, ?string $rcptId, int $schoolId, array $body, array $route): void {
    if (!$rcptId) json_error('Receipt ID required', 400);
    $db  = DB::get();
    $rid = (int)$rcptId;

    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT fr.*, s.full_name, s.admission_no, s.father_name, s.class_id, s.section_id FROM fee_receipts fr LEFT JOIN students s ON s.id=fr.student_id WHERE fr.id=:id AND fr.school_id=:sid AND fr.is_deleted=0 LIMIT 1');
        $stmt->execute([':id' => $rid, ':sid' => $schoolId]);
        $rcpt = $stmt->fetch();
        if (!$rcpt) json_error('Receipt not found', 404);
        $lines = $db->prepare('SELECT ph.*, fh.name AS head_name FROM payment_history ph LEFT JOIN fee_heads fh ON fh.id=ph.fee_head_id WHERE ph.receipt_id=:rid');
        $lines->execute([':rid' => $rid]);
        $rcpt['items'] = $lines->fetchAll();
        json_success($rcpt);
    }
    if ($method === 'PUT') {
        if (!in_array($route['role'], ['super_admin','admin'])) json_error('Forbidden', 403);
        $fields = ['payment_date','months_paid','net_fee','paid_amount','payment_mode','other_fee_amount','other_fee_desc'];
        $sets = []; $params = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $body)) { $sets[] = "$f=:$f"; $params[":$f"] = $f === 'months_paid' ? json_encode($body[$f]) : $body[$f]; }
        }
        if (empty($sets)) json_error('Nothing to update', 400);
        $params[':id'] = $rid; $params[':sid'] = $schoolId;
        $db->prepare('UPDATE fee_receipts SET ' . implode(',', $sets) . ', updated_at=NOW() WHERE id=:id AND school_id=:sid AND is_deleted=0')->execute($params);
        json_success(null, 'Receipt updated');
    }
    if ($method === 'DELETE') {
        if ($route['role'] !== 'super_admin') json_error('Only Super Admin can delete receipts', 403);
        $r = $db->prepare('SELECT student_id, session_id FROM fee_receipts WHERE id=:id AND school_id=:sid AND is_deleted=0 LIMIT 1');
        $r->execute([':id' => $rid, ':sid' => $schoolId]);
        $rcpt = $r->fetch();
        if (!$rcpt) json_error('Receipt not found', 404);

        $db->beginTransaction();
        $db->prepare('UPDATE fee_receipts SET is_deleted=1, updated_at=NOW() WHERE id=:id')->execute([':id' => $rid]);
        $db->prepare('DELETE FROM payment_history WHERE receipt_id=:rid')->execute([':rid' => $rid]);
        // Recalculate balance from all remaining receipts
        recalc_balance($db, (int)$rcpt['student_id'], $schoolId, (int)$rcpt['session_id']);
        $db->commit();
        json_success(null, 'Receipt deleted and balance recalculated');
    }
    json_error('Method not allowed', 405);
}

function recalc_balance(PDO $db, int $studentId, int $schoolId, int $sessionId): void {
    $stmt = $db->prepare('SELECT COALESCE(SUM(net_fee),0) AS due, COALESCE(SUM(paid_amount),0) AS paid FROM fee_receipts WHERE student_id=:stu AND school_id=:sch AND session_id=:sess AND is_deleted=0');
    $stmt->execute([':stu' => $studentId, ':sch' => $schoolId, ':sess' => $sessionId]);
    $row = $stmt->fetch();
    $newBal = (float)$row['due'] - (float)$row['paid'];
    $db->prepare('INSERT INTO fee_balance (school_id,session_id,student_id,running_balance,updated_at) VALUES (:sch,:sess,:stu,:bal,NOW()) ON DUPLICATE KEY UPDATE running_balance=:bal, updated_at=NOW()')
       ->execute([':sch' => $schoolId, ':sess' => $sessionId, ':stu' => $studentId, ':bal' => $newBal]);
}

function fees_register(string $method, int $schoolId): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    $p      = pagination();
    $db     = DB::get();
    $where  = ['fr.school_id=:sid', 'fr.is_deleted=0'];
    $params = [':sid' => $schoolId];
    if (!empty($_GET['session_id'])) { $where[] = 'fr.session_id=:sess';      $params[':sess'] = (int)$_GET['session_id']; }
    if (!empty($_GET['student_id'])) { $where[] = 'fr.student_id=:stuid';     $params[':stuid']= (int)$_GET['student_id']; }
    if (!empty($_GET['date_from']))  { $where[] = 'fr.payment_date>=:dfrom';  $params[':dfrom']= $_GET['date_from']; }
    if (!empty($_GET['date_to']))    { $where[] = 'fr.payment_date<=:dto';    $params[':dto']  = $_GET['date_to']; }
    if (!empty($_GET['class_id']))   { $where[] = 's.class_id=:cid';          $params[':cid']  = (int)$_GET['class_id']; }
    $wc = implode(' AND ', $where);

    $cntStmt = $db->prepare("SELECT COUNT(*) FROM fee_receipts fr LEFT JOIN students s ON s.id=fr.student_id WHERE $wc");
    $cntStmt->execute($params);
    $total = (int)$cntStmt->fetchColumn();

    $params[':lim'] = $p['limit']; $params[':off'] = $p['offset'];
    $stmt = $db->prepare(
        "SELECT fr.*, s.full_name, s.admission_no, s.father_name,
                c.name AS class_name, sec.name AS section_name
         FROM fee_receipts fr
         LEFT JOIN students s  ON s.id=fr.student_id
         LEFT JOIN classes c   ON c.id=s.class_id
         LEFT JOIN sections sec ON sec.id=s.section_id
         WHERE $wc ORDER BY fr.payment_date DESC, fr.id DESC LIMIT :lim OFFSET :off"
    );
    $stmt->execute($params);
    json_success(['receipts' => $stmt->fetchAll(), 'total' => $total, 'limit' => $p['limit'], 'offset' => $p['offset']]);
}

function fees_due(string $method, int $schoolId): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);

    $db        = DB::get();
    $sessId    = (int)($_GET['session_id'] ?? 0);
    $months    = !empty($_GET['months'])    ? explode(',', $_GET['months'])               : [];
    $classIds  = !empty($_GET['class_ids']) ? array_map('intval', explode(',', $_GET['class_ids'])) : [];

    $where  = ['s.school_id=:sid', 's.is_deleted=0', 's.status="Active"'];
    $params = [':sid' => $schoolId];
    if ($sessId)       { $where[] = 's.session_id=:sess'; $params[':sess'] = $sessId; }
    if (!empty($classIds)) {
        $ph     = implode(',', array_fill(0, count($classIds), '?'));
        $where[] = "s.class_id IN ($ph)";
        $params  = array_merge(array_values($params), $classIds);
    }

    $stmt = $db->prepare(
        'SELECT s.id, s.full_name, s.admission_no, s.primary_mobile, s.father_name,
                c.name AS class_name, sec.name AS section_name,
                COALESCE(fb.running_balance,0) AS balance
         FROM students s
         LEFT JOIN classes c   ON c.id=s.class_id
         LEFT JOIN sections sec ON sec.id=s.section_id
         LEFT JOIN fee_balance fb ON fb.student_id=s.id AND fb.session_id=:sess2
         WHERE ' . implode(' AND ', $where)
    );
    $params[] = $sessId;
    $stmt->execute($params);
    $students = $stmt->fetchAll();

    $dues = array_filter($students, fn($s) => (float)$s['balance'] > 0);
    json_success(['students' => array_values($dues), 'total' => count($dues)]);
}

function fees_accounts(string $method, ?string $accId, int $schoolId, array $body, array $route): void {
    $db = DB::get();
    if ($method === 'GET') {
        $sessId = (int)($_GET['session_id'] ?? 0);
        $stmt   = $db->prepare('SELECT a.*, COALESCE(SUM(fr.paid_amount),0) AS total_received FROM accounts a LEFT JOIN fee_receipts fr ON fr.account_id=a.id AND fr.is_deleted=0 AND (:sess=0 OR fr.session_id=:sess) WHERE a.school_id=:sid AND a.is_deleted=0 GROUP BY a.id ORDER BY a.name');
        $stmt->execute([':sid' => $schoolId, ':sess' => $sessId]);
        json_success($stmt->fetchAll());
    }
    if ($method === 'POST') {
        if (empty($body['name'])) json_error('name required', 400);
        $db->prepare('INSERT INTO accounts (school_id, name, description, is_deleted, created_at) VALUES (:sid,:name,:desc,0,NOW())')->execute([':sid' => $schoolId, ':name' => $body['name'], ':desc' => $body['description'] ?? null]);
        json_success(['id' => (int)$db->lastInsertId()], 'Account created', 201);
    }
    if ($method === 'PUT' && $accId) {
        $db->prepare('UPDATE accounts SET name=:name, description=:desc, updated_at=NOW() WHERE id=:id AND school_id=:sid')->execute([':name' => $body['name'] ?? null, ':desc' => $body['description'] ?? null, ':id' => (int)$accId, ':sid' => $schoolId]);
        json_success(null, 'Account updated');
    }
    if ($method === 'DELETE' && $accId) {
        if ($route['role'] !== 'super_admin') json_error('Forbidden', 403);
        $db->prepare('UPDATE accounts SET is_deleted=1 WHERE id=:id AND school_id=:sid')->execute([':id' => (int)$accId, ':sid' => $schoolId]);
        json_success(null, 'Account deleted');
    }
    json_error('Method not allowed', 405);
}

function fees_balance(string $method, ?string $studentId, int $schoolId): void {
    if ($method !== 'GET' || !$studentId) json_error('GET /fees/balance/:student_id required', 400);
    $db     = DB::get();
    $sessId = (int)($_GET['session_id'] ?? 0);
    $stmt   = $db->prepare('SELECT running_balance FROM fee_balance WHERE student_id=:id AND school_id=:sid AND (:sess=0 OR session_id=:sess) LIMIT 1');
    $stmt->execute([':id' => (int)$studentId, ':sid' => $schoolId, ':sess' => $sessId]);
    $row    = $stmt->fetch();
    json_success(['balance' => $row ? (float)$row['running_balance'] : 0.0]);
}
