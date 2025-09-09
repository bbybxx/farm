echo Project: %PROJECT_DIR%
echo Building Android (%CONFIG%) in %ANDROID_DIR%
echo APK copied to %OUTPUT_DIR%\%~nx0

@echo off
rem build-apk.bat - Build and optionally install Android APK for the project
rem Usage:
rem   build-apk.bat [debug|release] [install]

rem Relaunch self in a persistent cmd window so output stays visible when double-clicked
if "%KEEP_OPEN%"=="" (
  set "KEEP_OPEN=1"
  start "Build APK" cmd /k ""%~f0" %*"
  exit /b 0
)

setlocal enabledelayedexpansion
if "%~1"=="" set CONFIG=debug
if /I "%~1"=="release" set CONFIG=release
if /I "%~1"=="debug" set CONFIG=debug

set "PROJECT_DIR=%~dp0"
set "ANDROID_DIR=%PROJECT_DIR%android"

echo Project: %PROJECT_DIR%
echo Building Android (%CONFIG%) in %ANDROID_DIR%
pushd "%ANDROID_DIR%"

if not exist gradlew (
    echo gradlew not found, aborting.
    popd
    exit /b 1
)

if /I "%CONFIG%"=="debug" (
    echo Running gradle assembleDebug...
    call gradlew.bat clean assembleDebug
    set "APK_PATH=app\build\outputs\apk\debug\app-debug.apk"
) else (
    echo Running gradle assembleRelease...
    rem If signing info is provided via args or env, forward them to Gradle
    set "KS_ARG="
    if not "%~3"=="" set "KS_ARG=-PKEYSTORE_PATH=%~3"
    if not "%KEYSTORE_PATH%"=="" set "KS_ARG=-PKEYSTORE_PATH=%KEYSTORE_PATH%"
    if not "%~4"=="" set "KS_ARG=%KS_ARG% -PKEYSTORE_PASSWORD=%~4"
    if not "%KEYSTORE_PASSWORD%"=="" set "KS_ARG=%KS_ARG% -PKEYSTORE_PASSWORD=%KEYSTORE_PASSWORD%"
    if not "%~5"=="" set "KS_ARG=%KS_ARG% -PKEY_ALIAS=%~5"
    if not "%KEY_ALIAS%"=="" set "KS_ARG=%KS_ARG% -PKEY_ALIAS=%KEY_ALIAS%"
    if not "%~6"=="" set "KS_ARG=%KS_ARG% -PKEY_PASSWORD=%~6"
    if not "%KEY_PASSWORD%"=="" set "KS_ARG=%KS_ARG% -PKEY_PASSWORD=%KEY_PASSWORD%"

    call gradlew.bat clean assembleRelease %KS_ARG%
    set "APK_PATH=app\build\outputs\apk\release\app-release.apk"
)

if not exist "%APK_PATH%" (
    echo APK not found at %APK_PATH% - build probably failed.
    popd
    exit /b 2
)

set "OUTPUT_DIR=%PROJECT_DIR%build-output"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
copy /Y "%APK_PATH%" "%OUTPUT_DIR%\"
echo APK copied to %OUTPUT_DIR%\%~nx0

if /I "%~2"=="install" (
    if exist platform-tools\adb.exe (
        echo Installing APK to connected device using ./platform-tools/adb.exe...
        .\platform-tools\adb.exe install -r "%OUTPUT_DIR%\%~nx0"
    ) else (
        echo adb not found at ./platform-tools/adb.exe; trying system adb...
        adb install -r "%OUTPUT_DIR%\%~nx0"
    )
)

popd
endlocal
echo.
echo Build finished. Press any key to close this window...
pause >nul
exit /b 0
