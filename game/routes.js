// game/routes.js
const express = require('express');
const router = express.Router();
const gameServer = require('./server/gameEngine'); // your game logic module

router.get('/map-data', (req, res) => {
  res.json(gameServer.getMapData());
});

router.post('/action', (req, res) => {
  gameServer.handleAction(req.body);
  res.sendStatus(200);
});

router.get('/events', (req, res) => {
  gameServer.handleSSE(req, res);
});

module.exports = router;