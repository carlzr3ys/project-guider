# Upload Project Guider to cPanel

Your app needs **Node.js** on cPanel (not PHP-only hosting), because Telegram login runs on a Node server.

## 1) Prepare on your PC

```bash
npm install
npm run pack:cpanel
```

This creates:
- `cpanel-upload/` folder
- `cpanel-upload.zip` (if zip works)

## 2) Upload

1. cPanel → **File Manager**
2. Go to your domain folder (example: `projectguider.com` or a subfolder)
3. Upload `cpanel-upload.zip`
4. Extract it

Recommended structure:

```text
/home/USER/projectguider/
  app.js
  package.json
  dist/
  server/
  .env
```

## 3) Create `.env` on cPanel

In the same folder, create file `.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=projectguiderlogin_bot
TELEGRAM_CHAT_ID=-1003504741303
VITE_TELEGRAM_BOT_USERNAME=projectguiderlogin_bot
VITE_TELEGRAM_CHANNEL=https://t.me/+uD81UyseH_tkZGU1
TELEGRAM_AUTH_MAX_AGE=86400
```

## 4) Setup Node.js App (important)

1. cPanel → **Setup Node.js App**
2. Create application:
   - **Node.js version:** 18+ (or newest available)
   - **Application mode:** Production
   - **Application root:** folder where you uploaded files (e.g. `projectguider`)
   - **Application URL:** your domain / subdomain
   - **Application startup file:** `app.cjs` (required on LiteSpeed — not `app.js`)
3. Click **Create**
4. Open terminal in that app (or SSH) and run:

```bash
npm install --omit=dev
```

5. Click **Restart** on the Node.js app

## 5) Telegram domain

In [@BotFather](https://t.me/BotFather):

1. `/setdomain`
2. Choose `projectguiderlogin_bot`
3. Set your real domain, example: `yourdomain.com`

Without this, Login with Telegram will fail on the live site.

## 6) Test

Open your domain:

- Website loads
- `/api/health` returns JSON
- **Login with Telegram** works for group members

## If your cPanel has NO Node.js

Then static upload of `dist/` only will show the website, but **Telegram login/booking verification will NOT work**.  
You need hosting with Node.js, or put the API on another Node host (Railway/Render/VPS) and set `VITE_API_URL` before building.
