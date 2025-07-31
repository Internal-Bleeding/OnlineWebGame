//client/main.js

const canvas = document.getElementById('canvas');
const minimap = document.getElementById('minimap');
const mctx = minimap.getContext('2d');
const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 1000;
const ctx = canvas.getContext('2d');
const healthBar = document.getElementById('healthBar');
const slider = document.getElementById('healthSlider');
const CAMERA_WIDTH = canvas.width;
const CAMERA_HEIGHT = canvas.height;
let myId = null;
let previousState = null;
let targetState = null;
let lastUpdateTime = 0;
let interpAlpha = 0;


let gameState = {
    boxes: [],
    bullets: [],
};
let obstacles = [];

fetch('/game/map-data')
.then(res => res.json())
.then(_obstacles => {
    obstacles = _obstacles;
    renderLoop();
});

function drawMinimap() {
    mctx.clearRect(0, 0, minimap.width, minimap.height);

    const scaleX = minimap.width / WORLD_WIDTH;
    const scaleY = minimap.height / WORLD_HEIGHT;

    for (const box of obstacles) {
    const x = box.x * scaleX;
    const y = box.y * scaleY;
    const width = box.width * scaleX;
    const height = box.height * scaleY;

    mctx.fillStyle = 'black';
    mctx.fillRect(x, y, width, height);
    }

    for (const box of gameState.boxes) {
    const x = box.x * scaleX;
    const y = box.y * scaleY;
    const width = box.width * scaleX;
    const height = box.height * scaleY;

    mctx.fillStyle = box.id === myId ? 'blue' : 'red';
    mctx.fillRect(x, y, width, height);
    }
}


function setHealth(health) {
    healthBar.style.width = `${health}%`;

    if (health > 60) {
    healthBar.style.background = 'linear-gradient(to right, #0f0, #4caf50)';
    } else if (health > 30) {
    healthBar.style.background = 'linear-gradient(to right, #ff0, orange)';
    } else {
    healthBar.style.background = 'linear-gradient(to right, red, darkred)';
    }
}

function drawBox(box, cameraX, cameraY) {
ctx.save();

// Move to the box's center position
ctx.translate(
    box.x - cameraX + box.width / 2,
    box.y - cameraY + box.height / 2
);

// Rotate around the center
ctx.rotate(box.angle);

// Draw the box centered on (0, 0)
ctx.fillStyle = box.id === myId ? 'blue' : 'red';
ctx.fillRect(-box.width / 2, -box.height / 2, box.width, box.height);

ctx.restore();
}


function drawObstacle(obstacle, cameraX, cameraY) {
    ctx.save();

    // Move to the obstacle's center
    ctx.translate(
    obstacle.x - cameraX + obstacle.width / 2,
    obstacle.y - cameraY + obstacle.height / 2
    );

    // Rotate around the center
    ctx.rotate(obstacle.angle);

    // Draw rectangle centered on (0, 0)
    ctx.fillStyle = 'black';
    ctx.fillRect(
    -obstacle.width / 2,
    -obstacle.height / 2,
    obstacle.width,
    obstacle.height
    );

    ctx.restore();
}

function getLineIntersection(p1, p2, p3, p4) {
const s1x = p2.x - p1.x;
const s1y = p2.y - p1.y;
const s2x = p4.x - p3.x;
const s2y = p4.y - p3.y;

const denom = (-s2x * s1y + s1x * s2y);
if (denom === 0) return null; // parallel lines

const s = (-s1y * (p1.x - p3.x) + s1x * (p1.y - p3.y)) / denom;
const t = ( s2x * (p1.y - p3.y) - s2y * (p1.x - p3.x)) / denom;

if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
    return {
        x: p1.x + (t * s1x),
        y: p1.y + (t * s1y)
    };
}

return null;
}


function getRectangleEdges(rect) {
const { x, y, width, height } = rect;

const topLeft = { x: x, y: y };
const topRight = { x: x + width, y: y };
const bottomRight = { x: x + width, y: y + height };
const bottomLeft = { x: x, y: y + height };

return [
    [topLeft, topRight],
    [topRight, bottomRight],
    [bottomRight, bottomLeft],
    [bottomLeft, topLeft]
];
}


function getAngle(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
}

function castRayToObstacles(origin, angle, maxLength = 2000) {
const dx = Math.cos(angle);
const dy = Math.sin(angle);

const end = {
    x: origin.x + dx * maxLength,
    y: origin.y + dy * maxLength
};

let closest = null;
let closestDist = Infinity;

for (const obs of obstacles) {
    const edges = getRectangleEdges(obs);
    for (const [p1, p2] of edges) {
        const hit = getLineIntersection(origin, end, p1, p2);
        if (hit) {
            const dist = (hit.x - origin.x) ** 2 + (hit.y - origin.y) ** 2;
            if (dist < closestDist) {
                closest = hit;
                closestDist = dist;
            }
        }
    }
}

return closest || end; // fallback to max-length ray
}

