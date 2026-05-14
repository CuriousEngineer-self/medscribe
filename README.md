# ⚕ MedScribe — Clinical Patient Management System

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Android-lightgrey)

A self-hosted, specialisation-agnostic clinical patient management system built with pure HTML, JavaScript and Node.js. Designed for independent practitioners who want full control over their patient data — no subscriptions, no cloud lock-in, no third-party servers.

---

## Screenshots

> After cloning, launch the app and register to see the full UI.

| Dashboard | Patient Detail | Prescription Print |
|-----------|---------------|-------------------|
| Clean overview with stats and recent patients | Per-patient visit history with parameter trends | Full letterhead with Rx, advice, allergy warnings |

---

## How It Works

MedScribe runs as a small web server on your local machine. You access it through any browser at `http://localhost:3000`. All data is stored in a single SQLite file on disk — there is no external database server, no cloud dependency, and no data ever leaves your machine.

```
Your Browser  ──►  Node.js / Express (localhost:3000)  ──►  SQLite File (db/medscribe.sqlite)
```

### Architecture Overview

```
medscribe/
├── index.js                  ← Express server entry point
├── server/
│   ├── db.js                 ← SQLite layer (sql.js — pure JS, no native binaries)
│   ├── auth.js               ← JWT authentication + bcrypt password hashing
│   ├── doctor.js             ← Doctor profile + clinical parameter schema API
│   ├── patients.js           ← Patient CRUD API
│   └── visits.js             ← Visit records + parameter trends API
└── public/                   ← Entirely static frontend (no framework)
    ├── index.html            ← Single-page app shell
    ├── reset-password.html   ← Password reset page
    ├── css/style.css         ← Full UI stylesheet
    └── js/
        ├── api.js            ← Fetch wrapper with JWT auth
        ├── app.js            ← Auth flows, routing, dashboard
        ├── patients.js       ← Patient management UI
        ├── visits.js         ← Visit recording and viewing UI
        ├── schemas.js        ← Clinical parameter configuration UI
        ├── charts.js         ← Trend charts (Chart.js)
        └── print.js          ← Prescription printer
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (v18+) |
| Web Framework | Express.js |
| Database | SQLite via [sql.js](https://github.com/sql-js/sql.js) (pure JavaScript) |
| Authentication | JWT + bcrypt |
| Email | Nodemailer (optional, for password reset) |
| Frontend | Vanilla HTML + CSS + JavaScript |
| Charts | Chart.js |
| Fonts | DM Serif Display + DM Sans (Google Fonts) |

> **Why sql.js?** It is a pure JavaScript port of SQLite, which means it works on every platform without compiling any native binaries — important for portability across Windows, macOS, Linux and Android (Termux).

---

## Features

### Doctor Profile & Configuration
- Secure login with email and password (bcrypt hashed, JWT sessions)
- Email-based password reset (works without SMTP in development — link shown on screen)
- Full practice profile: name, qualifications, specialisation, license number, hospital name, address, contact numbers
- Live letterhead preview before printing

### Specialisation-Driven Clinical Parameters
This is the core design principle of MedScribe. Before using the system, the doctor configures the parameters relevant to their specialisation. Two parameter types are supported:

- **Numeric** — a measurable value with optional unit, minimum and maximum (e.g. Systolic BP in mmHg, range 90–140)
- **Descriptive** — a qualitative scale with three configurable labels (e.g. Tremor Severity: Absent / Mild / Pronounced)

Parameters are fully independent of individual patients — configure once, apply to all. This makes MedScribe equally suited to Cardiology, Neurology, Oncology, Orthopaedics, or any other specialisation.

### Patient Management
- Full demographics: name, date of birth (age auto-calculated), gender, height, weight, BMI (auto-calculated), blood group
- Contact details: 10-digit phone number (validated), optional email, address
- Drug allergy tracking — flagged prominently in red throughout the UI and on printed prescriptions
- Medical history and referral source
- Search patients by name or phone number

### Visit Records
- Record clinical parameter values for every visit
- Chief complaint, diagnosis, prescription (Rx), advice, follow-up date, internal notes
- View visit history with optional date range filtering
- Out-of-range parameter values highlighted in red

### Prescription Printing
- Full letterhead automatically populated from doctor profile
- Patient details, age, BMI, visit date, follow-up date
- Drug allergy warning prominently displayed
- Clinical parameters table (with out-of-range flagging)
- Diagnosis, prescription, advice
- Signature line
- Print to paper or save as PDF from any browser

### Parameter Trend Charts
- Line chart of any numeric parameter across all visits for a patient
- Reference lines at configured min/max values
- Out-of-range data points highlighted in red
- Useful for tracking disease progression or treatment response

---

## Installation

### Prerequisites

- **Node.js v18 or higher** — download from https://nodejs.org (choose the LTS version)
- **npm** — comes bundled with Node.js
- A modern browser: Chrome, Edge, Firefox, or Safari

Verify your Node.js version:
```bash
node --version   # Should show v18.x.x or higher
npm --version    # Should show 8.x or higher
```

---

### Windows

1. **Install Node.js**
   - Download the Windows Installer (.msi) from https://nodejs.org
   - Run the installer, accept defaults, ensure "Add to PATH" is checked
   - Restart your terminal after installation

2. **Download MedScribe**
   - Click the green **Code** button on this page → **Download ZIP**
   - Extract to a location like `C:\MedScribe\`
   - Or clone with Git: `git clone https://github.com/yourname/medscribe.git C:\MedScribe`

