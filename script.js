// Get DOM elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timerElement = document.getElementById('timer');
const jumpButton = document.getElementById('jumpButton');

// Set canvas dimensions to be responsive
function resizeCanvas() {
    canvas.width = Math.min(window.innerWidth * 0.9, 800);
    canvas.height = Math.min(window.innerHeight * 0.6, 400);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- Game Variables ---
let player, obstacles, powerups, boss, bossProjectiles, score, gameOver, startTime, obstacleSpawnTimer;
let gameState = 'running'; // running, boss, paused
let bossDefeated = false; // To ensure boss only happens once
let pauseEndTime = 0;

// --- Player Properties ---
const playerProps = {
    x: 50,
    y: canvas.height - 50,
    width: 40,
    height: 40,
    dy: 0,
    jumpStrength: 14,
    superJumpStrength: 28,
    gravity: 0.8
};

// --- Obstacle Properties ---
const obstacleProps = {
    width: 40,
    height: 40,
    speed: 5
};

// --- Player Class ---
class Player {
    constructor(x, y, width, height) {
        Object.assign(this, { x, y, width, height });
        this.dy = 0;
        this.hasSuperJump = false;
        this.hasShield = false;
    }

    draw() {
        ctx.font = `${this.height}px serif`;
        ctx.textBaseline = 'bottom';
        if (this.hasSuperJump) {
            ctx.shadowColor = 'yellow';
            ctx.shadowBlur = 15;
        } else if (this.hasShield) {
            ctx.shadowColor = 'cyan';
            ctx.shadowBlur = 15;
        }
        ctx.fillText('👻', this.x, this.y + this.height);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }

    update() {
        this.dy += playerProps.gravity;
        this.y += this.dy;
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.dy = 0;
        }
    }

    jump() {
        if (this.y + this.height >= canvas.height) {
            if (this.hasSuperJump) {
                this.dy = -playerProps.superJumpStrength;
                this.hasSuperJump = false;
            } else {
                this.dy = -playerProps.jumpStrength;
            }
        }
    }
}

// --- Boss Class ---
class Boss {
    constructor() {
        this.width = 120;
        this.height = 120;
        this.x = canvas.width;
        this.y = canvas.height - this.height;
        this.speed = 2;
        this.attackTimer = 0;
        this.attackWaves = 0;
        this.state = 'entering'; // entering, attacking, leaving
    }

    draw() {
        ctx.font = `40px serif`;
        ctx.textBaseline = 'bottom';
        ctx.fillText('🎃', this.x, this.y + 40);
        ctx.fillText('🎃', this.x + 40, this.y + 40);
        ctx.fillText('🎃', this.x + 80, this.y + 40);
    }

    update() {
        if (this.state === 'entering') {
            if (this.x > canvas.width - this.width - 20) {
                this.x -= this.speed;
            } else {
                this.state = 'attacking';
            }
        } else if (this.state === 'attacking') {
            this.attack();
            if (this.attackWaves >= 3 && bossProjectiles.length === 0) {
                this.state = 'leaving';
            }
        } else if (this.state === 'leaving') {
            this.x += this.speed;
            if (this.x > canvas.width) {
                gameState = 'paused';
                pauseEndTime = Date.now() + 3000;
                boss = null;
                bossDefeated = true; // Mark boss as defeated
            }
        }
    }

    attack() {
        this.attackTimer++;
        if (this.attackTimer % 120 === 0 && this.attackWaves < 3) {
            this.attackWaves++;
            const projectileY = Math.random() < 0.5 ? canvas.height - obstacleProps.height : canvas.height - (obstacleProps.height * 3);
            bossProjectiles.push({
                x: this.x,
                y: projectileY,
                width: obstacleProps.width,
                height: obstacleProps.height,
                speed: obstacleProps.speed + 3
            });
        }
    }
}

// --- Obstacle and Power-up Functions ---
function spawnObstacle() {
    const chance = Math.random();
    let isTower = false;

    if (chance < 0.25) {
        powerups.push({ type: 'shield', x: canvas.width, y: canvas.height - (obstacleProps.height * 2), width: obstacleProps.width, height: obstacleProps.height });
        obstacles.push({ type: 'exploding', x: canvas.width + 150, y: canvas.height - obstacleProps.height, width: obstacleProps.width, height: obstacleProps.height });
    } else if (chance < 0.50) {
        isTower = true;
        powerups.push({ type: 'jump', x: canvas.width, y: canvas.height - obstacleProps.height, width: obstacleProps.width, height: obstacleProps.height });
        const towerX = canvas.width + 300;
        for (let i = 0; i < 4; i++) obstacles.push({ type: 'normal', x: towerX, y: canvas.height - (obstacleProps.height * (i + 1)), width: obstacleProps.width, height: obstacleProps.height });
    } else if (chance < 0.75) {
        obstacles.push({ type: 'normal', x: canvas.width, y: canvas.height - obstacleProps.height, width: obstacleProps.width, height: obstacleProps.height });
        obstacles.push({ type: 'normal', x: canvas.width, y: canvas.height - (obstacleProps.height * 2), width: obstacleProps.width, height: obstacleProps.height });
    } else {
        obstacles.push({ type: 'normal', x: canvas.width, y: canvas.height - obstacleProps.height, width: obstacleProps.width, height: obstacleProps.height });
    }
    return isTower;
}

