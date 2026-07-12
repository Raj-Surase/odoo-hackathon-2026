Write-Host "Starting AssetFlow Services in a single terminal..." -ForegroundColor Cyan

# Run concurrently from the frontend directory, calling both the backend artisan server and frontend vite dev server
npx --prefix frontend concurrently -n "laravel,vite" -c "green,cyan" "cd backend && php artisan serve --port=8000" "cd frontend && npm run dev"
