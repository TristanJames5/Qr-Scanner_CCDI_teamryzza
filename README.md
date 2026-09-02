# CCDI QRScan — Web-Based Dynamic QR Code Attendance System
**Capstone Project — Computer Communication Development Institute (CCDI)**

CCDI QRScan is a web-based, real-time classroom attendance management system designed for university classrooms and computer laboratories. It completely replaces fragile paper roll-call sheets and costly biometric hardware by utilizing students' own smartphones as the scanning device, coupled with dynamic server-rotating cryptographic QR codes.

---

## 🚀 Key Features

1. **Anti-Proxy Dynamic Rotating QR Engine**
   - Cryptographically signed tokens (HMAC-SHA256) refreshed every 30 seconds.
   - Screenshots and shared photos expire instantly.
   - High-contrast projector HUD with live 30-second countdown ring and dynamic 6-digit backup codes.

2. **Mobile-First Student Scanner**
   - Zero-installation web app using the HTML5 Camera API (`html5-qrcode`).
   - Celebratory visual feedback, audio chime, and timestamped attendance receipt.
   - Comprehensive student portal displaying individual attendance rate % and history.

3. **Real-Time Instructor Projector HUD**
   - Live WebSocket (Socket.io) telemetry streaming incoming scans with zero page refresh.
   - Real-time counters: Present (On-Time), Late (After Cutoff), Absent, and Class Turnout %.
   - Audit-logged manual override modal for exceptional cases (e.g. dead battery, damaged camera).
   - Single-click session finalization that automatically records unscanned students as Absent.

4. **Intelligent Absenteeism Pattern Detection**
   - Algorithmic query engine that automatically flags students with $\ge N$ absences in their last $M$ sessions (e.g. absent in 4 of last 5 sessions).
   - Color-coded risk badges (`CRITICAL`, `HIGH`, `WARNING`, `HABITUAL_LATE`).
   - One-click notification email generation for academic counseling.

5. **Administrative Controls & Data Export**
   - Faculty and section management with CSV bulk roster import.
   - Full-term attendance matrix and per-session CSV reports ready for grading and registrar submission.

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 18 (Vite) + Tailwind CSS + Lucide Icons | High-performance SPA with modern responsive glassmorphism UI |
| **Mobile Scanner** | `html5-qrcode` + Web Audio API | Low-latency in-browser camera barcode processing with zero app store friction |
| **Real-time Layer** | Socket.io (WebSockets) | Sub-100ms real-time event broadcasting to instructor projector screens |
| **Backend** | Node.js + Express.js | Event-driven RESTful API with cryptographic HMAC-SHA256 token generation |
| **Database** | SQLite via Node.js built-in `DatabaseSync` (WAL Mode) | Zero-setup, self-contained relational database with ACID transactions and foreign keys |
| **Security** | JWT + bcrypt.js + HMAC-SHA256 | Role-Based Access Control (`admin`, `instructor`, `student`) with signed rotation |

---

## 🔑 Pre-Seeded Demo Accounts (Instant Testing)

The database is pre-populated with realistic CCDI college data. You can log in using these credentials or click the **1-Click Demo Accounts** selector on the login page:

| Role | Name | Email / Student ID | Password | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Dr. Maria Victoria Cruz | `admin@ccdi.edu.ph` | `admin123` | Dean of Studies / Full Admin Access |
| **Instructor** | Prof. Roberto Santos | `prof.santos@ccdi.edu.ph` | `instructor123` | Instructor for `BSIT-3A` (Web Systems) |
| **Instructor** | Engr. Ana Reyes | `engr.reyes@ccdi.edu.ph` | `instructor123` | Instructor for `BSCS-2B` (Data Structures) |
| **Student** | Juan Dela Cruz | `2023-00101` | `student123` | Good Standing (100% Attendance Rate) |
| **Student** | Mark Anthony Ramos | `2023-00107` | `student123` | Chronic Absentee (Absent in 4 of last 5 sessions) |
| **Student** | Princess Mae Villanueva | `2023-00114` | `student123` | High Risk (Absent in 3 of 5 sessions) |

---

## 🏃 Setup and Quick Start

### 1. Prerequisites
- Node.js (v18 or higher; Node.js v24 recommended)
- npm

### 2. Installation & Running
From the root directory (`ccdi-qrscan`):

```bash
# Install dependencies and start both backend and frontend concurrently:
npm install
npm run dev
```

The application will be accessible at:
- **Frontend Web App**: `http://localhost:5173`
- **Backend REST & WebSocket API**: `http://localhost:5000`

---

## 🎬 How to Demo the Complete End-to-End Flow

Follow this 5-minute script for presentations and capstone panel defense:

1. **Step 1: Launch Active Session as Instructor**
   - Open `http://localhost:5173/login` in your main browser window.
   - Click **Prof. Roberto Santos (Instructor)** to log in.
   - Click **Start Class Session** on section `BSIT-3A (Web Systems and Technologies)`.
   - The **Fullscreen Projector View** opens with the dynamic rotating QR code, the 30-second countdown timer, the 6-character backup code, and the live roster counter.

2. **Step 2: Simulate Student Scan in Second Window / Mobile View**
   - Open an Incognito window (or mobile phone on the same network) to `http://localhost:5173/login`.
   - Click **Juan Dela Cruz (Student)** and sign in.
   - Click **Open QR Scanner** or navigate to `/student/scan`.
   - Point your camera at the QR code (or type the 6-digit backup code displayed on the screen).
   - Observe instant celebratory confetti and a `PRESENT` receipt on the student window.
   - Look back at the instructor screen: Juan Dela Cruz appears in the **Live Incoming Scans feed** in real time via WebSockets with zero page reload!

3. **Step 3: Test Anti-Proxy Security Rejection**
   - Attempt to scan again with the same student account $\rightarrow$ Rejected: *"You have already scanned for this session"*.
   - Wait 35 seconds for the QR code to rotate, and attempt to submit the old token $\rightarrow$ Rejected: *"QR Code expired! Please scan the current code on screen"*.

4. **Step 4: Manual Override & Session Finalization**
   - On the instructor screen, find any pending student (e.g. *Patricia Nicole Mendoza*).
   - Click **Override**, select `Excused`, enter reason: *"Official university student council meeting"*, and submit.
   - Click **Finalize & Close Session** $\rightarrow$ remaining unscanned students are automatically marked `ABSENT`.
   - Click **Export CSV** to download the finalized session report.

5. **Step 5: View Pattern Detection & Risk Early Warnings**
   - Navigate to **Risk & Pattern Alerts** (`/instructor/patterns`).
   - Notice how the system automatically flags *Mark Anthony Ramos* with a **CRITICAL RISK** badge (*"Absent in 4 of the last 5 class sessions"*).
   - Click **Send Notice Email** to generate a direct academic intervention alert.

---

## 🛡️ Anti-Proxy Dynamic QR Protocol Specification

```
[ Instructor Display ]                        [ Backend Server ]                   [ Student Phone ]
         |                                             |                                   |
         | --- (1) GET /sessions/:id/rotate-token ---> |                                   |
         |                                             | -- (2) Sign HMAC-SHA256 token --> |
         |                                             |    Payload: (sessionId, ver, exp) |
         | <--- (3) Returns DataURL + Backup Code ---- |                                   |
         |                                             |                                   |
         | ====== [Displays 30s Rotating QR] =======   |                                   |
         |                                             |                                   |
         |                                             | <--- (4) POST /scan (Token) ----- |
         |                                             |                                   |
         |                                             | -- (5) Cryptographic Verify:      |
         |                                             |    - Check HMAC Signature         |
         |                                             |    - Verify Exp <= now + 5s grace |
         |                                             |    - Check UNIQUE(sess, student)  |
         |                                             |    - Evaluate Late Cutoff         |
         |                                             |                                   |
         | <--- (6) WebSocket: 'student_scanned' ----- | --- (7) 201 Created Status -----> |
         |      (Live HUD updates instantly)           |         (Confetti & Receipt)      |
```

---

## 🎓 Capstone Defense Questions & Architectural Rationales

### Q1: Why did you choose dynamic QR codes over RFID or Fingerprint Biometrics?
> **Answer**: Biometric scanners and RFID hardware require significant upfront institutional investment, physical maintenance, and create bottleneck queues where 40 students must queue at a single reader at the laboratory door (taking 6–8 minutes). CCDI QRScan utilizes existing student hardware (smartphones), enabling all 40 students to scan simultaneously in under 60 seconds at zero hardware cost.

### Q2: Why not use GPS Geofencing to verify physical presence?
> **Answer**: GPS signals within multi-story concrete and steel university laboratory buildings suffer from multipath interference and high positional inaccuracy ($\pm 30\text{--}50\text{ meters}$). Furthermore, GPS is trivially bypassed on mobile devices through developer "Mock Location" apps. A time-rotated 30-second cryptographic token displayed exclusively on the physical classroom projector guarantees optical line-of-sight in the room.

### Q3: How are race conditions prevented when 40 students scan in the same second?
> **Answer**: The database enforces an atomic `UNIQUE(session_id, student_id)` constraint at the relational level inside SQLite's write-ahead log (WAL) transactional engine. Even under extreme concurrency, duplicate requests are trapped and rejected before disk commit.
