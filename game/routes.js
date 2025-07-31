// game/routes.js
const express = require('express');
const router = express.Router();
const {obstacles} = require('./server/mapData'); // your game logic module

// Keep map-data if client fetches it
router.get('/map-data', (req, res) => {
  res.json(obstacles);
});

module.exports = router;