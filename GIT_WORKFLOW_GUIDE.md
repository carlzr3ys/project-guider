# Git Version Control & Deployment Guide

This guide explains how to manage updates using **Git Version Control** for Project Guider, from making local development changes to pulling and deploying updates directly on cPanel.

---

## 🛠️ Part 1: Developer Workflow (Pushing Updates)

Whenever you make changes, fix bugs, or add features to the codebase, follow these steps to push your updates safely to GitHub:

### 1. Verify and Test Build
Always ensure the application builds cleanly without errors:
```bash
npm run build
```

*(Optional)* If generating a zip archive for manual upload:
```bash
npm run pack:cpanel
```

### 2. Check Changed Files
Check which files have been modified or added:
```bash
git status
```

### 3. Stage & Commit Changes
Stage all modified files and commit with a clear message:
```bash
git add .
git commit -m "feat: add new feature description"
```

### 4. Push to GitHub
Push your committed changes to the `main` branch on GitHub:
```bash
git push origin main
```

---

## 🌐 Part 2: cPanel Hosting Workflow (Pulling Updates)

Since your code is hosted on cPanel, your friend can pull the latest updates directly from GitHub without needing to re-upload zip files manually every time.

---

### 🟢 Method A: Using cPanel Git Version Control (Recommended - No Terminal Needed)

1. Log into **cPanel**.
2. Search for and open **Git Version Control**.
3. Under **Repositories**, locate the `project-guider` repository and click **Manage**.
4. Click the **Pull or Deploy** tab.
5. Click **Update from Remote** (this pulls the latest commits from GitHub `main`).
6. Navigate to cPanel **Setup Node.js App**:
   - Select your application.
   - Click **Run NPM Install** *(if dependencies changed)*.
   - Click **Restart Application** 🔄.

---

### 💻 Method B: Using cPanel Terminal

1. Log into **cPanel** and open **Terminal**.
2. Navigate to your application root directory:
   ```bash
   cd ~/project-guider
   ```
3. Pull the latest updates from GitHub:
   ```bash
   git pull origin main
   ```
4. Install any new production dependencies:
   ```bash
   npm install --omit=dev
   ```
5. Go to cPanel **Setup Node.js App** and click **Restart Application** 🔄.

---

## 🔐 Managing Environment Variables (`.env`) with Git

To protect your admin passwords and Telegram bot tokens:

- **`.env` is ignored by Git** (via `.gitignore`) so secrets are never published publicly.
- **`.env.example` IS tracked by Git** and acts as a safe template.

### Adding New Environment Variables:
1. If you add a new environment variable locally (e.g. `NEW_API_KEY=123`), add a placeholder to `.env.example`:
   ```env
   NEW_API_KEY=
   ```
2. Commit and push `.env.example` to GitHub.
3. Update the production `.env` file on cPanel File Manager with the actual secret value.
4. Restart the Node.js application in cPanel.

---
*Your repository is now optimized for smooth Git version control and single-click cPanel updates!*
