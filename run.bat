@echo off
echo Starting AssetFlow Services in a single terminal...

:: Run concurrently from the frontend directory, calling both the backend artisan server and frontend vite dev server
call npx --prefix frontend concurrently -n "laravel,vite" -c "green,cyan" "cd backend && php artisan serve --port=8000" "cd frontend && npm run dev"
