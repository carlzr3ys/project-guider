import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'cpanel-upload')

const include = [
  'app.cjs',
  'app.js',
  'package.json',
  'package-lock.json',
  'dist',
  'public',
  'server',
  '.env.example',
  'README.md',
  'CPANEL.md',
]

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

for (const item of include) {
  const from = path.join(root, item)
  const to = path.join(outDir, item)
  if (!fs.existsSync(from)) continue
  fs.cpSync(from, to, { recursive: true })
}

// Don't ship local secrets — user creates .env on cPanel
const envExample = path.join(outDir, '.env.example')
if (fs.existsSync(envExample)) {
  fs.copyFileSync(envExample, path.join(outDir, '.env.example'))
}

console.log('Created folder: cpanel-upload/')
console.log('Zip that folder and upload to cPanel.')
console.log('Then on server: create .env, npm install --omit=dev, restart Node app.')

try {
  const zipPath = path.join(root, 'cpanel-upload.zip')
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)
  execSync(`powershell -Command "Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}' -Force"`, {
    stdio: 'inherit',
  })
  console.log('Also created: cpanel-upload.zip')
} catch {
  console.log('Zip step skipped — you can zip cpanel-upload/ manually.')
}
