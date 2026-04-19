class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        this.load.image('char', 'assets/char.png');
        this.load.audio('laserShoot', 'assets/laserShoot.wav');


        // ── Generate all assets procedurally (no external files needed) ──
        const g = (key, fn) => {
            if (this.textures.exists(key)) return;
            const tex = this.textures.createCanvas(key, 64, 64);
            fn(tex.getContext());
            tex.refresh();
        };

        // Sky canvas
        if (!this.textures.exists('sky')) this.textures.createCanvas('sky', 800, 500).refresh();

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
            ctx.fillRect(16, 8, 32, 28);
            ctx.fillStyle = '#aaa';
            ctx.fillRect(20, 4, 24, 20);
            ctx.fillStyle = '#f00';
            ctx.fillRect(24, 8, 6, 6);
            ctx.fillRect(34, 8, 6, 6);
            ctx.fillStyle = '#555';
            ctx.fillRect(10, 36, 12, 20);
            ctx.fillRect(42, 36, 12, 20);
            ctx.fillStyle = '#777';
            ctx.fillRect(4, 10, 10, 18);
            ctx.fillRect(50, 10, 10, 18);
        });

        // Cat enemy
        g('cat', ctx => {
            ctx.fillStyle = '#cc6600';
            ctx.fillRect(12, 20, 40, 28);
            ctx.fillRect(20, 8, 24, 24);
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(20, 4, 8, 10);
            ctx.fillRect(36, 4, 8, 10);
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(24, 14, 5, 5);
            ctx.fillRect(35, 14, 5, 5);
            ctx.fillStyle = '#cc6600';
            ctx.fillRect(52, 22, 6, 30);
        });

        // BOSS - Big Robot Cat Hybrid
        g('boss', ctx => {
            // Large body
            ctx.fillStyle = '#cc3300';
            ctx.fillRect(8, 12, 48, 40);
            // Large head
            ctx.fillStyle = '#ff4400';
            ctx.fillRect(12, 0, 40, 24);
            // Glowing red eyes
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(18, 6, 8, 8);
            ctx.fillRect(38, 6, 8, 8);
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(20, 8, 4, 4);
            ctx.fillRect(40, 8, 4, 4);
            // Ears
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(14, -8, 10, 10);
            ctx.fillRect(40, -8, 10, 10);
            // Large legs
            ctx.fillStyle = '#cc2200';
            ctx.fillRect(10, 52, 14, 12);
            ctx.fillRect(40, 52, 14, 12);
            // Arms
            ctx.fillStyle = '#ff5500';
            ctx.fillRect(0, 18, 10, 20);
            ctx.fillRect(54, 18, 10, 20);
        });

        // Bullet
        g('bullet', ctx => {
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(20, 26, 24, 12);
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(28, 28, 8, 8);
        });

        // Enemy Bullet (different color)
        g('enemyBullet', ctx => {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(16, 24, 32, 16);
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(24, 28, 16, 8);
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
        this.levelComplete = false;
        this.overlayShown = false;

        // Use registry to persist currentLevel across scene restarts
        if (!this.registry.has('currentLevel')) {
            this.registry.set('currentLevel', 1);
        }
        this.currentLevel = this.registry.get('currentLevel');

        // ── Dynamic Sky ──────────────────────────────────────────────────────
        this.skyTime = 0.25;
        this.skyImg = this.add.image(W / 2, H / 2, 'sky').setScrollFactor(0).setDepth(0);

        // ── Stars ────────────────────────────────────────────────────────────
        this.starObjs = [];
        for (let i = 0; i < 90; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, W),
                Phaser.Math.Between(0, H * 0.70),
                Phaser.Math.Between(1, 2),
                0xffffff, 0
            ).setScrollFactor(0).setDepth(1);
            this.starObjs.push(star);
        }

        // Sun/Moon disc
        this.sunDisc = this.add.circle(W / 2, H * 0.3, 26, 0xfffde0)
            .setScrollFactor(0).setDepth(1);

        // ── Background buildings ──────────────────────────────────────────────
        this.windowObjs = [];
        this.buildingLayer = this.add.group();
        for (let i = 0; i < 14; i++) {
            const bh = Phaser.Math.Between(80, 200);
            const bw = Phaser.Math.Between(40, 90);
            const bx = i * 120 + Phaser.Math.Between(-20, 20);
            this.add.rectangle(bx, this.GROUND_Y - bh / 2, bw, bh, 0x0a0a1e)
                .setScrollFactor(0.3).setDepth(2);
            for (let wy = 0; wy < Math.floor(bh / 18); wy++) {
                for (let wx = 0; wx < Math.floor(bw / 14); wx++) {
                    const win = this.add.rectangle(
                        bx - bw / 2 + 8 + wx * 14,
                        this.GROUND_Y - bh + 10 + wy * 18,
                        8, 10,
                        0x1a1a3e
                    ).setScrollFactor(0.3).setDepth(3);
                    win.isLit = Math.random() > 0.45;
                    this.windowObjs.push(win);
                }
            }
        }
        
