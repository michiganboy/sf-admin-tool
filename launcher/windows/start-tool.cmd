@echo off
setlocal

REM Change to repo root (two levels up from windows directory).
cd /d "%~dp0..\.."

echo Building sf-admin-tool...
call npm run build

echo Starting sf-admin-tool server (hidden, logging to launcher\windows\server-output.txt)...
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run start >> \"launcher\\windows\\server-output.txt\" 2>&1' -WindowStyle Hidden"
timeout /t 3 >nul
start "" "http://127.0.0.1:4387"
goto end

:end
endlocal
