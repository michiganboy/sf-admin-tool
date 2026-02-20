@echo off
setlocal

REM Stop any process listening on port 4387 (uses PowerShell).
echo Attempting to stop sf-admin-tool server on port 4387...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4387 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ('Stopping PID ' + $_.OwningProcess + ' ...'); Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo Done. If no PID was printed, nothing was running on port 4387.

endlocal
