# Project Guider - Security Updates Summary

This document summarizes the security vulnerabilities remediated and the protective measures implemented in the Project Guider application.

## 1. Authentication & Credential Management (CWE-798, CWE-256)
- **Removed Hardcoded Credentials:** Plaintext passwords (`ree123`, `luq123`) were permanently removed from the source code (`server/store.cjs`, `src/data.js`).
- **Password Hashing:** Passwords are now securely hashed using Node.js's native `crypto.scryptSync` with unique 16-byte salts.
- **Timing-Safe Verification:** Password comparisons now use `crypto.timingSafeEqual` to prevent timing attacks.
- **Secure Defaults:** If environment variables (`ADMIN_REE_PASSWORD`, `ADMIN_LUQ_PASSWORD`) are missing, the server generates secure ephemeral default passwords on startup.

## 2. API Security & Rate Limiting (CWE-307)
- **Rate Limiters Implemented:** Added sliding-window rate limiters to critical endpoints to prevent brute-force and DoS attacks:
  - `/api/admin/login`: 5 attempts per 15 minutes.
  - `/api/auth/telegram`: 10 attempts per 15 minutes.
  - `/api/bookings/notify`: 10 attempts per 15 minutes.
  - General API traffic: 200 requests per 15 minutes.

## 3. Session Management (CWE-770, CWE-522)
- **Server-Side Sessions:** Moved from client-side `sessionStorage` credential storage to secure, token-based server-side sessions.
- **Memory Management:** Capped the in-memory session store at 1,000 active sessions and implemented a 10-minute periodic TTL cleanup routine to mitigate Out-Of-Memory (OOM) DoS risks.

## 4. Cross-Origin Resource Sharing (CORS) (CWE-942)
- **Strict CORS Policy:** Replaced the wildcard `cors({ origin: true })` policy with a strict allowlist. Only origins explicitly defined in the `ALLOWED_ORIGINS` environment variable (and local development ports) are permitted.

## 5. Cross-Site Request Forgery (CSRF) Protection (CWE-352)
- **Anti-CSRF Tokens:** All state-changing requests (`POST`, `PUT`, `DELETE`) now require a valid `X-CSRF-Token` header, which is issued upon successful login and verified by server middleware.

## 6. Information Exposure (CWE-200)
- **Sensitive Data Masking:** Hardcoded Telegram numeric IDs and private channel links were removed. The public `/api/freelancers` endpoint was updated to explicitly strip sensitive fields (like `notifyChatId`) before sending data to clients.

## 7. HTTP Security Headers (CWE-693)
- **Header Middleware:** Added security headers to all responses to protect against common web vulnerabilities (Clickjacking, MIME Sniffing, XSS):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy: default-src 'self' ...`

## 8. Data Integrity (CWE-362)
- **Atomic File Writes:** Resolved concurrency race conditions during data persistence by replacing `fs.writeFileSync` with atomic file write operations. Data is written to a temporary file and renamed, preventing file corruption.

## 9. Input Validation (CWE-20)
- **Sanitization:** Added string trimming and length truncation bounds for all profile updates and state-changing payloads to prevent malicious input injection.

---
*These updates have been manually verified and tested to ensure the application is hardened against critical and high-severity threats.*
