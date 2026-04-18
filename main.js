class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        this.load.image('char', 'assets/char.png');

        // ── Generate all assets procedurally (no external files needed) ──
        const g = (key, fn) => {
            const tex = this.textures.createCanvas(key, 64, 64);
            fn(tex.getContext());
            tex.refresh();
        };

        // Sky gradient canvas
        const skyTex = this.textures.createCanvas('sky', 800, 500);
        const skyCtx = skyTex.getContext();
        const grad = skyCtx.createLinearGradient(0, 0, 0, 500);
        grad.addColorStop(0,   '#0d0d2b');
        grad.addColorStop(0.6, '#1a1a4e');
        grad.addColorStop(1,   '#2d1b4e');
        skyCtx.fillStyle = grad;
        skyCtx.fillRect(0, 0, 800, 500);
        skyTex.refresh();

        // Ground tile
        g('ground', ctx => {
            ctx.fillStyle = '#2a1a0e';
            ctx.fillRect(0, 0, 64, 64);
            ctx.fillStyle = '#3d2b1a';
            ctx.fillRect(0, 0, 64, 8);
            ctx.fillStyle = '#4a3520';
            ctx.fillRect(2, 2, 60, 4);
        });

        // Platform tile
        g('platform', ctx => {
            ctx.fillStyle = '#1a3a5c';
            ctx.fillRect(0, 0, 64, 24);
            ctx.fillStyle = '#2a5a8c';
            ctx.fillRect(0, 0, 64, 6);
            ctx.fillStyle = '#3a7aac';
            ctx.fillRect(2, 2, 60, 2);
        });

        // Robot enemy
        g('robot', ctx => {
            ctx.fillStyle = '#888';
            ctx.fillRect(16, 8, 32, 28);   // body
            ctx.fillStyle = '#aaa';
            ctx.fillRect(20, 4, 24, 20);   // head
            ctx.fillStyle = '#f00';
            ctx.fillRect(24, 8, 6, 6);     // left eye
            ctx.fillRect(34, 8, 6, 6);     // right eye
            ctx.fillStyle = '#555';
            ctx.fillRect(10, 36, 12, 20);  // left leg
            ctx.fillRect(42, 36, 12, 20);  // right leg
            ctx.fillStyle = '#777';
            ctx.fillRect(4, 10, 10, 18);   // left arm
            ctx.fillRect(50, 10, 10, 18);  // right arm
        });

        // Cat enemy
        g('cat', ctx => {
            ctx.fillStyle = '#cc6600';
            ctx.fillRect(12, 20, 40, 28);  // body
            ctx.fillRect(20, 8, 24, 24);   // head
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(20, 4, 8, 10);    // left ear
            ctx.fillRect(36, 4, 8, 10);    // right ear
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(24, 14, 5, 5);    // left eye
            ctx.fillRect(35, 14, 5, 5);    // right eye
            ctx.fillStyle = '#cc6600';
            ctx.fillRect(52, 22, 6, 30);   // tail
        });

        // Bullet
        g('bullet', ctx => {
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(20, 26, 24, 12);
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(28, 28, 8, 8);
        });

        // Coin
        g('coin', ctx => {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(32, 32, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(32, 32, 14, 0, Math.PI * 2);
            ctx.fill();
        });

        // Building bg deco
        g('building', ctx => {
            ctx.fillStyle = '#0a0a1e';
            ctx.fillRect(0, 0, 64, 64);
            ctx.fillStyle = '#1a2a4e';
            ctx.fillRect(4, 4, 56, 60);
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 3; col++) {
                    ctx.fillStyle = Math.random() > 0.4 ? '#ffdd88' : '#1a1a3e';
                    ctx.fillRect(8 + col * 18, 8 + row * 14, 12, 10);
                }
            }
        });
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.GROUND_Y = H - 60;
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.currentLevel = 1;
        this.levelComplete = false;

        // ── Sky ──────────────────────────────────────────────────────────────
        this.add.image(W / 2, H / 2, 'sky').setScrollFactor(0);

        // ── Stars ────────────────────────────────────────────────────────────
        for (let i = 0; i < 80; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, W),
                Phaser.Math.Between(0, H * 0.65),
                Phaser.Math.Between(1, 2),
                0xffffff,
                Phaser.Math.FloatBetween(0.3, 1)
            ).setScrollFactor(0.1);
        }

        // ── Background buildings (parallax layer) ────────────────────────────
        this.buildingLayer = this.add.group();
        for (let i = 0; i < 14; i++) {
            const bh = Phaser.Math.Between(80, 200);
            const bw = Phaser.Math.Between(40, 90);
            const bx = i * 120 + Phaser.Math.Between(-20, 20);
            const rect = this.add.rectangle(bx, this.GROUND_Y - bh / 2, bw, bh, 0x0a0a1e)
                .setScrollFactor(0.3);
            // windows
            for (let wy = 0; wy < Math.floor(bh / 18); wy++) {
                for (let wx = 0; wx < Math.floor(bw / 14); wx++) {
                    const lit = Math.random() > 0.45;
                    this.add.rectangle(
                        bx - bw / 2 + 8 + wx * 14,
                        this.GROUND_Y - bh + 10 + wy * 18,
                        8, 10,
                        lit ? 0xffdd88 : 0x1a1a3e
                    ).setScrollFactor(0.3);
                }
            }
        }

        // ── World width ───────────────────────────────────────────────────────
        const WORLD_W = 2400;
        this.physics.world.setBounds(0, 0, WORLD_W, H);

        // ── Ground ────────────────────────────────────────────────────────────
        this.groundGroup = this.physics.add.staticGroup();
        for (let x = 0; x < WORLD_W; x += 64) {
            const inGap = (x > 680 && x < 820) || (x > 1280 && x < 1420);
            if (!inGap) {
                const t = this.groundGroup.create(x + 32, this.GROUND_Y + 30, 'ground');
                t.setDisplaySize(64, 60).refreshBody();
            }
        }

        // ── Platforms ─────────────────────────────────────────────────────────
        this.platforms = this.physics.add.staticGroup();
        const platDefs = [
            { x: 300, y: 320, w: 3 },
            { x: 550, y: 260, w: 2 },
            { x: 750, y: 300, w: 3 },
            { x: 1000, y: 280, w: 3 },
            { x: 1200, y: 220, w: 2 },
            { x: 1350, y: 300, w: 3 },
            { x: 1600, y: 260, w: 3 },
            { x: 1800, y: 300, w: 2 },
            { x: 2000, y: 240, w: 3 },
            { x: 2200, y: 280, w: 2 },
        ];
        platDefs.forEach(({ x, y, w }) => {
            for (let i = 0; i < w; i++) {
                const p = this.platforms.create(x + i * 64, y, 'platform');
                p.setDisplaySize(64, 24).refreshBody();
            }
        });

        // ── Coins ─────────────────────────────────────────────────────────────
        this.coins = this.physics.add.staticGroup();
        const coinPositions = [
            320, 360, 570, 260, 770, 300, 1020, 280,
            1220, 220, 1370, 300, 1620, 260, 1820, 300,
            2020, 240, 2220, 280,
        ];
        for (let i = 0; i < coinPositions.length; i += 2) {
            this.coins.create(coinPositions[i], coinPositions[i + 1] - 30, 'coin')
                .setDisplaySize(20, 20).refreshBody();
        }
        // ground coins
        for (let x = 200; x < WORLD_W - 200; x += 180) {
            this.coins.create(x, this.GROUND_Y - 30, 'coin')
                .setDisplaySize(20, 20).refreshBody();
        }

        // ── Player ────────────────────────────────────────────────────────────
        const charKey = this.textures.exists('char') ? 'char' : 'char_fallback';
        this.player = this.physics.add.sprite(100, this.GROUND_Y - 40, charKey);
        this.player.setScale(1.5);  // SMALLER SIZE (was 2)
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);
        this.player.body.setGravityY(200);

        // ── Enemies - Different for each level ────────────────────────────────
        this.enemies = this.physics.add.group();
        this.createLevelEnemies();

        // ── Bullets ───────────────────────────────────────────────────────────
        this.bullets = this.physics.add.group({
            maxSize: 20,
            runChildUpdate: true,
        });
        this.lastShot = 0;
        this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // ── Colliders ────────────────────────────────────────────────────────
        this.physics.add.collider(this.player, this.groundGroup);
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.groundGroup);
        this.physics.add.collider(this.enemies, this.platforms);

        this.physics.add.overlap(this.player, this.coins, (player, coin) => {
            coin.destroy();
            this.score += 10;
            this.scoreTxt.setText('SCORE: ' + this.score);
        });

        this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
            if (!bullet.active || !enemy.active) return;
            bullet.destroy();
            enemy.destroy();
            this.score += 50;
            this.scoreTxt.setText('SCORE: ' + this.score);
            this.spawnExplosion(enemy.x, enemy.y);
            this.checkLevelComplete();
        });

        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (!enemy.active) return;
            if (this.player.body.velocity.y > 0 && player.y < enemy.y - 20) {
                enemy.destroy();
                this.player.setVelocityY(-350);
                this.score += 30;
                this.scoreTxt.setText('SCORE: ' + this.score);
                this.spawnExplosion(enemy.x, enemy.y);
                this.checkLevelComplete();
            } else {
                this.hitPlayer();
            }
        });

        // ── Camera ────────────────────────────────────────────────────────────
        this.cameras.main.setBounds(0, 0, WORLD_W, H);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // ── Controls ─────────────────────────────────────────────────────────
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            left:  Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            up:    Phaser.Input.Keyboard.KeyCodes.W,
        });

        // ── HUD ───────────────────────────────────────────────────────────────
        this.scoreTxt = this.add.text(16, 16, 'SCORE: 0', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#ffffff',
        }).setScrollFactor(0).setDepth(10);

        this.levelTxt = this.add.text(W / 2, 16, 'LEVEL: 1', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#ffdd00',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10);

        this.livesTxt = this.add.text(W - 16, 16, 'LIVES: 3', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#ff4444',
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(10);

        this.hintTxt = this.add.text(W / 2, H - 20, '← → / A D  move   W / ↑  jump   SPACE  shoot', {
            fontFamily: '"Press Start 2P"',
            fontSize: '7px',
            color: '#ffffff88',
        }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(10);

        // Back button
        const backBtn = this.add.text(16, H - 20, '< MENU', {
            fontFamily: '"Press Start 2P"',
            fontSize: '9px',
            color: '#ffffff',
            backgroundColor: '#00000066',
            padding: { x: 6, y: 4 },
        }).setOrigin(0, 1).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(10);
        backBtn.on('pointerup', () => {
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'flex';
        });

        this.invincible = false;
    }

    // ── Level Enemy Creation ──────────────────────────────────────────────────
    createLevelEnemies() {
        let enemyDefs = [];

        if (this.currentLevel === 1) {
            enemyDefs = [
                { x: 400,  type: 'robot' },
                { x: 650,  type: 'cat'   },
                { x: 900,  type: 'robot' },
            ];
        } else if (this.currentLevel === 2) {
            enemyDefs = [
                { x: 350,  type: 'robot' },
                { x: 550,  type: 'cat'   },
                { x: 750,  type: 'robot' },
                { x: 950,  type: 'cat'   },
                { x: 1150, type: 'robot' },
            ];
        } else if (this.currentLevel === 3) {
            enemyDefs = [
                { x: 300,  type: 'robot' },
                { x: 500,  type: 'cat'   },
                { x: 700,  type: 'robot' },
                { x: 900,  type: 'cat'   },
                { x: 1100, type: 'robot' },
                { x: 1300, type: 'cat'   },
                { x: 1500, type: 'robot' },
            ];
        }

        enemyDefs.forEach(({ x, type }) => {
            const e = this.enemies.create(x, this.GROUND_Y - 32, type);
            e.setDisplaySize(48, 56).refreshBody();
            e.setCollideWorldBounds(true);
            e.setBounce(1);
            e.body.setGravityY(200);
            e.setVelocityX(Phaser.Math.Between(60, 100) * (Math.random() > 0.5 ? 1 : -1));
            e.enemyType = type;
        });
    }

    // ── Check if level is complete ────────────────────────────────────────────
    checkLevelComplete() {
        if (this.enemies.countActive() === 0 && !this.levelComplete) {
            this.levelComplete = true;
            if (this.currentLevel < 3) {
                this.showLevelComplete();
            } else {
                this.showGameWin();
            }
        }
    }

    // ── Show Level Complete Screen ────────────────────────────────────────────
    showLevelComplete() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.gameOver = true;

        const panel = this.add.rectangle(W / 2, H / 2, 360, 200, 0x000000, 0.85)
            .setScrollFactor(0).setDepth(20);

        this.add.text(W / 2, H / 2 - 60, 'LEVEL COMPLETE!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            color: '#00ff00',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        this.add.text(W / 2, H / 2 - 10, 'SCORE: ' + this.score, {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#ffdd00',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        const nextBtn = this.add.text(W / 2, H / 2 + 50, '[ NEXT LEVEL ]', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#00aa00',
            padding: { x: 12, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(21);
        nextBtn.on('pointerup', () => this.loadNextLevel());
    }

    // ── Load Next Level ──────────────────────────────────────────────────────
    loadNextLevel() {
        this.currentLevel++;
        this.levelComplete = false;
        this.gameOver = false;
        this.lives = 3;
        this.scene.restart();
    }

    // ── Show Game Win ────────────────────────────────────────────────────────
    showGameWin() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.gameOver = true;

        const panel = this.add.rectangle(W / 2, H / 2, 360, 220, 0x000000, 0.85)
            .setScrollFactor(0).setDepth(20);

        this.add.text(W / 2, H / 2 - 70, 'YOU WIN!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '28px',
            color: '#ffdd00',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        this.add.text(W / 2, H / 2 - 20, 'ALL LEVELS COMPLETE', {
            fontFamily: '"Press Start 2P"',
            fontSize: '11px',
            color: '#00ff00',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        this.add.text(W / 2, H / 2 + 15, 'FINAL SCORE: ' + this.score, {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#ffffff',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        const restartBtn = this.add.text(W / 2, H / 2 + 70, '[ RESTART ]', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#e8000a',
            padding: { x: 12, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(21);
        restartBtn.on('pointerup', () => {
            this.currentLevel = 1;
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'flex';
        });
    }

    spawnExplosion(x, y) {
        for (let i = 0; i < 8; i++) {
            const p = this.add.circle(x, y, Phaser.Math.Between(4, 10),
                [0xff4400, 0xffaa00, 0xffff00][Math.floor(Math.random() * 3)]);
            this.tweens.add({
                targets: p,
                x: x + Phaser.Math.Between(-60, 60),
                y: y + Phaser.Math.Between(-60, 60),
                alpha: 0,
                scaleX: 0,
                scaleY: 0,
                duration: 400,
                onComplete: () => p.destroy(),
            });
        }
    }

    hitPlayer() {
        if (this.invincible || this.gameOver) return;
        this.lives--;
        this.livesTxt.setText('LIVES: ' + this.lives);
        this.invincible = true;

        this.tweens.add({
            targets: this.player,
            alpha: 0,
            duration: 100,
            repeat: 6,
            yoyo: true,
            onComplete: () => {
                this.player.setAlpha(1);
                this.invincible = false;
            }
        });

        this.player.setVelocityY(-300);

        if (this.lives <= 0) {
            this.gameOver = true;
            this.showGameOver();
        }
    }

    showGameOver() {
        const W = this.scale.width;
        const H = this.scale.height;

        const panel = this.add.rectangle(W / 2, H / 2, 360, 180, 0x000000, 0.85)
            .setScrollFactor(0).setDepth(20);

        this.add.text(W / 2, H / 2 - 50, 'GAME OVER', {
            fontFamily: '"Press Start 2P"',
            fontSize: '22px',
            color: '#e8000a',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        this.add.text(W / 2, H / 2 + 0, 'SCORE: ' + this.score, {
            fontFamily: '"Press Start 2P"',
            fontSize: '13px',
            color: '#ffdd00',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        const restart = this.add.text(W / 2, H / 2 + 50, '[ RESTART ]', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#e8000a',
            padding: { x: 12, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(21);
        restart.on('pointerup', () => {
            this.currentLevel = 1;
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'flex';
        });
    }

    update(time) {
        if (this.gameOver) return;

        const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
        const right = this.cursors.right.isDown || this.wasd.right.isDown;
        const jump  = this.cursors.up.isDown    || this.wasd.up.isDown;
        const onGround = this.player.body.blocked.down;

        // Move
        if (left) {
            this.player.setVelocityX(-220);
            this.player.setFlipX(true);
        } else if (right) {
            this.player.setVelocityX(220);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        // Jump
        if (jump && onGround) {
            this.player.setVelocityY(-520);
        }

        // Shoot - BULLET CENTERED ON CHARACTER
        if (Phaser.Input.Keyboard.JustDown(this.shootKey) && time > this.lastShot + 300) {
            this.lastShot = time;
            const b = this.bullets.get(this.player.x, this.player.y, 'bullet');  // CENTER Y (was y - 10)
            if (b) {
                b.setActive(true).setVisible(true).setDisplaySize(24, 12);
                b.body.reset(this.player.x, this.player.y);  // CENTER (was y - 10)
                b.setVelocityX(this.player.flipX ? -600 : 600);
                b.body.setAllowGravity(false);
                this.time.delayedCall(1200, () => { if (b.active) b.destroy(); });
            }
        }

        // Kill player if falls into pit
        if (this.player.y > this.scale.height + 50) {
            this.hitPlayer();
            this.player.setPosition(100, this.GROUND_Y - 40);
            this.player.setVelocity(0, 0);
        }
    }
}

// ── Phaser Configuration ──────────────────────────────────────────────────────
const config = {
    type: Phaser.AUTO,
    width: 700,
    height: 500,
    backgroundColor: '#1a1a2e',
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { 
            gravity: { y: 500 }, 
            debug: false 
        },
    },
    scene: [GameScene],
};

let game;

function startGame() {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    
    if (!game) {
        game = new Phaser.Game(config);
    } else {
        game.scene.start('GameScene');
    }
}