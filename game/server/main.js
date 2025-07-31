const { randomUUID } = require('crypto');
const gameEngine = require('./gameEngine');
const {obstacles, MAP_SIZE_X, MAP_SIZE_Y, boxes, bullets, clients, bulletLoopStarted} = require('./mapData');

function broadcast() {
    for (const client of clients.values()) {
        const clientBox = boxes.find(b => b.id === client.id);
        const visibleBoxes = boxes.filter(box => {
            if (box === clientBox) return true;
            return isBoxVisible({ x: clientBox.x, y: clientBox.y }, { x: box.x, y: box.y }, obstacles);
        });

        const payload = {
            myId: client.id,
            boxes: visibleBoxes,
            bullets
        };

        try {
            client.ws.send(JSON.stringify(payload));
        } catch (e) {
            console.error(`Failed to send to ${client.id}`, e);
        }
    }
}

function startLoop() {
    if (bulletLoopStarted) return;
    //bulletLoopStarted = true;

    setInterval(() => {
        
        gameEngine.moveBullets();
        // Bullet-Box/Obstacle Collision
        gameEngine.updateCollision();

        broadcast(); // send updated state to clients
    }, 1000 / 30); // 30 FPS
}

function handleWSConnection(ws) {
    const clientId = randomUUID();
    const newBox = {
        id: clientId,
        x: Math.floor(Math.random() * MAP_SIZE_X),
        y: Math.floor(Math.random() * MAP_SIZE_Y),
        angle: 0,
        width: 50,
        height: 50,
        health: 100,
    };

    boxes.push(newBox);
    const client = { id: clientId, ws };
    clients.set(clientId, client);

    ws.send(JSON.stringify({ myId: clientId, boxes, bullets }));

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            handleActionWS(clientId, msg);
        } catch (err) {
            console.error('Failed to parse message:', err);
        }
    });

    ws.on('close', () => {
        const filtered = boxes.filter(b => b.id !== clientId);
        boxes.length = 0;
        boxes.push(...filtered);
        clients.delete(clientId);
        broadcast();
    });

    startLoop();
    broadcast();
}


function handleActionWS(id, msg) {
    const ms = {id, msg};
    gameEngine.handleAction(ms);
    broadcast();
}

module.exports = {
    broadcast,
    handleWSConnection,
    handleActionWS
};