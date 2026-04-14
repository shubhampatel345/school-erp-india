# Roles & Permissions — SHUBH SCHOOL ERP

## All Roles

| Role | Description | Access Level |
|------|-------------|-------------|
| Super Admin | Full system access | All modules + all sessions (including archived) + User Management + Factory Reset |
| Admin | School administrator | All modules except Super Admin settings. Can reset non-admin passwords |
| Teacher | Teaching staff | Attendance (own classes), Homework, Timetable view, Student list (assigned classes) |
| Parent | Student guardian | Own children's fees, attendance, timetable, notices, homework |
| Student | Enrolled student | Own attendance, fee receipts, timetable, homework, exam results |
| Driver | Transport staff | QR Attendance scanner, own route info and student list |
| Receptionist | Front desk staff | Student info (view/add), attendance, basic fees view. No delete rights |
| Accountant | Finance staff | Full fees module, expense ledger, accounts, reports. No HR or settings |
| Librarian | Library staff | Student list (view only), basic attendance view, custom access |

---

## Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `superadmin` | `admin123` (change on first login) |
| Admin | `admin` | `admin123` (change on first login) |
| Teacher | Mobile No. | DOB in ddmmyyyy format |
| Student | Admission No. | DOB in ddmmyyyy format |
| Parent | Father's Mobile No. | Same mobile number (supports multiple children) |
| Driver | `driver` or Mobile No. | `driver123` or DOB if added via HR |
| Receptionist / Accountant / Librarian | Mobile No. | Set by Super Admin at user creation |

---

## Fee Module Permissions

| Role | View Receipts | Edit Receipts | Delete Receipts | Reprint |
|------|--------------|---------------|-----------------|---------|
| Super Admin | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ❌ | ✅ |
| Accountant | ✅ | ✅ | ❌ | ✅ |
| Receptionist | ✅ | ❌ | ❌ | ✅ |
| Teacher | ❌ | ❌ | ❌ | ❌ |
| Parent | Own children only | ❌ | ❌ | ❌ |
| Student | Own only | ❌ | ❌ | ❌ |

---

## Session Access

| Role | Current Session | Archived Sessions |
|------|----------------|-------------------|
| Super Admin | Full read/write | Full read/write |
| Admin | Full read/write | Read-only |
| All others | As per module permissions | Read-only |

---

## Password Management

### Users change their own password
Top-right user menu → **Change Password** (available to all logged-in users)

### Super Admin resets any password
**Settings → User Management** → find user → click **Reset Password** button

### If Super Admin is locked out
Open browser DevTools (F12) → Application → Local Storage → find key `shubh_erp_user_passwords` → edit the `superadmin` entry to `admin123`

---

## Adding New Staff Users (Super Admin only)

1. Go to **Settings → User Management**
2. Click **Add Staff User**
3. Enter:
   - Full Name
   - Position (Admin, Receptionist, Accountant, Librarian, Driver, etc.)
   - Mobile Number (becomes the username)
   - Password (user can change after first login)
4. User can log in immediately

---

## Teacher Assignment

When adding a teacher in HR → Staff Directory, the Subject-Class Range Wizard (Step 2) allows:

```
Example Teacher: Mrs. Sharma
  Subject 1: English     → Class 1 to Class 5
  Subject 2: Hindi       → Class 3 to Class 8
  Subject 3: Art         → Class 6 to Class 10
```

This data automatically feeds:
- Teacher Timetable Maker (Academics)
- Class-wise subject assignment checks
- Conflict detection in timetable generation

---

## Parent Login

Parents use their mobile number as both username and password. One parent login can see all children who share the same guardian mobile number.

Parent dashboard shows:
- All children listed (if multiple)
- Each child's: fees due, recent receipts, attendance this month, upcoming homework, exam timetable
