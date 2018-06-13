function FireBall(self, playerId, x, y, direction) {
    const projectile = self.physics.add.sprite(x, y, 'fireball');
    self.projectiles.add(projectile);

    projectile.damage = 10;
    projectile.flipX = direction;
    projectile.shooterId = playerId;
    projectile.body.allowGravity = false;
    projectile.setVelocityX(direction ? -800 : 800);

    if (projectile.shooterId != self.socket.id)
        self.physics.add.overlap(self.player.sprite, projectile, projectileCollision, null, this);

    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (otherPlayer.playerId == projectile.shooterId) return;
        self.physics.add.overlap(otherPlayer, projectile, projectileCollision, null, this);
    });

    return projectile;
}

function projectileCollision(player, projectile) {
    player.health -= projectile.damage;

    if (player.health <= 0) {
        player.health = 100;
        player.x = 32;
        player.y = 40;

        // flash sprite
        var counter = 0;
        var intervalId = setInterval(function () {
            player.alpha = player.alpha == 1 ? 0.2 : 1;
            if (++counter === 10) {
                player.alpha = 1;
                clearInterval(intervalId);
            }
        }, 100);
    } else {
        player.tint = 0xff0000;
        setTimeout(() => { player.tint = 0xffffff; }, 75);
        player.body.setVelocityY(-90);
    }

    projectile.destroy();
}
