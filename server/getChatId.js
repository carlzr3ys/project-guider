/**
 * Helper: after you add @projectguiderlogin_bot as admin
 * and send any message in the group, run:
 *   node server/getChatId.js
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN in .env')
  process.exit(1)
}

const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`)
const data = await res.json()

if (!data.ok) {
  console.error('Telegram error:', data)
  process.exit(1)
}

const chats = new Map()
for (const update of data.result || []) {
  const chat =
    update.message?.chat ||
    update.channel_post?.chat ||
    update.my_chat_member?.chat ||
    update.chat_member?.chat
  if (chat?.id) {
    chats.set(chat.id, chat)
  }
}

if (chats.size === 0) {
  console.log('No chats found yet.')
  console.log('1) Add @projectguiderlogin_bot as admin to your group/channel')
  console.log('2) Send a message in that group (or remove+re-add the bot)')
  console.log('3) Run this script again: node server/getChatId.js')
  process.exit(0)
}

console.log('Found chats:')
for (const chat of chats.values()) {
  console.log(`- id: ${chat.id}`)
  console.log(`  title: ${chat.title || chat.username || '(no title)'}`)
  console.log(`  type: ${chat.type}`)
  console.log('')
}
console.log('Copy the group/channel id into TELEGRAM_CHAT_ID in .env')
