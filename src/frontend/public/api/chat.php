<?php
/**
 * SHUBH SCHOOL ERP — Chat API Handler
 *
 * All endpoints require JWT auth (enforced in router.php).
 *
 * GET  /chat/conversations          — list conversations (DMs + groups) with last msg + unread count
 * GET  /chat/messages               — messages for a conversation (?conversation_id=X&page=1)
 * POST /chat/messages/send          — send message {conversation_id?, recipient_user_id?, content}
 * POST /chat/conversations/start    — start DM {recipient_user_id}
 * GET  /chat/groups                 — list groups current user is member of
 * POST /chat/groups/generate        — auto-generate class+section and route groups (Super Admin only)
 * GET  /chat/users                  — list all users for DM picker (id, full_name, role)
 * POST /chat/messages/read          — mark conversation messages as read {conversation_id}
 */

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/config.php';

$route    = $GLOBALS['route'];
$method   = $route['method'];
$body     = $route['body'];
$schoolId = (int)$route['schoolId'];
$userId   = (int)$route['userId'];
$role     = $route['role'];
$segments = $route['segments'];

// segments[0] = 'chat', segments[1] = sub-resource, segments[2] = action
$sub    = $segments[1] ?? '';
$action = $segments[2] ?? '';

$db = DB::get();

// ── Dispatch ──────────────────────────────────────────────────────────────────
if ($sub === 'conversations' && $method === 'GET') {
    chat_list_conversations($db, $schoolId, $userId);
}

if ($sub === 'conversations' && $action === 'start' && $method === 'POST') {
    chat_start_conversation($db, $schoolId, $userId, $body);
}

if ($sub === 'messages' && $action === 'send' && $method === 'POST') {
    chat_send_message($db, $schoolId, $userId, $body);
}

if ($sub === 'messages' && $action === 'read' && $method === 'POST') {
    chat_mark_read($db, $schoolId, $userId, $body);
}

if ($sub === 'messages' && $method === 'GET') {
    chat_get_messages($db, $schoolId, $userId);
}

if ($sub === 'groups' && $action === 'generate' && $method === 'POST') {
    if (!in_array($role, ['superadmin', 'admin'], true)) {
        json_error('Only Super Admin or Admin can generate groups', 403);
    }
    chat_generate_groups($db, $schoolId, $userId);
}

if ($sub === 'groups' && $method === 'GET') {
    chat_list_groups($db, $schoolId, $userId);
}

if ($sub === 'users' && $method === 'GET') {
    chat_list_users($db, $schoolId, $userId);
}

json_error('Unknown chat endpoint', 404);

