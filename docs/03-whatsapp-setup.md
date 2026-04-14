# WhatsApp Setup — SHUBH SCHOOL ERP

SHUBH SCHOOL ERP integrates with **wacoder.in** for real WhatsApp messaging. Send fee receipts, absent alerts, dues reminders, birthday wishes, and exam notifications directly to parents and staff.

---

## Step 1 — Get API Keys from wacoder.in

1. Visit **[wacoder.in](https://wacoder.in)** and register/login
2. Connect your WhatsApp number by scanning the QR code shown in the dashboard
3. Go to **API Credentials** in the wacoder dashboard
4. Copy your `app_key` and `auth_key`

> Keep these keys private — they authenticate all messages sent from your school account.

---

## Step 2 — Enter Keys in SHUBH SCHOOL ERP

1. Go to **Settings → WhatsApp API** (Super Admin only)
2. Paste your `app_key` in the App Key field
3. Paste your `auth_key` in the Auth Key field
4. Toggle **Enable WhatsApp** to ON
5. Enter a test mobile number and click **Send Test Message**
6. A green success message confirms your connection is live

### API Request Format (for reference)

```bash
curl --request POST 'https://wacoder.in/api/whatsapp-web/send-message' \
  --form 'app_key="YOUR_APP_KEY"' \
  --form 'auth_key="YOUR_AUTH_KEY"' \
  --form 'to="91XXXXXXXXXX"' \
  --form 'type="text"' \
  --form 'message="Fee receipt generated for Rahul Sharma - April 2025. Amount: ₹2500"'
```

> ⚠️ Test messages may show a CORS error in preview mode. Deploy to your cPanel domain for real sends to work correctly.

---

## Step 3 — Configure Auto-Send Scheduler

Go to **Communication → Auto-Send Scheduler** and enable the events you want:

| Event | Recipient | Trigger |
|-------|-----------|---------|
| Absent Alert | Parent (guardian mobile) | When student marked absent in Attendance |
| Fee Due Reminder | Parent | X days before the 15th of each month |
| Fee Receipt | Parent | Immediately after saving a fee collection |
| Birthday Wish | Student / Parent | On student's date of birth |
| Exam Timetable | Parent / Student | When exam timetable is published |
| Result Published | Parent / Student | When exam results are saved |
| Homework Deadline | Student | Day before assignment due date |

For each event:
- Toggle ON/OFF
- Set timing (e.g. "3 days before" for reminders)
- Select recipient group (Parent, Student, Teacher, or All)
- Select channel (WhatsApp, RCS, or Both)

---

## WhatsApp Auto-Reply Bot (Admission No. Lookup)

Parents can send their child's Admission No. to the school's WhatsApp number and receive an automated reply with:
- Student name, class, and section
- Attendance summary (present/absent this month)
- Pending fees amount and last payment date

### Setup Requirements

This feature requires:
1. A wacoder.in webhook configured to point to your server
2. A PHP endpoint on your cPanel server that receives the webhook, queries ERP data, and sends the reply

### PHP Webhook Script (for cPanel)

Upload this to `public_html/api/whatsapp-webhook.php`:

```php
<?php
// WhatsApp auto-reply webhook
header('Content-Type: application/json');

$body = json_decode(file_get_contents('php://input'), true);
$from = $body['from'] ?? '';
$message = trim($body['message'] ?? '');

// Student lookup by admission number
// (Integrate with your ERP data export here)
$admNo = strtoupper($message);

// Send auto-reply
$reply = "Hi! We received your query for Admission No: $admNo\n" .
         "Please allow 1-2 minutes for our system to fetch details.\n" .
         "For urgent help, call us directly.";

$ch = curl_init('https://wacoder.in/api/whatsapp-web/send-message');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'app_key'  => 'YOUR_APP_KEY',
    'auth_key' => 'YOUR_AUTH_KEY',
    'to'       => $from,
    'type'     => 'text',
    'message'  => $reply,
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
curl_close($ch);

echo json_encode(['status' => 'sent', 'result' => $result]);
```

---

## Troubleshooting WhatsApp

| Problem | Solution |
|---------|----------|
| CORS error in test | Normal in preview — deploy to real domain |
| "Unauthorized" error | Check app_key and auth_key are correct |
| Messages not received | Verify guardian mobile in student profile has country code (91XXXXXXXXXX) |
| Test message works but auto-send doesn't | Check that the event is toggled ON in Auto-Send Scheduler |
| WhatsApp session disconnected | Re-scan QR code in wacoder.in dashboard |

---

## Message Templates

The ERP sends these message templates (customizable in Communication → WhatsApp):

**Fee Receipt:**
```
Dear [Parent Name],
Fee receipt generated for [Student Name] - [Class]
Months: [April, May]  |  Amount: ₹[2500]
Receipt No: [R-001]  |  Date: [15-Apr-2025]
Thank you — SHUBH SCHOOL
```

**Absent Alert:**
```
Dear [Parent Name],
[Student Name] ([Class]) was ABSENT today ([Date]).
If this is incorrect, please contact the school.
— SHUBH SCHOOL
```

**Fee Due Reminder:**
```
Dear [Parent Name],
Fees for [Student Name] are due.
Amount: ₹[2500]  |  Due Date: 15th of this month
Pay at school or contact Admin.
— SHUBH SCHOOL
```
