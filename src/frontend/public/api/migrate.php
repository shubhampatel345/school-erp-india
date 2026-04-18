<?php
/**
 * SHUBH SCHOOL ERP — Database Migration Runner
 *
 * GET  /migrate/status          Show which migrations have run
 * GET  /migrate/run             Run all pending migrations (PUBLIC — for initial setup)
 * POST /migrate/run             Same as GET — supports both
 * POST /migrate/seed            Seed default data (superadmin + default school + session)
 * GET  /migrate/reset-superadmin  Reset superadmin password to admin123 (recovery endpoint)
 *
 * NOTE: All migrate endpoints are PUBLIC so they can be called during initial
 * setup before any user account exists. After first setup, you can restrict these
 * by adding a secret token check or removing access via .htaccess.
 */

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/config.php';

$route    = $GLOBALS['route'];
$method   = $route['method'];
$body     = $route['body'];
$schoolId = (int)($route['schoolId'] ?? 1);
$segments = $route['segments'];
$action   = $segments[1] ?? 'status';

// All migrate endpoints are PUBLIC (no auth required).

try {
    $db = DB::get();
} catch (Throwable $e) {
    json_error('Database connection failed: ' . $e->getMessage() . '. Check DB credentials in config.php.', 500);
}

match ($action) {
    'status'            => migrate_status($method, $db),
    'run'               => migrate_run($method, $schoolId, $db),
    'seed'              => migrate_seed($method, $schoolId, $body, $db),
    'reset-superadmin'  => reset_superadmin($method, $schoolId, $db),
    default             => json_error("Unknown migrate action: $action", 404),
};

