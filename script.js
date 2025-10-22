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
let player, obstacles, powerups, score, gameOver, startTime, obstacleSpawnTimer;

// --- Player Properties ---
const playerProps = {
    x: 50,
    y: canvas.height - 50,
    width: 40, // Adjusted for emoji size
    height: 40, // Adjusted for emoji size
    dy: 0, // Vertical velocity
    jumpStrength: 14, // Slightly stronger jump for bigger size
    superJumpStrength: 28, // Jump high enough for 4 obstacles
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
        // Add a glow effect based on active power-ups
        if (this.hasSuperJump) {
            ctx.shadowColor = 'yellow';
            ctx.shadowBlur = 15;
        } else if (this.hasShield) {
            ctx.shadowColor = 'cyan'; // Blue glow for shield
            ctx.shadowBlur = 15;
        }
        ctx.fillText('👻', this.x, this.y + this.height);
        ctx.shadowColor = 'transparent'; // Reset shadow
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
        if (this.y + this.height >= canvas.height) { // Only jump if on the ground
            if (this.hasSuperJump) {
                this.dy = -playerProps.superJumpStrength;
                this.hasSuperJump = false; // Consume the power-up
            } else {
                this.dy = -playerProps.jumpStrength;
            }
        }
    }
}

// --- Obstacle and Power-up Functions ---
function spawnObstacle() {
    const chance = Math.random();
    let isTower = false;

    // Case 1: Exploding Pumpkin + Shield Mushroom (25%)
    if (chance < 0.25) {
        powerups.push({
            x: canvas.width,
            y: canvas.height - (obstacleProps.height * 2), // High mushroom
            width: obstacleProps.width,
            height: obstacleProps.height,
            type: 'shield'
        });
        obstacles.push({
            x: canvas.width + 150,
            y: canvas.height - obstacleProps.height,
            width: obstacleProps.width,
            height: obstacleProps.height,
            type: 'exploding'
        });
    }
    // Case 2: Four-Pumpkin Tower + Jump Mushroom (25%)
    else if (chance < 0.50) {
        isTower = true;
        powerups.push({
            x: canvas.width,
            y: canvas.height - obstacleProps.height, // Ground mushroom
            width: obstacleProps.width,
            height: obstacleProps.height,
            type: 'jump'
        });
        const towerX = canvas.width + 300;
        for (let i = 0; i < 4; i++) {
            obstacles.push({
                x: towerX,
                y: canvas.height - (obstacleProps.height * (i + 1)),
                width: obstacleProps.width,
                height: obstacleProps.height,
                type: 'normal'
            });
        }
    }
    // Case 3: Double Pumpkin (one ground, one floating) (25%)
    else if (chance < 0.75) {
        // Ground pumpkin
        obstacles.push({
            x: canvas.width,
            y: canvas.height - obstacleProps.height,
            width: obstacleProps.width,
            height: obstacleProps.height,
            type: 'normal'
        });
        // Floating pumpkin directly above
        obstacles.push({
            x: canvas.width,
            y: canvas.height - (obstacleProps.height * 2),
            width: obstacleProps.width,
            height: obstacleProps.height,
            type: 'normal'
        });
    }
    // Case 4: Single Pumpkin (on the ground) (25%)
    else {
        obstacles.push({
            x: canvas.width,
            y: canvas.height - obstacleProps.height,
            width: obstacleProps.width,
            height: obstacleProps.height,
            type: 'normal'
        });
    }
    return isTower;
}

function updateEntities(entities) {
    for (let i = entities.length - 1; i >= 0; i--) {
        let entity = entities[i];
        entity.x -= obstacleProps.speed;
        if (entity.x + entity.width < 0) {
            entities.splice(i, 1);
        }
    }
}

function drawObstacles() {
    obstacles.forEach(obs => {
        ctx.font = `${obs.height}px serif`;
        ctx.textBaseline = 'bottom';
        const emoji = obs.type === 'exploding' ? '💣' : '🎃';
        ctx.fillText(emoji, obs.x, obs.y + obs.height);
    });
}

function drawPowerups() {
    powerups.forEach(p => {
        ctx.font = `${p.height}px serif`;
        ctx.textBaseline = 'bottom';
        if (p.type === 'shield') {
            ctx.shadowColor = 'gold';
            ctx.shadowBlur = 15;
        } else {
            ctx.shadowColor = 'yellow';
            ctx.shadowBlur = 10;
        }
        ctx.fillText('🍄', p.x, p.y + p.height);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    });
}

// --- Collision Detection ---
function checkObstacleCollision() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        if (player.x < obs.x + obs.width && player.x + player.width > obs.x &&
            player.y < obs.y + obs.height && player.y + player.height > obs.y) {

            if (obs.type === 'exploding' && player.hasShield) {
                player.hasShield = false; // Consume shield
                obstacles.splice(i, 1);   // Remove bomb
            } else {
                gameOver = true;
            }
        }
    }
}

function checkPowerupCollision() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (player.x < p.x + p.width && player.x + player.width > p.x &&
            player.y < p.y + p.height && player.y + player.height > p.y) {
            if (p.type === 'jump') {
                player.hasSuperJump = true;
            } else if (p.type === 'shield') {
                player.hasShield = true;
            }
            powerups.splice(i, 1); // Remove the power-up
        }
    }
}

// --- Game State Functions ---
function updateTimer() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    timerElement.innerText = `Time: ${elapsedTime}s`;
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

// --- Game Initialization ---
function init() {
    player = new Player(playerProps.x, playerProps.y, playerProps.width, playerProps.height);
    obstacles = [];
    powerups = [];
    gameOver = false;
    startTime = Date.now();
    obstacleSpawnTimer = 0;
    gameLoop();
}

// --- Main Game Loop ---
function gameLoop() {
    if (gameOver) {
        showGameOver();
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.update();
    player.draw();

    obstacleSpawnTimer++;
    if (obstacleSpawnTimer > (100 + Math.random() * 50)) {
        const isTower = spawnObstacle();
        if (isTower) {
            obstacleSpawnTimer = -180;
        } else {
            obstacleSpawnTimer = 0;
        }
    }

    updateEntities(obstacles);
    updateEntities(powerups);
    drawObstacles();
    drawPowerups();

    checkObstacleCollision();
    checkPowerupCollision();

    updateTimer();
    requestAnimationFrame(gameLoop);
}

// --- Event Listeners ---
function handleJump() {
    if (!gameOver) {
        player.jump();
    } else {
        init();
    }
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

// --- Start the game ---
init();
