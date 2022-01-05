﻿require('dotenv').config()
const express = require("express")
const http = require('http');
const serverLogic = require(process.env.GAMESERVERLOGICPATH)
const {Server} = require('socket.io');

// Setup globals

const app = express();
const server = http.createServer(app);
const roomName = process.env.ROOMNAME
const io = new Server(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true,
    transports: ['websocket', 'polling'],
  }, allowEIO3: true
});

// Setup websocket

io.on("connection", socket => {

  console.log(`Socket ${socket.id} connected.`)
  socket.join(roomName)

  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnect.`)
    socket.leave(roomName)
  })

})

// Start server

const port = process.env.PORT
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
