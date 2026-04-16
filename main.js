class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenu' });
    }

    preload() {
        this.load.image('bg', 'assets/bg.png');
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        try {
            const bg = this.add.image(W / 2, H / 2, 'bg');
            bg.setDisplaySize(W, H);
        } catch(e) {
            this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a2e);
        }

        this.add.text(W / 2, H * 0.28, 'Velvet Riot', {
            fontFamily: '"Press Start 2P"',
            fontSize: '32px',
            color: '#e8000a',
            stroke: '#8b0000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        const makeButton = (y, label, callback) => {
            const btnW = 220, btnH = 48, radius = 24;
            const btn = this.add.graphics();

            const drawBtn = (color) => {
                btn.clear();
                btn.fillStyle(color, 1);
                btn.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
            };
            drawBtn(0xe6e6e1);
            btn.setPosition(W / 2, y);

            const txt = this.add.text(W / 2, y, label, {
                fontFamily: '"Press Start 2P"',
                fontSize: '13px',
                color: '#222222',
            }).setOrigin(0.5);

            const zone = this.add.zone(W / 2, y, btnW, btnH).setInteractive({ useHandCursor: true });
            zone.on('pointerover', () => { drawBtn(0xffffff); this.tweens.add({ targets: [btn, txt], y: y - 2, duration: 80 }); });
            zone.on('pointerout',  () => { drawBtn(0xe6e6e1); this.tweens.add({ targets: [btn, txt], y: y,     duration: 80 }); });
            zone.on('pointerdown', () => { drawBtn(0xccccc8); });
            zone.on('pointerup',   () => { drawBtn(0xe6e6e1); callback(); });
        };

        makeButton(H * 0.50, 'PLAY',     () => this.scene.start('GameScene'));
        makeButton(H * 0.62, 'SHOP',     () => {});
        makeButton(H * 0.74, 'SETTINGS', () => {});
    }
}


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
            // gap at x=700-820 and x=1300-1420
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
            { x: 750, y: 300, w: 3 },  // over gap
            { x: 1000, y: 280, w: 3 },
            { x: 1200, y: 220, w: 2 },
            { x: 1350, y: 300, w: 3 }, // over gap
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
        this.player = this.physics.add.sprite(100, this.GROUND_Y - 40, 'char');
        this.player.setScale(2);
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);
        this.player.body.setGravityY(200);

        // ── Enemies ───────────────────────────────────────────────────────────
        this.enemies = this.physics.add.group();
        const enemyDefs = [
            { x: 400,  type: 'robot' },
            { x: 650,  type: 'cat'   },
            { x: 900,  type: 'robot' },
            { x: 1100, type: 'cat'   },
            { x: 1500, type: 'robot' },
            { x: 1700, type: 'cat'   },
            { x: 1900, type: 'robot' },
            { x: 2100, type: 'cat'   },
            { x: 2300, type: 'robot' },
        ];
        enemyDefs.forEach(({ x, type }) => {
            const e = this.enemies.create(x, this.GROUND_Y - 32, type);
            e.setDisplaySize(48, 56).refreshBody();
            e.setCollideWorldBounds(true);
            e.setBounce(1);
            e.body.setGravityY(200);
            e.setVelocityX(Phaser.Math.Between(60, 100) * (Math.random() > 0.5 ? 1 : -1));
            e.enemyType = type;
        });

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
            bullet.destroy();
            enemy.destroy();
            this.score += 50;
            this.scoreTxt.setText('SCORE: ' + this.score);
            this.spawnExplosion(enemy.x, enemy.y);
        });

        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (this.player.body.velocity.y > 0 && player.y < enemy.y - 20) {
                // stomped
                enemy.destroy();
                this.player.setVelocityY(-350);
                this.score += 30;
                this.scoreTxt.setText('SCORE: ' + this.score);
                this.spawnExplosion(enemy.x, enemy.y);
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
        backBtn.on('pointerup', () => this.scene.start('MainMenu'));

        // ── Invincibility flag ────────────────────────────────────────────────
        this.invincible = false;
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

        // Flash effect
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
        const panel = this.add.rectangle(W / 2, H / 2, 360, 180, 0x000000, 0.8)
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
        restart.on('pointerup', () => this.scene.restart());
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

        // Shoot
        if (Phaser.Input.Keyboard.JustDown(this.shootKey) && time > this.lastShot + 300) {
            this.lastShot = time;
            const b = this.bullets.get(this.player.x, this.player.y - 10, 'bullet');
            if (b) {
                b.setActive(true).setVisible(true).setDisplaySize(24, 12);
                b.body.reset(this.player.x, this.player.y - 10);
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


// ── Entry point ───────────────────────────────────────────────────────────────
function startGame() {
    document.querySelector('.menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

    const config = {
        type: Phaser.AUTO,
        width: 700,
        height: 500,
        backgroundColor: '#1a1a2e',
        parent: 'game-container',
        physics: {
            default: 'arcade',
            arcade: { gravity: { y: 500 }, debug: false },
        },
        scene: [GameScene],
    };

    new Phaser.Game(config);
}