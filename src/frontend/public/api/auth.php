<?php
error_reporting(0);
ini_set('display_errors', '0');

/**
 * SHUBH SCHOOL ERP — Auth Handler
 * POST /auth/login
 * POST /auth/refresh
 * POST /auth/change-password
 */

require_once __DIR__ . '/config.php';

$route  = $GLOBALS['route'];
$method = $route['method'];
$sub    = $route['sub'];
$body   = $route['body'];

// ── POST /auth/login ──────────────────────────────────────────────────────────
if ($method === 'POST' && $sub === 'login') {
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';

    if (!$username || !$password) {
        json_error('username and password are required', 400);
    }

    $db   = DB::get();
    $stmt = $db->prepare(
        'SELECT u.*, s.name AS school_name
         FROM users u
         LEFT JOIN schools s ON s.id = u.school_id
         WHERE u.username = :un AND u.is_deleted = 0
         LIMIT 1'
    );
    $stmt->execute([':un' => $username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_error('Invalid username or password', 401);
    }
    if ((int)$user['is_active'] === 0) {
        json_error('Account disabled — contact Super Admin', 403);
    }

    $now     = time();
    $payload = [
        'user_id'   => $user['id'],
        'school_id' => $user['school_id'],
        'role'      => $user['role'],
        'name'      => $user['full_name'],
        'iat'       => $now,
        'exp'       => $now + JWT_EXPIRY,
    ];
    $token = jwt_encode($payload);

    $refreshPayload = $payload;
    $refreshPayload['exp'] = $now + JWT_REFRESH;
    $refreshPayload['type'] = 'refresh';
    $refreshToken = jwt_encode($refreshPayload);

    $db->prepare('UPDATE users SET refresh_token=:rt, last_login=NOW() WHERE id=:id')
       ->execute([':rt' => hash('sha256', $refreshToken), ':id' => $user['id']]);

    json_success([
        'token'         => $token,
        'refresh_token' => $refreshToken,
        'expires_in'    => JWT_EXPIRY,
        'user' => [
            'id'          => $user['id'],
            'username'    => $user['username'],
            'full_name'   => $user['full_name'],
            'role'        => $user['role'],
            'school_id'   => $user['school_id'],
            'school_name' => $user['school_name'] ?? '',
        ],
    ], 'Login successful');
}

// ── POST /auth/refresh ────────────────────────────────────────────────────────
if ($method === 'POST' && $sub === 'refresh') {
    $refreshToken = $body['refresh_token'] ?? '';
    if (!$refreshToken) json_error('refresh_token is required', 400);

    $payload = jwt_verify($refreshToken);
    if (!$payload || ($payload['type'] ?? '') !== 'refresh') {
        json_error('Invalid or expired refresh token', 401);
    }

    $db   = DB::get();
    $stmt = $db->prepare('SELECT id, role, school_id, full_name, username, is_active FROM users WHERE id=:id AND refresh_token=:rt AND is_deleted=0 LIMIT 1');
    $stmt->execute([':id' => $payload['user_id'], ':rt' => hash('sha256', $refreshToken)]);
    $user = $stmt->fetch();

    if (!$user || !$user['is_active']) json_error('Token revoked', 401);

    $now     = time();
    $newPayload = [
        'user_id'   => $user['id'],
        'school_id' => $user['school_id'],
        'role'      => $user['role'],
        'name'      => $user['full_name'],
        'iat'       => $now,
        'exp'       => $now + JWT_EXPIRY,
    ];
    $newToken = jwt_encode($newPayload);

    json_success(['token' => $newToken, 'expires_in' => JWT_EXPIRY], 'Token refreshed');
}

// ── POST /auth/change-password ────────────────────────────────────────────────
if ($method === 'POST' && $sub === 'change-password') {
    $currentUserId = $route['userId'];
    $targetId      = (int)($body['user_id'] ?? $currentUserId);
    $oldPassword   = $body['old_password'] ?? '';
    $newPassword   = $body['new_password'] ?? '';

    if (strlen($newPassword) < 6) json_error('New password must be at least 6 characters', 400);

    $db   = DB::get();
    $stmt = $db->prepare('SELECT id, password_hash FROM users WHERE id=:id AND is_deleted=0 LIMIT 1');
    $stmt->execute([':id' => $targetId]);
    $user = $stmt->fetch();
    if (!$user) json_error('User not found', 404);

    $isSuperAdmin = ($route['role'] === 'super_admin');
    $isSelf       = ($currentUserId === $targetId);

    if (!$isSuperAdmin) {
        if (!$isSelf) json_error('Forbidden', 403);
        if (!password_verify($oldPassword, $user['password_hash'])) {
            json_error('Current password is incorrect', 401);
        }
    }

    $hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    $db->prepare('UPDATE users SET password_hash=:h, updated_at=NOW() WHERE id=:id')
       ->execute([':h' => $hash, ':id' => $targetId]);

    json_success(null, 'Password changed successfully');
}

json_error('Unknown auth endpoint', 404);
