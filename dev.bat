@echo off
title Portfolio Dev Server
node scripts\check.js
if errorlevel 1 (
  echo Check failed - fix data.json before serving.
  pause
  exit /b 1
)
echo Starting dev server + watcher...
echo.
node scripts\serve.js
pause
