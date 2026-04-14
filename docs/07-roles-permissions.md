# Roles & Permissions — SHUBH SCHOOL ERP

SHUBH SCHOOL ERP has **9 user roles** with different access levels. Super Admin controls all permissions and can add/manage users for each role.

---

## Role Access Matrix

| Role | Students | Fees | Attendance | Exams | HR/Payroll | Transport | Inventory | Communication | Settings |
|------|----------|------|------------|-------|------------|-----------|-----------|---------------|----------|
| **Super Admin** | Full | Full | Full | Full | Full | Full | Full | Full | Full |
| **Admin** | Full | Full | Full | Full | View/Add | Full | Full | Full | Limited |
| **Accountant** | View | Full | View | View | View | View | View | View | No |
| **Receptionist** | View/Add | View | View/Mark | View | No | View | No | No | No |
| **Teacher** | Own classes | No | Mark/View | View | No | No | No | No | No |
| **Parent** | Own child | Own receipts | Own child | Own child | No | No | No | No | No |
| **Student** | Own profile | Own receipts | Own | Own | No | No | No | No | No |
| **Driver** | Route list | No | QR scan | No | No | Own route | No | No | No |
| **Librarian** | View only | No | View | No | No | No | No | No | No |

---

## Fee Receipt Rights

| Role | View | Edit | Delete | Reprint |
|------|------|------|--------|---------|
| Super Admin | ✅ All | ✅ | ✅ | ✅ |
| Admin | ✅ All | ✅ | ❌ | ✅ |
| Accountant | ✅ All | ✅ | ❌ | ✅ |
| Receptionist | ✅ All | ❌ | ❌ | ✅ |
| Teacher | ❌ | ❌ | ❌ | ❌ |
| Parent | Own children only | ❌ | ❌ | ❌ |
| Student | Own only | ❌ | ❌ | ❌ |

> Edit/Delete rights for Admin and Accountant are granted by Super Admin in **Settings → User Management → Permissions**.

---

## Role Descriptions

### Super Admin
- Full unrestricted access to all 15+ modules
- Can create/delete sessions, run Promote Students
- Can reset any user's password
- Can edit data in any session (including archived sessions)
- Can toggle online payment gateways (GPay, Razorpay, PayU)
- Can configure WhatsApp API keys

### Admin
- All modules except Super Admin-level settings
- Cannot perform Factory Reset or delete sessions
- Cannot reset Super Admin password

### Accountant
- Full Fees module access (collect, register, dues, accounts)
- Full Expenses/Income module
- Reports access
- Cannot access HR payroll or system settings

### Receptionist
- Can add and view students
- Can mark attendance
- Basic fees view (no receipt editing)
- No access to HR, inventory, or settings

### Teacher
- Mark attendance for assigned classes only
- View student list for their classes
- Assign and view homework
- View class timetable and exam timetable
- No fee access

### Parent
- View own children's fee receipts and payment history
- View own children's attendance records
- View timetable and exam timetable
- View homework assignments
- Can change own password

### Student
- View own attendance
- View own fee receipts
- View own timetable and homework
- Can change own password

### Driver
- QR Attendance scanner (scan student admit card QR to mark present)
- View own route details and student list for the route
- Dashboard shows today's route summary

### Librarian
- View student list (read-only)
- View basic attendance
- No fee, HR, or settings access

---

## Adding New Users

### Teachers, Drivers, Support Staff
`HR → Staff Directory → Add Staff`
- Credentials auto-created: Username = Mobile No., Password = DOB (ddmmyyyy)
- For teachers: subject-class range wizard opens in Step 2

### Students
`Students → Add Student`
- Credentials auto-created: Username = Admission No., Password = DOB (ddmmyyyy)

### Parents
- Auto-created from student guardian mobile number
- Username = Mobile No., Password = Mobile No.
- Parents with multiple children share one login (all children's data shown)

### Admin / Accountant / Receptionist / Librarian
`Settings → User Management → Add Staff User` (Super Admin only)
- Enter full name, position, mobile number (becomes username), and password
- User can change own password after first login

---

## Password Management

### Users changing their own password
All logged-in users can change their password via the **user menu (top-right) → Change Password**.

### Super Admin resetting any user's password
`Settings → User Management`
- Find the user in the list
- Click the **Reset Password** icon
- Enter a new temporary password
- Share the new password with the user

### Recovering Super Admin password
If the Super Admin password is forgotten:
1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Find key `shubh_erp_user_passwords`
4. Edit the `superadmin` value to `admin123`
5. Login with the reset password and change it immediately

Or perform a **Factory Reset** (Settings → Data → Factory Reset) if starting fresh — this returns everything to default including `superadmin / admin123`.
