<?php
error_reporting(0);
ini_set('display_errors', '0');

/**
 * SHUBH SCHOOL ERP — Inventory API
 * /inventory/items[/:id]        CRUD items (with stock tracking)
 * /inventory/purchases[/:id]    CRUD purchase records (adds to stock)
 * /inventory/sales[/:id]        CRUD sale records (deducts from stock)
 * /inventory/report             GET stock report
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
    'items'     => inv_items($method, $actionId, $schoolId, $body, $route),
    'purchases' => inv_purchases($method, $actionId, $schoolId, $body, $route),
    'sales'     => inv_sales($method, $actionId, $schoolId, $body, $route),
    'report'    => inv_report($method, $schoolId),
    default     => json_error("Unknown inventory action: $action", 404),
};

// ── Items ─────────────────────────────────────────────────────────────────────
function inv_items(string $method, ?string $itemId, int $schoolId, array $body, array $route): void {
    $db = DB::get();

    if ($method === 'GET' && !$itemId) {
        $p      = pagination();
        $where  = ['school_id=:sid', 'is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['session_id'])) { $where[] = 'session_id=:sess'; $params[':sess'] = (int)$_GET['session_id']; }
        if (!empty($_GET['category']))   { $where[] = 'category=:cat';    $params[':cat']  = $_GET['category']; }
        if (!empty($_GET['search']))     { $where[] = 'name LIKE :q';     $params[':q']    = '%' . $_GET['search'] . '%'; }
        $wc = implode(' AND ', $where);

        $cStmt = $db->prepare("SELECT COUNT(*) FROM inventory_items WHERE $wc");
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $params[':lim'] = $p['limit'];
        $params[':off'] = $p['offset'];
        $stmt = $db->prepare("SELECT * FROM inventory_items WHERE $wc ORDER BY name LIMIT :lim OFFSET :off");
        $stmt->execute($params);
        json_success(['items' => $stmt->fetchAll(), 'total' => $total]);
    }

    if ($method === 'GET' && $itemId) {
        $stmt = $db->prepare('SELECT * FROM inventory_items WHERE id=:id AND school_id=:sid AND is_deleted=0 LIMIT 1');
        $stmt->execute([':id' => (int)$itemId, ':sid' => $schoolId]);
        $item = $stmt->fetch();
        if (!$item) json_error('Item not found', 404);
        json_success($item);
    }

    if ($method === 'POST') {
        if (empty($body['name'])) json_error('name is required', 400);
        $db->prepare(
            'INSERT INTO inventory_items (school_id, session_id, name, category, unit, sell_price, current_stock, low_stock_alert, is_deleted, created_by, created_at, updated_at)
             VALUES (:sid, :sess, :name, :cat, :unit, :price, :stock, :low, 0, :by, NOW(), NOW())'
        )->execute([
            ':sid'   => $schoolId,
            ':sess'  => $body['session_id']     ?? null,
            ':name'  => $body['name'],
            ':cat'   => $body['category']       ?? null,
            ':unit'  => $body['unit']           ?? null,
            ':price' => (float)($body['sell_price']     ?? 0),
            ':stock' => (int)($body['current_stock']    ?? 0),
            ':low'   => (int)($body['low_stock_alert']  ?? 5),
            ':by'    => $route['userId'],
        ]);
        json_success(['id' => (int)$db->lastInsertId()], 'Item created', 201);
    }

    if ($method === 'PUT' && $itemId) {
        $fields = ['name', 'category', 'unit', 'sell_price', 'current_stock', 'low_stock_alert'];
        $sets = []; $params = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $body)) {
                $sets[] = "$f=:$f";
                $params[":$f"] = in_array($f, ['sell_price']) ? (float)$body[$f]
                               : (in_array($f, ['current_stock','low_stock_alert']) ? (int)$body[$f] : $body[$f]);
            }
        }
        if (empty($sets)) json_error('No fields to update', 400);
        $params[':id']  = (int)$itemId;
        $params[':sid'] = $schoolId;
        $db->prepare('UPDATE inventory_items SET ' . implode(',', $sets) . ', updated_at=NOW() WHERE id=:id AND school_id=:sid AND is_deleted=0')
           ->execute($params);
        json_success(null, 'Item updated');
    }

    if ($method === 'DELETE' && $itemId) {
        if (!in_array($route['role'], ['super_admin', 'admin'])) json_error('Forbidden', 403);
        $db->prepare('UPDATE inventory_items SET is_deleted=1, updated_at=NOW() WHERE id=:id AND school_id=:sid')
           ->execute([':id' => (int)$itemId, ':sid' => $schoolId]);
        json_success(null, 'Item deleted');
    }

    json_error('Method not allowed', 405);
}

// ── Purchases ─────────────────────────────────────────────────────────────────
function inv_purchases(string $method, ?string $purchId, int $schoolId, array $body, array $route): void {
    $db = DB::get();

    if ($method === 'GET') {
        $p      = pagination();
        $where  = ['p.school_id=:sid', 'p.is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['session_id'])) { $where[] = 'p.session_id=:sess'; $params[':sess']   = (int)$_GET['session_id']; }
        if (!empty($_GET['item_id']))    { $where[] = 'p.item_id=:iid';     $params[':iid']    = (int)$_GET['item_id']; }
        if (!empty($_GET['date_from']))  { $where[] = 'p.purchase_date>=:df'; $params[':df']   = $_GET['date_from']; }
        if (!empty($_GET['date_to']))    { $where[] = 'p.purchase_date<=:dt'; $params[':dt']   = $_GET['date_to']; }
        $wc = implode(' AND ', $where);

        $cStmt = $db->prepare("SELECT COUNT(*) FROM inventory_purchases p WHERE $wc");
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $params[':lim'] = $p['limit'];
        $params[':off'] = $p['offset'];
        $stmt = $db->prepare(
            "SELECT p.*, i.name AS item_name, i.unit FROM inventory_purchases p
             LEFT JOIN inventory_items i ON i.id=p.item_id
             WHERE $wc ORDER BY p.purchase_date DESC, p.id DESC LIMIT :lim OFFSET :off"
        );
        $stmt->execute($params);
        json_success(['purchases' => $stmt->fetchAll(), 'total' => $total]);
    }

    if ($method === 'POST') {
        if (empty($body['item_id']) || empty($body['quantity'])) json_error('item_id and quantity required', 400);
        $itemId  = (int)$body['item_id'];
        $qty     = (int)$body['quantity'];
        if ($qty <= 0) json_error('quantity must be positive', 400);

        $db->beginTransaction();
        try {
            $db->prepare(
                'INSERT INTO inventory_purchases (school_id, session_id, item_id, quantity, purchase_price, vendor, purchase_date, notes, is_deleted, created_by, created_at, updated_at)
                 VALUES (:sid, :sess, :iid, :qty, :price, :vendor, :pdate, :notes, 0, :by, NOW(), NOW())'
            )->execute([
                ':sid'    => $schoolId,
                ':sess'   => $body['session_id']    ?? null,
                ':iid'    => $itemId,
                ':qty'    => $qty,
                ':price'  => (float)($body['purchase_price'] ?? 0),
                ':vendor' => $body['vendor']         ?? null,
                ':pdate'  => $body['purchase_date']  ?? date('Y-m-d'),
                ':notes'  => $body['notes']          ?? null,
                ':by'     => $route['userId'],
            ]);
            $newPurchId = (int)$db->lastInsertId();

            // Increment stock
            $db->prepare('UPDATE inventory_items SET current_stock=current_stock+:qty, updated_at=NOW() WHERE id=:id AND school_id=:sid')
               ->execute([':qty' => $qty, ':id' => $itemId, ':sid' => $schoolId]);

            $db->commit();
            json_success(['id' => $newPurchId], 'Purchase recorded', 201);
        } catch (Throwable $e) {
            $db->rollBack();
            json_error('Failed to save purchase: ' . $e->getMessage(), 500);
        }
    }

    if ($method === 'DELETE' && $purchId) {
        if (!in_array($route['role'], ['super_admin', 'admin'])) json_error('Forbidden', 403);

        // Reverse the stock increase
        $p = $db->prepare('SELECT item_id, quantity FROM inventory_purchases WHERE id=:id AND school_id=:sid AND is_deleted=0 LIMIT 1');
        $p->execute([':id' => (int)$purchId, ':sid' => $schoolId]);
        $purchase = $p->fetch();
        if (!$purchase) json_error('Purchase not found', 404);

        $db->beginTransaction();
        $db->prepare('UPDATE inventory_purchases SET is_deleted=1, updated_at=NOW() WHERE id=:id')->execute([':id' => (int)$purchId]);
        $db->prepare('UPDATE inventory_items SET current_stock=GREATEST(0, current_stock-:qty), updated_at=NOW() WHERE id=:id AND school_id=:sid')
           ->execute([':qty' => (int)$purchase['quantity'], ':id' => (int)$purchase['item_id'], ':sid' => $schoolId]);
        $db->commit();
        json_success(null, 'Purchase deleted and stock reversed');
    }

    json_error('Method not allowed', 405);
}

// ── Sales ─────────────────────────────────────────────────────────────────────
function inv_sales(string $method, ?string $saleId, int $schoolId, array $body, array $route): void {
    $db = DB::get();

    if ($method === 'GET') {
        $p      = pagination();
        $where  = ['s.school_id=:sid', 's.is_deleted=0'];
        $params = [':sid' => $schoolId];
        if (!empty($_GET['session_id'])) { $where[] = 's.session_id=:sess'; $params[':sess']  = (int)$_GET['session_id']; }
        if (!empty($_GET['item_id']))    { $where[] = 's.item_id=:iid';     $params[':iid']   = (int)$_GET['item_id']; }
        if (!empty($_GET['student_id'])) { $where[] = 's.student_id=:stud'; $params[':stud']  = (int)$_GET['student_id']; }
        if (!empty($_GET['date_from']))  { $where[] = 's.sale_date>=:df';   $params[':df']    = $_GET['date_from']; }
        if (!empty($_GET['date_to']))    { $where[] = 's.sale_date<=:dt';   $params[':dt']    = $_GET['date_to']; }
        $wc = implode(' AND ', $where);

        $cStmt = $db->prepare("SELECT COUNT(*) FROM inventory_sales s WHERE $wc");
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $params[':lim'] = $p['limit'];
        $params[':off'] = $p['offset'];
        $stmt = $db->prepare(
            "SELECT s.*, i.name AS item_name, i.unit, st.full_name AS student_name
             FROM inventory_sales s
             LEFT JOIN inventory_items i ON i.id=s.item_id
             LEFT JOIN students st ON st.id=s.student_id
             WHERE $wc ORDER BY s.sale_date DESC, s.id DESC LIMIT :lim OFFSET :off"
        );
        $stmt->execute($params);
        json_success(['sales' => $stmt->fetchAll(), 'total' => $total]);
    }

    if ($method === 'POST') {
        if (empty($body['item_id']) || empty($body['quantity'])) json_error('item_id and quantity required', 400);
        $itemId = (int)$body['item_id'];
        $qty    = (int)$body['quantity'];
        if ($qty <= 0) json_error('quantity must be positive', 400);

        // Check sufficient stock
        $stockStmt = $db->prepare('SELECT current_stock FROM inventory_items WHERE id=:id AND school_id=:sid AND is_deleted=0 LIMIT 1');
        $stockStmt->execute([':id' => $itemId, ':sid' => $schoolId]);
        $item = $stockStmt->fetch();
        if (!$item) json_error('Item not found', 404);
        if ((int)$item['current_stock'] < $qty) json_error('Insufficient stock', 409);

        $db->beginTransaction();
        try {
            $db->prepare(
                'INSERT INTO inventory_sales (school_id, session_id, item_id, student_id, quantity, sell_price, sale_date, notes, is_deleted, created_by, created_at, updated_at)
                 VALUES (:sid, :sess, :iid, :stud, :qty, :price, :sdate, :notes, 0, :by, NOW(), NOW())'
            )->execute([
                ':sid'   => $schoolId,
                ':sess'  => $body['session_id']  ?? null,
                ':iid'   => $itemId,
                ':stud'  => isset($body['student_id']) ? (int)$body['student_id'] : null,
                ':qty'   => $qty,
                ':price' => (float)($body['sell_price'] ?? 0),
                ':sdate' => $body['sale_date']   ?? date('Y-m-d'),
                ':notes' => $body['notes']       ?? null,
                ':by'    => $route['userId'],
            ]);
            $newSaleId = (int)$db->lastInsertId();

            // Decrement stock
            $db->prepare('UPDATE inventory_items SET current_stock=GREATEST(0, current_stock-:qty), updated_at=NOW() WHERE id=:id AND school_id=:sid')
               ->execute([':qty' => $qty, ':id' => $itemId, ':sid' => $schoolId]);

            $db->commit();
            json_success(['id' => $newSaleId], 'Sale recorded', 201);
        } catch (Throwable $e) {
            $db->rollBack();
            json_error('Failed to save sale: ' . $e->getMessage(), 500);
        }
    }

    if ($method === 'DELETE' && $saleId) {
        if (!in_array($route['role'], ['super_admin', 'admin'])) json_error('Forbidden', 403);

        $s = $db->prepare('SELECT item_id, quantity FROM inventory_sales WHERE id=:id AND school_id=:sid AND is_deleted=0 LIMIT 1');
        $s->execute([':id' => (int)$saleId, ':sid' => $schoolId]);
        $sale = $s->fetch();
        if (!$sale) json_error('Sale not found', 404);

        $db->beginTransaction();
        $db->prepare('UPDATE inventory_sales SET is_deleted=1, updated_at=NOW() WHERE id=:id')->execute([':id' => (int)$saleId]);
        $db->prepare('UPDATE inventory_items SET current_stock=current_stock+:qty, updated_at=NOW() WHERE id=:id AND school_id=:sid')
           ->execute([':qty' => (int)$sale['quantity'], ':id' => (int)$sale['item_id'], ':sid' => $schoolId]);
        $db->commit();
        json_success(null, 'Sale deleted and stock restored');
    }

    json_error('Method not allowed', 405);
}

// ── Stock Report ──────────────────────────────────────────────────────────────
function inv_report(string $method, int $schoolId): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    $db     = DB::get();
    $sessId = (int)($_GET['session_id'] ?? 0);

    $where  = ['i.school_id=:sid', 'i.is_deleted=0'];
    $params = [':sid' => $schoolId];
    if ($sessId) { $where[] = 'i.session_id=:sess'; $params[':sess'] = $sessId; }
    $wc = implode(' AND ', $where);

    $stmt = $db->prepare(
        "SELECT i.*,
                COALESCE(SUM(DISTINCT ip.quantity), 0) AS total_purchased,
                COALESCE(SUM(DISTINCT isa.quantity), 0) AS total_sold,
                COALESCE(SUM(DISTINCT isa.quantity * isa.sell_price), 0) AS total_revenue
         FROM inventory_items i
         LEFT JOIN inventory_purchases ip ON ip.item_id=i.id AND ip.is_deleted=0 AND (:sess2=0 OR ip.session_id=:sess2)
         LEFT JOIN inventory_sales isa    ON isa.item_id=i.id AND isa.is_deleted=0 AND (:sess3=0 OR isa.session_id=:sess3)
         WHERE $wc
         GROUP BY i.id ORDER BY i.name"
    );
    $params[':sess2'] = $sessId;
    $params[':sess3'] = $sessId;
    $stmt->execute($params);
    json_success($stmt->fetchAll());
}
