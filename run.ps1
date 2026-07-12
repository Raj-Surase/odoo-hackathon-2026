Write-Host "Starting AssetFlow Services..." -ForegroundColor Cyan

# Start Laravel Backend in a new window
Write-Host "Launching Backend (Laravel)..."
Start-Process cmd -ArgumentList "/k cd backend && php artisan serve --port=8000"

# Start Vite Frontend in a new window
Write-Host "Launching Frontend (Vite)..."
Start-Process cmd -ArgumentList "/k cd frontend && npm run dev"

Write-Host "Both services launched in separate windows." -ForegroundColor Green
