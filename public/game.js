// World of Tanks Game - Main Game Logic
// ================================================

const API_URL = 'http://localhost:3000/api';

// Game State
let gameState = {
    currentScreen: 'title',
    playerId: null,
    playerData: null,
    currentCountry: 'germany',
    selectedTank: null,
    battleState: null,
    isPaused: false
};

// Tank Definitions
const TANK_DEFINITIONS = {
    germany: [
        { id: 'pz2', name: 'Pz.Kpfw. II', tier: 1, armor: 35, hp: 100, speed: 60, firepower: 45, reload: 3, hasAA: false, description: 'ドイツの軽戦車。機動力に優れている。' },
        { id: 'pz3', name: 'Pz.Kpfw. III', tier: 2, armor: 50, hp: 150, speed: 50, firepower: 75, reload: 4, hasAA: false, description: '中戦車。バランスが良い。' },
        { id: 'tiger1', name: 'Tiger I', tier: 3, armor: 100, hp: 300, speed: 38, firepower: 120, reload: 5, hasAA: true, description: '重戦車。火力と装甲が強力。' }
    ],
    ussr: [
        { id: 't26', name: 'T-26', tier: 1, armor: 25, hp: 90, speed: 65, firepower: 40, reload: 2.5, hasAA: false, description: 'ソビエト軽戦車。高速機動型。' },
        { id: 't34', name: 'T-34', tier: 2, armor: 60, hp: 160, speed: 55, firepower: 85, reload: 4, hasAA: false, description: '革新的な傾斜装甲を持つ中戦車。' },
        { id: 'is2', name: 'IS-2', tier: 3, armor: 120, hp: 320, speed: 35, firepower: 125, reload: 5.5, hasAA: true, description: 'ソビエト重戦車。最強クラス。' }
    ],
    usa: [
        { id: 'm4', name: 'M4 Sherman', tier: 1, armor: 40, hp: 110, speed: 58, firepower: 50, reload: 3.2, hasAA: false, description: 'アメリカ中戦車。信頼性が高い。' },
        { id: 'm26', name: 'M26 Pershing', tier: 2, armor: 75, hp: 180, speed: 48, firepower: 95, reload: 4.5, hasAA: false, description: '重巡戦車。火力が優秀。' },
        { id: 't34', name: 'T34 American', tier: 3, armor: 110, hp: 310, speed: 42, firepower: 115, reload: 5.2, hasAA: true, description: 'アメリカ重戦車。バランス型。' }
    ]
};

const SHOP_TANKS = [
    { id: 'jagdtiger', name: 'Jagdtiger', tier: 3, country: 'germany', armor: 250, hp: 400, speed: 20, firepower: 150, reload: 6, hasAA: false, cost: 150000, description: 'ドイツ駆逐戦車。怪物級の火力。' },
    { id: 'isu152', name: 'ISU-152', tier: 3, country: 'ussr', armor: 220, hp: 380, speed: 25, firepower: 145, reload: 5.8, hasAA: false, cost: 150000, description: 'ソビエト駆逐戦車。榴弾砲搭載。' },
    { id: 't95', name: 'T95', tier: 3, country: 'usa', armor: 305, hp: 420, speed: 15, firepower: 140, reload: 6.2, hasAA: false, cost: 150000, description: 'アメリカ自走砲。最強装甲。' }
];

// Initialization
window.addEventListener('load', async () => {
    try {
        // Initialize or load player
        const response = await fetch(`${API_URL}/player/init`, { method: 'POST' });
        const data = await response.json();
        gameState.playerId = data.playerId;
        gameState.playerData = data.player;
        
        loadPlayerData();
        showScreen('title');
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
});

// Load and display player data
async function loadPlayerData() {
    try {
        const response = await fetch(`${API_URL}/player/${gameState.playerId}`);
        gameState.playerData = await response.json();
        updateTitleScreen();
    } catch (error) {
        console.error('Failed to load player data:', error);
    }
}

// Screen Management
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenName + '-screen').classList.add('active');
    gameState.currentScreen = screenName;
    
    if (screenName === 'garage') {
        initGarageScreen();
    } else if (screenName === 'shop') {
        initShopScreen();
    } else if (screenName === 'title') {
        updateTitleScreen();
    }
}

function updateTitleScreen() {
    document.getElementById('title-level').textContent = gameState.playerData.level;
    document.getElementById('title-money').textContent = gameState.playerData.money;
}

// Garage Screen Functions
function initGarageScreen() {
    updateGarageInfo();
    document.querySelectorAll('.country-tab').forEach(btn => {
        btn.classList.remove('active');
        btn.addEventListener('click', () => switchCountry(btn.dataset.country));
    });
    document.querySelector('.country-tab').classList.add('active');
    switchCountry('germany');
}

