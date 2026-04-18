class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        this.load.image('char', 'assets/char.png');

        // ── Generate all assets procedurally (no external files needed) ──
        // Guard: skip if texture already exists (scene.restart() re-runs preload)
        const g = (key, fn) => {
            if (this.textures.exists(key)) return;
            const tex = this.textures.createCanvas(key, 64, 64);
            fn(tex.getContext());
            tex.refresh();
        };

        // Sky canvas - redrawn dynamically each frame
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
        this.levelComplete = false;
        this.overlayShown = false; // guard: only ONE overlay can ever show

        // Use registry to persist currentLevel across scene restarts
        if (!this.registry.has('currentLevel')) {
            this.registry.set('currentLevel', 1);
        }
        this.currentLevel = this.registry.get('currentLevel');

        // ── Dynamic Sky ──────────────────────────────────────────────────────
        this.skyTime = 0.25; // start at sunrise
        this.skyImg = this.add.image(W / 2, H / 2, 'sky').setScrollFactor(0).setDepth(0);

        // ── Stars (hidden at day, shown at night) ────────────────────────────
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

        // ── Background buildings (parallax layer, windows stored for night) ──
        this.windowObjs = []; // all window rects stored here
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

        // ── Player ────────────────────────────────────────────────────────────
        // Create fallback texture if char failed to load
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
        this.player = this.physics.add.sprite(100, this.GROUND_Y - 40, charKey);
        this.player.setScale(1.5);  // SMALLER SIZE (was 2)
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);
        this.player.body.setGravityY(200);
        this.player.setDepth(5);

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
        this.physics.add.collider(this.enemies, this.groundGroup);

        this.physics.add.overlap(this.player, this.coins, (player, coin) => {
            coin.disableBody(true, true);
            this.score += 10;
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
            this.registry.set('currentLevel', 1);
            this.scene.stop();
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'flex';
            setTimeout(() => {
                if (game) { game.destroy(true); game = null; }
            }, 100);
        });

        this.invincible = false;
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
            enemyDefs = [
                { x: 250,  type: 'robot' },
                { x: 450,  type: 'cat'   },
                { x: 650,  type: 'robot' },
                { x: 850,  type: 'cat'   },
                { x: 1050, type: 'robot' },
                { x: 1250, type: 'cat'   },
                { x: 1450, type: 'robot' },
                { x: 1650, type: 'cat'   },
                { x: 1850, type: 'robot' },
                { x: 2050, type: 'cat'   },
                { x: 2200, type: 'robot' },
                { x: 2350, type: 'cat'   },
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
            e.setDepth(5);
        });
    }

    // ── Check if level is complete ────────────────────────────────────────────
    checkLevelComplete() {
        if (this.enemies.countActive() === 0 && !this.levelComplete && !this.overlayShown) {
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
        this.registry.set('currentLevel', this.currentLevel + 1);
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

        // Shoot - BULLET SLIGHTLY BELOW CENTER
        if (Phaser.Input.Keyboard.JustDown(this.shootKey) && time > this.lastShot + 300) {
            this.lastShot = time;
            const bulletY = this.player.y + 12;
            const bx = this.player.x;
            const b = this.bullets.get(bx, bulletY, 'bullet');
            if (b) {
                b.enableBody(true, bx, bulletY, true, true);
                b.setDisplaySize(24, 12);
                b.setVelocityX(this.player.flipX ? -600 : 600);
                b.setVelocityY(0);
                b.body.setAllowGravity(false);
                this.time.delayedCall(1200, () => { if (b.active) b.disableBody(true, true); });
            }
        }

        // Kill player if falls into pit
        if (this.player.y > this.scale.height + 50) {
            this.hitPlayer();
            this.player.setPosition(100, this.GROUND_Y - 40);
            this.player.setVelocity(0, 0);
        }

        // ── Day/Night cycle ──────────────────────────────────────────────────
        this.skyTime = (this.skyTime + 0.00008) % 1.0;
        const t = this.skyTime;

        // Helper: lerp between two hex colors
        const lerpColor = (a, b, f) => {
            const ar = (a>>16)&0xff, ag = (a>>8)&0xff, ab = a&0xff;
            const br = (b>>16)&0xff, bg = (b>>8)&0xff, bb = b&0xff;
            return (Math.round(ar+(br-ar)*f)<<16)|(Math.round(ag+(bg-ag)*f)<<8)|Math.round(ab+(bb-ab)*f);
        };

        // Sky color keyframes: night->sunrise->day->sunset->night
        // t: 0=night, 0.2=sunrise, 0.45=day, 0.7=sunset, 0.85=night
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

        // Redraw sky canvas with gradient
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

        // Sun/Moon position: arc across sky
        const W2 = this.scale.width;
        const H2 = this.scale.height;
        const angle = t * Math.PI * 2;
        const sunX = W2 * 0.1 + W2 * 0.8 * ((t < 0.5 ? t * 2 : (t - 0.5) * 2));
        const sunY = H2 * 0.7 - Math.sin(t * Math.PI * 2) * H2 * 0.55;
        this.sunDisc.setPosition(sunX, sunY);
        // Day = sun (yellow), Night = moon (pale blue-white)
        const isNight = t < 0.15 || t > 0.80;
        const isDawn  = (t >= 0.15 && t < 0.35) || (t >= 0.65 && t <= 0.80);
        this.sunDisc.setFillStyle(isNight ? 0xdde8ff : isDawn ? 0xffaa44 : 0xfff176);
        this.sunDisc.setRadius(isNight ? 20 : 26);

        // Stars: fade in at night, fade out at day
        const starAlpha = isNight ? 0.9 : (isDawn ? 0.2 : 0);
        this.starObjs.forEach(s => s.setAlpha(starAlpha * (0.4 + Math.random() * 0.6)));

        // Building windows: lit yellow at night, dark at day
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