// ── GET /chat/conversations ───────────────────────────────────────────────────
function chat_list_conversations(PDO $db, int $schoolId, int $userId): never {
    // All conversations the user is a member of, with last message and unread count
    $stmt = $db->prepare("
        SELECT
            c.id,
            c.type,
            c.name,
            c.class_id,
            c.section_id,
            c.route_id,
            c.updated_at,
            (
                SELECT m.content
                FROM   chat_messages m
                WHERE  m.conversation_id = c.id AND m.is_deleted = 0
                ORDER  BY m.sent_at DESC
                LIMIT  1
            ) AS last_message,
            (
                SELECT m.sent_at
                FROM   chat_messages m
                WHERE  m.conversation_id = c.id AND m.is_deleted = 0
                ORDER  BY m.sent_at DESC
                LIMIT  1
            ) AS last_message_at,
            (
                SELECT COUNT(*)
                FROM   chat_messages m
                WHERE  m.conversation_id = c.id
                  AND  m.is_deleted = 0
                  AND  m.sender_user_id != :uid1
                  AND  m.sent_at > COALESCE(
                           (SELECT cm2.last_read_at FROM chat_conversation_members cm2
                            WHERE cm2.conversation_id = c.id AND cm2.user_id = :uid2),
                           '1970-01-01'
                       )
            ) AS unread_count,
            (
                SELECT COUNT(*) FROM chat_conversation_members cm3
                WHERE  cm3.conversation_id = c.id
            ) AS member_count
        FROM chat_conversations c
        INNER JOIN chat_conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = :uid3
        WHERE c.school_id = :sid AND c.is_deleted = 0
        ORDER BY last_message_at DESC, c.updated_at DESC
    ");
    $stmt->execute([':uid1' => $userId, ':uid2' => $userId, ':uid3' => $userId, ':sid' => $schoolId]);
    $rows = $stmt->fetchAll();

    // For direct conversations, fetch the other user's name
    foreach ($rows as &$row) {
        if ($row['type'] === 'direct') {
            $other = $db->prepare("
                SELECT u.full_name, u.role
                FROM   chat_conversation_members cm
                INNER JOIN users u ON u.id = cm.user_id
                WHERE  cm.conversation_id = :cid AND cm.user_id != :uid
                LIMIT  1
            ");
            $other->execute([':cid' => $row['id'], ':uid' => $userId]);
            $otherUser = $other->fetch();
            $row['other_user_name'] = $otherUser ? $otherUser['full_name'] : 'Unknown';
            $row['other_user_role'] = $otherUser ? $otherUser['role'] : '';
        } else {
            $row['other_user_name'] = null;
            $row['other_user_role'] = null;
        }
        $row['id']           = (int)$row['id'];
        $row['unread_count'] = (int)$row['unread_count'];
        $row['member_count'] = (int)$row['member_count'];
    }
    unset($row);

    json_success($rows, 'Conversations loaded');
}

// ── POST /chat/conversations/start ────────────────────────────────────────────
function chat_start_conversation(PDO $db, int $schoolId, int $userId, array $body): never {
    $recipientId = (int)($body['recipient_user_id'] ?? 0);
    if (!$recipientId || $recipientId === $userId) {
        json_error('Invalid recipient_user_id', 400);
    }

    // Verify recipient exists in this school
    $rStmt = $db->prepare('SELECT id FROM users WHERE id=:rid AND school_id=:sid AND is_deleted=0 LIMIT 1');
    $rStmt->execute([':rid' => $recipientId, ':sid' => $schoolId]);
    if (!$rStmt->fetch()) {
        json_error('Recipient user not found', 404);
    }

    // Check if DM conversation already exists between these two users
    $existing = $db->prepare("
        SELECT c.id
        FROM   chat_conversations c
        INNER JOIN chat_conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = :uid
        INNER JOIN chat_conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = :rid
        WHERE  c.school_id = :sid AND c.type = 'direct' AND c.is_deleted = 0
        LIMIT  1
    ");
    $existing->execute([':uid' => $userId, ':rid' => $recipientId, ':sid' => $schoolId]);
    $conv = $existing->fetch();

    if ($conv) {
        json_success(['conversation_id' => (int)$conv['id']], 'Conversation already exists');
    }

    // Create new DM conversation
    $db->prepare("
        INSERT INTO chat_conversations (school_id, type, created_at, updated_at, is_deleted)
        VALUES (:sid, 'direct', NOW(), NOW(), 0)
    ")->execute([':sid' => $schoolId]);
    $convId = (int)$db->lastInsertId();

    // Add both members
    $addMember = $db->prepare("
        INSERT IGNORE INTO chat_conversation_members (conversation_id, user_id, joined_at)
        VALUES (:cid, :uid, NOW())
    ");
    $addMember->execute([':cid' => $convId, ':uid' => $userId]);
    $addMember->execute([':cid' => $convId, ':uid' => $recipientId]);

    json_success(['conversation_id' => $convId], 'Conversation started', 201);
}

// ── GET /chat/messages ────────────────────────────────────────────────────────
function chat_get_messages(PDO $db, int $schoolId, int $userId): never {
    $convId = (int)($_GET['conversation_id'] ?? 0);
    $page   = max(1, (int)($_GET['page'] ?? 1));
    if (!$convId) json_error('Missing conversation_id', 400);

    // Verify user is a member of this conversation
    chat_assert_member($db, $convId, $userId, $schoolId);

    $pageSize = 50;
    $offset   = ($page - 1) * $pageSize;

    $stmt = $db->prepare("
        SELECT
            m.id,
            m.conversation_id,
            m.sender_user_id,
            u.full_name   AS sender_name,
            u.role        AS sender_role,
            m.content,
            m.sent_at,
            m.is_deleted
        FROM   chat_messages m
        INNER JOIN users u ON u.id = m.sender_user_id
        WHERE  m.conversation_id = :cid AND m.is_deleted = 0
        ORDER  BY m.sent_at ASC
        LIMIT  :limit OFFSET :offset
    ");
    $stmt->bindValue(':cid',    $convId,   PDO::PARAM_INT);
    $stmt->bindValue(':limit',  $pageSize, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset,   PDO::PARAM_INT);
    $stmt->execute();
    $messages = $stmt->fetchAll();

    // Count total for pagination
    $countStmt = $db->prepare("
        SELECT COUNT(*) AS total FROM chat_messages
        WHERE  conversation_id = :cid AND is_deleted = 0
    ");
    $countStmt->execute([':cid' => $convId]);
    $total = (int)$countStmt->fetchColumn();

    // Cast IDs
    foreach ($messages as &$m) {
        $m['id']               = (int)$m['id'];
        $m['conversation_id']  = (int)$m['conversation_id'];
        $m['sender_user_id']   = (int)$m['sender_user_id'];
        $m['is_mine']          = ($m['sender_user_id'] === $userId);
    }
    unset($m);

    json_success([
        'messages'   => $messages,
        'page'       => $page,
        'page_size'  => $pageSize,
        'total'      => $total,
        'has_more'   => ($offset + $pageSize) < $total,
    ], 'Messages loaded');
}

// ── POST /chat/messages/send ──────────────────────────────────────────────────
function chat_send_message(PDO $db, int $schoolId, int $userId, array $body): never {
    $content = trim($body['content'] ?? '');
    if ($content === '') {
        json_error('Message content cannot be empty', 400);
    }

    $convId      = (int)($body['conversation_id']   ?? 0);
    $recipientId = (int)($body['recipient_user_id'] ?? 0);

    // If no conversation_id, start a DM first
    if (!$convId && $recipientId) {
        // Reuse start_conversation logic inline
        $rStmt = $db->prepare('SELECT id FROM users WHERE id=:rid AND school_id=:sid AND is_deleted=0 LIMIT 1');
        $rStmt->execute([':rid' => $recipientId, ':sid' => $schoolId]);
        if (!$rStmt->fetch()) json_error('Recipient not found', 404);

        $existing = $db->prepare("
            SELECT c.id
            FROM   chat_conversations c
            INNER JOIN chat_conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = :uid
            INNER JOIN chat_conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = :rid
            WHERE  c.school_id = :sid AND c.type = 'direct' AND c.is_deleted = 0
            LIMIT  1
        ");
        $existing->execute([':uid' => $userId, ':rid' => $recipientId, ':sid' => $schoolId]);
        $conv = $existing->fetch();

        if ($conv) {
            $convId = (int)$conv['id'];
        } else {
            $db->prepare("
                INSERT INTO chat_conversations (school_id, type, created_at, updated_at, is_deleted)
                VALUES (:sid, 'direct', NOW(), NOW(), 0)
            ")->execute([':sid' => $schoolId]);
            $convId = (int)$db->lastInsertId();
            $addMember = $db->prepare("
                INSERT IGNORE INTO chat_conversation_members (conversation_id, user_id, joined_at)
                VALUES (:cid, :uid, NOW())
            ");
            $addMember->execute([':cid' => $convId, ':uid' => $userId]);
            $addMember->execute([':cid' => $convId, ':uid' => $recipientId]);
        }
    }

    if (!$convId) json_error('Missing conversation_id or recipient_user_id', 400);

    // Verify user is a member
    chat_assert_member($db, $convId, $userId, $schoolId);

    // Insert message
    $db->prepare("
        INSERT INTO chat_messages (conversation_id, sender_user_id, content, sent_at, is_deleted)
        VALUES (:cid, :uid, :content, NOW(), 0)
    ")->execute([':cid' => $convId, ':uid' => $userId, ':content' => $content]);
    $msgId = (int)$db->lastInsertId();

    // Update conversation's updated_at
    $db->prepare("UPDATE chat_conversations SET updated_at = NOW() WHERE id = :cid")
       ->execute([':cid' => $convId]);

    // Auto-update sender's last_read_at
    $db->prepare("
        UPDATE chat_conversation_members SET last_read_at = NOW()
        WHERE  conversation_id = :cid AND user_id = :uid
    ")->execute([':cid' => $convId, ':uid' => $userId]);

    json_success([
        'message_id'      => $msgId,
        'conversation_id' => $convId,
        'sent_at'         => gmdate('Y-m-d H:i:s'),
    ], 'Message sent', 201);
}

// ── POST /chat/messages/read ──────────────────────────────────────────────────
function chat_mark_read(PDO $db, int $schoolId, int $userId, array $body): never {
    $convId = (int)($body['conversation_id'] ?? 0);
    if (!$convId) json_error('Missing conversation_id', 400);

    chat_assert_member($db, $convId, $userId, $schoolId);

    $db->prepare("
        UPDATE chat_conversation_members SET last_read_at = NOW()
        WHERE  conversation_id = :cid AND user_id = :uid
    ")->execute([':cid' => $convId, ':uid' => $userId]);

    json_success(null, 'Marked as read');
}

// ── GET /chat/groups ──────────────────────────────────────────────────────────
function chat_list_groups(PDO $db, int $schoolId, int $userId): never {
    $stmt = $db->prepare("
        SELECT
            c.id,
            c.type,
            c.name,
            c.class_id,
            c.section_id,
            c.route_id,
            c.updated_at,
            (
                SELECT COUNT(*) FROM chat_conversation_members cm2
                WHERE  cm2.conversation_id = c.id
            ) AS member_count
        FROM chat_conversations c
        INNER JOIN chat_conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = :uid
        WHERE c.school_id = :sid AND c.type IN ('class_group','route_group') AND c.is_deleted = 0
        ORDER BY c.name ASC
    ");
    $stmt->execute([':uid' => $userId, ':sid' => $schoolId]);
    $groups = $stmt->fetchAll();
    foreach ($groups as &$g) {
        $g['id']           = (int)$g['id'];
        $g['member_count'] = (int)$g['member_count'];
    }
    unset($g);
    json_success($groups, 'Groups loaded');
}

// ── POST /chat/groups/generate ────────────────────────────────────────────────
function chat_generate_groups(PDO $db, int $schoolId, int $userId): never {
    $created = [];
    $updated = [];

    // ── 1. Class + Section groups ────────────────────────────────────────────
    // Find all class-section pairs that have at least one active student
    $csStmt = $db->prepare("
        SELECT DISTINCT
            s.class_id,
            s.section_id,
            c.name AS class_name,
            sec.name AS section_name
        FROM   students s
        INNER JOIN classes  c   ON c.id   = s.class_id  AND c.is_deleted  = 0
        INNER JOIN sections sec ON sec.id = s.section_id AND sec.is_deleted = 0
        WHERE  s.school_id = :sid AND s.is_deleted = 0 AND s.status = 'Active'
          AND  s.class_id IS NOT NULL AND s.section_id IS NOT NULL
    ");
    $csStmt->execute([':sid' => $schoolId]);
    $classSections = $csStmt->fetchAll();

    foreach ($classSections as $cs) {
        $classId   = (int)$cs['class_id'];
        $sectionId = (int)$cs['section_id'];
        $groupName = 'Class ' . $cs['class_name'] . '-' . $cs['section_name'] . ' Group';

        // Upsert conversation
        $existStmt = $db->prepare("
            SELECT id FROM chat_conversations
            WHERE  school_id = :sid AND type = 'class_group'
              AND  class_id = :cid AND section_id = :secid AND is_deleted = 0
            LIMIT  1
        ");
        $existStmt->execute([':sid' => $schoolId, ':cid' => $classId, ':secid' => $sectionId]);
        $existing = $existStmt->fetch();

        if ($existing) {
            $convId = (int)$existing['id'];
            $db->prepare("UPDATE chat_conversations SET name=:name, updated_at=NOW() WHERE id=:id")
               ->execute([':name' => $groupName, ':id' => $convId]);
            $updated[] = $groupName;
        } else {
            $db->prepare("
                INSERT INTO chat_conversations (school_id, type, name, class_id, section_id, created_at, updated_at, is_deleted)
                VALUES (:sid, 'class_group', :name, :cid, :secid, NOW(), NOW(), 0)
            ")->execute([':sid' => $schoolId, ':name' => $groupName, ':cid' => $classId, ':secid' => $sectionId]);
            $convId = (int)$db->lastInsertId();
            $created[] = $groupName;
        }

        // Add students in this class+section
        $studStmt = $db->prepare("
            SELECT u.id AS user_id
            FROM   students s
            INNER JOIN users u ON u.reference_id = s.id AND u.role = 'student' AND u.is_deleted = 0
            WHERE  s.school_id = :sid AND s.class_id = :cid AND s.section_id = :secid
              AND  s.is_deleted = 0 AND s.status = 'Active'
        ");
        $studStmt->execute([':sid' => $schoolId, ':cid' => $classId, ':secid' => $sectionId]);
        chat_bulk_add_members($db, $convId, $studStmt->fetchAll(PDO::FETCH_COLUMN, 0));

        // Add teachers assigned to this class range
        $teachStmt = $db->prepare("
            SELECT DISTINCT u.id AS user_id
            FROM   teacher_subjects ts
            INNER JOIN staff sf ON sf.id = ts.staff_id AND sf.is_deleted = 0
            INNER JOIN users u  ON u.reference_id = sf.id AND u.role = 'teacher' AND u.is_deleted = 0
            WHERE  ts.school_id = :sid AND ts.is_deleted = 0
              AND  :classNum BETWEEN ts.class_from AND ts.class_to
        ");
        // Use class order_num as numeric class number for range comparison
        $orderStmt = $db->prepare("SELECT order_num FROM classes WHERE id=:id LIMIT 1");
        $orderStmt->execute([':id' => $classId]);
        $classNum = (int)($orderStmt->fetchColumn() ?: $classId);

        $teachStmt->execute([':sid' => $schoolId, ':classNum' => $classNum]);
        chat_bulk_add_members($db, $convId, $teachStmt->fetchAll(PDO::FETCH_COLUMN, 0));

        // Also add admin/superadmin users
        chat_add_admin_users($db, $convId, $schoolId);
    }

    // ── 2. Route groups ──────────────────────────────────────────────────────
    $routeStmt = $db->prepare("
        SELECT id, name FROM routes WHERE school_id=:sid AND is_deleted=0
    ");
    $routeStmt->execute([':sid' => $schoolId]);
    $routes = $routeStmt->fetchAll();

    foreach ($routes as $route) {
        $routeId   = (int)$route['id'];
        $groupName = 'Route ' . $route['name'] . ' Group';

        $existStmt = $db->prepare("
            SELECT id FROM chat_conversations
            WHERE  school_id=:sid AND type='route_group' AND route_id=:rid AND is_deleted=0
            LIMIT  1
        ");
        $existStmt->execute([':sid' => $schoolId, ':rid' => $routeId]);
        $existing = $existStmt->fetch();

        if ($existing) {
            $convId = (int)$existing['id'];
            $db->prepare("UPDATE chat_conversations SET name=:name, updated_at=NOW() WHERE id=:id")
               ->execute([':name' => $groupName, ':id' => $convId]);
            $updated[] = $groupName;
        } else {
            $db->prepare("
                INSERT INTO chat_conversations (school_id, type, name, route_id, created_at, updated_at, is_deleted)
                VALUES (:sid, 'route_group', :name, :rid, NOW(), NOW(), 0)
            ")->execute([':sid' => $schoolId, ':name' => $groupName, ':rid' => $routeId]);
            $convId = (int)$db->lastInsertId();
            $created[] = $groupName;
        }

        // Add students on this route
        $routeStudStmt = $db->prepare("
            SELECT u.id AS user_id
            FROM   student_transport st
            INNER JOIN students s ON s.id = st.student_id AND s.is_deleted = 0 AND s.status = 'Active'
            INNER JOIN users u    ON u.reference_id = s.id AND u.role = 'student' AND u.is_deleted = 0
            WHERE  st.school_id = :sid AND st.route_id = :rid AND st.is_deleted = 0
        ");
        $routeStudStmt->execute([':sid' => $schoolId, ':rid' => $routeId]);
        chat_bulk_add_members($db, $convId, $routeStudStmt->fetchAll(PDO::FETCH_COLUMN, 0));

        // Add driver user if exists (look up by mobile from routes table)
        $driverStmt = $db->prepare("
            SELECT u.id FROM routes r
            INNER JOIN users u ON u.username = r.driver_mobile AND u.school_id = r.school_id AND u.is_deleted = 0
            WHERE r.id = :rid AND r.school_id = :sid
            LIMIT 1
        ");
        $driverStmt->execute([':rid' => $routeId, ':sid' => $schoolId]);
        $driverUser = $driverStmt->fetch();
        if ($driverUser) {
            chat_bulk_add_members($db, $convId, [(int)$driverUser['id']]);
        }

        // Add admin/superadmin users
        chat_add_admin_users($db, $convId, $schoolId);
    }

    json_success([
        'created' => $created,
        'updated' => $updated,
        'total'   => count($created) + count($updated),
    ], count($created) . ' groups created, ' . count($updated) . ' updated');
}

// ── GET /chat/users ───────────────────────────────────────────────────────────
function chat_list_users(PDO $db, int $schoolId, int $userId): never {
    $stmt = $db->prepare("
        SELECT id, full_name, role, is_active
        FROM   users
        WHERE  school_id = :sid AND is_deleted = 0 AND is_active = 1 AND id != :uid
        ORDER  BY full_name ASC
    ");
    $stmt->execute([':sid' => $schoolId, ':uid' => $userId]);
    $users = $stmt->fetchAll();
    foreach ($users as &$u) {
        $u['id'] = (int)$u['id'];
    }
    unset($u);
    json_success($users, 'Users loaded');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Abort with 403 if $userId is not a member of $convId in $schoolId.
 */
function chat_assert_member(PDO $db, int $convId, int $userId, int $schoolId): void {
    $stmt = $db->prepare("
        SELECT 1
        FROM   chat_conversation_members cm
        INNER JOIN chat_conversations c ON c.id = cm.conversation_id
        WHERE  cm.conversation_id = :cid AND cm.user_id = :uid
          AND  c.school_id = :sid AND c.is_deleted = 0
        LIMIT  1
    ");
    $stmt->execute([':cid' => $convId, ':uid' => $userId, ':sid' => $schoolId]);
    if (!$stmt->fetch()) {
        json_error('Access denied: not a member of this conversation', 403);
    }
}

/**
 * Bulk-insert conversation members, ignoring duplicates.
 * @param int[] $userIds
 */
function chat_bulk_add_members(PDO $db, int $convId, array $userIds): void {
    if (empty($userIds)) return;
    $stmt = $db->prepare("
        INSERT IGNORE INTO chat_conversation_members (conversation_id, user_id, joined_at)
        VALUES (:cid, :uid, NOW())
    ");
    foreach ($userIds as $uid) {
        if ((int)$uid > 0) {
            $stmt->execute([':cid' => $convId, ':uid' => (int)$uid]);
        }
    }
}

/**
 * Add all superadmin and admin users of the school to a conversation.
 */
function chat_add_admin_users(PDO $db, int $convId, int $schoolId): void {
    $stmt = $db->prepare("
        SELECT id FROM users
        WHERE  school_id=:sid AND role IN ('superadmin','admin') AND is_deleted=0 AND is_active=1
    ");
    $stmt->execute([':sid' => $schoolId]);
    chat_bulk_add_members($db, $convId, $stmt->fetchAll(PDO::FETCH_COLUMN, 0));
}
