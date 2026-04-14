# ESSL / ZKTeco Biometric Integration

SHUBH SCHOOL ERP supports IP-based biometric attendance devices from ESSL, ZKTeco, Realand, and compatible manufacturers. Punch data syncs automatically to the attendance module.

---

## Requirements

- Biometric device must support **TCP/IP network communication** (most ESSL and ZKTeco devices do)
- Device and the computer running SHUBH ERP must be on the **same local network (LAN/WiFi)**
- Device IP must be **static** (not DHCP) so the ERP can always reach it
- For **cPanel hosted** deployments: a PHP proxy script is required (see Step 4)

---

## Step 1 — Configure Device Network Settings

On the ESSL/ZKTeco biometric device:

1. Press **Menu** on the device
2. Navigate to **Communication → Ethernet** (or **Comm** → **Network**)
3. Set the following:

| Setting | Recommended Value | Notes |
|---------|-------------------|-------|
| IP Address | 192.168.1.201 | Static IP in your LAN subnet |
| Subnet Mask | 255.255.255.0 | Same as your router subnet |
| Gateway | 192.168.1.1 | Your router's IP |
| Port | 4370 | Default ZKTeco SDK port |
| Device ID | 1 | Check your device's hardware settings |

4. Save and restart the device
5. Ping the IP from your computer to verify connectivity: `ping 192.168.1.201`

---

## Step 2 — Add Device in ERP

1. Go to **Attendance → Biometric Devices** tab
2. Click **Add Device** button
3. Enter:

| Field | Example | Description |
|-------|---------|-------------|
| Device Name | Main Gate | Label for identification |
| Device IP | 192.168.1.201 | Static IP set in Step 1 |
| Port | 4370 | Default ZKTeco port |
| Device ID | 1 | From device settings |

4. Click **Test Connection** — a green success message confirms reachability
5. Click **Sync Attendance** to pull all punch records from the device

---

## Step 3 — Map Biometric IDs to Students/Staff

Each enrolled fingerprint on the device has a User ID number. These must be mapped to ERP records:

1. Go to **Attendance → Biometric ID Mapping**
2. Click **Add Mapping**
3. For each person:
   - Enter the **Device User ID** (from device: Menu → User Management → View All)
   - Select the matching **Student** or **Staff** from the ERP dropdown
4. Save the mapping
5. Run **Sync Attendance** — punch records will now match the correct person

> **Tip:** Export the device user list to CSV from the device management software, then bulk-import mappings.

---

## Step 4 — PHP Proxy Script for cPanel Hosting

Browser JavaScript cannot directly connect to the biometric device due to CORS restrictions. For cPanel-hosted deployments, install this PHP proxy:

**Upload to:** `public_html/api/biometric-proxy.php`

```php
<?php
/**
 * SHUBH SCHOOL ERP — Biometric Proxy
 * Bridges the browser and ZKTeco/ESSL device via TCP
 * Upload to: public_html/api/biometric-proxy.php
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Content-Type: application/json');

$ip      = $_GET['ip']      ?? '';
$port    = (int)($_GET['port'] ?? 4370);
$action  = $_GET['action']  ?? 'sync';

if (!$ip || !filter_var($ip, FILTER_VALIDATE_IP)) {
    echo json_encode(['error' => 'Valid device IP required']);
    exit;
}

// Connect to ZKTeco device via TCP (5 second timeout)
$sock = @fsockopen($ip, $port, $errno, $errstr, 5);
if (!$sock) {
    echo json_encode(['error' => "Cannot connect to $ip:$port — $errstr ($errno)"]);
    exit;
}

// ZKLib session initiation command
$cmd_init  = pack('H*', '5050827d08000000000000000000000000000000');
// ZKLib get attendance log command
$cmd_attnd = pack('H*', '5050827d08000000000000003c00000000000000');

fwrite($sock, $cmd_init);
usleep(500000); // 0.5s wait
fwrite($sock, $cmd_attnd);

$data = '';
stream_set_timeout($sock, 3);
while (!feof($sock)) {
    $chunk = fread($sock, 1024);
    if ($chunk === false || strlen($chunk) === 0) break;
    $data .= $chunk;
}
fclose($sock);

echo json_encode([
    'status'   => 'ok',
    'ip'       => $ip,
    'port'     => $port,
    'bytes'    => strlen($data),
    'data_b64' => base64_encode($data),
]);
```

**Configure in ERP:**
1. Go to **Attendance → Biometric Settings**
2. Set **Proxy URL** to `https://yourdomain.com/api/biometric-proxy.php`
3. Test connection — the ERP will route all device calls through this PHP script

---

## Auto-Sync Schedule (cPanel Cron Job)

To sync attendance automatically every 30 minutes, add a cPanel Cron Job:

**cPanel → Cron Jobs → Add New Cron Job:**

```
Schedule: Every 30 minutes  (*/30 * * * *)
Command:  curl "https://yourdomain.com/api/biometric-proxy.php?ip=192.168.1.201&port=4370&action=sync" > /dev/null 2>&1
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Test Connection fails | Verify device IP and port. Ping device from your PC. Check both are on same LAN subnet |
| Connection timeout | Temporarily disable Windows Firewall. Add port 4370 to firewall exceptions |
| Punch data syncs but wrong person | Re-check Biometric ID Mapping — Device User ID must exactly match the mapping |
| No data after sync | Device log may be empty. Check via Menu → Attendance Records on device |
| Works on LAN but not on cPanel | Install and configure the PHP proxy script described above |
| Proxy script returns blank | Check PHP version is 7.4+ in cPanel. Verify `fsockopen` is enabled |
| Device shows "connection refused" | Confirm device is powered on, connected to LAN, and IP is reachable |

---

## Supported Device Models

Tested and compatible (ZKLib TCP protocol):

| Brand | Compatible Models |
|-------|------------------|
| ESSL | iFace 700, iFace302, iClock 580, T9 |
| ZKTeco | ZK4500, F18, F22, MB360, SpeedFace |
| Realand | A-C021, A-C091 |
| Other | Any device supporting ZKLib TCP SDK on port 4370 |

> If your device model is not listed, check if it supports "SDK TCP protocol" — most modern ESSL and ZKTeco devices do.
