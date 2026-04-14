# REST API Reference — SHUBH SCHOOL ERP

Complete reference for the PHP REST API backend (`/api/`) used in MySQL Mode.

---

## Base URL

```
https://yourdomain.com/api
```

All endpoints are relative to this base URL.

---

## Authentication

The API uses **Bearer JWT tokens** for authentication.

### Login to Get a Token

```http
POST /auth/login
Content-Type: application/json

{
  "username": "superadmin",
  "password": "admin123"
}
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "superadmin",
  "user_id": "abc-123"
}
```

### Using the Token

Include the token in the `Authorization` header for all subsequent requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Tokens expire after **24 hours**. The ERP auto-refreshes tokens on re-login.

---

## Response Format

All responses follow this structure:

```json
{
  "success": true | false,
  "data": { ... } | [ ... ],
  "message": "Optional message",
  "error": "Error description (only when success: false)"
}
```

HTTP status codes:
- `200` — Success
- `201` — Created
- `400` — Bad request (missing/invalid fields)
- `401` — Unauthorized (missing or expired token)
- `403` — Forbidden (insufficient role permissions)
- `404` — Not found
- `500` — Server error

---

## Endpoints

### Auth Module (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | Login and get JWT token | No |
| POST | `/auth/logout` | Invalidate token | Yes |
| POST | `/auth/change-password` | Change own password | Yes |
| POST | `/auth/reset-password` | Reset any user's password | Super Admin |
| GET | `/auth/me` | Get current user info | Yes |

**Example: Change Password**
```http
POST /auth/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "old_password": "admin123",
  "new_password": "NewStrongPass@123"
}
```

---

### Students Module (`/students`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/students` | List all students (with filters) | Yes |
| GET | `/students/{id}` | Get single student | Yes |
| POST | `/students` | Add new student | Admin+ |
| PUT | `/students/{id}` | Update student | Admin+ |
| DELETE | `/students/{id}` | Delete student | Super Admin |
| GET | `/students/export` | Export as CSV | Admin+ |
| POST | `/students/import` | Import from CSV | Admin+ |
| GET | `/students/search?q={term}` | Search by name/mobile/village | Yes |

**Query Parameters for GET `/students`:**
```
?class=Class+5
&section=A
&status=Active
&session_id=abc-123
&gender=Male
&category=OBC
&route=Route+1
```

**Example: Add Student**
```http
POST /students
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Rahul Kumar",
  "admission_no": "2025042",
  "father_name": "Suresh Kumar",
  "mobile": "9876543210",
  "dob": "2012-04-01",
  "class": "Class 5",
  "section": "A",
  "gender": "Male",
  "session_id": "session-uuid"
}
```

---

### Fees Module (`/fees`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/fees/headings` | List fee headings | Yes |
| POST | `/fees/headings` | Create fee heading | Super Admin |
| PUT | `/fees/headings/{id}` | Update heading | Super Admin |
| DELETE | `/fees/headings/{id}` | Delete heading | Super Admin |
| GET | `/fees/plan` | Get fee plan | Yes |
| GET | `/fees/plan?class={}&section={}` | Get plan for class/section | Yes |
| POST | `/fees/plan` | Set fee amount | Super Admin |
| GET | `/fees/receipts` | List receipts (with filters) | Yes |
| GET | `/fees/receipts/{id}` | Get single receipt | Yes |
| POST | `/fees/receipts` | Create fee receipt | Accountant+ |
| PUT | `/fees/receipts/{id}` | Edit receipt | Admin+ |
| DELETE | `/fees/receipts/{id}` | Delete receipt | Super Admin |
| GET | `/fees/due?months[]=April&class=Class+5` | Get dues report | Admin+ |
| GET | `/fees/accounts` | Account-wise summary | Accountant+ |

**Example: Create Receipt**
```http
POST /fees/receipts
Authorization: Bearer {token}
Content-Type: application/json

{
  "student_id": "student-uuid",
  "months": ["April", "May"],
  "fee_breakup": [
    {"heading": "Tuition Fee", "amount": 1200},
    {"heading": "Lab Fee", "amount": 300}
  ],
  "transport_amount": 500,
  "other_charges": 150,
  "other_label": "Tie",
  "discount": 0,
  "old_balance": 200,
  "net_fee": 2350,
  "amount_paid": 2000,
  "balance_after": 350,
  "payment_mode": "Cash",
  "payment_date": "2025-10-15"
}
```

---

### Attendance Module (`/attendance`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/attendance` | Get attendance records | Yes |
| GET | `/attendance?date=2025-10-15&class=Class+5` | By date and class | Yes |
| POST | `/attendance` | Mark attendance (bulk) | Teacher+ |
| PUT | `/attendance/{id}` | Update single record | Teacher+ |
| GET | `/attendance/summary?date=2025-10-15` | Class-wise summary | Yes |
| GET | `/attendance/student/{id}?month=October` | Student monthly attendance | Yes |