3. **Open a terminal in the folder**
   - Open File Explorer → navigate to `C:\MedScribe\`
   - Hold `Shift` + right-click in the folder → **"Open PowerShell window here"**

4. **Install dependencies**
   ```powershell
   npm install
   ```

5. **Configure the app**
   ```powershell
   copy .env.example .env
   notepad .env
   ```
   Change `JWT_SECRET` to any long random string (32+ characters). Save and close.

6. **Start the server**
   ```powershell
   node index.js
   ```
   You should see:
   ```
   🏥 MedScribe running at http://localhost:3000
   ```

7. **Open in browser**
   Navigate to http://localhost:3000

8. **To keep it running after closing the terminal**, use the built-in Task Scheduler:
   - Search "Task Scheduler" in Start Menu
   - Create Basic Task → Trigger: "At log on"
   - Action: Start a program
     - Program: `C:\Program Files\nodejs\node.exe`
     - Arguments: `C:\MedScribe\index.js`
     - Start in: `C:\MedScribe`

---

### macOS

1. **Install Node.js**

   Option A — Direct download: https://nodejs.org (macOS Installer .pkg)

   Option B — Via Homebrew (recommended if you use brew):
   ```bash
   brew install node
   ```

2. **Clone or download MedScribe**
   ```bash
   git clone https://github.com/yourname/medscribe.git
   cd medscribe
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure**
   ```bash
   cp .env.example .env
   nano .env        # or open in any text editor
   ```
   Set a strong `JWT_SECRET`. Save with `Ctrl+O`, exit with `Ctrl+X`.

5. **Start the server**
   ```bash
   node index.js
   ```

6. **Open in browser**
   Navigate to http://localhost:3000

7. **Auto-start on login** — create a launchd plist:
   ```bash
   sudo nano /Library/LaunchDaemons/com.medscribe.plist
   ```
   Paste:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
     "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>Label</key><string>com.medscribe</string>
     <key>ProgramArguments</key>
     <array>
       <string>/usr/local/bin/node</string>
       <string>/path/to/medscribe/index.js</string>
     </array>
     <key>WorkingDirectory</key><string>/path/to/medscribe</string>
     <key>RunAtLoad</key><true/>
     <key>KeepAlive</key><true/>
   </dict>
   </plist>
   ```
   Then load it:
   ```bash
   sudo launchctl load /Library/LaunchDaemons/com.medscribe.plist
   ```

---

### Linux (Ubuntu / Debian)

1. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node --version    # verify v20.x
   ```

2. **Clone MedScribe**
   ```bash
   git clone https://github.com/yourname/medscribe.git
   cd medscribe
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure**
   ```bash
   cp .env.example .env
   nano .env
   ```
   Set a strong `JWT_SECRET`. Save with `Ctrl+O`, exit with `Ctrl+X`.

5. **Start the server**
   ```bash
   node index.js
   ```

6. **Open in browser**
   Navigate to http://localhost:3000

7. **Auto-start with systemd** (recommended for always-on use):
   ```bash
   sudo nano /etc/systemd/system/medscribe.service
   ```
   Paste (replace paths and username):
   ```ini
   [Unit]
   Description=MedScribe Clinical Management System
   After=network.target

   [Service]
   Type=simple
   User=your-linux-username
   WorkingDirectory=/home/your-linux-username/medscribe
   ExecStart=/usr/bin/node index.js
   Restart=on-failure
   RestartSec=10
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```
   Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable medscribe
   sudo systemctl start medscribe
   sudo systemctl status medscribe   # should show "active (running)"
   ```

