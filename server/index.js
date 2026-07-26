/**
 * ESM entry that boots the CommonJS server (status sync + Telegram API).
 * cPanel should use app.cjs → server/index.cjs directly.
 */
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
require('./index.cjs')
