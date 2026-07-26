# Project Guider By Ree & Luq

React (Vite) site for Free / Not too busy / Busy status, Telegram-authenticated booking, and admin tools.

Telegram channel: https://t.me/+**************
## Features

- Public status board for guides
- Users **log in with Telegram** to book
- Server verifies the user is a **member of your Telegram group**
- Booking uses Telegram identity automatically (no username field)
- Admin panel: profile, password, status, add admin, join requests, booking inbox

## Setup Telegram login (required for booking)

1. Open [@BotFather](https://t.me/BotFather) → create a bot → copy **token** and **username**
2. Add the bot as **admin** in your Project Guider group/channel
3. Get the numeric **chat id** (example tools: `@userinfobot` / `@RawDataBot` inside the group, or forward a group message to a chat-id bot)
4. In BotFather: `/setdomain` → choose your bot → set your website domain  
   - Local testing usually needs a public HTTPS tunnel (e.g. ngrok) pointing to Vite
5. Copy env file and fill values:

```bash
cp .env.example .env
```

```env
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_BOT_USERNAME=YourBotUsername
TELEGRAM_CHAT_ID=-100xxxxxxxxxx
VITE_TELEGRAM_BOT_USERNAME=YourBotUsername
VITE_TELEGRAM_CHANNEL=https://t.me/+************
```

## Run

```bash
npm install
npm run dev
```
Admins can change password, edit own profile only, add admins, and approve join requests.
