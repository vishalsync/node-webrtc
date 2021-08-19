const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

const port = process.env.PORT || 3000;

app.use(express.static("public"));

http.listen(port, () => {
    console.log("app is running on port", port);
});

const _rooms = {};

io.on("connection", socket => {
    console.log("A user connected");

    // Joining room for 1 to 1 video call.
    socket.on("create or join", room => {
        console.log("Create or join to room", room);
        // const myRoom = io.sockets.adapter.rooms[1] || {length: 0}

        console.log("_rooms =", _rooms);
        const myRoom = _rooms[room] || [];
        console.log("myRoom =", myRoom);
        const numClients = myRoom.length;
        console.log(room, "has", numClients, "clients");


        // Joining room for 1 to 1 video call.
        if(numClients === 0) {
            _rooms[room] = [room];
            socket.join(room);
            socket.emit("created", room);

        } else if(numClients === 1) {
            _rooms[room].push(room);
            socket.join(room);
            socket.emit("joined", room);
        } else {
            socket.emit("full", room);
        }
    });


    socket.on("ready", room => {
        console.log("ready");
        socket.broadcast.to(room).emit("ready");
    });

    socket.on("candidate", event => {
        socket.broadcast.to(event.room).emit("candidate", event);
    });

    socket.on("offer", event => {
        socket.broadcast.to(event.room).emit("offer", event.sdp);
    });

    socket.on("answer", event => {
        socket.broadcast.to(event.room).emit("answer", event.sdp);
    });


});