// Add a tracker for the current run
this.levelEarnings = 0;

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
                t.setDepth(4);
            }
        }

        // ── Coins (ground only) ───────────────────────────────────────────────
        this.coins = this.physics.add.staticGroup();
        for (let x = 200; x < WORLD_W - 200; x += 180) {
            this.coins.create(x, this.GROUND_Y - 30, 'coin')
                .setDisplaySize(20, 20).refreshBody().setDepth(5);
        }

        // ── Player - FIX: Spawn properly on ground ───────────────────────────
        // ── Player - Spawn in the air ───────────────────────────────────────────
if (!this.textures.exists('char') && !this.textures.exists('char_fallback')) {
    const fb = this.textures.createCanvas('char_fallback', 48, 64);
    const fc = fb.getContext();
    fc.fillStyle = '#44aaff';
    fc.fillRect(8, 0, 32, 40);
    fc.fillStyle = '#2288dd';
    fc.fillRect(10, 40, 12, 24);
    fc.fillRect(26, 40, 12, 24);
    fc.fillStyle = '#ffffff';
    fc.fillRect(14, 8, 8, 8);
    fc.fillRect(26, 8, 8, 8);
    fb.refresh();
}
const charKey = this.textures.exists('char') ? 'char' : 'char_fallback';

// CHANGED: Spawn at GROUND_Y - 200 so the player falls into the scene
this.player = this.physics.add.sprite(100, this.GROUND_Y - 200, charKey);
this.player.setScale(1.5);
this.player.setBounce(0.1);
this.player.setCollideWorldBounds(true);
this.player.body.setGravityY(200);
this.player.setDepth(5);

        // ── Enemies - Different for each level ────────────────────────────────
        this.enemies = this.physics.add.group();
        this.boss = null;  // Boss placeholder
        this.bossBullets = this.physics.add.group({ maxSize: 10 });
        this.bossHP = 0;
        this.bossMaxHP = 0;
        this.bossHPText = null;
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
        this.physics.add.collider(this.enemies, this.groundGroup);
        if (this.boss) {
            this.physics.add.collider(this.boss, this.groundGroup);
        }

       // Update your existing overlap to use levelEarnings instead of registry.score
this.physics.add.overlap(this.player, this.coins, (player, coin) => {
    coin.disableBody(true, true);
    this.levelEarnings += 10; // Add to temporary stash
    this.score += 10;         // Update HUD
    this.scoreTxt.setText('SCORE: ' + this.score);
});

        this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
            if (!bullet.active || !enemy.active) return;
            bullet.disableBody(true, true);
            enemy.disableBody(true, true);
            this.score += 50;
            this.scoreTxt.setText('SCORE: ' + this.score);
            this.spawnExplosion(enemy.x, enemy.y);
            this.checkLevelComplete();
        });

        // BOSS: Bullet damage - FIX: Only damage, don't destroy body until HP is 0
        // ── BOSS: Improved Bullet Damage Logic ──────────────────────────────
