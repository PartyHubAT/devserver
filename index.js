require('dotenv').config()
const express = require('express')
const http = require('http')
const initServerLogic = require(process.env.GAMESERVERLOGICPATH)
const { Server } = require('socket.io')

// Setup globals

const app = express()
const server = http.createServer(app)
const roomName = process.env.ROOMNAME
const startPlayerCount = parseInt(process.env.STARTPLAYERCOUNT)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST'],
    credentials: true,
    transports: ['websocket', 'polling']
  },
  allowEIO3: true
})
const playerIds = []

// Setup websocket

function playerCount () {
  return playerIds.length
}

function addPlayer (socket) {
  socket.join(roomName)
  playerIds.push(socket.id)
  console.log(`Socket ${socket.id} connected. (${playerCount()}/${startPlayerCount})`)
}

function removePlayer (socket) {
  socket.leave(roomName)
  playerIds.splice(playerIds.indexOf(socket.id), 1)
  console.log(`Socket ${socket.id} disconnect. (${playerCount()}/${startPlayerCount})`)
}

function startPlayerCountReached () {
  return playerCount() === startPlayerCount
}

function isPlayer (socket) {
  return playerIds.includes(socket.id)
}

function getSocketById (id) {
  return io.sockets.sockets.get(id)
}

function getPlayerSockets () {
  return playerIds.map(id => getSocketById(id))
}

function getPlayers () {
  return playerIds.map(id => ({
    _id: id
  }))
}

function emitToAll (name, data) {
  console.log(`Server sent "${name}" to all sockets with ${JSON.stringify(data)}`)
  io.to(roomName).emit(name, data)
}

function emitToOne (id, eventName, data) {
  console.log(`Server sent "${eventName}" to "${id}" socket with ${JSON.stringify(data)}`)
  getSocketById(id).emit(eventName, data)
}

function startGame () {
  console.log('Initializing game...')

  const players = getPlayers()
  const gameServer = initServerLogic(emitToAll, emitToOne, players)

  getPlayerSockets().forEach(socket => {
    const events = gameServer.events
    Object.keys(events).forEach(event => {
      socket.on(event, data => {
        console.log(`Socket ${socket.id} sent "${event}" to the server with ${JSON.stringify(data)}`)
        events[event](data)
      })
    })
  })

  console.log('Starting game...')

  gameServer.startGame()
}

io.on('connection', socket => {
  if (!startPlayerCountReached()) {
    addPlayer(socket)
  } else { console.log(`Socket ${socket.id} attempted to join, but the room is already full.`) }

  if (startPlayerCountReached()) {
    console.log('Start player-count reached.')
    startGame()
  }

  socket.on('disconnect', () => {
    if (isPlayer(socket)) { removePlayer(socket) }
  })
})

// Start server

const port = process.env.PORT
server.listen(port, () => {
  console.log(`Server listening on port ${port}`)
  console.log('Waiting for players...')
})
