<?php
/**
 * SHUBH SCHOOL ERP — migrate.php (redirect stub)
 *
 * This file previously created tables with snake_case columns which conflicted
 * with index.php (camelCase columns). It is now a redirect-only stub.
 *
 * All migration functionality lives in index.php.
 * Use these URLs instead:
 *   https://shubh.psmkgs.com/api/index.php?route=migrate/run
 *   https://shubh.psmkgs.com/api/index.php?route=migrate/reset
 *   https://shubh.psmkgs.com/api/index.php?route=migrate/reset-superadmin
 */

// Redirect to the correct endpoint in index.php
$action = $_GET['action'] ?? $_GET['route'] ?? 'run';
header('Location: index.php?route=migrate/' . rawurlencode($action));
exit;
