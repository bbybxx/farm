@echo off
REM push.bat — wrapper that delegates to push.ps1 (PowerShell)
REM Usage: push.bat "Commit message" [branch]

setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0push.ps1" %*
exit /b %ERRORLEVEL%