function updateEntities(entities, speed) {
    for (let i = entities.length - 1; i >= 0; i--) {
        let entity = entities[i];
        entity.x -= speed;
        if (entity.x + entity.width < 0) {
            entities.splice(i, 1);
        }
    }
}

function drawObstacles() {
    obstacles.forEach(obs => {
        ctx.font = `${obs.height}px serif`;
        ctx.textBaseline = 'bottom';
        ctx.fillText(obs.type === 'exploding' ? '💣' : '🎃', obs.x, obs.y + obs.height);
    });
}

function drawPowerups() {
    powerups.forEach(p => {
        ctx.font = `${p.height}px serif`;
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = p.type === 'shield' ? 'gold' : 'yellow';
        ctx.shadowBlur = p.type === 'shield' ? 15 : 10;
        ctx.fillText('🍄', p.x, p.y + p.height);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    });
}

function drawProjectiles() {
    bossProjectiles.forEach(proj => {
        ctx.font = `${proj.height}px serif`;
        ctx.textBaseline = 'bottom';
        ctx.fillText('🎃', proj.x, proj.y + proj.height);
    });
}

// --- Collision Detection ---
function checkCollisions() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        if (player.x < obs.x + obs.width && player.x + player.width > obs.x && player.y < obs.y + obs.height && player.y + player.height > obs.y) {
            if (obs.type === 'exploding' && player.hasShield) {
                player.hasShield = false;
                obstacles.splice(i, 1);
            } else {
                gameOver = true;
            }
        }
    }
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (player.x < p.x + p.width && player.x + player.width > p.x && player.y < p.y + p.height && player.y + player.height > p.y) {
            if (p.type === 'jump') player.hasSuperJump = true;
            else if (p.type === 'shield') player.hasShield = true;
            powerups.splice(i, 1);
        }
    }
    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
        const proj = bossProjectiles[i];
        if (player.x < proj.x + proj.width && player.x + player.width > proj.x && player.y < proj.y + proj.height && player.y + player.height > proj.y) {
            gameOver = true;
        }
    }
}

// --- Game State Functions ---
function updateTimer() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    timerElement.innerText = `Time: ${elapsedTime}s`;
    return elapsedTime;
}

function showGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff9900';
    ctx.font = '40px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '20px "Courier New", Courier, monospace';
    ctx.fillText('Press Space or Tap to Restart', canvas.width / 2, canvas.height / 2 + 20);
}

function init() {
    player = new Player(playerProps.x, playerProps.y, playerProps.width, playerProps.height);
    obstacles = [];
    powerups = [];
    boss = null;
    bossProjectiles = [];
    gameOver = false;
    startTime = Date.now();
    obstacleSpawnTimer = 0;
    gameState = 'running';
    bossDefeated = false; // Reset on init
    gameLoop();
}

function gameLoop() {
    if (gameOver) {
        showGameOver();
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    player.update();
    player.draw();

    const elapsedTime = updateTimer();

    if (gameState === 'paused') {
        if (Date.now() > pauseEndTime) {
            gameState = 'running';
        }
    } else if (gameState === 'running') {
        obstacleSpawnTimer++;
        if (obstacleSpawnTimer > (100 + Math.random() * 50)) {
            const isTower = spawnObstacle();
            obstacleSpawnTimer = isTower ? -180 : 0;
        }
        updateEntities(obstacles, obstacleProps.speed);
        updateEntities(powerups, obstacleProps.speed);

        if (elapsedTime >= 60 && !bossDefeated) {
            gameState = 'boss';
            obstacles = [];
            powerups = [];
            boss = new Boss();
        }
    } else if (gameState === 'boss') {
        boss.update();
        boss.draw();
        updateEntities(bossProjectiles, bossProjectiles[0]?.speed || obstacleProps.speed);
        drawProjectiles();
    }

    drawObstacles();
    drawPowerups();
    checkCollisions();

    requestAnimationFrame(gameLoop);
}

function handleJump() {
    if (!gameOver) player.jump();
    else init();
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleJump();
    }
});
jumpButton.addEventListener('click', handleJump);
jumpButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleJump();
});

init();
