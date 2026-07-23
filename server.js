const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Data directory
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbFile = path.join(dataDir, 'gamedata.json');

// Initialize game data
const initializeData = () => {
  const defaultData = {
    players: {},
    lastShopUpdate: new Date().toDateString(),
    shopTank: null
  };
  return defaultData;
};

const loadData = () => {
  if (fs.existsSync(dbFile)) {
    return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  }
  return initializeData();
};

const saveData = (data) => {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
};

// Tank definitions
const tankDefinitions = {
  germany: [
    { id: 'pz2', name: 'Pz.Kpfw. II', tier: 1, armor: 35, hp: 100, speed: 60, firepower: 45, reload: 3, },
    { id: 'pz3', name: 'Pz.Kpfw. III', tier: 2, armor: 50, hp: 150, speed: 50, firepower: 75, reload: 4 },
    { id: 'tiger1', name: 'Tiger I', tier: 3, armor: 100, hp: 300, speed: 38, firepower: 120, reload: 5 }
  ],
  ussr: [
    { id: 't26', name: 'T-26', tier: 1, armor: 25, hp: 90, speed: 65, firepower: 40, reload: 2.5 },
    { id: 't34', name: 'T-34', tier: 2, armor: 60, hp: 160, speed: 55, firepower: 85, reload: 4 },
    { id: 'is2', name: 'IS-2', tier: 3, armor: 120, hp: 320, speed: 35, firepower: 125, reload: 5.5 }
  ],
  usa: [
    { id: 'm4', name: 'M4 Sherman', tier: 1, armor: 40, hp: 110, speed: 58, firepower: 50, reload: 3.2 },
    { id: 'm26', name: 'M26 Pershing', tier: 2, armor: 75, hp: 180, speed: 48, firepower: 95, reload: 4.5 },
    { id: 't34', name: 'T34 American', tier: 3, armor: 110, hp: 310, speed: 42, firepower: 115, reload: 5.2 }
  ]
};

// Shop tank pool (different from tech tree)
const shopTankPool = [
  { id: 'jagdtiger', name: 'Jagdtiger', tier: 3, country: 'germany', armor: 250, hp: 400, speed: 20, firepower: 150, reload: 6, cost: 150000 },
  { id: isu152', name: 'ISU-152', tier: 3, country: 'ussr', armor: 220, hp: 380, speed: 25, firepower: 145, reload: 5.8, cost: 150000 },
  { id: 't95', name: 'T95', tier: 3, country: 'usa', armor: 305, hp: 420, speed: 15, firepower: 140, reload: 6.2, cost: 150000 }
];

// Get or create player
app.post('/api/player/init', (req, res) => {
  const data = loadData();
  const playerId = 'player_' + Date.now();
  
  data.players[playerId] = {
    id: playerId,
    level: 1,
    money: 0,
    experience: 0,
    tanks: {
      germany: { pz2: { tier: 1, cannon: 0, chassis: 0, engine: 0, selected: true } },
      ussr: { t26: { tier: 1, cannon: 0, chassis: 0, engine: 0, selected: false } },
      usa: { m4: { tier: 1, cannon: 0, chassis: 0, engine: 0, selected: false } }
    },
    ownedShopTanks: [],
    lastRepairKit: 0
  };
  
  saveData(data);
  res.json({ playerId, player: data.players[playerId] });
});

// Get player data
app.get('/api/player/:playerId', (req, res) => {
  const data = loadData();
  const player = data.players[req.params.playerId];
  
  if (player) {
    res.json(player);
  } else {
    res.status(404).json({ error: 'Player not found' });
  }
});

// Update player money and experience
app.post('/api/player/:playerId/reward', (req, res) => {
  const data = loadData();
  const player = data.players[req.params.playerId];
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  const { money, experience } = req.body;
  player.money += money || 0;
  player.experience += experience || 0;
  
  // Level up calculation
  const expPerLevel = 10000;
  player.level = Math.floor(player.experience / expPerLevel) + 1;
  
  saveData(data);
  res.json(player);
});

// Upgrade tank
app.post('/api/tank/upgrade', (req, res) => {
  const data = loadData();
  const player = data.players[req.body.playerId];
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  const { country, tankId, upgradeType } = req.body;
  const cost = 3500;
  
  if (player.money < cost) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }
  
  const tank = player.tanks[country][tankId];
  if (tank[upgradeType] < 2) {
    tank[upgradeType]++;
    player.money -= cost;
    saveData(data);
    res.json({ success: true, player });
  } else {
    res.status(400).json({ error: 'Max upgrade reached' });
  }
});

// Buy tank from tech tree
app.post('/api/tank/buy', (req, res) => {
  const data = loadData();
  const player = data.players[req.body.playerId];
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  const { country, tier } = req.body;
  const tierCosts = { 2: 25000, 3: 35000 };
  const tierLevels = { 2: 5, 3: 10 };
  
  if (player.level < tierLevels[tier]) {
    return res.status(400).json({ error: 'Insufficient level' });
  }
  
  if (player.money < tierCosts[tier]) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }
  
  const tanks = tankDefinitions[country];
  const newTank = tanks.find(t => t.tier === tier);
  
  if (!newTank) {
    return res.status(400).json({ error: 'Tank not found' });
  }
  
  if (!player.tanks[country][newTank.id]) {
    player.tanks[country][newTank.id] = { tier, cannon: 0, chassis: 0, engine: 0, selected: false };
    player.money -= tierCosts[tier];
    saveData(data);
    res.json({ success: true, player });
  } else {
    res.status(400).json({ error: 'Tank already owned' });
  }
});

// Buy shop tank
app.post('/api/tank/buy-shop', (req, res) => {
  const data = loadData();
  const player = data.players[req.body.playerId];
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  const shopTank = shopTankPool[req.body.shopTankIndex];
  
  if (player.money < shopTank.cost) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }
  
  player.ownedShopTanks.push({ ...shopTank, bought: new Date() });
  player.money -= shopTank.cost;
  saveData(data);
  res.json({ success: true, player });
});

// Get today's shop tank
app.get('/api/shop/today', (req, res) => {
  const data = loadData();
  const today = new Date().toDateString();
  
  if (data.lastShopUpdate !== today) {
    data.lastShopUpdate = today;
    data.shopTank = shopTankPool[Math.floor(Math.random() * shopTankPool.length)];
    saveData(data);
  }
  
  res.json({ shopTank: data.shopTank });
});

// Select tank for battle
app.post('/api/battle/select-tank', (req, res) => {
  const data = loadData();
  const player = data.players[req.body.playerId];
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  const { country, tankId } = req.body;
  
  // Deselect all
  for (let c in player.tanks) {
    for (let t in player.tanks[c]) {
      player.tanks[c][t].selected = false;
    }
  }
  
  player.tanks[country][tankId].selected = true;
  saveData(data);
  res.json({ success: true, player });
});

// Reset game
app.post('/api/game/reset', (req, res) => {
  fs.unlinkSync(dbFile);
  res.json({ success: true, message: 'Game reset' });
});

app.listen(PORT, () => {
  console.log(`World of Tanks server running on http://localhost:${PORT}`);
});
