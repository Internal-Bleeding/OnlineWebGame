// engine/gameEngine.js
const { randomUUID } = require('crypto');
const {obstacles, MAP_SIZE_X, MAP_SIZE_Y, boxes, bullets, clients} = require('./mapData');

function isBoxVisible(from, to, obstacles) {
    for (const obs of obstacles) {
        const obsEdges = getRectangleEdges(obs);

        for (const edge of obsEdges) {
            if (doLineSegmentsIntersect(from, to, edge[0], edge[1])) {
                return false;
            } 
        }
    }
    return true;
}

function getRectangleEdges(rect) { //get the corners of the obstacle and make it into lines
    const { x, y, width, height } = rect;
    const corners = [
        { x: x, y: y },
        { x: x + width, y: y },
        { x: x + width, y: y + height },
        { x: x, y: y + height }
    ];
    return [
        [corners[0], corners[1]],
        [corners[1], corners[2]],
        [corners[2], corners[3]],
        [corners[3], corners[0]]
    ];
}

function doLineSegmentsIntersect(p1, p2, q1, q2) {
    function ccw(a, b, c) {
        return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    }
    return (
        ccw(p1, q1, q2) !== ccw(p2, q1, q2) &&
        ccw(p1, p2, q1) !== ccw(p1, p2, q2)
    );
}

/*function broadcast() {
    for (const client of clients.values()) {
        const clientBox = boxes.filter(b => b.id == client.id)[0]; // return the box that has our client id
        const visibleBoxes = boxes.filter(box => {
            if (box === clientBox) return true;

            const from = { x: clientBox.x, y: clientBox.y };
            const to = { x: box.x, y: box.y };

            return isBoxVisible(from, to, obstacles);
        });

        client.res.write(`data: ${JSON.stringify({ myId: client.id, boxes: visibleBoxes, bullets })}\n\n`);
    }
}*/

function isPointInRotatedBox(point, box) {
  const angle = box.angle; // in radians

  // Compute center of the box from top-left
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  // Translate point to box's center
  const dx = point.x - centerX;
  const dy = point.y - centerY;

  // Rotate point into box's local axis-aligned space
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  // Check point within axis-aligned box in local space
  return (
    localX >= -box.width / 2 && localX <= box.width / 2 &&
    localY >= -box.height / 2 && localY <= box.height / 2
  );
}

function moveBullets() {
    // Move bullets
    for (const bullet of bullets) {
        bullet.x += bullet.speed * Math.cos(bullet.angle);
        bullet.y += bullet.speed * Math.sin(bullet.angle);
    }
}

function updateCollision() {
    const filtered = bullets.filter(bullet => {
        let hit = false;

        // Hit player boxes
        for (const box of boxes) {
            if (box.id === bullet.owner) continue;

            if (isPointInRotatedBox(bullet, box)) {
                box.health -= 10;
                console.log(`Box ${box.id} hit! Health: ${box.health}`);
                hit = true;
                break;
            }
        }

        // Hit obstacles (stop bullet, no damage)
        if (!hit) {
            for (const obs of obstacles) {
                if (isPointInRotatedBox(bullet, obs)) {
                    console.log(`Bullet hit obstacle ${obs.id}`);
                    hit = true;
                    break;
                }
            }
        }

        // Remove bullet if it hit something or went out of bounds
        return !hit &&
            bullet.x >= 0 && bullet.x <= MAP_SIZE_X &&
            bullet.y >= 0 && bullet.y <= MAP_SIZE_Y;
    });
    bullets.length = 0;
    bullets.push(...filtered);
}

function handleAction(msg) {
    const { id, type, dy, da } = msg;
    const box = boxes.find(b => b.id === id);
    if (!box) return res.sendStatus(404);

    box.angle = box.angle || 0;

    if (box.health <= 0) return; //check if dead before letting move

    if (type === 'move') {
    const nextX = box.x + dy * Math.cos(box.angle);
    const nextY = box.y + dy * Math.sin(box.angle);

    const wouldCollide = obstacles.some(obs =>
        isPointInRotatedBox({ x: nextX, y: nextY }, obs)
    );
    if (!wouldCollide) {
        box.x = nextX;
        box.y = nextY;
    }
    } else if (type === 'rotate') {
        box.angle += da;
    } else if (type === 'shoot') {
        bullets.push({
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
            angle: box.angle,
            speed: 20,
            owner: id
        });
    }

    //broadcast();
    //res.sendStatus(200);
}

module.exports = {
    handleAction,
    moveBullets,
    updateCollision
};