function drawVisionMask(playerBox, cameraX, cameraY) {
    const origin = {
        x: playerBox.x + playerBox.width / 2,
        y: playerBox.y + playerBox.height / 2
    };

    const rays = [];


    const step = Math.PI / 180;
    for (let i = 0; i < 370; i++) {
        const angle = i * step;
        const hitPoint = castRayToObstacles(origin, angle);
        rays.push({ angle, x: hitPoint.x, y: hitPoint.y });
    }

    // Sort rays by angle to form a fan
    rays.sort((a, b) => a.angle - b.angle);

    // Fill screen with darkness
    // ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clip out the visibility polygon
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(origin.x - cameraX, origin.y - cameraY);
    for (const ray of rays) {
        ctx.lineTo(ray.x - cameraX, ray.y - cameraY);
    }
    ctx.closePath();
    ctx.clip();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

}

function drawBullet(bullet, cameraX, cameraY) {
    const r = 5;
    if (
    bullet.x + r < cameraX ||
    bullet.x - r > cameraX + canvas.width ||
    bullet.y + r < cameraY ||
    bullet.y - r > cameraY + canvas.height
    ) return;

    ctx.beginPath();
    ctx.arc(bullet.x - cameraX, bullet.y - cameraY, r, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
}


function interpolateGameState(alpha) {
    if (!previousState || !targetState) return;

    const lerp = (a, b, t) => a + (b - a) * t;

    gameState = {
    boxes: targetState.boxes.map((box, i) => {
        const prev = previousState.boxes.find(b => b.id === box.id) || box;
        return {
        ...box,
        x: lerp(prev.x, box.x, alpha),
        y: lerp(prev.y, box.y, alpha),
        angle: lerp(prev.angle, box.angle, alpha)
        };
    }),
    bullets: targetState.bullets.map((b, i) => {
        const prev = previousState.bullets.find(pb =>
        Math.abs(pb.x - b.x) < 100 && Math.abs(pb.y - b.y) < 100
        ) || b;
        return {
        ...b,
        x: lerp(prev.x, b.x, alpha),
        y: lerp(prev.y, b.y, alpha)
        };
    })
    };
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const myBox = gameState.boxes.find(box => box.id === myId);
    if (!myBox) return;

    const cameraX = myBox.x + myBox.width / 2 - canvas.width / 2;
    const cameraY = myBox.y + myBox.height / 2 - canvas.height / 2;



    obstacles.forEach(obstacle => {
    drawObstacle(obstacle, cameraX, cameraY);
    });
    drawVisionMask(myBox, cameraX, cameraY);
    drawMinimap();

        for (const box of gameState.boxes) {
    drawBox(box, cameraX, cameraY);
    }

    for (const bullet of gameState.bullets) {
    drawBullet(bullet, cameraX, cameraY);
    }
}

const ws = new WebSocket(`ws://${location.host}`); // automatically connects to main server

ws.onmessage = function (e) {
    previousState = gameState;
    const data = JSON.parse(e.data);
    if (!myId && data.myId) myId = data.myId;
    setHealth(data.boxes.find(box => box.id === myId)?.health || 0);
    targetState = data;
    lastUpdateTime = performance.now();
};

ws.onopen = () => {
    console.log('[WebSocket] Connected to game server');
};

ws.onclose = () => {
    console.warn('[WebSocket] Disconnected from game server');
};

function renderLoop() {
    const now = performance.now();
    const delta = now - lastUpdateTime;
    interpAlpha = Math.min(delta / 100, 1); // assuming server updates every ~100ms

    interpolateGameState(interpAlpha);
    drawGame();
    requestAnimationFrame(renderLoop);
}

function sendAction(type, payload = {}) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, ...payload }));
    }
}

// Smooth key input logic
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

window.addEventListener('keydown', (e) => {
    if (e.key in keys) keys[e.key] = true;
    if (e.key === ' ') sendAction('shoot');
});

window.addEventListener('keyup', (e) => {
    if (e.key in keys) keys[e.key] = false;
});

function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function setKey(key, state) {
    if (key in keys) keys[key] = state;
}

// Show mobile controls if on a phone
if (isMobileDevice()) {
    document.getElementById('mobile-controls').style.display = 'block';
}

setInterval(() => {
    if (!myId) return;
    if (keys.ArrowUp) sendAction('move', { dy: 5 });
    if (keys.ArrowDown) sendAction('move', { dy: -5 });
    if (keys.ArrowLeft) sendAction('rotate', { da: -0.05 });
    if (keys.ArrowRight) sendAction('rotate', { da: 0.05 });
}, 50); // every 50ms for smooth input