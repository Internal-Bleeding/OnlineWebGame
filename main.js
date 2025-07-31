const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const gameRoutes = require('./game/routes');
const gameServer = require('./game/server/main');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Serve static files from /client folder
app.use(express.static(path.join(__dirname, 'game/client')));

// Route for /game/map-data
app.use('/game', gameRoutes);

// Fallback route to serve index.html on `/`
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'game/client', 'index.html'));
});

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
});

wss.on('connection', (ws) => {
    gameServer.handleWSConnection(ws);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});