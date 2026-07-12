import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

let holds = [];

function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // 1 = OPEN
            client.send(message);
        }
    });
}

// Periodically clean up expired holds
setInterval(() => {
    const now = Date.now();
    const prevCount = holds.length;
    holds = holds.filter(h => h.expires_at > now);
    if (holds.length !== prevCount) {
        console.log(`Cleaned up expired holds. Current holds:`, holds.length);
        broadcast({ type: 'hold_update', holds });
    }
}, 1000);

wss.on('connection', (ws) => {
    console.log('Client connected');
    
    // Immediately send current holds to new client
    ws.send(JSON.stringify({ type: 'hold_update', holds }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received action:', data.type, data);

            switch (data.type) {
                case 'hold':
                    // Remove existing holds by this user
                    holds = holds.filter(h => h.user_id !== data.user_id);
                    // Add new hold
                    holds.push({
                        resource_id: parseInt(data.resource_id),
                        start_datetime: data.start_datetime,
                        end_datetime: data.end_datetime,
                        user_id: data.user_id,
                        user_name: data.user_name,
                        expires_at: Date.now() + 60000 // 60 seconds expiration
                    });
                    broadcast({ type: 'hold_update', holds });
                    break;

                case 'release':
                    // Release holds by this user
                    holds = holds.filter(h => h.user_id !== data.user_id);
                    broadcast({ type: 'hold_update', holds });
                    break;

                case 'booking_created':
                case 'booking_cancelled':
                    // When a booking is created or cancelled, clear the user's hold and broadcast refresh
                    holds = holds.filter(h => h.user_id !== data.user_id);
                    broadcast({ type: 'hold_update', holds });
                    broadcast({ type: 'refresh_calendar', resource_id: parseInt(data.resource_id) });
                    break;

                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (err) {
            console.error('Error handling websocket message:', err);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log('WebSocket Server running on ws://localhost:8080');
