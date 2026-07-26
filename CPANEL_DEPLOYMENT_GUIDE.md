# Complete cPanel Deployment Guide for Project Guider

This guide provides step-by-step instructions on how to package, deploy, configure, and run **Project Guider** on cPanel hosting (LiteSpeed / Phusion Passenger).

---

## 📋 Overview of Architecture on cPanel

- **Frontend**: Built with React & Vite (`dist/` directory). Served directly by the Node.js Express server.
- **Backend**: Node.js Express server (`server/index.cjs`).
- **Entry File**: `app.cjs` (bridges Passenger / LiteSpeed CommonJS requirement with the backend).
- **Database**: Atomic JSON file store (`server/data/store.json`).

---

## 🛠️ Step 1: Package the Project Locally

Before uploading to cPanel, build the static assets and generate the upload archive locally.

1. Open your terminal in the project directory.
2. Run the packaging command:
   ```bash
   npm run pack:cpanel
   ```
3. This command will:
   - Compile the React frontend into `dist/`.
   - Copy only production files (`app.cjs`, `package.json`, `dist/`, `server/`, `.env.example`, etc.) into `cpanel-upload/`.
   - Automatically generate `cpanel-upload.zip` in your project root.

---

## 📤 Step 2: Upload Files to cPanel

1. Log into your **cPanel Dashboard**.
2. Open **File Manager**.
3. Create a directory for your app outside `public_html` (recommended, e.g., `/home/username/project-guider`), or directly inside `public_html` if deploying to your primary domain.
4. Upload `cpanel-upload.zip` into your created directory.
5. Right-click `cpanel-upload.zip` and select **Extract**.

---

## ⚙️ Step 3: Configure Node.js App in cPanel

1. In cPanel, search for and open **Setup Node.js App**.
2. Click **Create Application**.
3. Configure the settings:
   - **Node.js version**: Choose `18.x`, `20.x`, or higher.
   - **Application mode**: `Production`
   - **Application root**: Enter the folder path relative to home (e.g., `project-guider`).
   - **Application URL**: Select your domain or subdomain (e.g., `https://yourdomain.com`).
   - **Application startup file**: Type `app.cjs` *(Do NOT use app.js or server/index.cjs directly to avoid ESM issues with LiteSpeed)*.
4. Click **Create**.

---

## 🔑 Step 4: Configure Environment Variables

Create your `.env` file in cPanel:

1. In **File Manager**, navigate to your app root folder.
2. Ensure hidden files are visible (Settings → Show Hidden Files).
3. Create a file named `.env` (or copy `.env.example` to `.env`).
4. Add your production environment settings:

```env
# Server Port & Domain
PORT=8787
ALLOWED_ORIGINS=https://yourdomain.com

# Admin Authentication Passwords (DO NOT USE DEFAULT PASSWORDS)
ADMIN_REE_PASSWORD=YourStrongPasswordHere123!
ADMIN_LUQ_PASSWORD=YourStrongPasswordHere456!

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_USERNAME=projectguiderlogin_bot
TELEGRAM_CHAT_ID=-1001234567890

# Admin Telegram Chat IDs (For Booking Notifications)
TELEGRAM_NOTIFY_REE=883323653
TELEGRAM_NOTIFY_LUQ=7912382530
TELEGRAM_CHANNEL_URL=https://t.me/projectguider
```

---

## 📦 Step 5: Install Dependencies & Start App

1. Return to **Setup Node.js App** in cPanel.
2. Select your application from the list.
3. Click **Run NPM Install** to install production dependencies (`express`, `cors`, `dotenv`).
4. Once installation completes, click **Restart Application**.

---

## 🌐 Step 6: SSL / HTTPS Setup

1. In cPanel, go to **SSL/TLS Status** or **AutoSSL**.
2. Run AutoSSL or issue a free Let's Encrypt certificate for your domain/subdomain.
3. Ensure your site forces HTTPS.

---

## 🔍 Troubleshooting & Verification

### 1. `ERR_REQUIRE_ESM` Error
- **Cause**: LiteSpeed/Passenger tries to `require()` an ES Module file (`type: module` in `package.json`).
- **Solution**: Ensure your startup file in cPanel Node.js App is set strictly to `app.cjs`.

### 2. Rate Limiting or Login Failures
- Verify `ADMIN_REE_PASSWORD` and `ADMIN_LUQ_PASSWORD` are set in `.env`.
- Check cPanel error logs via **Passenger Log / stderr log** in File Manager (`stderr.log`).

### 3. Data File Integrity
- The application automatically initializes `server/data/store.json` on first access.
- Ensure the server process has read/write permissions for the `server/data/` directory.

---
*Your Project Guider web application is now fully deployed and secured on cPanel!*
