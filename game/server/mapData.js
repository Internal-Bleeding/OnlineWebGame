const obstacles = Object.freeze([
    { id: 'obs1', x: 0, y: 0, width: 1000, height: 20, angle: 0 },
    { id: 'obs2', x: 0, y: 0, width: 20, height: 1000, angle: 0 },
    { id: 'obs3', x: 0, y: 980, width: 1000, height: 20, angle: 0 },
    { id: 'obs4', x: 980, y: 0, width: 20, height: 1000, angle: 0 },
    { id: 'obs5', x: 600, y: 400, width: 100, height: 200, angle: 0 },
    { id: 'obs6', x: 200, y: 400, width: 100, height: 200, angle: 0 },
]);

const MAP_SIZE_X = 1000;
const MAP_SIZE_Y = 1000;

let bulletLoopStarted = false;

let boxes = [];
let bullets = [];
let clients = new Map();

module.exports = {
    obstacles,
    MAP_SIZE_X,
    MAP_SIZE_Y,
    boxes,
    bullets, 
    clients,
    bulletLoopStarted
}