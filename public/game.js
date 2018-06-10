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
        frames: this.anims.generateFrameNames('player', { prefix: 'p1_walk', start: 1, end: 11, zeroPad: 2 }),
        frameRate: 10,
        repeat: -1
    });

    this.socket = io();
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

    this.cursors = this.input.keyboard.createCursorKeys();
    this.controls = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
}

function update() {
    if (this.player) {
        if (this.cursors.left.isDown || this.controls.left.isDown) {
            this.player.body.setVelocityX(-200);
            this.player.anims.play('walk', true);
            this.player.flipX = true;
        } else if (this.cursors.right.isDown || this.controls.right.isDown) {
            this.player.body.setVelocityX(200);
            this.player.anims.play('walk', true);
            this.player.flipX = false;
        } else {
            this.player.body.setVelocityX(0);
            this.player.anims.play('idle', true);
        }

        if ((this.cursors.up.isDown || this.controls.up.isDown) && this.player.body.onFloor()) {
            this.player.body.setVelocityY(-500);
        }

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
    self.player.setBounce(0.2);
    self.player.setCollideWorldBounds(true);

    self.player.body.setSize(self.player.width, self.player.height - 8);
    self.physics.add.collider(self.groundLayer, self.player);

    self.cameras.main.setBounds(0, 0, self.map.widthInPixels, self.map.heightInPixels);
    self.cameras.main.startFollow(self.player);

    self.cameras.main.setBackgroundColor('#ccccff');
}

function addPlayers(self, playerInfo) {
    const otherPlayer = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'player');
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);

    otherPlayer.setBounce(0.2);
    otherPlayer.setCollideWorldBounds(true);

    otherPlayer.body.setSize(otherPlayer.width, otherPlayer.height - 8);
    self.physics.add.collider(self.groundLayer, otherPlayer);
}
