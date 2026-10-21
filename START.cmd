@echo off
cd /d "%~dp0"
set NEXT_TELEMETRY_DISABLED=1
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 24 LTS from https://nodejs.org and try again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing the free application libraries...
  call npm.cmd ci --no-audit --no-fund
  if errorlevel 1 (
    echo Installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)
echo.
echo FairDeal AI - local hackathon prototype
echo When Ready appears, open http://localhost:3000 in your browser.
echo Keep this window open. Ctrl+C stops the app.
echo.
call npm.cmd run dev
pause
