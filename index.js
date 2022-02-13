require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

// Setup globals

const app = express()
const server = http.createServer(app)
const roomName = process.env.ROOMNAME
const startPlayerCount = parseInt(process.env.STARTPLAYERCOUNT)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
    transports: ['websocket', 'polling']
  },
  allowEIO3: true
})
const playerIds = []
let status = 'LOBBY'

// Setup websocket

/**
 * Calculates the current player count
 * @returns {number} The number of players currently in the game
 */
function playerCount () {
  return playerIds.length
}

/**
 * Adds a player to the game
 * @param {Socket} socket
 */
function addPlayer (socket) {
  socket.join(roomName)
  playerIds.push(socket.id)
  console.log(`Socket ${socket.id} connected. (${playerCount()}/${startPlayerCount})`)
}

/**
 * Removes a player from the game
 * @param {Socket} socket
 */
function removePlayer (socket) {
  socket.leave(roomName)
  playerIds.splice(playerIds.indexOf(socket.id), 1)
  console.log(`Socket ${socket.id} disconnect. (${playerCount()}/${startPlayerCount})`)
}

/**
 * Checks if the player-count to start is reached
 * @returns {boolean} Whether the count was reached or not
 */
function startPlayerCountReached () {
  return playerCount() === startPlayerCount
}

/**
 * Checks if a socket is a player in the current game
 * @param {Socket} socket The socket
 * @returns {boolean} Whether the socket is a player in the current game
 */
function isPlayer (socket) {
  return playerIds.includes(socket.id)
}

/**
 * Gets a socket in the game by its id
 * @param {String} id The sockets id
 * @returns {Socket} The socket
 */
function getSocketById (id) {
  return io.sockets.sockets.get(id)
}

/**
 * Gets all sockets, currently in the game
 * @returns {Socket[]} The sockets
 */
function getPlayerSockets () {
  return playerIds.map(id => getSocketById(id))
}

/**
 * Makes the players for the game
 * @returns {{_id: String}[]} The generated players
 */
function getPlayers () {
  return playerIds.map(id => ({
    _id: id
  const pseudoNames = [
    'Max',
    'Fabian',
    'Ramon',
    'Lisa',
    'Theresa',
    'Armin',
    'Moritz',
    'Carina'
  ]
  return playerIds.map((id) => ({
    _id: id,
    name: pseudoNames[Math.floor(Math.random() * pseudoNames.length)]
  }))
}

/**
 * Checks if the server is currently in the lobby-phase
 * @returns {boolean} Whether the server is in the lobby phase
 */
function isInLobby () {
  return status === 'LOBBY'
}

/**
 * Emits an event to all sockets in the game
 * @param {string} eventName The name of the event
 * @param {Object} data The data to be emitted
 */
function emitToAll (eventName, data) {
  console.log(`Server sent "${eventName}" to all sockets with ${JSON.stringify(data)}`)
  io.to(roomName).emit(eventName, data)
}

/**
 * Emits an event to a specific socket in the game
 * @param {String} id The id of the socket
 * @param {string} eventName The name of the event
 * @param {Object} data The data to be emitted
 */
function emitToOne (id, eventName, data) {
  console.log(`Server sent "${eventName}" to "${id}" socket with ${JSON.stringify(data)}`)
  getSocketById(id).emit(eventName, data)
}

/**
 * Ends the current game
 */
function endGame () {
  console.log('Game was ended')
  status = 'LOBBY'
  getPlayerSockets().forEach(socket => socket.disconnect())
}

/**
 * Starts the game
 */
function startGame () {
  console.log('Initializing game...')
  status = 'INGAME'

  const settings = require(process.env.SETTINGSPATH)
  const initServerLogic = require(process.env.GAMESERVERLOGICPATH)

  const players = getPlayers()
  const gameServer = initServerLogic(emitToAll, emitToOne, endGame, players, settings)

  getPlayerSockets().forEach(socket => {
  const gameServer = initServerLogic(
    emitToAll,
    emitToOne,
    endGame,
    players,
    settings && settings.defaultValues ? settings.defaultValues : settings
  )

    const events = gameServer.events
    Object.keys(events).forEach(event => {
      socket.on(event, data => {
        console.log(`Socket ${socket.id} sent "${event}" to the server with ${JSON.stringify(data)}`)
        events[event](socket.id, data)
      })
    })
  })

  console.log('Starting game...')

  gameServer.startGame()
}

io.on('connection', socket => {
  // Players can only join while there is room and the game has not started yet.
  if (!startPlayerCountReached()) {
    if (isInLobby()) {
      addPlayer(socket)
      // If enough players are here, the game can start
      if (startPlayerCountReached()) {
        console.log('Start player-count reached.')
        startGame()
      }
    } else { console.log(`Socket ${socket.id} attempted to join, but the game has already started.`) }
  } else { console.log(`Socket ${socket.id} attempted to join, but the room is already full.`) }

  socket.on('disconnect', () => {
    // Only remove sockets if they are actually in the game
    if (isPlayer(socket)) {
      removePlayer(socket)

      // If the game is already running, quit it

      if (!isInLobby()) {
        console.log('A player left the game while it is running.')
        endGame()
      }
    }
  })
})

// Start server

const port = process.env.PORT
server.listen(port, () => {
  console.log(`Server listening on port ${port}`)
  console.log('Waiting for players...')
})
