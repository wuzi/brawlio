function FireBall(self, playerId, x, y, direction) {
    const projectile = self.physics.add.sprite(x, y, 'fireball');
    self.projectiles.add(projectile);

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
    projectile.destroy();
    player.tint = 0xff0000;
    player.body.setVelocityY(-90);
    setTimeout(() => { player.tint = 0xffffff; }, 75);
}