---

### Android (via Termux)

MedScribe runs natively on Android through Termux — no PC required.

1. Install **Termux** from F-Droid (not the Play Store):
   https://f-droid.org/packages/com.termux/

2. Open Termux and run:
   ```bash
   pkg update && pkg upgrade
   pkg install nodejs git
   ```

3. Clone and set up:
   ```bash
   git clone https://github.com/yourname/medscribe.git
   cd medscribe
   npm install
   cp .env.example .env
   ```

4. Edit `.env` with a text editor:
   ```bash
   pkg install nano
   nano .env
   ```

5. Start the server:
   ```bash
   node index.js
   ```

6. Open Chrome on Android and go to http://localhost:3000

> **Tip:** To keep Termux running in the background, swipe down to the notification and tap "Acquire Wakelock".

---

## Configuration

All configuration is done via the `.env` file:

```env
# Server port (default: 3000)
PORT=3000

# REQUIRED: Change this to a long random secret string
JWT_SECRET=replace-this-with-something-long-and-random

# Optional: SMTP for email-based password reset
# If not set, reset links are shown on-screen (fine for single-user use)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-16-char-app-password   ← Gmail App Password, not your login password

NODE_ENV=production
```

### Gmail App Password Setup
If you want email-based password reset:
1. Enable 2-Factor Authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Use that 16-character password as `SMTP_PASS`

---

## First-Time Setup (After Installation)

1. Open http://localhost:3000 and click **Create account**
2. Go to **Profile & Configuration → Doctor Profile** — fill in all your practice details (name, qualifications, license, hospital address etc.). This populates your prescription letterhead.
3. Go to **Profile & Configuration → Patient Parameters** — add the clinical parameters for your specialisation. Examples:

   | Specialisation | Parameter Examples |
   |---------------|-------------------|
   | Cardiology | Systolic BP (numeric, mmHg, 90–140), Heart Rate (numeric, bpm, 50–100), Chest Pain (descriptive) |
   | Neurology | MMSE Score (numeric, 0–30), Tremor Severity (descriptive), Grip Strength L/R (numeric, kg) |
   | Endocrinology | Fasting Glucose (numeric, mg/dL), HbA1c (numeric, %), Weight (numeric, kg) |
   | Pulmonology | FEV1 (numeric, L), SpO2 (numeric, %, 95–100), Dyspnoea Scale (descriptive) |

4. Check **Profile & Configuration → Letterhead Preview** to confirm your prescription header looks correct.
5. Start adding patients and recording visits.

---

## Data & Backup

All data lives in one file: `db/medscribe.sqlite`

**Manual backup:**
```bash
cp db/medscribe.sqlite db/backup-$(date +%Y%m%d).sqlite
```

**Scheduled backup (Linux/macOS cron):**
```bash
crontab -e
# Add this line — backs up daily at 2 AM:
0 2 * * * cp /path/to/medscribe/db/medscribe.sqlite /path/to/backups/medscribe-$(date +\%Y\%m\%d).sqlite
```

**To restore:** Stop the server, replace `db/medscribe.sqlite` with your backup, restart.

---

## Accessing from Other Devices on the Same Network

You can access MedScribe from any phone, tablet or other computer on the same WiFi:

1. Find your machine's local IP:
   - **Windows:** `ipconfig` → IPv4 Address
   - **macOS/Linux:** `ip addr` or `ifconfig`
2. On the other device, open a browser and go to `http://192.168.x.x:3000` (use your actual IP)
3. Ensure your firewall allows inbound connections on port 3000

---

## Printing Prescriptions

Click the **🖨 Print** button on any visit record. Tips for best results:

- Use **Google Chrome** for most reliable layout
- In the print dialog, enable **Background graphics**
- Set margins to **Default** or **Minimum**
- Paper size: **A4**
- To save as PDF: set the printer to **"Save as PDF"** (Chrome/Edge/macOS) or **"Microsoft Print to PDF"** (Windows)

