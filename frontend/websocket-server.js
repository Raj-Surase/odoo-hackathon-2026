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

function broadcastHolds() {
    const clientsHolds = holds.map(h => ({
        resource_id: h.resource_id,
        start_datetime: h.start_datetime,
        end_datetime: h.end_datetime,
        user_id: h.user_id,
        user_name: h.user_name,
        expires_at: h.expires_at
    }));
    broadcast({ type: 'hold_update', holds: clientsHolds });
}

// Periodically clean up expired holds
setInterval(() => {
    const now = Date.now();
    const prevCount = holds.length;
    holds = holds.filter(h => h.expires_at > now);
    if (holds.length !== prevCount) {
        console.log(`Cleaned up expired holds. Current holds:`, holds.length);
        broadcastHolds();
    }
}, 1000);

wss.on('connection', (ws) => {
    console.log('Client connected');
    
    // Immediately send current holds to new client
    const clientsHolds = holds.map(h => ({
        resource_id: h.resource_id,
        start_datetime: h.start_datetime,
        end_datetime: h.end_datetime,
        user_id: h.user_id,
        user_name: h.user_name,
        expires_at: h.expires_at
    }));
    ws.send(JSON.stringify({ type: 'hold_update', holds: clientsHolds }));

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
                        expires_at: Date.now() + 60000, // 60 seconds expiration
                        ws: ws
                    });
                    broadcastHolds();
                    break;

                case 'release':
                    // Release holds by this user
                    holds = holds.filter(h => h.user_id !== data.user_id);
                    broadcastHolds();
                    break;

                case 'booking_created':
                case 'booking_cancelled':
                    // When a booking is created or cancelled, clear the user's hold and broadcast refresh
                    holds = holds.filter(h => h.user_id !== data.user_id);
                    broadcastHolds();
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
        const prevCount = holds.length;
        holds = holds.filter(h => h.ws !== ws);
        if (holds.length !== prevCount) {
            console.log(`Cleaned up holds for disconnected client.`);
            broadcastHolds();
        }
    });
});

console.log('WebSocket Server running on ws://localhost:8080');
