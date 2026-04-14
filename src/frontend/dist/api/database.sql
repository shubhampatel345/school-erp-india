-- SHUBH SCHOOL ERP — MySQL Database Schema
-- Encoding: utf8mb4, Collation: utf8mb4_unicode_ci
-- All tables include: id, school_id, session_id, created_at, updated_at, created_by, is_deleted

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ────────────────────────────────────────────────────────────
-- SCHOOLS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  address       TEXT,
  phone         VARCHAR(20),
  email         VARCHAR(100),
  logo_url      TEXT,
  background_url TEXT,
  whatsapp_app_key   VARCHAR(200),
  whatsapp_auth_key  VARCHAR(200),
  whatsapp_enabled   TINYINT(1) DEFAULT 0,
  rcs_enabled        TINYINT(1) DEFAULT 0,
  gpay_enabled       TINYINT(1) DEFAULT 0,
  razorpay_enabled   TINYINT(1) DEFAULT 0,
  payu_enabled       TINYINT(1) DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- USERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  username        VARCHAR(100) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('superadmin','admin','receptionist','accountant','librarian','teacher','parent','student','driver') NOT NULL,
  display_name    VARCHAR(200),
  mobile          VARCHAR(20),
  entity_id       INT UNSIGNED COMMENT 'student.id or staff.id',
  refresh_token   VARCHAR(500),
  refresh_expires TIMESTAMP NULL,
  is_active       TINYINT(1) DEFAULT 1,
  last_login      TIMESTAMP NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      INT UNSIGNED,
  is_deleted      TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_school_username (school_id, username),
  INDEX idx_school_id (school_id),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- SESSIONS (academic year)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  name        VARCHAR(50) NOT NULL COMMENT 'e.g. 2025-26',
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_current  TINYINT(1) DEFAULT 0,
  is_archived TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- CLASSES & SECTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  name        VARCHAR(50) NOT NULL,
  order_num   INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sections (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  class_id    INT UNSIGNED NOT NULL,
  name        VARCHAR(10) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_class (school_id, class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- STUDENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id         INT UNSIGNED NOT NULL,
  session_id        INT UNSIGNED NOT NULL,
  admission_no      VARCHAR(50) NOT NULL,
  name              VARCHAR(200) NOT NULL,
  dob               DATE,
  gender            ENUM('Male','Female','Other'),
  category          VARCHAR(50),
  religion          VARCHAR(50),
  blood_group       VARCHAR(10),
  photo_url         TEXT,
  father_name       VARCHAR(200),
  mother_name       VARCHAR(200),
  guardian_name     VARCHAR(200),
  primary_mobile    VARCHAR(20),
  secondary_mobile  VARCHAR(20),
  email             VARCHAR(100),
  address           TEXT,
  village           VARCHAR(100),
  city              VARCHAR(100),
  state             VARCHAR(100),
  pin               VARCHAR(10),
  aadhaar_no        VARCHAR(20),
  sr_no             VARCHAR(50),
  pen_no            VARCHAR(50),
  apaar_no          VARCHAR(50),
  previous_school   VARCHAR(200),
  admission_date    DATE,
  class_id          INT UNSIGNED,
  section_id        INT UNSIGNED,
  roll_no           VARCHAR(20),
  status            ENUM('Active','Inactive','Discontinued','Passed Out') DEFAULT 'Active',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by        INT UNSIGNED,
  is_deleted        TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_school_admission (school_id, session_id, admission_no),
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_class_section (class_id, section_id),
  INDEX idx_primary_mobile (primary_mobile),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- STAFF
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  session_id      INT UNSIGNED NOT NULL,
  employee_code   VARCHAR(50),
  name            VARCHAR(200) NOT NULL,
  designation     VARCHAR(100),
  department      VARCHAR(100),
  dob             DATE,
  gender          ENUM('Male','Female','Other'),
  mobile          VARCHAR(20),
  email           VARCHAR(100),
  address         TEXT,
  photo_url       TEXT,
  aadhaar_no      VARCHAR(20),
  pan_no          VARCHAR(20),
  bank_account    VARCHAR(30),
  bank_ifsc       VARCHAR(20),
  bank_name       VARCHAR(100),
  joining_date    DATE,
  salary_type     ENUM('Monthly','Daily','Hourly') DEFAULT 'Monthly',
  basic_salary    DECIMAL(10,2) DEFAULT 0,
  hra             DECIMAL(10,2) DEFAULT 0,
  da              DECIMAL(10,2) DEFAULT 0,
  ta              DECIMAL(10,2) DEFAULT 0,
  other_allowance DECIMAL(10,2) DEFAULT 0,
  pf_employee     DECIMAL(10,2) DEFAULT 0,
  pf_employer     DECIMAL(10,2) DEFAULT 0,
  esi             DECIMAL(10,2) DEFAULT 0,
  status          ENUM('Active','Inactive','Resigned') DEFAULT 'Active',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      INT UNSIGNED,
  is_deleted      TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- TEACHER SUBJECTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED NOT NULL,
  staff_id    INT UNSIGNED NOT NULL,
  subject_id  INT UNSIGNED NOT NULL,
  class_from  INT UNSIGNED,
  class_to    INT UNSIGNED,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_staff (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- PAYROLL
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_setup (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED NOT NULL,
  staff_id    INT UNSIGNED NOT NULL,
  month       TINYINT UNSIGNED NOT NULL COMMENT '1=Jan..12=Dec',
  year        SMALLINT UNSIGNED NOT NULL,
  working_days TINYINT UNSIGNED,
  present_days TINYINT UNSIGNED,
  gross_salary DECIMAL(10,2),
  deductions   DECIMAL(10,2),
  net_salary   DECIMAL(10,2),
  paid_date    DATE,
  status       ENUM('Draft','Paid') DEFAULT 'Draft',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_staff (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- SUBJECTS
-- ────────────────────────────────────────────────────────────
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
  session_id  INT UNSIGNED NOT NULL,
  subject_id  INT UNSIGNED NOT NULL,
  class_id    INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_subject (subject_id),
  INDEX idx_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- TIMETABLES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timetables (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED NOT NULL,
  type        ENUM('exam','teacher') NOT NULL,
  class_id    INT UNSIGNED,
  section_id  INT UNSIGNED,
  staff_id    INT UNSIGNED,
  data_json   LONGTEXT COMMENT 'JSON blob for timetable data',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- TRANSPORT
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(200) NOT NULL,
  bus_no      VARCHAR(50),
  driver_name VARCHAR(200),
  driver_mobile VARCHAR(20),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS student_transport (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        INT UNSIGNED NOT NULL,
  session_id       INT UNSIGNED NOT NULL,
  student_id       INT UNSIGNED NOT NULL,
  route_id         INT UNSIGNED,
  pickup_point_id  INT UNSIGNED,
  months_json      VARCHAR(500) COMMENT 'JSON array of active month numbers 1-12',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by       INT UNSIGNED,
  is_deleted       TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_student_session (student_id, session_id),
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- FEES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_heads (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(200) NOT NULL,
  months_json VARCHAR(500) COMMENT 'JSON array of applicable month numbers',
  group_id    INT UNSIGNED,
  account_id  INT UNSIGNED,
  order_num   INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fee_plans (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED NOT NULL,
  fee_head_id  INT UNSIGNED NOT NULL,
  class_id     INT UNSIGNED NOT NULL,
  section_id   INT UNSIGNED COMMENT 'NULL = applies to all sections',
  amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_class_section (class_id, section_id),
  INDEX idx_fee_head (fee_head_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fee_accounts (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(200) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_discounts (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED NOT NULL,
  student_id   INT UNSIGNED NOT NULL,
  amount       DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Monthly discount amount',
  applies_to   VARCHAR(500) COMMENT 'JSON array of fee_head_ids (or "transport")',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_student_session (student_id, session_id),
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS old_fee_entries (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED NOT NULL,
  student_id   INT UNSIGNED NOT NULL,
  description  VARCHAR(200),
  amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  entry_date   DATE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fee_receipts (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  session_id      INT UNSIGNED NOT NULL,
  student_id      INT UNSIGNED NOT NULL,
  receipt_no      VARCHAR(50) NOT NULL,
  receipt_date    DATE NOT NULL,
  months_paid     VARCHAR(500) COMMENT 'JSON array of month numbers',
  fee_breakdown   LONGTEXT COMMENT 'JSON: {fee_head_id, amount}[]',
  transport_amount DECIMAL(10,2) DEFAULT 0,
  other_charges   DECIMAL(10,2) DEFAULT 0,
  other_desc      VARCHAR(200),
  discount        DECIMAL(10,2) DEFAULT 0,
  old_balance     DECIMAL(10,2) DEFAULT 0 COMMENT 'Carried-forward due (positive=owed)',
  gross_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance         DECIMAL(10,2) DEFAULT 0 COMMENT 'Remaining (positive=owed, negative=credit)',
  payment_mode    ENUM('Cash','Cheque','Online','UPI','DD') DEFAULT 'Cash',
  cheque_no       VARCHAR(50),
  bank_name       VARCHAR(100),
  collected_by    INT UNSIGNED COMMENT 'users.id',
  account_id      INT UNSIGNED,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      INT UNSIGNED,
  is_deleted      TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_student (student_id),
  INDEX idx_receipt_no (receipt_no),
  INDEX idx_receipt_date (receipt_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- ATTENDANCE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED NOT NULL,
  entity_type  ENUM('student','staff') NOT NULL,
  entity_id    INT UNSIGNED NOT NULL,
  date         DATE NOT NULL,
  status       ENUM('Present','Absent','Late','Half Day','Leave') DEFAULT 'Present',
  in_time      TIME,
  out_time     TIME,
  method       ENUM('Manual','RFID','QR','Biometric','IP') DEFAULT 'Manual',
  device_id    INT UNSIGNED,
  remarks      VARCHAR(200),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_entity_date (school_id, entity_type, entity_id, date),
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS biometric_devices (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  name         VARCHAR(100) NOT NULL,
  ip_address   VARCHAR(50),
  port         SMALLINT UNSIGNED DEFAULT 4370,
  device_type  VARCHAR(50) COMMENT 'ESSL, ZKTeco, etc.',
  is_active    TINYINT(1) DEFAULT 1,
  last_sync    TIMESTAMP NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- INVENTORY
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED NOT NULL,
  name         VARCHAR(200) NOT NULL,
  category     VARCHAR(100),
  unit         VARCHAR(50),
  sell_price   DECIMAL(10,2) DEFAULT 0,
  current_stock INT DEFAULT 0,
  low_stock_alert INT DEFAULT 5,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_purchases (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED NOT NULL,
  item_id      INT UNSIGNED NOT NULL,
  quantity     INT NOT NULL,
  purchase_price DECIMAL(10,2),
  vendor       VARCHAR(200),
  purchase_date DATE,
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_sales (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED NOT NULL,
  item_id      INT UNSIGNED NOT NULL,
  student_id   INT UNSIGNED,
  quantity     INT NOT NULL,
  sell_price   DECIMAL(10,2),
  sale_date    DATE,
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- EXPENSES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_heads (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(200) NOT NULL,
  type        ENUM('Income','Expense') DEFAULT 'Expense',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expenses (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   INT UNSIGNED NOT NULL,
  session_id  INT UNSIGNED NOT NULL,
  head_id     INT UNSIGNED NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  description TEXT,
  expense_date DATE,
  receipt_url TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED,
  is_deleted  TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_head (head_id),
  INDEX idx_date (expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- HOMEWORK
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS homework (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED NOT NULL,
  class_id     INT UNSIGNED NOT NULL,
  section_id   INT UNSIGNED,
  subject_id   INT UNSIGNED,
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  due_date     DATE,
  staff_id     INT UNSIGNED,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_session (school_id, session_id),
  INDEX idx_class_section (class_id, section_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- ALUMNI
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alumni (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  student_id   INT UNSIGNED,
  name         VARCHAR(200) NOT NULL,
  pass_out_year YEAR,
  mobile       VARCHAR(20),
  email        VARCHAR(100),
  occupation   VARCHAR(200),
  address      TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED,
  user_id      INT UNSIGNED,
  type         VARCHAR(100),
  title        VARCHAR(500),
  message      TEXT,
  is_read      TINYINT(1) DEFAULT 0,
  channel      ENUM('App','WhatsApp','RCS','Email') DEFAULT 'App',
  entity_type  VARCHAR(50),
  entity_id    INT UNSIGNED,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by   INT UNSIGNED,
  is_deleted   TINYINT(1) DEFAULT 0,
  INDEX idx_school_user (school_id, user_id),
  INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_scheduler (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id     INT UNSIGNED NOT NULL,
  event_type    VARCHAR(100) NOT NULL,
  is_enabled    TINYINT(1) DEFAULT 0,
  days_before   TINYINT DEFAULT 0,
  time_of_day   TIME DEFAULT '08:00:00',
  recipient     VARCHAR(100) COMMENT 'parents, students, teachers, all',
  channel       VARCHAR(100) COMMENT 'whatsapp, rcs, both',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- BACKUP HISTORY
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS backup_history (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    INT UNSIGNED NOT NULL,
  filename     VARCHAR(500) NOT NULL,
  size_bytes   BIGINT UNSIGNED,
  created_by   INT UNSIGNED,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- SYSTEM LOGS
-- ────────────────────────────────────────────────────────────
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
  INDEX idx_school_id (school_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- FEE BALANCE (running balance per student per session)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_balance (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       INT UNSIGNED NOT NULL,
  session_id      INT UNSIGNED,
  student_id      INT UNSIGNED NOT NULL,
  running_balance DECIMAL(10,2) DEFAULT 0 COMMENT 'positive=owed, negative=credit',
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_session (student_id, session_id, school_id),
  INDEX idx_school_session (school_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- ACCOUNTS (fee collection accounts)
-- ────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────
-- WHATSAPP LOGS
-- ────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────
-- MIGRATIONS TRACKER
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS migrations (
  id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(200) NOT NULL UNIQUE,
  ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- ALIGN: fee_receipts — add columns used by fees.php
-- (safe to run on an existing table — ALTER IGNORE)
-- ────────────────────────────────────────────────────────────
-- These columns may already exist in fresh installs; the IF NOT EXISTS
-- guard prevents duplicate-column errors on re-import.

-- fee_heads: rename months_json → applicable_months for fees.php compatibility
-- (In a fresh install, months_json may or may not exist; we add applicable_months)
ALTER TABLE fee_heads
  ADD COLUMN IF NOT EXISTS applicable_months TEXT COMMENT 'JSON array of applicable month names';

-- fees_plan alias: fees.php uses table name "fees_plan"
-- The schema already has "fee_plans"; create an alias view for compatibility
CREATE OR REPLACE VIEW fees_plan AS SELECT * FROM fee_plans;

-- student_transport: ensure bus_no column exists (used by students.php)
ALTER TABLE student_transport
  ADD COLUMN IF NOT EXISTS bus_no VARCHAR(50) AFTER pickup_point_id;

-- ────────────────────────────────────────────────────────────
-- SEED: default superadmin school + user
-- ────────────────────────────────────────────────────────────
INSERT IGNORE INTO schools (id, name, address) VALUES (1, 'SHUBH SCHOOL ERP', 'Default School');

-- Default superadmin: username=superadmin, password=admin123 (bcrypt cost=10)
INSERT IGNORE INTO users (id, school_id, username, password_hash, full_name, role, is_active)
VALUES (1, 1, 'superadmin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super Admin', 'super_admin', 1);

-- Default session
INSERT IGNORE INTO sessions (id, school_id, name, start_date, end_date, is_current)
VALUES (1, 1, '2025-26', '2025-04-01', '2026-03-31', 1);

SET FOREIGN_KEY_CHECKS = 1;
