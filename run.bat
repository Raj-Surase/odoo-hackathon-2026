@echo off
echo Starting AssetFlow Services in a single terminal...

call npx --prefix frontend concurrently -n "laravel,vite,ws" -c "green,cyan,magenta" "cd backend && php artisan serve --port=8000" "cd frontend && npm run dev" "node frontend/websocket-server.js"
