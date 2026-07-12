@echo off
echo Starting AssetFlow Services...

:: Start Laravel Backend Server on Port 8000
echo Launching Backend (Laravel)...
start "AssetFlow Backend" cmd /k "cd backend && php artisan serve --port=8000"

:: Start Vite Frontend Dev Server
echo Launching Frontend (Vite)...
start "AssetFlow Frontend" cmd /k "cd frontend && npm run dev"

echo Both services launched in separate windows.
pause
