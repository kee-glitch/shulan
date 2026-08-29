@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "NODE_EXE=C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not exist "%NODE_EXE%" (
  echo 未找到本机 Node.js 运行环境，请先安装 Node.js。
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo 未找到 dist\index.html，请先执行项目构建。
  pause
  exit /b 1
)

echo 正在启动：http://127.0.0.1:4173/
start "" "http://127.0.0.1:4173/"
"%NODE_EXE%" "node_modules\vite\bin\vite.js" preview --host 127.0.0.1 --port 4173
pause