**Example: Mark Attendance (Bulk)**
```http
POST /attendance
Authorization: Bearer {token}
Content-Type: application/json

{
  "date": "2025-10-15",
  "class": "Class 5",
  "section": "A",
  "records": [
    {"student_id": "uuid-1", "status": "Present", "time_in": "08:15:00"},
    {"student_id": "uuid-2", "status": "Absent"},
    {"student_id": "uuid-3", "status": "Late", "time_in": "09:45:00"}
  ],
  "device_type": "Manual"
}
```

---

### HR Module (`/hr`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/hr/staff` | List all staff | Yes |
| GET | `/hr/staff/{id}` | Get staff member | Yes |
| POST | `/hr/staff` | Add staff member | Admin+ |
| PUT | `/hr/staff/{id}` | Update staff | Admin+ |
| DELETE | `/hr/staff/{id}` | Delete staff | Super Admin |
| GET | `/hr/payroll?month=October&year=2025` | Payroll summary | Admin+ |
| POST | `/hr/payroll/generate` | Generate payroll | Admin+ |

---

### Academics Module (`/academics`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/academics/classes` | List classes and sections | Yes |
| POST | `/academics/classes` | Add class/section | Admin+ |
| DELETE | `/academics/classes/{id}` | Remove class/section | Super Admin |
| GET | `/academics/subjects` | List subjects with class assignments | Yes |
| POST | `/academics/subjects` | Add subject | Admin+ |
| PUT | `/academics/subjects/{id}` | Update subject | Admin+ |

---

### Transport Module (`/transport`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/transport/routes` | List all routes | Yes |
| GET | `/transport/routes/{id}` | Get route with pickup points | Yes |
| POST | `/transport/routes` | Add route | Admin+ |
| PUT | `/transport/routes/{id}` | Update route/pickup points | Admin+ |
| DELETE | `/transport/routes/{id}` | Delete route | Super Admin |

---

### Inventory Module (`/inventory`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/inventory/items` | List all items | Yes |
| POST | `/inventory/items` | Add item | Admin+ |
| PUT | `/inventory/items/{id}` | Update item | Admin+ |
| POST | `/inventory/purchase` | Record purchase | Admin+ |
| POST | `/inventory/sale` | Record sale | Admin+ |
| GET | `/inventory/report` | Stock summary report | Admin+ |

---

### Settings Module (`/settings`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/settings` | Get all settings | Yes |
| POST | `/settings` | Update setting (key-value) | Admin+ |
| GET | `/settings/school-profile` | Get school profile | Yes |
| POST | `/settings/school-profile` | Update school profile | Admin+ |

**Example: Update Setting**
```http
POST /settings
Authorization: Bearer {token}
Content-Type: application/json

{
  "key": "whatsapp_api_key",
  "value": "your-api-key"
}
```

---

### Backup & Sync Module (`/backup`, `/sync`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/backup/export` | Export full database as JSON | Super Admin |
| POST | `/backup/import` | Import JSON backup to database | Super Admin |
| POST | `/backup/reset` | Factory reset (truncate all tables) | Super Admin |
| GET | `/sync/status` | Check server status and version | Yes |
| POST | `/sync/push` | Push localStorage data to server | Admin+ |
| GET | `/sync/pull?since={timestamp}` | Pull changes since last sync | Yes |

**Example: Pull Changes (5-second polling)**
```http
GET /sync/pull?since=2025-10-15T08:30:00Z
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "data": {
    "students": [...],      // Changed since timestamp
    "fee_receipts": [...],  // Changed since timestamp
    "attendance": [...]     // Changed since timestamp
  },
  "server_time": "2025-10-15T08:35:00Z"
}
```

---

### Migration Module (`/migrate`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/migrate.php?action=run` | Create all tables (run once) | No (IP restricted) |
| GET | `/migrate.php?action=status` | Check table status | No |
| GET | `/migrate.php?action=rollback` | Drop all tables | No (Super Admin only) |

> The migration endpoint is intended to be run directly in the browser. It is not behind JWT auth but is accessible only during initial setup. After migration, it is safe to leave in place — subsequent runs are no-ops.

---

## Error Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| `AUTH_REQUIRED` | No token provided | Missing `Authorization` header |
| `AUTH_EXPIRED` | Token expired | Token older than 24 hours — re-login |
| `AUTH_INVALID` | Bad token | Token tampered or wrong secret |
| `ROLE_FORBIDDEN` | Insufficient role | Action requires higher permission |
| `NOT_FOUND` | Record not found | Wrong ID in URL |
| `DUPLICATE_ENTRY` | Unique constraint violated | Admission No. or mobile already exists |
| `DB_ERROR` | MySQL error | Check config.php credentials |
| `VALIDATION_ERROR` | Missing required fields | Check request body |

---

## Rate Limits

- No hard rate limits for internal use
- WhatsApp proxy endpoint: 1 request/second recommended (wacoder.in limit)
- Sync pull endpoint: called every 5 seconds by the ERP automatically

---

## CORS Configuration

The API allows requests only from the domain configured in `ALLOWED_ORIGIN` in `config.php`. To allow multiple domains (e.g. staging + production):

```php
$allowed_origins = [
    'https://yourdomain.com',
    'https://erp.yourdomain.com'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}
```