function switchCountry(country) {
    gameState.currentCountry = country;
    document.querySelectorAll('.country-tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    displayTanksInGarage(country);
}

function displayTanksInGarage(country) {
    const container = document.getElementById('garage-tanks');
    container.innerHTML = '';
    
    const tanks = TANK_DEFINITIONS[country];
    const playerTanks = gameState.playerData.tanks[country];
    
    tanks.forEach(tankDef => {
        const playerTank = playerTanks[tankDef.id];
        const div = document.createElement('div');
        div.className = 'garage-tank-item' + (playerTank?.selected ? ' selected' : '');
        div.innerHTML = `
            <strong>${tankDef.name}</strong>
            <p>Tier ${tankDef.tier}</p>
            <p>強化: 砲身${playerTank?.cannon || 0}/2 車体${playerTank?.chassis || 0}/2 エンジン${playerTank?.engine || 0}/2</p>
        `;
        div.onclick = () => selectTankInGarage(country, tankDef.id, tankDef);
        container.appendChild(div);
    });
}

function selectTankInGarage(country, tankId, tankDef) {
    gameState.selectedTank = { country, tankId, def: tankDef };
    
    document.getElementById('tank-name').textContent = tankDef.name;
    document.getElementById('tank-description').textContent = tankDef.description;
    document.getElementById('stat-armor').textContent = tankDef.armor;
    document.getElementById('stat-hp').textContent = tankDef.hp;
    document.getElementById('stat-speed').textContent = tankDef.speed;
    document.getElementById('stat-firepower').textContent = tankDef.firepower;
    document.getElementById('tank-equipment').textContent = tankDef.hasAA ? '機銃装備' : '機銃なし';
    
    drawTankImage(tankDef);
    
    const playerTank = gameState.playerData.tanks[country][tankId];
    const selectBtn = document.getElementById('select-tank-btn');
    if (playerTank?.selected) {
        selectBtn.textContent = '現在この戦車が選択されています。';
        selectBtn.disabled = true;
    } else {
        selectBtn.textContent = `${tankDef.name}で出撃する`;
        selectBtn.disabled = false;
    }
}

function drawTankImage(tankDef) {
    const canvas = document.getElementById('tank-image');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw tank silhouette based on type
    ctx.fillStyle = '#ff6400';
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Hull
    ctx.fillRect(-40, -20, 80, 40);
    // Turret
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    // Gun
    ctx.fillRect(-5, -25, 10, 30);
    
    ctx.resetTransform();
}

async function upgradeTank(upgradeType) {
    if (!gameState.selectedTank) return;
    
    try {
        const response = await fetch(`${API_URL}/tank/upgrade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: gameState.playerId,
                country: gameState.selectedTank.country,
                tankId: gameState.selectedTank.tankId,
                upgradeType: upgradeType
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            gameState.playerData = data.player;
            updateGarageInfo();
            selectTankInGarage(gameState.selectedTank.country, gameState.selectedTank.tankId, gameState.selectedTank.def);
        } else {
            alert('強化に失敗しました');
        }
    } catch (error) {
        console.error('Upgrade failed:', error);
    }
}

async function selectTankForBattle() {
    if (!gameState.selectedTank) return;
    
    try {
        const response = await fetch(`${API_URL}/battle/select-tank`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: gameState.playerId,
                country: gameState.selectedTank.country,
                tankId: gameState.selectedTank.tankId
            })
        });
        
        if (response.ok) {
            await loadPlayerData();
            startBattle();
        }
    } catch (error) {
        console.error('Tank selection failed:', error);
    }
}

function updateGarageInfo() {
    document.getElementById('garage-level').textContent = gameState.playerData.level;
    document.getElementById('garage-money').textContent = gameState.playerData.money;
}

// Shop Screen Functions
async function initShopScreen() {
    updateShopInfo();
    await displayShopTank();
    displayTechTree();
}

async function displayShopTank() {
    try {
        const response = await fetch(`${API_URL}/shop/today`);
        const data = await response.json();
        const shopTank = data.shopTank;
        
        const container = document.getElementById('shop-daily-tank');
        container.innerHTML = `
            <h4>${shopTank.name}</h4>
            <p>${shopTank.description}</p>
            <p>Tier: ${shopTank.tier} | 装甲: ${shopTank.armor} | HP: ${shopTank.hp}</p>
            <button onclick="buyShopTank()">150000で購入</button>
        `;
    } catch (error) {
        console.error('Failed to load shop tank:', error);
    }
}

function displayTechTree() {
    const countries = ['germany', 'ussr', 'usa'];
    countries.forEach(country => {
        const container = document.getElementById(country + '-tree');
        container.innerHTML = '';
        
        TANK_DEFINITIONS[country].forEach(tankDef => {
            const div = document.createElement('div');
            div.className = 'tree-tank-item';
            const playerTank = gameState.playerData.tanks[country][tankDef.id];
            const cost = tankDef.tier === 2 ? 25000 : 35000;
            const canBuy = gameState.playerData.level >= (tankDef.tier === 2 ? 5 : 10) && !playerTank;
            
            div.innerHTML = `
                <strong>${tankDef.name}</strong>
                <p>Tier ${tankDef.tier} - ${cost}</p>
                ${playerTank ? '<p style="color: #00ff00;">所有</p>' : ''}
                ${!playerTank && tankDef.tier > 1 ? `<button onclick="buyTankFromTree('${country}', ${tankDef.tier})" ${!canBuy ? 'disabled' : ''}>購入</button>` : ''}
            `;
            container.appendChild(div);
        });
    });
}

async function buyTankFromTree(country, tier) {
    try {
        const response = await fetch(`${API_URL}/tank/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: gameState.playerId,
                country: country,
                tier: tier
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            gameState.playerData = data.player;
            updateShopInfo();
            displayTechTree();
        } else {
            alert('購入に失敗しました');
        }
    } catch (error) {
        console.error('Purchase failed:', error);
    }
}

function updateShopInfo() {
    document.getElementById('shop-level').textContent = gameState.playerData.level;
    document.getElementById('shop-money').textContent = gameState.playerData.money;
}

// Battle System
class BattleSystem {
    constructor(playerTank) {
        this.canvas = document.getElementById('battle-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimap = document.getElementById('minimap');
        this.minimapCtx = this.minimap.getContext('2d');
        
        this.mapType = ['desert', 'snow', 'coastal'][Math.floor(Math.random() * 3)];
        this.timeOfDay = this.mapType === 'desert' ? 'morning' : ['day', 'night'][Math.floor(Math.random() * 2)];
        this.weather = this.getRandomWeather();
        
        this.fieldWidth = 800;
        this.fieldHeight = 600;
        this.obstacles = this.generateObstacles();
        this.mines = [];
        
        this.player = this.createPlayerTank(playerTank);
        this.allies = [this.createAITank(true)];
        this.enemies = [this.createAITank(false), this.createAITank(false)];
        
        this.battleStats = { kills: 0, damage: 0, money: 0 };
        this.gameTime = 0;
        this.isPaused = false;
        this.isObserving = false;
        
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        
        this.setupEventListeners();
        this.gameLoop();
    }
    
    getRandomWeather() {
        if (this.mapType === 'desert') return 'clear';
        if (this.mapType === 'snow') return 'snow';
        return ['clear', 'fog', 'rain'][Math.floor(Math.random() * 3)];
    }
    
    generateObstacles() {
        const obstacles = [];
        const count = 8;
        
        for (let i = 0; i < count; i++) {
            let validPosition = false;
            let x, y;
            
            while (!validPosition) {
                x = Math.random() * (this.fieldWidth - 100) + 50;
                y = Math.random() * (this.fieldHeight - 100) + 50;
                
                validPosition = true;
                for (let obs of obstacles) {
                    const dist = Math.hypot(obs.x - x, obs.y - y);
                    if (dist < 150) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            const type = this.getObstacleType();
            obstacles.push({
                x, y,
                type: type,
                width: 50,
                height: 50,
                hp: type === 'wooden_box' ? 50 : 999,
                maxHp: type === 'wooden_box' ? 50 : 999
            });
        }
        
        return obstacles;
    }
    
    getObstacleType() {
        if (this.mapType === 'desert') {
            return ['rock', 'wooden_box'][Math.floor(Math.random() * 2)];
        } else if (this.mapType === 'snow') {
            return ['rock', 'wooden_box', 'wall'][Math.floor(Math.random() * 3)];
        } else { // coastal
            return ['rock', 'wooden_box', 'barricade'][Math.floor(Math.random() * 3)];
        }
    }
    
    createPlayerTank(tankData) {
        const tankDef = tankData.def;
        return {
            x: this.fieldWidth / 2,
            y: this.fieldHeight / 2,
            vx: 0,
            vy: 0,
            angle: 0,
            turretAngle: 0,
            hp: tankDef.hp,
            maxHp: tankDef.hp,
            armor: tankDef.armor,
            speed: tankDef.speed,
            firepower: tankDef.firepower,
            reload: tankDef.reload,
            reloadCurrent: 0,
            name: tankDef.name,
            hasAA: tankDef.hasAA,
            ammo: 30,
            maxAmmo: 30,
            machineGunAmmo: 200,
            machineGunMaxAmmo: 200,
            aiming: 0,
            maxAiming: 50,
            isDead: false,
            lastDamageTime: 0,
            smokeDuration: 0,
            fireDuration: 0,
            width: 40,
            height: 50,
            repairs: 3,
            repairCooldown: 0,
            mines: 3,
            mineCooldown: 0,
            isPlayer: true,
            teamId: 'player'
        };
    }
    
    createAITank(isAlly) {
        const countries = ['germany', 'ussr', 'usa'];
        const country = countries[Math.floor(Math.random() * 3)];
        const tankDef = TANK_DEFINITIONS[country][Math.floor(Math.random() * 2)];
        
        let validPosition = false;
        let x, y;
        
        while (!validPosition) {
            x = Math.random() * this.fieldWidth;
            y = Math.random() * this.fieldHeight;
            
            validPosition = Math.hypot(x - this.player.x, y - this.player.y) > 200;
        }
        
        return {
            x, y,
            vx: 0,
            vy: 0,
            angle: Math.random() * Math.PI * 2,
            turretAngle: Math.random() * Math.PI * 2,
            hp: tankDef.hp,
            maxHp: tankDef.hp,
            armor: tankDef.armor,
            speed: tankDef.speed,
            firepower: tankDef.firepower,
            reload: tankDef.reload,
            reloadCurrent: 0,
            name: tankDef.name,
            hasAA: tankDef.hasAA,
            ammo: 30,
            maxAmmo: 30,
            machineGunAmmo: 200,
            machineGunMaxAmmo: 200,
            isDead: false,
            lastDamageTime: 0,
            smokeDuration: 0,
            fireDuration: 0,
            width: 40,
            height: 50,
            isPlayer: false,
            teamId: isAlly ? 'allies' : 'enemies',
            aiState: 'patrol',
            aiTarget: null,
            aiTimer: 0
        };
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === 'Escape') {
                this.togglePause();
            } else if (e.key === 'r') {
                this.useRepairKit();
            } else if (e.key === 'm') {
                this.deployMine();
            } else if (e.key === '1' || e.key === '2') {
                // Change ammo type
            } else if (e.key === ' ') {
                e.preventDefault();
                this.fireAA();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        document.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        document.addEventListener('click', () => {
            this.fireMainGun();
        });
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pause-menu').classList.toggle('hidden');
    }
    
    update() {
        if (this.isPaused) return;
        
        this.gameTime++;
        
        // Update player tank
        this.updateTankMovement(this.player);
        this.updateTankTurret(this.player);
        this.updateTankReload(this.player);
        this.updateTankStatus(this.player);
        
        // Update allies
        this.allies.forEach(ally => {
            if (!ally.isDead) {
                this.updateAITank(ally);
                this.updateTankReload(ally);
                this.updateTankStatus(ally);
            }
        });
        
        // Update enemies
        this.enemies.forEach(enemy => {
            if (!enemy.isDead) {
                this.updateAITank(enemy);
                this.updateTankReload(enemy);
                this.updateTankStatus(enemy);
            }
        });
        
        // Update projectiles and effects
        this.updateEffects();
        
        // Check collisions
        this.checkCollisions();
        
        // Check win/lose conditions
        this.checkBattleEnd();
        
        // Update UI
        this.updateBattleUI();
    }
    
    updateTankMovement(tank) {
        if (tank.isPlayer) {
            const forward = this.keys['w'] || this.keys['arrowup'];
            const backward = this.keys['s'] || this.keys['arrowdown'];
            const left = this.keys['a'] || this.keys['arrowleft'];
            const right = this.keys['d'] || this.keys['arrowright'];
            
            if (forward) {
                tank.vx = Math.cos(tank.angle) * (tank.speed * 0.3);
                tank.vy = Math.sin(tank.angle) * (tank.speed * 0.3);
            } else if (backward) {
                tank.vx = Math.cos(tank.angle) * (-tank.speed * 0.2);
                tank.vy = Math.sin(tank.angle) * (-tank.speed * 0.2);
            }
            
            if (left) {
                tank.angle -= 0.05;
            }
            if (right) {
                tank.angle += 0.05;
            }
            
            if (forward || backward) {
                tank.aiming = Math.min(tank.aiming + 1, tank.maxAiming);
            } else {
                tank.aiming = Math.max(tank.aiming - 2, 0);
            }
        }
        
        // Apply friction
        tank.vx *= 0.95;
        tank.vy *= 0.95;
        
        // Update position
        tank.x += tank.vx;
        tank.y += tank.vy;
        
        // Boundary check
        tank.x = Math.max(20, Math.min(this.fieldWidth - 20, tank.x));
        tank.y = Math.max(20, Math.min(this.fieldHeight - 20, tank.y));
        
        // Check shallow water effect
        if (this.mapType === 'coastal' && this.isInShallowWater(tank.x, tank.y)) {
            tank.vx *= 0.7;
            tank.vy *= 0.7;
        }
    }
    
    isInShallowWater(x, y) {
        // Coastal map shallow water is on the right side
        return this.mapType === 'coastal' && x > this.fieldWidth - 150;
    }
    
    updateTankTurret(tank) {
        if (tank.isPlayer) {
            const dx = this.mouseX - (this.canvas.width / 2);
            const dy = this.mouseY - (this.canvas.height / 2);
            const targetAngle = Math.atan2(dy, dx);
            
            // Turret follows with delay for weight feel
            const angleDiff = ((targetAngle - tank.turretAngle + Math.PI) % (Math.PI * 2)) - Math.PI;
            tank.turretAngle += angleDiff * 0.05;
        }
    }
    
    updateTankReload(tank) {
        if (tank.reloadCurrent > 0) {
            tank.reloadCurrent--;
        }
    }
    
    updateTankStatus(tank) {
        if (tank.smokeDuration > 0) {
            tank.smokeDuration--;
        }
        if (tank.fireDuration > 0) {
            tank.fireDuration--;
            tank.hp -= 1; // Fire damage
        }
        if (tank.repairCooldown > 0) {
            tank.repairCooldown--;
        }
        if (tank.mineCooldown > 0) {
            tank.mineCooldown--;
        }
    }
    
    updateAITank(tank) {
        let target = this.findNearestEnemy(tank);
        
        if (tank.aiState === 'patrol') {
            if (target && Math.hypot(target.x - tank.x, target.y - tank.y) < 300) {
                tank.aiState = 'engage';
                tank.aiTarget = target;
            } else {
                tank.aiTimer++;
                if (tank.aiTimer > 60) {
                    tank.angle += (Math.random() - 0.5) * 0.2;
                    tank.aiTimer = 0;
                }
                tank.vx = Math.cos(tank.angle) * (tank.speed * 0.15);
                tank.vy = Math.sin(tank.angle) * (tank.speed * 0.15);
            }
        } else if (tank.aiState === 'engage') {
            if (!target) {
                tank.aiState = 'patrol';
                tank.aiTarget = null;
            } else {
                const dist = Math.hypot(target.x - tank.x, target.y - tank.y);
                const angleToTarget = Math.atan2(target.y - tank.y, target.x - tank.x);
                
                // Move towards or away from target
                if (dist > 150) {
                    tank.vx = Math.cos(angleToTarget) * (tank.speed * 0.2);
                    tank.vy = Math.sin(angleToTarget) * (tank.speed * 0.2);
                } else if (dist < 80) {
                    tank.vx = Math.cos(angleToTarget) * (-tank.speed * 0.15);
                    tank.vy = Math.sin(angleToTarget) * (-tank.speed * 0.15);
                }
                
                // Rotate turret at target
                tank.turretAngle += ((angleToTarget - tank.turretAngle + Math.PI) % (Math.PI * 2) - Math.PI) * 0.08;
                
                // AI fire
                if (tank.reloadCurrent <= 0 && Math.random() < 0.02) {
                    this.fireAIGun(tank, target);
                }
            }
        }
        
        tank.x += tank.vx;
        tank.y += tank.vy;
        
        tank.x = Math.max(20, Math.min(this.fieldWidth - 20, tank.x));
        tank.y = Math.max(20, Math.min(this.fieldHeight - 20, tank.y));
    }
    
    findNearestEnemy(tank) {
        let nearest = null;
        let minDist = Infinity;
        
        const enemies = tank.teamId === 'allies' ? this.enemies : [...this.allies, this.player];
        
        enemies.forEach(enemy => {
            if (!enemy.isDead) {
                const dist = Math.hypot(enemy.x - tank.x, enemy.y - tank.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = enemy;
                }
            }
        });
        
        return nearest;
    }
    
    fireMainGun() {
        if (this.player.reloadCurrent <= 0 && this.player.ammo > 0 && !this.isPaused) {
            const projectile = {
                x: this.player.x + Math.cos(this.player.turretAngle) * 30,
                y: this.player.y + Math.sin(this.player.turretAngle) * 30,
                vx: Math.cos(this.player.turretAngle) * 5,
                vy: Math.sin(this.player.turretAngle) * 5,
                damage: this.player.firepower,
                owner: this.player,
                isFromPlayer: true,
                muzzleFlashTime: 10
            };
            
            this.projectiles = this.projectiles || [];
            this.projectiles.push(projectile);
            
            this.player.reloadCurrent = this.player.reload * 60;
            this.player.ammo--;
            this.player.aiming = this.player.maxAiming;
        }
    }
    
    fireAIGun(tank, target) {
        if (tank.ammo > 0) {
            const projectile = {
                x: tank.x + Math.cos(tank.turretAngle) * 30,
                y: tank.y + Math.sin(tank.turretAngle) * 30,
                vx: Math.cos(tank.turretAngle) * 5,
                vy: Math.sin(tank.turretAngle) * 5,
                damage: tank.firepower,
                owner: tank,
                isFromPlayer: false,
                muzzleFlashTime: 10
            };
            
            this.projectiles = this.projectiles || [];
            this.projectiles.push(projectile);
            
            tank.reloadCurrent = tank.reload * 60;
            tank.ammo--;
        }
    }
    
    fireAA() {
        if (this.player.hasAA && this.player.machineGunAmmo > 0 && !this.isPaused) {
            const projectile = {
                x: this.player.x + Math.cos(this.player.turretAngle) * 20,
                y: this.player.y + Math.sin(this.player.turretAngle) * 20,
                vx: Math.cos(this.player.turretAngle) * 6,
                vy: Math.sin(this.player.turretAngle) * 6,
                damage: 5,
                owner: this.player,
                isFromPlayer: true,
                isAA: true,
                muzzleFlashTime: 5
            };
            
            this.projectiles = this.projectiles || [];
            this.projectiles.push(projectile);
            
            this.player.machineGunAmmo--;
            this.player.aiming += 2;
        }
    }
    
    useRepairKit() {
        if (this.player.repairs > 0 && this.player.repairCooldown <= 0) {
            this.player.hp = Math.min(this.player.hp + 100, this.player.maxHp);
            this.player.repairs--;
            this.player.repairCooldown = 180; // 3 seconds cooldown
        }
    }
    
    deployMine() {
        if (this.player.mines > 0 && this.player.mineCooldown <= 0) {
            const mine = {
                x: this.player.x,
                y: this.player.y,
                radius: 30,
                damage: 50,
                owner: this.player
            };
            
            this.mines.push(mine);
            this.player.mines--;
            this.player.mineCooldown = 300; // 5 seconds cooldown
        }
    }
    
    updateEffects() {
        this.projectiles = this.projectiles || [];
        this.projectiles = this.projectiles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            
            // Check if out of bounds
            if (p.x < 0 || p.x > this.fieldWidth || p.y < 0 || p.y > this.fieldHeight) {
                return false;
            }
            
            // Check collision with obstacles
            for (let obs of this.obstacles) {
                if (this.checkCollisionCircleRect(p.x, p.y, 3, obs)) {
                    // Impact effect
                    this.addImpactEffect(p.x, p.y);
                    return false;
                }
            }
            
            // Check collision with tanks
            const allTanks = [this.player, ...this.allies, ...this.enemies];
            for (let tank of allTanks) {
                if (!tank.isDead && tank !== p.owner && this.checkCollisionCircleRect(p.x, p.y, 3, tank)) {
                    this.damageRank(tank, p.damage, p);
                    this.addImpactEffect(p.x, p.y);
                    return false;
                }
            }
            
            return true;
        });
        
        this.effects = this.effects || [];
        this.effects = this.effects.filter(e => {
            e.duration--;
            return e.duration > 0;
        });
    }
    
    addImpactEffect(x, y) {
        this.effects = this.effects || [];
        this.effects.push({
            type: 'impact',
            x, y,
            duration: 10,
            radius: 20
        });
    }
    
    checkCollisions() {
        const allTanks = [this.player, ...this.allies, ...this.enemies];
        
        // Tank to tank collision
        for (let i = 0; i < allTanks.length; i++) {
            for (let j = i + 1; j < allTanks.length; j++) {
                const t1 = allTanks[i];
                const t2 = allTanks[j];
                
                if (!t1.isDead && !t2.isDead && this.checkCollisionCircleCircle(t1, t2)) {
                    // Ram damage
                    const damage1 = Math.abs(t1.vx) + Math.abs(t1.vy);
                    const damage2 = Math.abs(t2.vx) + Math.abs(t2.vy);
                    
                    if (damage1 > 1) this.damageRank(t2, damage1 * 10, null);
                    if (damage2 > 1) this.damageRank(t1, damage2 * 10, null);
                    
                    // Separate tanks
                    const dx = t2.x - t1.x;
                    const dy = t2.y - t1.y;
                    const dist = Math.hypot(dx, dy);
                    t1.x -= (dx / dist) * 5;
                    t1.y -= (dy / dist) * 5;
                    t2.x += (dx / dist) * 5;
                    t2.y += (dy / dist) * 5;
                }
            }
        }
        
        // Tank to obstacle collision
        for (let tank of allTanks) {
            if (!tank.isDead) {
                for (let obs of this.obstacles) {
                    if (this.checkCollisionCircleRect(tank.x, tank.y, 25, obs)) {
                        // Push tank away
                        const dx = tank.x - obs.x;
                        const dy = tank.y - obs.y;
                        const dist = Math.hypot(dx, dy);
                        tank.x += (dx / dist) * 3;
                        tank.y += (dy / dist) * 3;
                        tank.vx = 0;
                        tank.vy = 0;
                        
                        // Damage wooden boxes
                        if (obs.type === 'wooden_box' && Math.hypot(tank.vx, tank.vy) > 2) {
                            obs.hp -= 5;
                        }
                    }
                }
            }
        }
        
        // Mine detonation
        for (let mine of this.mines) {
            for (let tank of allTanks) {
                if (!tank.isDead && Math.hypot(tank.x - mine.x, tank.y - mine.y) < mine.radius) {
                    this.damageRank(tank, mine.damage, null);
                    this.addExplosionEffect(mine.x, mine.y);
                }
            }
        }
    }
    
    checkCollisionCircleCircle(t1, t2) {
        const dist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
        return dist < (t1.width / 2 + t2.width / 2);
    }
    
    checkCollisionCircleRect(cx, cy, r, rect) {
        const closestX = Math.max(rect.x - rect.width / 2, Math.min(cx, rect.x + rect.width / 2));
        const closestY = Math.max(rect.y - rect.height / 2, Math.min(cy, rect.y + rect.height / 2));
        const dist = Math.hypot(cx - closestX, cy - closestY);
        return dist < r + 20;
    }
    
    damageRank(tank, damage, projectile) {
        if (tank.isDead) return;
        
        // Calculate angle of impact for armor calculation
        let armorModifier = 1;
        if (projectile) {
            const angle = Math.atan2(projectile.vy, projectile.vx) - tank.angle;
            if (Math.abs(angle) < Math.PI / 4) {
                armorModifier = 0.7; // Front armor
            } else if (Math.abs(angle - Math.PI) < Math.PI / 4) {
                armorModifier = 1.5; // Rear armor
            } else {
                armorModifier = 1; // Side armor
            }
        }
        
        const finalDamage = damage * (1 - (tank.armor / 200) * armorModifier);
        tank.hp -= finalDamage;
        tank.lastDamageTime = 10;
        
        if (Math.random() < 0.3) {
            tank.smokeDuration = 30;
        }
        
        this.battleStats.damage += finalDamage;
        
        if (tank.hp <= 0) {
            this.killTank(tank);
        }
    }
    
    killTank(tank) {
        tank.isDead = true;
        tank.hp = 0;
        
        if (tank !== this.player) {
            if (tank.teamId === 'enemies') {
                this.battleStats.kills++;
                this.battleStats.money += 2500;
            }
        }
        
        this.addExplosionEffect(tank.x, tank.y);
    }
    
    addExplosionEffect(x, y) {
        this.effects = this.effects || [];
        for (let i = 0; i < 20; i++) {
            this.effects.push({
                type: 'explosion',
                x, y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                duration: 15,
                size: Math.random() * 5 + 2
            });
        }
    }
    
    checkBattleEnd() {
        const aliveEnemies = this.enemies.filter(e => !e.isDead).length;
        const aliveAllies = this.allies.filter(a => !a.isDead).length;
        const playerAlive = !this.player.isDead;
        
        if (aliveEnemies === 0) {
            this.endBattle(true);
        } else if (!playerAlive && aliveAllies === 0) {
            this.endBattle(false);
        } else if (!playerAlive && aliveAllies > 0) {
            this.isObserving = true;
        }
    }
    
    endBattle(victory) {
        this.battleStats.money += victory ? 5000 : 1000;
        this.battleStats.exp = this.battleStats.kills * 1000 + Math.floor(this.battleStats.damage / 10);
        
        showBattleResult(victory, this.battleStats);
    }
    
    updateBattleUI() {
        const hpPercent = (this.player.hp / this.player.maxHp) * 100;
        document.getElementById('player-hp-fill').style.width = hpPercent + '%';
        document.getElementById('ammo-count').textContent = this.player.ammo;
        document.getElementById('mg-ammo').textContent = this.player.machineGunAmmo;
        document.getElementById('enemy-count').textContent = this.enemies.filter(e => !e.isDead).length;
        document.getElementById('ally-count').textContent = (this.player.isDead ? 0 : 1) + this.allies.filter(a => !a.isDead).length;
        
        const cooldown = Math.max(0, this.player.repairCooldown);
        document.getElementById('repair-kit-cooldown').textContent = `修復キット: ${this.player.repairs}個 (${cooldown > 0 ? Math.ceil(cooldown / 60) + 's' : '準備完了'})`;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = this.getBackgroundColor();
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw fog/rain effect
        this.renderWeatherEffect();
        
        // Draw obstacles
        this.renderObstacles();
        
        // Draw tanks
        this.renderTank(this.player);
        this.allies.forEach(a => this.renderTank(a));
        this.enemies.forEach(e => this.renderTank(e));
        
        // Draw projectiles
        this.renderProjectiles();
        
        // Draw effects
        this.renderEffects();
        
        // Draw aiming reticle
        if (!this.player.isDead) {
            this.renderAimingReticle();
        }
        
        // Draw minimap
        this.renderMinimap();
    }
    
    getBackgroundColor() {
        if (this.mapType === 'desert') {
            return '#d4a574';
        } else if (this.mapType === 'snow') {
            return '#e8e8e8';
        } else {
            return '#4a7c8c';
        }
    }
    
    renderWeatherEffect() {
        if (this.weather === 'fog') {
            this.ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.weather === 'rain') {
            this.ctx.strokeStyle = 'rgba(100, 150, 200, 0.6)';
            for (let i = 0; i < 50; i++) {
                const x = (i * 30 + this.gameTime * 2) % this.canvas.width;
                const y = (i * 15 + this.gameTime * 5) % this.canvas.height;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x - 5, y + 15);
                this.ctx.stroke();
            }
        } else if (this.weather === 'snow') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            for (let i = 0; i < 30; i++) {
                const x = (i * 40 + this.gameTime) % this.canvas.width;
                const y = (i * 30 + this.gameTime * 0.5) % this.canvas.height;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    renderObstacles() {
        this.obstacles.forEach(obs => {
            if (obs.type === 'rock') {
                this.ctx.fillStyle = '#888';
                this.ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
            } else if (obs.type === 'wooden_box') {
                this.ctx.fillStyle = '#8b4513';
                this.ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
                this.ctx.strokeStyle = '#654321';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
            } else if (obs.type === 'barricade') {
                this.ctx.fillStyle = '#4a4a4a';
                this.ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, 15);
            } else if (obs.type === 'wall') {
                this.ctx.fillStyle = '#aaa';
                this.ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
            }
        });
    }
    
    renderTank(tank) {
        if (tank.isDead) {
            this.ctx.fillStyle = '#1a1a1a';
            this.ctx.fillRect(tank.x - tank.width / 2, tank.y - tank.height / 2, tank.width, tank.height);
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(tank.x - 8, tank.y - 12, 16, 20);
            return;
        }
        
        this.ctx.save();
        this.ctx.translate(tank.x, tank.y);
        
        // Hull color
        let hullColor;
        if (tank.teamId === 'player') {
            hullColor = '#00aa00';
        } else if (tank.teamId === 'allies') {
            hullColor = '#0000ff';
        } else {
            hullColor = '#ff0000';
        }
        
        // Damage effect
        if (tank.lastDamageTime > 0) {
            this.ctx.filter = 'brightness(1.5)';
            tank.lastDamageTime--;
        }
        
        // Draw hull
        this.ctx.rotate(tank.angle);
        this.ctx.fillStyle = hullColor;
        this.ctx.fillRect(-tank.width / 2, -tank.height / 2, tank.width, tank.height);
        
        // Draw tracks
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(-tank.width / 2 - 3, -tank.height / 2 + 2, tank.width + 6, 6);
        this.ctx.fillRect(-tank.width / 2 - 3, tank.height / 2 - 8, tank.width + 6, 6);
        
        this.ctx.rotate(-tank.angle);
        
        // Draw turret
        this.ctx.fillStyle = hullColor;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 18, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw gun
        this.ctx.rotate(tank.turretAngle);
        this.ctx.fillStyle = '#555';
        this.ctx.fillRect(-4, -12, 8, 25);
        
        // Muzzle flash
        if (tank.reloadCurrent > tank.reload * 60 - 5) {
            this.ctx.fillStyle = '#ff6400';
            this.ctx.fillRect(-3, -15, 6, 8);
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.fillRect(-2, -12, 4, 5);
        }
        
        this.ctx.rotate(-tank.turretAngle);
        
        // Smoke effect
        if (tank.smokeDuration > 0) {
            this.ctx.fillStyle = `rgba(100, 100, 100, ${tank.smokeDuration / 30})`;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 20 + Math.sin(this.gameTime * 0.1) * 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Fire effect
        if (tank.fireDuration > 0) {
            this.ctx.fillStyle = `rgba(255, 100, 0, ${tank.fireDuration / 20})`;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
        
        // HP bar
        const barWidth = 40;
        const barHeight = 4;
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(tank.x - barWidth / 2, tank.y - tank.height / 2 - 12, barWidth, barHeight);
        
        const healthPercent = tank.hp / tank.maxHp;
        this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        this.ctx.fillRect(tank.x - barWidth / 2, tank.y - tank.height / 2 - 12, barWidth * healthPercent, barHeight);
    }
    
    renderProjectiles() {
        this.projectiles = this.projectiles || [];
        this.projectiles.forEach(p => {
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    renderEffects() {
        this.effects = this.effects || [];
        this.effects.forEach(e => {
            if (e.type === 'impact') {
                this.ctx.strokeStyle = `rgba(255, 100, 0, ${e.duration / 10})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, e.radius * (1 - e.duration / 10), 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (e.type === 'explosion') {
                this.ctx.fillStyle = `rgba(255, 100, 0, ${e.duration / 15})`;
                e.x += e.vx;
                e.y += e.vy;
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
    
    renderAimingReticle() {
        const reticleSize = 20 + (this.player.aiming / this.player.maxAiming) * 20;
        
        // Accuracy modifier from weather
        let accuracyMod = 1;
        if (this.weather === 'fog') accuracyMod = 1.3;
        if (this.weather === 'rain') accuracyMod = 1.2;
        
        const actualReticleSize = reticleSize * accuracyMod;
        
        this.ctx.strokeStyle = 'rgba(255, 200, 0, 0.7)';
        this.ctx.lineWidth = 2;
        
        // Outer circle
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, actualReticleSize, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Cross
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2 - actualReticleSize / 2, this.canvas.height / 2);
        this.ctx.lineTo(this.canvas.width / 2 + actualReticleSize / 2, this.canvas.height / 2);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, this.canvas.height / 2 - actualReticleSize / 2);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height / 2 + actualReticleSize / 2);
        this.ctx.stroke();
    }
    
    renderMinimap() {
        this.minimapCtx.fillStyle = this.getBackgroundColor();
        this.minimapCtx.fillRect(0, 0, this.minimap.width, this.minimap.height);
        
        const scaleX = this.minimap.width / this.fieldWidth;
        const scaleY = this.minimap.height / this.fieldHeight;
        
        // Draw player
        this.minimapCtx.fillStyle = '#00ff00';
        this.minimapCtx.fillRect(this.player.x * scaleX - 2, this.player.y * scaleY - 2, 4, 4);
        
        // Draw allies
        this.minimapCtx.fillStyle = '#0000ff';
        this.allies.forEach(a => {
            if (!a.isDead) {
                this.minimapCtx.fillRect(a.x * scaleX - 2, a.y * scaleY - 2, 4, 4);
            }
        });
        
        // Draw enemies
        this.minimapCtx.fillStyle = '#ff0000';
        this.enemies.forEach(e => {
            if (!e.isDead) {
                this.minimapCtx.fillRect(e.x * scaleX - 2, e.y * scaleY - 2, 4, 4);
            }
        });
    }
    
    gameLoop = () => {
        this.update();
        this.render();
        requestAnimationFrame(this.gameLoop);
    }
}

let battleSystem = null;

async function startBattle() {
    await loadPlayerData();
    
    // Find selected tank
    let selectedTank = null;
    for (let country in gameState.playerData.tanks) {
        for (let tankId in gameState.playerData.tanks[country]) {
            if (gameState.playerData.tanks[country][tankId].selected) {
                const tankDef = TANK_DEFINITIONS[country].find(t => t.id === tankId);
                selectedTank = { country, tankId, def: tankDef };
                break;
            }
        }
    }
    
    if (!selectedTank) {
        alert('戦車を選択してください');
        return;
    }
    
    showScreen('battle');
    battleSystem = new BattleSystem(selectedTank);
}

function resumeBattle() {
    if (battleSystem) {
        battleSystem.togglePause();
    }
}

function showBattleResult(victory, stats) {
    document.getElementById('result-title').textContent = victory ? '勝利！' : '敗北...';
    document.getElementById('result-kills').textContent = stats.kills;
    document.getElementById('result-damage').textContent = Math.floor(stats.damage);
    document.getElementById('result-money').textContent = stats.money;
    document.getElementById('result-exp').textContent = stats.exp || 0;
    
    // Update player data
    fetch(`${API_URL}/player/${gameState.playerId}/reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ money: stats.money, experience: stats.exp || 0 })
    }).then(() => {
        loadPlayerData();
    });
    
    showScreen('result');
}

function showGarage() {
    showScreen('garage');
}

function showShop() {
    showScreen('shop');
}

async function resetGame() {
    if (confirm('ゲームをリセットしてもよろしいですか？')) {
        await fetch(`${API_URL}/game/reset`, { method: 'POST' });
        location.reload();
    }
}

function backToTitle() {
    if (gameState.currentScreen === 'battle' && battleSystem) {
        battleSystem.isPaused = true;
    }
    showScreen('title');
}
