var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

var players = {};

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    console.log('a user connected');
    players[socket.id] = {
        x: 200,
        y: 200,
        flipX: false,
        currentAnim: "idle",
        playerId: socket.id
    };
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('disconnect', function () {
        console.log('user disconnected');
        delete players[socket.id];
        io.emit('disconnect', socket.id);
    });

    socket.on('playerMovement', function (movementData) {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].flipX = movementData.flipX;
        players[socket.id].currentAnim = movementData.currentAnim;
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });
});

server.listen(3000, function () {
    console.log(`Listening on http://localhost:${server.address().port}`);
});
