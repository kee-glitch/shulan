import { defineConfig, devices } from '@playwright/test'
const runtimeBin = 'C:\\Users\\Administrator\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin'
export default defineConfig({
  testDir: './tests',
  webServer: { command: '"C:\\Users\\Administrator\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\bin\\fallback\\pnpm.cmd" run dev', env: { PATH: `${runtimeBin};${process.env.PATH}` }, url: 'http://127.0.0.1:5173', reuseExistingServer: true },
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'on-first-retry', launchOptions: { executablePath: 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe' } },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ]
})
