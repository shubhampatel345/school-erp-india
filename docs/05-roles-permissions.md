# Roles & Permissions

## All Roles

| Role | Description | Module Access |
|------|-------------|---------------|
| Super Admin | Full system access | All modules + Settings + User Management |
| Admin | School administrator | All modules except Super Admin settings |
| Teacher | Teaching staff | Attendance, Homework, Timetable, own classes |
| Parent | Student guardian | Own children's fees, attendance, timetable |
| Student | Enrolled student | Own attendance, fee receipts, timetable, homework |
| Driver | Transport staff | QR Attendance scanner, own route info |
| Receptionist | Front desk staff | Student info, attendance, basic fees view |
| Accountant | Finance staff | Full fees module, reports, expenses |
| Librarian | Library staff | Student list, basic attendance view |

## Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `superadmin` | `admin123` (changeable) |
| Teacher | Mobile No. | DOB in ddmmyyyy format |
| Student | Admission No. | DOB in ddmmyyyy format |
| Parent | Guardian Mobile No. | Same mobile number |
| Driver | Mobile No. | DOB in ddmmyyyy format |

## Fee Module Permissions

| Role | View | Edit | Delete |
|------|------|------|--------|
| Super Admin | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ❌ |
| Accountant | ✅ | ✅ | ❌ |
| Receptionist | ✅ | ❌ | ❌ |
| Teacher | ❌ | ❌ | ❌ |
| Parent/Student | Own only | ❌ | ❌ |

## Password Reset

- Users can change their own password: top-right user menu → Change Password
- Super Admin can reset any user's password: Settings → User Management → Reset Password
- Super Admin password reset: edit `shubh_erp_user_passwords` in browser DevTools if locked out