if (this.boss) {
    this.physics.add.overlap(this.bullets, this.boss, (boss, bullet) => {
        // 1. Safety check: ensure both exist and the bullet hasn't already hit something
        if (!bullet.active || !boss.active || bullet.hasHitBoss) return;

        // 2. Mark the bullet immediately so it cannot trigger again
        bullet.hasHitBoss = true;
        bullet.disableBody(true, true);

        // 3. Subtract HP
        this.bossHP = Math.max(0, this.bossHP - 1);
        this.updateBossHPDisplay();
        
        // 4. Visual feedback
        this.spawnExplosion(bullet.x, bullet.y);
        
        // 5. Flash effect
        this.tweens.add({
            targets: boss,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
        });

        // 6. Check death
        if (this.bossHP <= 0) {
            boss.disableBody(true, true); // This physically removes the boss
            this.boss.setActive(false);
            this.boss.setVisible(false);
            
            this.score += 500;
            this.scoreTxt.setText('SCORE: ' + this.score);
            this.spawnExplosion(boss.x, boss.y);
            this.checkLevelComplete();
        }
    });
}

        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (!enemy.active) return;
            if (this.player.body.velocity.y > 0 && player.y < enemy.y - 20) {
                enemy.disableBody(true, true);
                this.player.setVelocityY(-350);
                this.score += 30;
                this.scoreTxt.setText('SCORE: ' + this.score);
                this.spawnExplosion(enemy.x, enemy.y);
                this.checkLevelComplete();
            } else {
                this.hitPlayer();
            }
        });

        // BOSS: Touch damage
        if (this.boss) {
            this.physics.add.overlap(this.player, this.boss, () => {
                this.hitPlayer();
            });
        }

        // BOSS: Enemy bullet damage
        this.physics.add.overlap(this.player, this.bossBullets, (player, bullet) => {
            if (!bullet.active) return;
            bullet.disableBody(true, true);
            this.hitPlayer();
        });

        // ── Camera ────────────────────────────────────────────────────────────
        this.cameras.main.setBounds(0, 0, WORLD_W, H);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // ── Controls ──────────────────────────────────────────────────────────
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
            this.registry.set('currentLevel', 1);
            this.scene.stop();
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'flex';
            setTimeout(() => {
                if (game) { game.destroy(true); game = null; }
            }, 100);
        });

        this.invincible = false;
        this.lastBossShot = 0;
    }

    // ── Level Enemy Creation ──────────────────────────────────────────────────
    createLevelEnemies() {
        let enemyDefs = [];

        if (this.currentLevel === 1) {
            enemyDefs = [
                { x: 400,  type: 'robot' },
                { x: 600,  type: 'cat'   },
                { x: 800,  type: 'robot' },
                { x: 1000, type: 'cat'   },
                { x: 1200, type: 'robot' },
                { x: 1500, type: 'cat'   },
                { x: 1800, type: 'robot' },
            ];
        } else if (this.currentLevel === 2) {
            enemyDefs = [
                { x: 300,  type: 'robot' },
                { x: 500,  type: 'cat'   },
                { x: 700,  type: 'robot' },
                { x: 900,  type: 'cat'   },
                { x: 1100, type: 'robot' },
                { x: 1300, type: 'cat'   },
                { x: 1500, type: 'robot' },
                { x: 1700, type: 'cat'   },
                { x: 1900, type: 'robot' },
                { x: 2100, type: 'cat'   },
            ];
        } else if (this.currentLevel === 3) {
            // BOSS LEVEL - Only one big boss
            this.createBoss();
            return;
        }

        enemyDefs.forEach(({ x, type }) => {
            const e = this.enemies.create(x, this.GROUND_Y - 32, type);
            e.setDisplaySize(48, 56).refreshBody();
            e.setCollideWorldBounds(true);
            e.setBounce(1);
            e.body.setGravityY(200);
            e.setVelocityX(Phaser.Math.Between(60, 100) * (Math.random() > 0.5 ? 1 : -1));
            e.enemyType = type;
            e.setDepth(5);
        });
    }

    // ── CREATE BOSS ───────────────────────────────────────────────────────────
    createBoss() {
        const W = this.scale.width;
        this.boss = this.physics.add.sprite(W + 300, this.GROUND_Y - 80, 'boss');
        this.boss.setDisplaySize(120, 140).refreshBody();
        this.boss.setCollideWorldBounds(true);
        this.boss.setBounce(0.3);
        this.boss.body.setGravityY(200);
        this.boss.setVelocityX(-80);
        this.boss.setDepth(5);
        
        // Boss HP - FIX: Increased HP so boss doesn't die in one hit
        this.bossMaxHP = 20;
        this.bossHP = this.bossMaxHP;
        
        // Boss HP display - Make it more visible
        this.bossHPText = this.add.text(W / 2, 45, 'BOSS HP: 20/20', {
            fontFamily: '"Press Start 2P"',
            fontSize: '13px',
            color: '#ff0000',
            backgroundColor: '#00000088',
            padding: { x: 8, y: 4 },
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10);
    }

    updateBossHPDisplay() {
        if (this.bossHPText) {
            const hp = Math.max(0, this.bossHP);
            this.bossHPText.setText('BOSS HP: ' + hp + '/' + this.bossMaxHP);
        }
    }

    // ── BOSS SHOOTING ─────────────────────────────────────────────────────────
    bossFire(time) {
        if (!this.boss || !this.boss.active) return;
        
        if (time > this.lastBossShot + 800) {
            this.lastBossShot = time;
            
            // Fire red bullet at player
            const bulletY = this.boss.y;
            const bulletX = this.boss.x;
            const b = this.bossBullets.get(bulletX, bulletY, 'enemyBullet');
            
            if (b) {
                b.enableBody(true, bulletX, bulletY, true, true);
                b.setDisplaySize(32, 16);
                b.setDepth(6);  // FIX: Bullets in front of buildings (depth 6, buildings are 2-3)
                
                // Calculate direction to player
                const dx = this.player.x - bulletX;
                const dy = this.player.y - bulletY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > 0) {
                    const speed = 300;
                    b.setVelocityX((dx / dist) * speed);
                    b.setVelocityY((dy / dist) * speed);
                }
                
                b.body.setAllowGravity(false);
                this.time.delayedCall(2000, () => { if (b && b.active) b.disableBody(true, true); });
            }
        }
    }

    // ── Check if level is complete ────────────────────────────────────────────
    checkLevelComplete() {
        const noEnemies = this.enemies.countActive() === 0;
        const noBoss = !this.boss || !this.boss.active;
        
        if (noEnemies && noBoss && !this.levelComplete && !this.overlayShown) {
            this.levelComplete = true;
            this.overlayShown = true;
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

    // --- Save earnings to the main menu system ---
    // We check if the function exists globally in the browser window
    if (typeof window.saveEarnings === 'function') {
        window.saveEarnings(this.levelEarnings);
    } else {
        console.warn("saveEarnings not found, check script.js");
    }

    // --- UI Overlay ---
    const panel = this.add.rectangle(W / 2, H / 2, 360, 200, 0x000000, 0.85)
        .setScrollFactor(0).setDepth(20);

    this.add.text(W / 2, H / 2 - 60, 'LEVEL COMPLETE!', {
        fontFamily: '"Press Start 2P"',
        fontSize: '20px',
        color: '#00ff00',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

    // Display total score and earned coins
    this.add.text(W / 2, H / 2 - 10, 'SCORE: ' + this.score, {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#ffdd00',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

    this.add.text(W / 2, H / 2 + 15, 'EARNED: ' + this.levelEarnings + ' GOLD', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#aaaaaa',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

    const nextBtn = this.add.text(W / 2, H / 2 + 60, '[ NEXT LEVEL ]', {
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
        this.registry.set('currentLevel', this.currentLevel + 1);
        this.scene.restart();
    }

    // ── Show Game Win ────────────────────────────────────────────────────────
    showGameWin() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.gameOver = true;
        
        saveEarnings(this.levelEarnings);

        const panel = this.add.rectangle(W / 2, H / 2, 360, 220, 0x000000, 0.85)
            .setScrollFactor(0).setDepth(20);

        this.add.text(W / 2, H / 2 - 70, 'YOU WIN!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '28px',
            color: '#ffdd00',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        this.add.text(W / 2, H / 2 - 20, 'BOSS DEFEATED!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#ff4444',
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
            this.registry.set('currentLevel', 1);
            this.scene.stop();
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'flex';
            setTimeout(() => {
                if (game) { game.destroy(true); game = null; }
            }, 100);
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
        if (this.invincible || this.gameOver || this.overlayShown) return;
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
            this.overlayShown = true;
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
            this.registry.set('currentLevel', 1);
            this.scene.stop();
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'flex';
            setTimeout(() => {
                if (game) { game.destroy(true); game = null; }
            }, 100);
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
        

        // Shoot - BIGGER BULLETS (36x20) - FIX: Set proper depth in front of buildings
        if (Phaser.Input.Keyboard.JustDown(this.shootKey) && time > this.lastShot + 180) { // Firerate tweak to 100-500 higher the slower
            this.lastShot = time;

            //Play shoot sound
            if (gameState && gameState.sfxEnabled) {
                this.sound.play('laserShoot', { volume: 0.5 });
            }

            const bulletY = this.player.y + 12;
            const bx = this.player.x;
            const b = this.bullets.get(bx, bulletY, 'bullet');
            if (b) {
                b.enableBody(true, bx, bulletY, true, true);
                b.setDisplaySize(36, 20);  // BIGGER (was 24x12)
                b.setVelocityX(this.player.flipX ? -600 : 600);
                b.setVelocityY(0);
                b.body.setAllowGravity(false);
                b.setDepth(6);  // FIX: Depth 6 so bullets render in front of buildings (depth 2-3)
                b.hasHitBoss = false;  // Reset flag for each new bullet
                this.time.delayedCall(1200, () => { if (b.active) b.disableBody(true, true); });
            }
        }

        // Boss AI: Chase and shoot
        if (this.boss && this.boss.active) {
            // Boss moves toward player
            if (this.boss.x > this.player.x) {
                this.boss.setVelocityX(-100);
                this.boss.setFlipX(true);
            } else {
                this.boss.setVelocityX(100);
                this.boss.setFlipX(false);
            }
            
            // Boss shoots at player
            this.bossFire(time);
        }

        // Kill player if falls into pit
        // Kill player if falls into pit
if (this.player.y > this.scale.height + 50) {
    this.hitPlayer();
    // CHANGED: Reset player to 200 pixels above ground for a falling respawn
    this.player.setPosition(100, this.GROUND_Y - 200);
    this.player.setVelocity(0, 0);
}

        // ── Day/Night cycle ──────────────────────────────────────────────────
        this.skyTime = (this.skyTime + 0.00008) % 1.0;
        const t = this.skyTime;

        const lerpColor = (a, b, f) => {
            const ar = (a>>16)&0xff, ag = (a>>8)&0xff, ab = a&0xff;
            const br = (b>>16)&0xff, bg = (b>>8)&0xff, bb = b&0xff;
            return (Math.round(ar+(br-ar)*f)<<16)|(Math.round(ag+(bg-ag)*f)<<8)|Math.round(ab+(bb-ab)*f);
        };

        const skyKeys = [
            { t: 0.00, top: 0x0d0d2b, bot: 0x1a1a4e },
            { t: 0.20, top: 0xff6b35, bot: 0xffc87a },
            { t: 0.45, top: 0x4ab0e8, bot: 0x87ceeb },
            { t: 0.70, top: 0xff4500, bot: 0xff8c42 },
            { t: 0.85, top: 0x0d0d2b, bot: 0x1a1a4e },
            { t: 1.00, top: 0x0d0d2b, bot: 0x1a1a4e },
        ];
        let k0 = skyKeys[0], k1 = skyKeys[1];
        for (let i = 0; i < skyKeys.length - 1; i++) {
            if (t >= skyKeys[i].t && t < skyKeys[i+1].t) { k0 = skyKeys[i]; k1 = skyKeys[i+1]; break; }
        }
        const span = k1.t - k0.t;
        const f = span > 0 ? (t - k0.t) / span : 0;
        const topCol = lerpColor(k0.top, k1.top, f);
        const botCol = lerpColor(k0.bot, k1.bot, f);

        const skyTex = this.textures.get('sky');
        const skyCtx = skyTex.getSourceImage();
        if (skyCtx && skyCtx.getContext) {
            const ctx = skyCtx.getContext('2d');
            const grad = ctx.createLinearGradient(0, 0, 0, 500);
            const toHex = c => '#' + c.toString(16).padStart(6,'0');
            grad.addColorStop(0, toHex(topCol));
            grad.addColorStop(1, toHex(botCol));
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 800, 500);
            skyTex.refresh();
        }

        const W2 = this.scale.width;
        const H2 = this.scale.height;
        const sunX = W2 * 0.1 + W2 * 0.8 * ((t < 0.5 ? t * 2 : (t - 0.5) * 2));
        const sunY = H2 * 0.7 - Math.sin(t * Math.PI * 2) * H2 * 0.55;
        this.sunDisc.setPosition(sunX, sunY);
        const isNight = t < 0.15 || t > 0.80;
        const isDawn  = (t >= 0.15 && t < 0.35) || (t >= 0.65 && t <= 0.80);
        this.sunDisc.setFillStyle(isNight ? 0xdde8ff : isDawn ? 0xffaa44 : 0xfff176);
        this.sunDisc.setRadius(isNight ? 20 : 26);

        const starAlpha = isNight ? 0.9 : (isDawn ? 0.2 : 0);
        this.starObjs.forEach(s => s.setAlpha(starAlpha * (0.4 + Math.random() * 0.6)));

        const winCol = isNight ? 0xffdd88 : 0x1a1a3e;
        const winAlpha = isNight ? 1 : (isDawn ? 0.4 : 0);
        this.windowObjs.forEach(w => {
            if (w.isLit) { w.setFillStyle(winCol); w.setAlpha(winAlpha); }
        });
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
    
    if (game) {
        game.destroy(true);
        game = null;
    }
    game = new Phaser.Game(config);
}