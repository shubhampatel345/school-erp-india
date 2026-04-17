<?php
/**
 * SHUBH SCHOOL ERP — API Entry Point
 *
 * Single file that:
 *  1. Suppresses all PHP warnings/notices (prevents HTML corruption of JSON)
 *  2. Sets CORS + JSON headers FIRST before any output
 *  3. Handles OPTIONS preflight immediately
 *  4. Wraps the entire router in a try/catch — any uncaught error returns JSON, never HTML
 *
 * Upload this file (and all other api/ files) to your cPanel public_html/api/ folder.
 */

// ── 1. Silence all PHP notices/warnings — they corrupt JSON output ────────────
error_reporting(0);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ── 2. CORS + Content-Type headers — MUST be sent before any output ───────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-School-ID, X-Requested-With');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

// ── 3. Handle OPTIONS preflight — return immediately with 200 ─────────────────
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
    exit;
}

// ── 4. Route everything through the router, catching ALL errors as JSON ────────
try {
    require_once __DIR__ . '/router.php';
} catch (Throwable $e) {
    // Make sure headers haven't been flushed with HTML
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode([
        'status'  => 'error',
        'message' => 'Internal server error: ' . $e->getMessage(),
        'data'    => null,
    ]);
    exit;
}
