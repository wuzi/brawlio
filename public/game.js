var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 500 }
        }
    },
    scene: {
        key: 'main',
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

function preload() {
    this.load.tilemapTiledJSON('map', 'assets/map.json');
    this.load.spritesheet('tiles', 'assets/tiles.png', { frameWidth: 70, frameHeight: 70 });
    this.load.atlas('player', 'assets/player.png', 'assets/player.json');
    this.load.image('fireball', 'assets/fireball.png');
}

function create() {
    var self = this;

    this.map = this.make.tilemap({ key: 'map' });
    this.groundTiles = this.map.addTilesetImage('tiles');
    this.groundLayer = this.map.createDynamicLayer('World', this.groundTiles, 0, 0);
    this.groundLayer.setCollisionByExclusion([-1]);

    this.physics.world.bounds.width = this.groundLayer.width;
    this.physics.world.bounds.height = this.groundLayer.height;

    this.anims.create({
        key: 'idle',
        frames: [{ key: 'player', frame: 'p1_stand' }],
        frameRate: 10,
    });

    this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNames('player', { prefix: 'p1_walk', start: 1, end: 4, zeroPad: 2 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'jump',
        frames: [{ key: 'player', frame: 'p1_jump' }],
        frameRate: 10,
    });

    this.socket = io();
    this.projectiles = this.physics.add.group();
    this.otherPlayers = this.physics.add.group();

    this.socket.on('currentPlayers', function (players) {
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            } else {
                addPlayers(self, players[id]);
            }
        });
    });

    this.socket.on('newPlayer', function (playerInfo) {
        addPlayers(self, playerInfo);
    });

    this.socket.on('disconnect', function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });

    this.socket.on('playerMoved', function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                otherPlayer.anims.play(playerInfo.currentAnim, true);
                otherPlayer.flipX = playerInfo.flipX;
            }
        });
    });

    this.socket.on('projectileShot', function (projectileInfo) {
        shootProjectile(self, projectileInfo.shooterId, projectileInfo.x, projectileInfo.y, projectileInfo.flipX, false);
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.controls = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    };
}

function update() {
    if (this.player) {
        var self = this;

        // Movement
        if (this.cursors.left.isDown || this.controls.left.isDown) {
            this.player.body.setVelocityX(-200);
            if (this.player.body.onFloor()) this.player.anims.play('walk', true);
            this.player.flipX = true;
        } else if (this.cursors.right.isDown || this.controls.right.isDown) {
            this.player.body.setVelocityX(200);
            if (this.player.body.onFloor()) this.player.anims.play('walk', true);
            this.player.flipX = false;
        } else {
            this.player.body.setVelocityX(0);
            this.player.anims.play(this.player.body.onFloor() ? 'idle' : 'jump', true);
        }

        // Jump
        if ((this.cursors.up.isDown || this.controls.up.isDown) && this.player.body.onFloor()) {
            this.player.body.setVelocityY(-500);
            this.player.anims.play('jump', true);
        }

        // Attack
        if (Phaser.Input.Keyboard.JustDown(this.controls.space) && !this.player.lastShot) {
            shootProjectile(this, this.socket.id, this.player.x, this.player.y, this.player.flipX);
        }

        if (this.player.lastShot > 0) this.player.lastShot--;

        // Destroy projectile if out of bounds
        this.projectiles.getChildren().forEach(function (projectile) {
            if (projectile.x > self.map.widthInPixels || projectile.x < 0) {
                projectile.destroy();
            }
        });

        // Send position to server
        var x = this.player.x;
        var y = this.player.y;

        if (this.player.oldPosition && (x !== this.player.oldPosition.x || y !== this.player.oldPosition.y)) {
            this.socket.emit('playerMovement', { x: this.player.x, y: this.player.y, flipX: this.player.flipX, currentAnim: this.player.anims.currentAnim.key });
        }

        this.player.oldPosition = {
            x: this.player.x,
            y: this.player.y
        };
    }
}

function addPlayer(self, playerInfo) {
    self.player = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'player');
    self.player.setCollideWorldBounds(true);

    self.player.body.setSize(self.player.width, self.player.height - 8);
    self.physics.add.collider(self.groundLayer, self.player);

    self.cameras.main.setBounds(0, 0, self.map.widthInPixels, self.map.heightInPixels);
    self.cameras.main.startFollow(self.player);

    self.cameras.main.setBackgroundColor('#A6CCFF');
}

function addPlayers(self, playerInfo) {
    const otherPlayer = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'player');
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
    otherPlayer.setCollideWorldBounds(true);

    otherPlayer.body.setSize(otherPlayer.width, otherPlayer.height - 8);
    self.physics.add.collider(self.groundLayer, otherPlayer);
}

function shootProjectile(self, shooterId, x, y, direction, emit = true) {
    const projectile = self.physics.add.sprite(x + (direction ? -self.player.width / 2 : (self.player.width / 2)), y, 'fireball');
    self.projectiles.add(projectile);
    projectile.body.allowGravity = false;
    projectile.flipX = direction;
    projectile.setVelocityX(direction ? -800 : 800);

    // Register collision of other players projectiles
    if (shooterId != self.socket.id) {
        self.physics.add.overlap(self.player, projectile, projectileCollision, null, this);
    }

    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (otherPlayer.playerId != shooterId) {
            self.physics.add.overlap(otherPlayer, projectile, projectileCollision, null, this);
        }
    });

    // Send projectile data
    if (emit) {
        self.player.lastShot = 50;
        self.socket.emit('shootProjectile', { shooterId: self.socket.id, flipX: direction, x: x, y: y });
    }
}

function projectileCollision(player, projectile) {
    projectile.destroy();
    player.body.setVelocityY(-90);
    player.tint = 0xff0000;
    setTimeout(() => {
        player.tint = 0xffffff;
    }, 75);
}
