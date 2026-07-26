# Complete Changelog & System Updates

This document provides a comprehensive overview of all architectural, security, feature, and deployment updates made to the **Project Guider** repository.

---

## 🛡️ 1. Security Vulnerabilities Remediated

All identified critical and high-severity security vulnerabilities were systematically remediated:

### A. Credential Hashing & Secret Management (CWE-798, CWE-256)
- **Problem**: Plaintext passwords (`ree123`, `luq123`) were hardcoded in public source code (`server/store.cjs` and `src/data.js`).
- **Fix**: 
  - Purged all hardcoded passwords from frontend and backend files.
  - Implemented password hashing using Node.js's native `crypto.scryptSync` with unique 16-byte salts.
  - Applied `crypto.timingSafeEqual` for timing-safe password comparison during admin login.
  - Configured admin passwords to load securely from environment variables (`ADMIN_REE_PASSWORD`, `ADMIN_LUQ_PASSWORD`).

### B. Sensitive Data Masking (CWE-200)
- **Problem**: Numeric Telegram IDs (`883323653`, `7912382530`) and private channel links were exposed in public client bundles.
- **Fix**:
  - Removed sensitive IDs from client bundles (`src/data.js`).
  - Configured server environment variables (`TELEGRAM_NOTIFY_REE`, `TELEGRAM_NOTIFY_LUQ`, `TELEGRAM_CHANNEL_URL`).
  - Updated `/api/freelancers` public endpoint to strip `notifyChatId` before sending responses to clients.

### C. Restrictive CORS Allowlist (CWE-942)
- **Problem**: Express server reflected arbitrary request origins via `cors({ origin: true })`.
- **Fix**: Implemented strict origin validation against an explicit allowlist from `ALLOWED_ORIGINS` environment variable and local dev origins (`http://localhost:5173`, etc.).

### D. Rate Limiting (CWE-307)
- **Problem**: Endpoints had no rate limiting, allowing brute-force login attacks.
- **Fix**: Implemented sliding-window rate limiters in `server/index.cjs`:
  - `/api/admin/login`: Max 5 attempts per 15 mins.
  - `/api/auth/telegram`: Max 10 attempts per 15 mins.
  - `/api/bookings/notify`: Max 10 attempts per 15 mins.
  - `/api/join-requests`: Max 5 attempts per 15 mins.
  - General API routes: Max 200 requests per 15 mins.

### E. Session Store Memory Protection (CWE-770)
- **Problem**: Unbounded in-memory session `Map` with no expiration cleanup, creating an OOM DoS vector.
- **Fix**: Enforced a `MAX_SESSIONS` cap of 1,000 active sessions and added a 10-minute periodic TTL cleanup routine.

### F. Anti-CSRF Token Protection (CWE-352)
- **Problem**: State-changing endpoints lacked CSRF verification.
- **Fix**: Added anti-CSRF token verification (`X-CSRF-Token` header) for state-changing HTTP methods (`POST`, `PUT`, `DELETE`).

### G. Security Headers (CWE-693)
- **Fix**: Configured middleware setting `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Content-Security-Policy`.

### H. Atomic Database File Writes (CWE-362)
- **Problem**: Direct `fs.writeFileSync` calls risked file corruption under concurrent write access.
- **Fix**: Created `atomicWriteFileSync` in `server/store.cjs`, which writes content to a unique temporary file before executing an atomic `fs.renameSync`.

### I. Input Validation & Bounds (CWE-20)
- **Fix**: Added input sanitization and length limits (name <= 100, role <= 100, bio <= 1000) for all profile updates and submissions.

---

## ⚡ 2. Server Persistence & Real-Time Sync for Join Requests

- **Problem**: Service provider join requests were previously stored only in the applicant's browser `localStorage`, making them invisible to admins logged in on other devices.
- **Fix**:
  - **Server Store (`server/store.cjs`)**: Added `joinRequests` data layer with atomic persistence in `server/data/store.json`.
  - **API Endpoints (`server/index.cjs`)**:
    - `POST /api/join-requests`: Public application submission route with rate limiting.
    - `GET /api/join-requests`: Admin route to fetch pending applications.
    - `POST /api/join-requests/:id/resolve`: Admin route to approve or reject applications centrally.
  - **Client Store (`src/api/storeApi.js` & `src/hooks/useStore.js`)**: Integrated backend endpoints and added automatic server polling (`pullFromServer`) so join requests sync across all devices in real time.

---

## 📁 3. Cleanup & Environment Configuration

- **Environment Template**: Created `.env.example` detailing all required environment variables (`PORT`, `ALLOWED_ORIGINS`, `ADMIN_REE_PASSWORD`, `ADMIN_LUQ_PASSWORD`, Telegram tokens).
- **Asset Cleanup**: Removed unreferenced orphan image assets from the root directory.
- **LiteSpeed Compatibility**: Maintained `app.cjs` CommonJS bridge for cPanel Phusion Passenger and LiteSpeed server environments.

---

## 🚀 4. Git Deployment Workflow

- Updated [README.md](file:///README.md) with concise project documentation.
- Created [GIT_WORKFLOW_GUIDE.md](file:///GIT_WORKFLOW_GUIDE.md) providing clear instructions on staging/pushing code locally and pulling updates in cPanel using Git Version Control.

---
*All changes verified and pushed to `https://github.com/carlzr3ys/project-guider`.*
