@echo off
setlocal
cd /d "%~dp0"
node autoPage\generateJsonToHtml.js
if errorlevel 1 (
  echo Build failed. Please check Node.js and autoPage\site.config.json.
  pause
  exit /b 1
)
echo Build completed. No files were uploaded or submitted.
pause
