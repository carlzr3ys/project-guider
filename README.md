# Project Guider

A modern, secure service provider web application built with **React (Vite)** and **Node.js (Express)**. Features Telegram-authenticated booking, real-time availability status, server-persisted join requests, and an administrative dashboard.

---

## ✨ Features

- 🟢 **Live Guide Availability Board**: Real-time status indicators (Free / Chill / Busy) for project guides.
- 💬 **Telegram-Authenticated Bookings**: Direct integration with Telegram Widget for automated user identity verification.
- 🔒 **Security Hardened**:
  - `scrypt` password hashing with unique salts & timing-safe verification (`crypto.timingSafeEqual`).
  - Sliding-window rate limiting on login, join requests, and booking endpoints.
  - Strict Cross-Origin Resource Sharing (CORS) origin verification.
  - Anti-CSRF token protection on state-changing API routes.
  - Security headers (`nosniff`, `X-Frame-Options`, `Content-Security-Policy`).
  - Atomic file store writes (`atomicWriteFileSync`) to prevent database corruption under concurrency.
- 📩 **Server-Persisted Join Requests**: Service provider applications are persisted centrally on the Node.js server and synchronized in real-time across all admin sessions.
- 🛠️ **Admin Dashboard**: Profile customization, status updates, team member creation, and application management.
- 🚀 **cPanel & Production Ready**: Pre-configured CommonJS bridge (`app.cjs`) and automated cPanel packaging tools for seamless hosting deployment.

---

## 🚀 Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/carlzr3ys/project-guider.git
cd project-guider
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and fill in your configuration:
```env
PORT=8787
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:8787,http://127.0.0.1:8787

# Admin Passwords
ADMIN_REE_PASSWORD=YourLocalPasswordRee
ADMIN_LUQ_PASSWORD=YourLocalPasswordLuq

# Telegram Bot Credentials (Required for booking authentication)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_CHAT_ID=-100xxxxxxxxxx
TELEGRAM_CHANNEL_URL=https://t.me/projectguider
```

### 4. Run Development Server
```bash
npm run dev
```
Access the application at `http://localhost:5173` (Frontend) and `http://localhost:8787` (Backend API).

---

## 🛠️ Scripts & Build Commands

- `npm run dev`: Runs frontend (Vite) and backend (Express) concurrently.
- `npm run build`: Compiles production frontend bundle to `dist/`.
- `npm run pack:cpanel`: Builds production assets and packages a ready-to-upload `cpanel-upload.zip` file.

---

## 🌐 Production & cPanel Deployment Guide

For full step-by-step instructions on deploying and updating this application on cPanel hosting, see [CPANEL_DEPLOYMENT_GUIDE.md](file:///CPANEL_DEPLOYMENT_GUIDE.md) and security documentation in [SECURITY_UPDATES.md](file:///SECURITY_UPDATES.md).

---
*Built with ❤️ for Project Guider.*
