# Database Schema — SHUBH SCHOOL ERP (MySQL)

Complete reference for the MySQL database structure used in MySQL Mode. All tables are created automatically by the migration script (`/api/migrate.php?action=run`).

---

## Table Overview

| Table | Records | Description |
|-------|---------|-------------|
| `students` | One per student | Core student profiles with all admission data |
| `staff` | One per staff member | Teacher and non-teaching staff profiles |
| `users` | One per login | Login credentials for all user types |
| `sessions` | One per academic year | Session archive (infinite history) |
| `fee_headings` | One per fee type | Fee heading definitions with applicable months |
| `fee_plan` | One per class/section/heading | Fee amounts per class, section, heading |
| `fee_receipts` | One per payment | Individual fee payment records |
| `attendance` | One per student per day | Daily attendance records |
| `transport` | One per route | Bus routes, pickup points, monthly fares |
| `inventory` | One per item | Stock items, purchases, sales |
| `expenses` | One per entry | Income and expense ledger entries |
| `homework` | One per assignment | Homework assignments with due dates |
| `alumni` | One per alumni | Alumni directory records |
| `settings` | Key-value pairs | School profile, WhatsApp keys, preferences |
| `school_profile` | Single row | School name, address, logo, theme |
| `notifications` | One per event | ERP event notification log |

---

## Table Definitions

### `students`

```sql
CREATE TABLE students (
  id              VARCHAR(36)  PRIMARY KEY,       -- UUID
  admission_no    VARCHAR(20)  UNIQUE NOT NULL,    -- e.g. '2025001'
  name            VARCHAR(100) NOT NULL,
  father_name     VARCHAR(100),
  mother_name     VARCHAR(100),
  dob             DATE,                            -- Date of birth
  gender          ENUM('Male','Female','Other'),
  class           VARCHAR(20),                     -- e.g. 'Class 5'
  section         VARCHAR(5),                      -- e.g. 'A'
  roll_no         INT,
  category        VARCHAR(30),                     -- General/OBC/SC/ST
  mobile          VARCHAR(15),                     -- Father/guardian mobile
  mobile2         VARCHAR(15),                     -- Mother mobile (optional)
  address         TEXT,
  village         VARCHAR(100),
  aadhaar_no      VARCHAR(20),
  sr_no           VARCHAR(20),
  pen_no          VARCHAR(20),
  apaar_no        VARCHAR(20),
  admission_date  DATE,
  status          ENUM('Active','Discontinued','Passed Out') DEFAULT 'Active',
  previous_school VARCHAR(150),
  transport_route VARCHAR(100),
  transport_bus   VARCHAR(50),
  pickup_point    VARCHAR(100),
  transport_months JSON,                           -- Array of month names
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_months JSON,                            -- Applicable month names
  discount_headings JSON,                          -- Applicable heading IDs
  old_fees_balance DECIMAL(10,2) DEFAULT 0,
  photo_url       TEXT,                            -- Base64 or URL
  session_id      VARCHAR(36),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_class_section (class, section),
  INDEX idx_mobile (mobile),
  INDEX idx_session (session_id),
  INDEX idx_status (status)
);
```

### `staff`

```sql
CREATE TABLE staff (
  id              VARCHAR(36)  PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  designation     VARCHAR(50),                     -- Teacher, Admin, Driver, etc.
  mobile          VARCHAR(15)  UNIQUE,
  dob             DATE,
  email           VARCHAR(100),
  address         TEXT,
  salary_gross    DECIMAL(10,2) DEFAULT 0,
  salary_net      DECIMAL(10,2) DEFAULT 0,
  join_date       DATE,
  subjects        JSON,                            -- [{subject, classFrom, classTo}]
  photo_url       TEXT,
  status          ENUM('Active','Inactive') DEFAULT 'Active',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_designation (designation)
);
```

### `users`

```sql
CREATE TABLE users (
  id              VARCHAR(36)  PRIMARY KEY,
  username        VARCHAR(100) UNIQUE NOT NULL,    -- Adm.No., Mobile, or 'superadmin'
  password_hash   VARCHAR(255) NOT NULL,           -- bcrypt hash
  role            ENUM('superadmin','admin','teacher','student','parent',
                       'driver','receptionist','accountant','librarian'),
  linked_id       VARCHAR(36),                     -- student.id or staff.id
  is_active       TINYINT(1) DEFAULT 1,
  last_login      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_linked (linked_id)
);
```

