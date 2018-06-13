var config = {
    type: Phaser.AUTO,
    parent: "game",
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

    this.anims.create({
        key: 'cast',
        frames: this.anims.generateFrameNames('player', { prefix: 'p1_cast', start: 1, end: 3, zeroPad: 2 }),
        frameRate: 10
    });

    this.socket = io();
    this.projectiles = this.physics.add.group();
    this.otherPlayers = this.physics.add.group();

    this.socket.on('currentPlayers', function (players) {
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                self.player = new Player(self, players[id].playerId, players[id].x, players[id].y);

                // Make camera follow player
                self.cameras.main.setBounds(0, 0, self.map.widthInPixels, self.map.heightInPixels);
                self.cameras.main.setBackgroundColor('#A6CCFF');
                self.cameras.main.startFollow(self.player.sprite);
            } else {
                var player = new Player(self, players[id].playerId, players[id].x, players[id].y)

                player.sprite.setPosition(players[id].x, players[id].y);
                player.sprite.anims.play(players[id].currentAnim, true);
                player.sprite.flipX = players[id].flipX;

                self.otherPlayers.add(player.sprite);
            }
        });
    });

    this.socket.on('newPlayer', function (playerInfo) {
        var player = new Player(self, playerInfo.playerId, playerInfo.x, playerInfo.y);
        self.otherPlayers.add(player.sprite);
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
        new FireBall(self, projectileInfo.shooterId, projectileInfo.x, projectileInfo.y, projectileInfo.flipX);
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
            this.player.move(CONSTANT.LEFT);
        } else if (this.cursors.right.isDown || this.controls.right.isDown) {
            this.player.move(CONSTANT.RIGHT);
        } else {
            this.player.sprite.body.setVelocityX(0);
            if (!this.player.isCasting) {
                this.player.sprite.anims.play(this.player.onFloor() ? 'idle' : 'jump', true);
            }
        }

        // Jump
        if ((this.cursors.up.isDown || this.controls.up.isDown) && this.player.onFloor()) {
            this.player.jump();
        }

        // Attack
        if (Phaser.Input.Keyboard.JustDown(this.controls.space)) {
            this.player.shoot();
        }

        // Destroy projectile if out of bounds
        this.projectiles.getChildren().forEach(function (projectile) {
            if (projectile.x > self.map.widthInPixels || projectile.x < 0) {
                projectile.destroy();
            }
        });

        // Send position to server
        if (this.player.sprite.x !== this.player.oldPosition.x || this.player.sprite.y !== this.player.oldPosition.y || this.player.sprite.anims.currentAnim.key !== this.player.oldPosition.currentAnim) {
            this.socket.emit('playerMovement', { x: this.player.sprite.x, y: this.player.sprite.y, flipX: this.player.sprite.flipX, currentAnim: this.player.sprite.anims.currentAnim.key });
        }

        this.player.oldPosition = { x: this.player.sprite.x, y: this.player.sprite.y };
    }
}
