function Player(self, id, x, y) {
    this.self = self;

    this.sprite = self.physics.add.sprite(this.x, this.y, 'player');
    this.sprite.setCollideWorldBounds(true);

    this.sprite.body.setSize(this.sprite.width, this.sprite.height - 8);
    self.physics.add.collider(self.groundLayer, this.sprite);
    this.sprite.anims.play('idle', true);
    this.sprite.on('animationcomplete', this.onAnimationComplete, this);

    this.playerId = id;
    this.sprite.playerId = id;
    this.canShoot = true;
    this.isCasting = false;
    this.oldPosition = {
        x: null,
        y: null,
        currentAnim: 'idle'
    };
}

Player.prototype.onFloor = function () {
    return this.sprite.body.onFloor();
};

Player.prototype.jump = function () {
    this.sprite.body.setVelocityY(-500);
    this.sprite.anims.play('jump', true);
};

Player.prototype.shoot = function () {
    if (this.canShoot == false) return;

    var fireball = new FireBall(this.self, this.playerId, this.sprite.x, this.sprite.y, this.sprite.flipX);
    this.self.socket.emit('shootProjectile', { shooterId: fireball.shooterId, x: fireball.x, y: fireball.y, flipX: fireball.flipX });

    this.sprite.anims.play('cast');

    this.isCasting = true;
    this.canShoot = false;
    setTimeout(() => {
        this.canShoot = true;
    }, 500);
};

Player.prototype.move = function (direction) {
    switch (direction) {
        case CONSTANT.LEFT:
            this.sprite.body.setVelocityX(-200);
            if (this.onFloor() && !this.isCasting) this.sprite.anims.play('walk', true);
            this.sprite.flipX = true;
            break;

        case CONSTANT.RIGHT:
            this.sprite.body.setVelocityX(200);
            if (this.onFloor() && !this.isCasting) this.sprite.anims.play('walk', true);
            this.sprite.flipX = false;
            break;
    }
}

Player.prototype.onAnimationComplete = function (animation, frame) {
    switch (animation.key) {
        case 'cast':
            this.isCasting = false;
            break;
    }
}