### `sessions`

```sql
CREATE TABLE sessions (
  id              VARCHAR(36)  PRIMARY KEY,
  name            VARCHAR(20)  NOT NULL,           -- e.g. '2025-26'
  start_date      DATE,
  end_date        DATE,
  is_current      TINYINT(1) DEFAULT 0,
  is_archived     TINYINT(1) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `fee_headings`

```sql
CREATE TABLE fee_headings (
  id              VARCHAR(36)  PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,           -- e.g. 'Tuition Fee'
  applicable_months JSON,                          -- ['April','May','June',...]
  is_active       TINYINT(1) DEFAULT 1,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `fee_plan`

```sql
CREATE TABLE fee_plan (
  id              VARCHAR(36)  PRIMARY KEY,
  heading_id      VARCHAR(36)  NOT NULL,
  class           VARCHAR(20)  NOT NULL,
  section         VARCHAR(5),                      -- NULL means all sections
  amount          DECIMAL(10,2) NOT NULL,
  session_id      VARCHAR(36),
  UNIQUE KEY uk_plan (heading_id, class, section, session_id),
  INDEX idx_class_section (class, section),
  FOREIGN KEY (heading_id) REFERENCES fee_headings(id) ON DELETE CASCADE
);
```

### `fee_receipts`

```sql
CREATE TABLE fee_receipts (
  id              VARCHAR(36)  PRIMARY KEY,
  receipt_no      VARCHAR(20)  NOT NULL,
  student_id      VARCHAR(36)  NOT NULL,
  student_name    VARCHAR(100),
  class           VARCHAR(20),
  section         VARCHAR(5),
  months          JSON,                            -- ['April','May']
  fee_breakup     JSON,                            -- [{heading, amount}]
  transport_amount DECIMAL(10,2) DEFAULT 0,
  other_charges   DECIMAL(10,2) DEFAULT 0,
  other_label     VARCHAR(100),
  discount        DECIMAL(10,2) DEFAULT 0,
  old_balance     DECIMAL(10,2) DEFAULT 0,
  net_fee         DECIMAL(10,2) NOT NULL,
  amount_paid     DECIMAL(10,2) NOT NULL,
  balance_after   DECIMAL(10,2) DEFAULT 0,        -- Positive = deficit, negative = credit
  payment_mode    ENUM('Cash','Cheque','Online','UPI') DEFAULT 'Cash',
  received_by     VARCHAR(100),                    -- Staff name
  received_role   VARCHAR(50),                     -- Staff role
  session_id      VARCHAR(36),
  payment_date    DATE NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_student (student_id),
  INDEX idx_date (payment_date),
  INDEX idx_session (session_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT
);
```

### `attendance`

```sql
CREATE TABLE attendance (
  id              VARCHAR(36)  PRIMARY KEY,
  student_id      VARCHAR(36)  NOT NULL,
  date            DATE NOT NULL,
  status          ENUM('Present','Absent','Late','Leave') NOT NULL,
  time_in         TIME,
  marked_by       VARCHAR(100),                    -- Staff name or 'RFID'/'QR'
  device_type     ENUM('Manual','RFID','QR','Biometric') DEFAULT 'Manual',
  session_id      VARCHAR(36),
  UNIQUE KEY uk_attendance (student_id, date),
  INDEX idx_date (date),
  INDEX idx_student (student_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
```

### `transport`

```sql
CREATE TABLE transport (
  id              VARCHAR(36)  PRIMARY KEY,
  route_name      VARCHAR(100) NOT NULL,
  bus_no          VARCHAR(20),
  driver_id       VARCHAR(36),                     -- staff.id
  pickup_points   JSON,                            -- [{name, monthly_fare}]
  is_active       TINYINT(1) DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `settings`

```sql
CREATE TABLE settings (
  setting_key     VARCHAR(100) PRIMARY KEY,
  setting_value   LONGTEXT,                        -- JSON or plain text
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Entity Relationships (ASCII Diagrams)

### Students → Fees

```
sessions ──────────┐
                   │
students ──────────┤
  id (PK)          │
  session_id (FK)  │
       │           │
       │           ▼
  fee_receipts ────┤
  student_id (FK)  │
  session_id (FK)  │
                   │
  fee_plan ────────┤
  session_id (FK)  │
       │           │
       ▼           │
  fee_headings ────┘
  id (PK)
```

### Staff → Users → Attendance

```
staff ─────────────┐
  id (PK)          │
       │           │
       ▼           │
  users ───────────┤
  linked_id (FK)   │
                   │
students ──────────┤
  id (PK)          │
       │           │
       ▼           │
  attendance ──────┘
  student_id (FK)
```

### Transport → Students

```
transport
  id (PK)
  pickup_points (JSON)
       │
       │ (matched by name)
       ▼
students
  transport_route
  transport_bus
  pickup_point
  transport_months (JSON)
```

---

## Sample SQL Queries

### Students by Class and Section

```sql
-- All active students in Class 5A for session 2025-26
SELECT s.admission_no, s.name, s.father_name, s.mobile
FROM students s
JOIN sessions ses ON s.session_id = ses.id
WHERE s.class = 'Class 5'
  AND s.section = 'A'
  AND s.status = 'Active'
  AND ses.name = '2025-26'
ORDER BY s.roll_no;
```

### Fees Due This Month

```sql
-- Students with unpaid fees for the current month (e.g. October)
SELECT
  s.admission_no,
  s.name,
  s.class,
  s.section,
  s.mobile,
  SUM(fp.amount) AS monthly_fee_due
FROM students s
JOIN fee_plan fp ON fp.class = s.class AND (fp.section = s.section OR fp.section IS NULL)
JOIN fee_headings fh ON fp.heading_id = fh.id
WHERE s.status = 'Active'
  AND JSON_CONTAINS(fh.applicable_months, '"October"')
  AND s.id NOT IN (
    SELECT DISTINCT student_id
    FROM fee_receipts
    WHERE JSON_CONTAINS(months, '"October"')
      AND session_id = (SELECT id FROM sessions WHERE is_current = 1)
  )
GROUP BY s.id, s.admission_no, s.name, s.class, s.section, s.mobile
ORDER BY s.class, s.section, s.name;
```

### Attendance Summary for a Date

```sql
-- Attendance summary by class for a given date
SELECT
  s.class,
  s.section,
  COUNT(*) AS total_students,
  SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
  SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent,
  ROUND(SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS attendance_pct
FROM students s
LEFT JOIN attendance a ON a.student_id = s.id AND a.date = '2025-10-15'
WHERE s.status = 'Active'
  AND s.session_id = (SELECT id FROM sessions WHERE is_current = 1)
GROUP BY s.class, s.section
ORDER BY s.class, s.section;
```

### Staff Payroll Calculation

```sql
-- Net salary calculation for October 2025 (based on attendance)
SELECT
  st.name,
  st.designation,
  st.salary_gross,
  COUNT(a.id) AS days_present,
  26 AS working_days,
  ROUND(st.salary_gross * COUNT(a.id) / 26, 0) AS net_salary
FROM staff st
LEFT JOIN attendance a ON a.student_id = st.id
  AND a.date BETWEEN '2025-10-01' AND '2025-10-31'
  AND a.status = 'Present'
WHERE st.status = 'Active'
GROUP BY st.id, st.name, st.designation, st.salary_gross
ORDER BY st.designation, st.name;
```

### Fee Collection Summary by Month

```sql
-- Total fees collected per month for session 2025-26
SELECT
  JSON_UNQUOTE(JSON_EXTRACT(months, '$[0]')) AS month,
  COUNT(*) AS receipt_count,
  SUM(amount_paid) AS total_collected,
  SUM(net_fee) AS total_billed,
  SUM(net_fee - amount_paid) AS total_pending
FROM fee_receipts
WHERE session_id = (SELECT id FROM sessions WHERE name = '2025-26')
GROUP BY month
ORDER BY FIELD(month,
  'April','May','June','July','August','September',
  'October','November','December','January','February','March'
);
```
