@echo off
REM push.bat — wrapper that delegates to push.ps1 (PowerShell)
REM Usage: push.bat "Commit message" [branch]

setlocal
if "%~1"=="" (
	REM launched by double-click without args: keep window open after script finishes
	powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0push.ps1"
	set RC=%ERRORLEVEL%
	echo.
	echo Нажмите любую клавишу, чтобы закрыть окно...
	pause >nul
	exit /b %RC%
) else (
	powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0push.ps1" %*
	exit /b %ERRORLEVEL%
)
