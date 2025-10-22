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
let player, obstacles, score, gameOver, startTime, obstacleSpawnTimer;

// --- Player Properties ---
const playerProps = {
    x: 50,
    y: canvas.height - 50,
    width: 30,
    height: 30,
    color: '#FFFFFF', // A white square, like a ghost
    dy: 0, // Vertical velocity
    jumpStrength: 12,
    gravity: 0.7
};

// --- Obstacle Properties ---
const obstacleProps = {
    width: 40,
    height: 40,
    color: '#ff9900', // Orange for pumpkins
    speed: 5
};

// --- Player Class ---
class Player {
    constructor(x, y, width, height, color) {
        Object.assign(this, { x, y, width, height, color });
        this.dy = 0;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.dy += playerProps.gravity;
        this.y += this.dy;

        // Prevent falling through the floor
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.dy = 0;
        }
    }

    jump() {
        // Only jump if on the ground
        if (this.y + this.height >= canvas.height) {
            this.dy = -playerProps.jumpStrength;
        }
    }
}

// --- Obstacle Functions ---
function spawnObstacle() {
    obstacles.push({
        x: canvas.width,
        y: canvas.height - obstacleProps.height,
        width: obstacleProps.width,
        height: obstacleProps.height
    });
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= obstacleProps.speed;

        // Remove obstacles that go off-screen
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

function drawObstacles() {
    ctx.fillStyle = obstacleProps.color;
    obstacles.forEach(obs => {
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    });
}

// --- Collision Detection ---
function checkCollision() {
    for (const obs of obstacles) {
        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            gameOver = true;
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
    player = new Player(playerProps.x, playerProps.y, playerProps.width, playerProps.height, playerProps.color);
    obstacles = [];
    score = 0;
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

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw player
    player.update();
    player.draw();

    // Spawn, update, and draw obstacles
    obstacleSpawnTimer++;
    if (obstacleSpawnTimer > 90) { // Spawn an obstacle every 90 frames
        spawnObstacle();
        obstacleSpawnTimer = 0;
    }
    updateObstacles();
    drawObstacles();

    // Check for collisions
    checkCollision();

    // Update UI
    updateTimer();

    requestAnimationFrame(gameLoop);
}

// --- Event Listeners ---
function handleJump() {
    if (!gameOver) {
        player.jump();
    } else {
        init(); // Restart game
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