// ── Status ────────────────────────────────────────────────────────────────────
function migrate_status(string $method, PDO $db): void {
    if ($method !== 'GET') json_error('Method not allowed', 405);

    // Ensure migrations table exists
    $db->exec('CREATE TABLE IF NOT EXISTS migrations (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(200) NOT NULL UNIQUE,
        ran_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

    $stmt = $db->query('SELECT name, ran_at FROM migrations ORDER BY ran_at');
    $ran  = $stmt->fetchAll();

    $all = array_column(migrations_list(), 'name');
    $ranNames = array_column($ran, 'name');
    $pending  = array_values(array_diff($all, $ranNames));

    json_success([
        'ran'     => $ran,
        'pending' => $pending,
        'total'   => count($all),
    ]);
}

// ── Run Pending Migrations ────────────────────────────────────────────────────
function migrate_run(string $method, int $schoolId, PDO $db): void {
    // Allow both GET and POST so admins can trigger from browser URL too
    if (!in_array($method, ['GET', 'POST'], true)) json_error('Method not allowed', 405);

    // Ensure migrations table
    $db->exec('CREATE TABLE IF NOT EXISTS migrations (
        id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL UNIQUE,
        ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

    $stmt    = $db->query('SELECT name FROM migrations');
    $ran     = array_column($stmt->fetchAll(), 'name');
    $applied = [];
    $errors  = [];

    foreach (migrations_list() as $migration) {
        if (in_array($migration['name'], $ran, true)) continue;
        try {
            $db->exec($migration['sql']);
            $db->prepare('INSERT IGNORE INTO migrations (name) VALUES (:n)')->execute([':n' => $migration['name']]);
            $applied[] = $migration['name'];
        } catch (PDOException $e) {
            $errors[] = ['migration' => $migration['name'], 'error' => $e->getMessage()];
        }
    }

    // Always seed superadmin after running migrations
    seed_superadmin_record($schoolId, $db);

    $code = empty($errors) ? 200 : 207;
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode([
        'status'  => empty($errors) ? 'success' : 'partial',
        'message' => count($applied) . ' migration(s) applied. Superadmin seeded.',
        'data'    => ['applied' => $applied, 'errors' => $errors],
    ]);
    exit;
}

// ── Seed Default Data ─────────────────────────────────────────────────────────
function migrate_seed(string $method, int $schoolId, array $body, PDO $db): void {
    // Accept both GET and POST for easier browser-based setup
    if (!in_array($method, ['GET', 'POST'], true)) json_error('Method not allowed', 405);

    $seeded = [];

    // Default school
    $chkSchool = $db->prepare('SELECT id FROM schools WHERE id=:id LIMIT 1');
    $chkSchool->execute([':id' => $schoolId]);
    if (!$chkSchool->fetch()) {
        $db->prepare('INSERT INTO schools (id, name, address) VALUES (:id, :name, :addr)')
           ->execute([':id' => $schoolId, ':name' => $body['school_name'] ?? 'SHUBH SCHOOL ERP', ':addr' => $body['address'] ?? '']);
        $seeded[] = 'school';
    }

    // Upsert superadmin — always ensure it exists with correct credentials
    $result = seed_superadmin_record($schoolId, $db, $body['superadmin_username'] ?? 'superadmin', $body['superadmin_password'] ?? 'admin123');
    $seeded[] = $result;

    // Default current session
    $chkSess = $db->prepare('SELECT id FROM sessions WHERE school_id=:sid AND is_current=1 LIMIT 1');
    $chkSess->execute([':sid' => $schoolId]);
    if (!$chkSess->fetch()) {
        $db->prepare('INSERT INTO sessions (school_id, name, start_date, end_date, is_current, is_archived, is_deleted) VALUES (:sid,:name,:start,:end,1,0,0)')
           ->execute([':sid' => $schoolId, ':name' => date('Y') . '-' . (date('y') + 1), ':start' => date('Y') . '-04-01', ':end' => (date('Y') + 1) . '-03-31']);
        $seeded[] = 'default session';
    }

    json_success(['seeded' => $seeded], 'Seed complete. Login with superadmin / admin123');
}

// ── Reset Superadmin Password (recovery endpoint) ─────────────────────────────
function reset_superadmin(string $method, int $schoolId, PDO $db): void {
    // Allow GET for easy browser access
    if (!in_array($method, ['GET', 'POST'], true)) json_error('Method not allowed', 405);

    $result = seed_superadmin_record($schoolId, $db, 'superadmin', 'admin123', true);

    json_success([
        'action'   => $result,
        'username' => 'superadmin',
        'password' => 'admin123',
    ], 'Superadmin password reset to admin123. You can now login.');
}

// ── Shared: seed/upsert the superadmin user ───────────────────────────────────
function seed_superadmin_record(
    int $schoolId,
    PDO $db,
    string $username = 'superadmin',
    string $password = 'admin123',
    bool $forceUpdate = false
): string {
    // Use cost=10 for broad PHP version compatibility
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);

    // First ensure the schools table exists (might be called before migrations)
    try {
        $db->exec('CREATE TABLE IF NOT EXISTS schools (
            id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name       VARCHAR(200) NOT NULL,
            address    TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

        $db->exec('CREATE TABLE IF NOT EXISTS users (
            id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            school_id     INT UNSIGNED NOT NULL,
            username      VARCHAR(100) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name     VARCHAR(200),
            role          VARCHAR(50) NOT NULL DEFAULT \'teacher\',
            is_active     TINYINT(1) DEFAULT 1,
            refresh_token VARCHAR(500),
            last_login    TIMESTAMP NULL,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by    INT UNSIGNED,
            is_deleted    TINYINT(1) DEFAULT 0,
            UNIQUE KEY uq_school_username (school_id, username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    } catch (Throwable $e) {
        // Tables already exist — ignore
    }

    // Ensure school record exists
    try {
        $db->prepare('INSERT IGNORE INTO schools (id, name) VALUES (:id, :name)')
           ->execute([':id' => $schoolId, ':name' => 'SHUBH SCHOOL ERP']);
    } catch (Throwable $e) { /* ignore */ }

    // Check if superadmin exists
    $stmt = $db->prepare('SELECT id, password_hash FROM users WHERE username=:u AND school_id=:sid AND is_deleted=0 LIMIT 1');
    $stmt->execute([':u' => $username, ':sid' => $schoolId]);
    $existing = $stmt->fetch();

    if (!$existing) {
        // Insert new superadmin
        $db->prepare('INSERT INTO users (school_id, username, password_hash, full_name, role, is_active, created_at, updated_at) VALUES (:sid,:u,:h,"Super Admin","superadmin",1,NOW(),NOW())')
           ->execute([':sid' => $schoolId, ':u' => $username, ':h' => $hash]);
        return 'superadmin user created';
    }

    // Always update hash — this fixes corrupted/empty/plaintext hashes
    // If forceUpdate=false, still update because we want to ensure the hash is valid
    $existingHash = $existing['password_hash'] ?? '';
    $needsUpdate  = $forceUpdate
        || empty($existingHash)
        || strpos($existingHash, '$2') !== 0; // not a bcrypt hash

    if ($needsUpdate) {
        $db->prepare('UPDATE users SET password_hash=:h, is_active=1, is_deleted=0, role="superadmin", full_name="Super Admin", updated_at=NOW() WHERE id=:id')
           ->execute([':h' => $hash, ':id' => $existing['id']]);
        return 'superadmin user updated (hash re-set)';
    }

    return 'superadmin user already exists (hash intact)';
}

// ── Migration Definitions ─────────────────────────────────────────────────────
function migrations_list(): array {
    return [
        [
            'name' => '001_create_core_tables',
            'sql'  => <<<SQL
CREATE TABLE IF NOT EXISTS schools (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(200) NOT NULL,
  address          TEXT,
  phone            VARCHAR(20),
  email            VARCHAR(100),
  logo_url         TEXT,
  background_url   TEXT,
  whatsapp_app_key  VARCHAR(200),
  whatsapp_auth_key VARCHAR(200),
  whatsapp_enabled  TINYINT(1) DEFAULT 0,
  rcs_enabled       TINYINT(1) DEFAULT 0,
  gpay_enabled      TINYINT(1) DEFAULT 0,
  razorpay_enabled  TINYINT(1) DEFAULT 0,
  payu_enabled      TINYINT(1) DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  username        VARCHAR(100) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(200),
  role            VARCHAR(50) NOT NULL DEFAULT 'teacher',
  reference_id    INT UNSIGNED,
  refresh_token   VARCHAR(500),
  is_active       TINYINT(1) DEFAULT 1,
  last_login      TIMESTAMP NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      INT UNSIGNED,
  is_deleted      TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_school_username (school_id, username),
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  name        VARCHAR(50) NOT NULL,
  start_date  DATE,
  end_date    DATE,
  is_current  TINYINT(1) DEFAULT 0,
  is_archived TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        ],
        [
            'name' => '002_create_student_tables',
            'sql'  => <<<SQL
CREATE TABLE IF NOT EXISTS classes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id  INT UNSIGNED NOT NULL,
  name       VARCHAR(50) NOT NULL,
  order_num  INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT UNSIGNED,
  is_deleted TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sections (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id  INT UNSIGNED NOT NULL,
  class_id   INT UNSIGNED NOT NULL,
  name       VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT UNSIGNED,
  is_deleted TINYINT(1) DEFAULT 0,
  INDEX idx_school_class (school_id, class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS students (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        INT UNSIGNED NOT NULL,
  session_id       INT UNSIGNED,
  admission_no     VARCHAR(50) NOT NULL,
  full_name        VARCHAR(200) NOT NULL,
  dob              DATE,
  gender           ENUM('Male','Female','Other'),
  category         VARCHAR(50),
  religion         VARCHAR(50),
  blood_group      VARCHAR(10),
  photo_url        TEXT,
  father_name      VARCHAR(200),
  mother_name      VARCHAR(200),
  guardian_name    VARCHAR(200),
  primary_mobile   VARCHAR(20),
  secondary_mobile VARCHAR(20),
  email            VARCHAR(100),
  address          TEXT,
  village          VARCHAR(100),
  district         VARCHAR(100),
  state            VARCHAR(100),
  pincode          VARCHAR(10),
  aadhaar_no       VARCHAR(20),
  sr_no            VARCHAR(50),
  pen_no           VARCHAR(50),
  apaar_no         VARCHAR(50),
  previous_school  VARCHAR(200),
  admission_date   DATE,
  class_id         INT UNSIGNED,
  section_id       INT UNSIGNED,
  roll_no          VARCHAR(20),
  rfid_tag         VARCHAR(100),
  caste            VARCHAR(50),
  status           ENUM('Active','Inactive','Discontinued','Passed Out') DEFAULT 'Active',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by       INT UNSIGNED,
  is_deleted       TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_school_adm (school_id, session_id, admission_no),
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_primary_mobile (primary_mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_transport (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  session_id      INT UNSIGNED,
  student_id      INT UNSIGNED NOT NULL,
  route_id        INT UNSIGNED,
  pickup_point_id INT UNSIGNED,
  bus_no          VARCHAR(50),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted      TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_student_session (student_id, session_id),
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_transport_months (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id    INT UNSIGNED NOT NULL,
  month_name    VARCHAR(20) NOT NULL,
  is_applicable TINYINT(1) DEFAULT 1,
  INDEX idx_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_discounts (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id      INT UNSIGNED NOT NULL,
  session_id     INT UNSIGNED,
  student_id     INT UNSIGNED NOT NULL,
  monthly_amount DECIMAL(10,2) DEFAULT 0,
  applies_to     TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted     TINYINT(1) DEFAULT 0,
  INDEX idx_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS old_fee_entries (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED,
  student_id  INT UNSIGNED NOT NULL,
  fee_year    YEAR,
  month_num   TINYINT UNSIGNED,
  amount      DECIMAL(10,2) DEFAULT 0,
  description VARCHAR(200),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        ],
        [
            'name' => '003_create_fee_tables',
            'sql'  => <<<SQL
CREATE TABLE IF NOT EXISTS fee_heads (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id         INT UNSIGNED NOT NULL,
  session_id        INT UNSIGNED,
  name              VARCHAR(200) NOT NULL,
  applicable_months TEXT COMMENT 'JSON array',
  sort_order        INT DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by        INT UNSIGNED,
  is_deleted        TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fees_plan (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id      INT UNSIGNED NOT NULL,
  session_id     INT UNSIGNED,
  class_id       INT UNSIGNED NOT NULL,
  section_id     INT UNSIGNED,
  fee_head_id    INT UNSIGNED NOT NULL,
  monthly_amount DECIMAL(10,2) DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by     INT UNSIGNED,
  is_deleted     TINYINT(1) DEFAULT 0,
  INDEX idx_class_section (class_id, section_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accounts (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fee_receipts (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        INT UNSIGNED NOT NULL,
  session_id       INT UNSIGNED,
  student_id       INT UNSIGNED NOT NULL,
  receipt_no       VARCHAR(50) NOT NULL,
  payment_date     DATE NOT NULL,
  months_paid      TEXT COMMENT 'JSON array of month names',
  net_fee          DECIMAL(10,2) DEFAULT 0,
  paid_amount      DECIMAL(10,2) DEFAULT 0,
  old_balance      DECIMAL(10,2) DEFAULT 0,
  balance_after    DECIMAL(10,2) DEFAULT 0,
  payment_mode     VARCHAR(50) DEFAULT 'Cash',
  account_id       INT UNSIGNED,
  other_fee_amount DECIMAL(10,2) DEFAULT 0,
  other_fee_desc   VARCHAR(200),
  received_by      INT UNSIGNED,
  received_by_name VARCHAR(200),
  received_by_role VARCHAR(50),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted       TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_history (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  receipt_id  INT UNSIGNED NOT NULL,
  student_id  INT UNSIGNED NOT NULL,
  fee_head_id INT UNSIGNED,
  months_paid TEXT,
  amount      DECIMAL(10,2) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_receipt (receipt_id),
  INDEX idx_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fee_balance (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  session_id      INT UNSIGNED,
  student_id      INT UNSIGNED NOT NULL,
  running_balance DECIMAL(10,2) DEFAULT 0,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_session (student_id, session_id, school_id),
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        ],
        [
            'name' => '004_create_hr_tables',
            'sql'  => <<<SQL
CREATE TABLE IF NOT EXISTS staff (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  employee_id     VARCHAR(50),
  full_name       VARCHAR(200) NOT NULL,
  designation     VARCHAR(100),
  department      VARCHAR(100),
  dob             DATE,
  gender          ENUM('Male','Female','Other'),
  mobile          VARCHAR(20),
  email           VARCHAR(100),
  address         TEXT,
  qualification   VARCHAR(200),
  date_of_joining DATE,
  gross_salary    DECIMAL(10,2) DEFAULT 0,
  photo_url       TEXT,
  rfid_tag        VARCHAR(100),
  aadhaar_no      VARCHAR(20),
  pan_no          VARCHAR(20),
  bank_account    VARCHAR(30),
  bank_name       VARCHAR(100),
  ifsc            VARCHAR(20),
  is_active       TINYINT(1) DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      INT UNSIGNED,
  is_deleted      TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id),
  INDEX idx_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_subjects (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED,
  staff_id    INT UNSIGNED NOT NULL,
  subject_id  INT UNSIGNED NOT NULL,
  class_from  INT DEFAULT 1,
  class_to    INT DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_staff (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payroll_setup (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id         INT UNSIGNED NOT NULL,
  session_id        INT UNSIGNED,
  staff_id          INT UNSIGNED NOT NULL,
  basic_salary      DECIMAL(10,2) DEFAULT 0,
  hra               DECIMAL(10,2) DEFAULT 0,
  da                DECIMAL(10,2) DEFAULT 0,
  ta                DECIMAL(10,2) DEFAULT 0,
  other_allowances  DECIMAL(10,2) DEFAULT 0,
  pf_deduction      DECIMAL(10,2) DEFAULT 0,
  esi_deduction     DECIMAL(10,2) DEFAULT 0,
  tds_deduction     DECIMAL(10,2) DEFAULT 0,
  other_deductions  DECIMAL(10,2) DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by        INT UNSIGNED,
  is_deleted        TINYINT(1) DEFAULT 0,
  INDEX idx_staff (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payslips (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        INT UNSIGNED NOT NULL,
  session_id       INT UNSIGNED,
  staff_id         INT UNSIGNED NOT NULL,
  pay_month        VARCHAR(10),
  pay_year         SMALLINT UNSIGNED,
  gross_salary     DECIMAL(10,2) DEFAULT 0,
  net_salary       DECIMAL(10,2) DEFAULT 0,
  total_deductions DECIMAL(10,2) DEFAULT 0,
  net_pay          DECIMAL(10,2) DEFAULT 0,
  working_days     TINYINT UNSIGNED DEFAULT 26,
  present_days     TINYINT UNSIGNED DEFAULT 26,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by       INT UNSIGNED,
  is_deleted       TINYINT(1) DEFAULT 0,
  INDEX idx_staff (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        ],
        [
            'name' => '005_create_academics_tables',
            'sql'  => <<<SQL
CREATE TABLE IF NOT EXISTS subjects (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(20),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_subject_mapping (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED,
  class_id    INT UNSIGNED NOT NULL,
  subject_id  INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timetables (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED,
  type        ENUM('exam','teacher') NOT NULL DEFAULT 'exam',
  class_id    INT UNSIGNED,
  section_id  INT UNSIGNED,
  staff_id    INT UNSIGNED,
  data_json   LONGTEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        ],
        [
            'name' => '006_create_transport_tables',
            'sql'  => <<<SQL
CREATE TABLE IF NOT EXISTS routes (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  session_id      INT UNSIGNED,
  name            VARCHAR(200) NOT NULL,
  bus_no          VARCHAR(50),
  driver_name     VARCHAR(200),
  driver_mobile   VARCHAR(20),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      INT UNSIGNED,
  is_deleted      TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pickup_points (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  route_id     INT UNSIGNED NOT NULL,
  name         VARCHAR(200) NOT NULL,
  monthly_fare DECIMAL(10,2) DEFAULT 0,
  order_num    INT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_route (school_id, route_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        ],
        [
            'name' => '007_create_attendance_tables',
            'sql'  => <<<SQL
CREATE TABLE IF NOT EXISTS attendance (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  entity_type     ENUM('student','staff') NOT NULL,
  entity_id       INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  check_in_time   TIME,
  check_out_time  TIME,
  mark_type       VARCHAR(50) DEFAULT 'manual',
  device_id       INT UNSIGNED,
  marked_by       INT UNSIGNED,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted      TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_entity_date (school_id, entity_type, entity_id, attendance_date),
  INDEX idx_school_date (school_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS biometric_devices (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  name         VARCHAR(100) NOT NULL,
  device_type  VARCHAR(50),
  ip_address   VARCHAR(50),
  port         SMALLINT UNSIGNED DEFAULT 4370,
  is_active    TINYINT(1) DEFAULT 1,
  last_sync    TIMESTAMP NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        ],
        [
            'name' => '008_create_inventory_tables',
            'sql'  => <<<SQL
CREATE TABLE IF NOT EXISTS inventory_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  session_id      INT UNSIGNED,
  name            VARCHAR(200) NOT NULL,
  category        VARCHAR(100),
  unit            VARCHAR(50),
  sell_price      DECIMAL(10,2) DEFAULT 0,
  current_stock   INT DEFAULT 0,
  low_stock_alert INT DEFAULT 5,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      INT UNSIGNED,
  is_deleted      TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_purchases (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id      INT UNSIGNED NOT NULL,
  session_id     INT UNSIGNED,
  item_id        INT UNSIGNED NOT NULL,
  quantity       INT NOT NULL,
  purchase_price DECIMAL(10,2),
  vendor         VARCHAR(200),
  purchase_date  DATE,
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by     INT UNSIGNED,
  is_deleted     TINYINT(1) DEFAULT 0,
  INDEX idx_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_sales (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED,
  item_id     INT UNSIGNED NOT NULL,
  student_id  INT UNSIGNED,
  quantity    INT NOT NULL,
  sell_price  DECIMAL(10,2),
  sale_date   DATE,
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        ],
        [
            'name' => '010_create_chat_tables',
            'sql'  => <<<SQL
CREATE TABLE IF NOT EXISTS chat_conversations (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  type        ENUM('direct','class_group','route_group') NOT NULL DEFAULT 'direct',
  name        VARCHAR(255) NULL,
  class_id    INT UNSIGNED NULL,
  section_id  INT UNSIGNED NULL,
  route_id    INT UNSIGNED NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id),
  INDEX idx_class_section (school_id, class_id, section_id),
  INDEX idx_route (school_id, route_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id  INT UNSIGNED NOT NULL,
  sender_user_id   INT UNSIGNED NOT NULL,
  content          TEXT NOT NULL,
  sent_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted       TINYINT(1) DEFAULT 0,
  INDEX idx_conversation (conversation_id),
  INDEX idx_sender (sender_user_id),
  INDEX idx_sent_at (conversation_id, sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_conversation_members (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id  INT UNSIGNED NOT NULL,
  user_id          INT UNSIGNED NOT NULL,
  last_read_at     TIMESTAMP NULL,
  joined_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conv_user (conversation_id, user_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_message_reads (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  read_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_msg_user (message_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        ],
        [
            'name' => '009_create_misc_tables',
            'sql'  => <<<SQL
CREATE TABLE IF NOT EXISTS expense_heads (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED,
  name        VARCHAR(200) NOT NULL,
  type        ENUM('Income','Expense') DEFAULT 'Expense',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expenses (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED,
  head_id      INT UNSIGNED,
  amount       DECIMAL(10,2) NOT NULL,
  description  TEXT,
  expense_date DATE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS homework (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED,
  class_id    INT UNSIGNED NOT NULL,
  section_id  INT UNSIGNED,
  subject_id  INT UNSIGNED,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  due_date    DATE,
  staff_id    INT UNSIGNED,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alumni (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id     INT UNSIGNED NOT NULL,
  student_id    INT UNSIGNED,
  name          VARCHAR(200) NOT NULL,
  pass_out_year YEAR,
  mobile        VARCHAR(20),
  email         VARCHAR(100),
  occupation    VARCHAR(200),
  address       TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by    INT UNSIGNED,
  is_deleted    TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED,
  type         VARCHAR(100),
  title        VARCHAR(500),
  message      TEXT,
  is_read      TINYINT(1) DEFAULT 0,
  channel      VARCHAR(50) DEFAULT 'App',
  entity_type  VARCHAR(50),
  entity_id    INT UNSIGNED,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_user (school_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_scheduler (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  event_type   VARCHAR(100) NOT NULL,
  is_enabled   TINYINT(1) DEFAULT 0,
  days_before  TINYINT DEFAULT 0,
  time_of_day  TIME DEFAULT '08:00:00',
  recipient    VARCHAR(100),
  channel      VARCHAR(100),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id     INT UNSIGNED NOT NULL,
  recipient     VARCHAR(20),
  message       TEXT,
  status        VARCHAR(50) DEFAULT 'sent',
  response_json TEXT,
  sent_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS backup_history (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  filename    VARCHAR(500) NOT NULL,
  size_bytes  BIGINT UNSIGNED,
  created_by  INT UNSIGNED,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_logs (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED,
  user_id      INT UNSIGNED,
  action       VARCHAR(200),
  entity_type  VARCHAR(100),
  entity_id    INT UNSIGNED,
  details_json TEXT,
  ip_address   VARCHAR(50),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        ],
    ];
}