---

## Known Limitations

These are current limitations to be aware of before deploying in a clinical setting:

1. **Single doctor per instance** — each registered account is fully independent. There is no shared patient database or role-based access control (e.g. receptionist vs. doctor). Multi-doctor clinic support would require a significant backend redesign.

2. **No file attachments** — lab reports, X-rays, ECGs and other documents cannot be attached to visit records. Only structured text data is stored.

3. **No appointment calendar** — there is no scheduling or calendar module. MedScribe records visits after they occur; it does not manage future bookings.

4. **No offline support** — the browser requires the Node.js server to be running. If the server stops, the app is inaccessible. (Termux users: the server stops if Termux is killed by Android's memory manager.)

5. **Not HIPAA/DISHA certified** — MedScribe is not audited or certified for regulatory compliance. For regulated environments, additional measures (audit logs, encrypted storage, access controls, HTTPS) would be required.

6. **No HTTPS by default** — traffic is unencrypted over HTTP. This is acceptable on a single-device local setup but should not be used across a network without adding an Nginx/Caddy reverse proxy with TLS.

7. **Single SQLite file** — while SQLite handles typical clinical workloads well (thousands of patients, tens of thousands of visits), it is not suitable for very high concurrency (multiple users writing simultaneously at scale).

8. **Password reset requires SMTP or manual link** — without SMTP configured, password reset links are shown on-screen. This is convenient for single-user use but not suitable for multi-user deployments.

9. **No audit trail** — edits and deletions are not logged. Once a visit or patient record is deleted, it cannot be recovered unless a database backup exists.

10. **Browser print layout** — prescription print quality depends on the browser. Chrome is recommended; other browsers may have minor layout differences.

---

## Roadmap (Potential Future Features)

- [ ] Multi-doctor / clinic support with role-based access
- [ ] Appointment scheduling and calendar view
- [ ] Lab report and document attachments (PDF/image upload)
- [ ] Patient-facing read-only portal with QR code access
- [ ] SMS/WhatsApp follow-up reminders (via Twilio)
- [ ] Excel/PDF bulk data export
- [ ] Audit trail and change history
- [ ] HTTPS support via built-in Caddy/Let's Encrypt integration
- [ ] Progressive Web App (PWA) with offline support
- [ ] ICD-10 diagnosis code lookup

---

## Security Recommendations

If running MedScribe beyond a single local device:

1. **Change `JWT_SECRET`** to a long random string before first use
2. **Enable HTTPS** using Nginx or Caddy as a reverse proxy
3. **Enable full-disk encryption** on the machine storing patient data
4. **Restrict network access** — do not expose port 3000 directly to the internet
5. **Back up regularly** — the SQLite file is your entire database
6. **Keep Node.js updated** — run `node --version` and update periodically

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ERR_REQUIRE_ESM` on startup | Run `npm install uuid@8` to downgrade uuid, or ensure all deps are installed fresh |
| `Port 3000 already in use` | Change `PORT` in `.env`, or kill the process: `lsof -ti:3000 \| xargs kill` (Linux/macOS) |
| Blank white screen after login | Clear browser cache (`Ctrl+Shift+Del`), or try an incognito window |
| Print layout looks broken | Use Chrome; enable "Background graphics" in print settings |
| Can't access from another device | Check your firewall; use the correct local IP (not `localhost`) |
| Database error on start | Restore from backup, or delete `db/medscribe.sqlite` to start fresh (all data lost) |
| Password reset email not arriving | Check `SMTP_*` settings in `.env`; check spam folder; use App Password for Gmail |
| Termux server stops on Android | Swipe down notification → tap "Acquire Wakelock" in Termux |

---

## Contributing

Contributions, bug reports and feature suggestions are welcome. Please open an issue before submitting a pull request for significant changes.

---

## License

MIT License — free to use, modify and distribute. See `LICENSE` file for details.

---

## Disclaimer

MedScribe is a practice management tool intended to assist clinicians. It is not a substitute for clinical judgment. The authors accept no liability for clinical decisions made using this software. Ensure compliance with local data protection regulations (e.g. DISHA in India, HIPAA in the US, GDPR in Europe) before deploying in a regulated environment.

---

*Built with ❤️ for independent medical practitioners.*
