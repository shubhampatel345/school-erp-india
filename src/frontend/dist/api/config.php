<?php
/**
 * SHUBH SCHOOL ERP — Database Configuration
 * PDO singleton, utf8mb4 charset, environment-driven credentials.
 *
 * Deployment: copy this file to your cPanel server and update the constants
 * below (or set them as PHP environment variables for better security).
 */

define('DB_HOST',     getenv('DB_HOST')     ?: 'localhost');
define('DB_PORT',     getenv('DB_PORT')     ?: '3306');
define('DB_NAME',     getenv('DB_NAME')     ?: 'shubh_erp');
define('DB_USER',     getenv('DB_USER')     ?: 'root');
define('DB_PASS',     getenv('DB_PASS')     ?: '');
define('DB_CHARSET',  'utf8mb4');

// JWT secret — change this to a long random string in production
define('JWT_SECRET',  getenv('JWT_SECRET')  ?: 'CHANGE_ME_IN_PRODUCTION_USE_64_RANDOM_CHARS');
define('JWT_EXPIRY',  86400);          // 24 hours
define('JWT_REFRESH', 604800);         // 7 days

// App version shown in /sync/status
define('APP_VERSION', '1.0.0');

class DB {
    private static ?PDO $instance = null;

    public static function get(): PDO {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
            );
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
            ];
            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode([
                    'status'  => 'error',
                    'message' => 'Database connection failed',
                    'data'    => null,
                ]);
                exit;
            }
        }
        return self::$instance;
    }
}

/**
 * Shared response helpers
 */
function json_success(mixed $data, string $message = 'OK', int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'success', 'message' => $message, 'data' => $data]);
    exit;
}

function json_error(string $message, int $code = 400, mixed $data = null): never {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => $message, 'data' => $data]);
    exit;
}

/**
 * Pagination helper — returns validated limit/offset from query params
 * @return array{limit:int, offset:int}
 */
function pagination(): array {
    $limit  = min((int)($_GET['limit']  ?? 50), 200);
    $offset = max((int)($_GET['offset'] ?? 0),  0);
    return ['limit' => $limit, 'offset' => $offset];
}

/**
 * Require a non-empty string field in an array, or abort with 400.
 */
function require_field(array $data, string $field): mixed {
    if (!array_key_exists($field, $data) || $data[$field] === '' || $data[$field] === null) {
        json_error("Missing required field: $field", 400);
    }
    return $data[$field];
}

/**
 * Sanitise / cast a nullable date string for MySQL (YYYY-MM-DD or null).
 */
function date_or_null(?string $val): ?string {
    if (!$val) return null;
    $d = date_create($val);
    return $d ? date_format($d, 'Y-m-d') : null;
}

/**
 * Return the current UTC timestamp string for MySQL DATETIME columns.
 */
function now(): string {
    return gmdate('Y-m-d H:i:s');
}
