require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const clearModule = require('clear-module')

// Setup constants

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
/**
 * The currently logged-in players
 * @type {Player[]}
 */
const players = []
let status = 'LOBBY'

// Setup websocket

/**
 * Gets a random pseudo-name
 * @return {string} The name
 */
function getRandomFreePseudoName () {
  const freeNames = pseudoNames.filter(it => players.findIndex(p => p.name === it) === -1)
  return freeNames[Math.floor(Math.random() * freeNames.length)]
}

/**
 * Calculates the current player count
 * @returns {number} The number of players currently in the game
 */
function playerCount () {
  return players.length
}

/**
 * Adds a player to the game
 * @param {import('socket.io').Socket} socket
 */
function addPlayer (socket) {
  socket.join(roomName)
  const player = {
    _id: socket.id,
    name: getRandomFreePseudoName()
  }
  players.push(player)
  console.log(`${player.name} (${socket.id}) connected. (${playerCount()}/${startPlayerCount})`)
}

/**
 * Removes a player from the game
 * @param {import('socket.io').Socket} socket
 */
function removePlayer (socket) {
  socket.leave(roomName)
  players.splice(players.findIndex(it => it._id === socket.id), 1)
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
 * Finds the player with a given id
 * @param {PlayerId} id The id
 * @returns {Player} The found player
 */
function getPlayerById (id) {
  return players.find(it => it._id === id)
}

/**
 * Gets the name of a player by their id
 * @param {PlayerId} id The players id
 * @returns {string} The players name
 */
function getPlayerName (id) {
  return getPlayerById(id).name
}

/**
 * Checks if a socket is a player in the current game
 * @param {import('socket.io').Socket} socket The socket
 * @returns {boolean} Whether the socket is a player in the current game
 */
function isPlayer (socket) {
  return players.findIndex(it => it._id === socket.id) !== -1
}

/**
 * Gets a socket in the game by its id
 * @param {PlayerId} id The sockets id
 * @returns {import('socket.io').Socket} The socket
 */
function getSocketById (id) {
  return io.sockets.sockets.get(id)
}

/**
 * Gets all sockets, currently in the game
 * @returns {import('socket.io').Socket[]} The sockets
 */
function getPlayerSockets () {
  return players.map(it => getSocketById(it._id))
}

/**
 * Checks if the server is currently in the lobby-phase
 * @returns {boolean} Whether the server is in the lobby phase
 */
function isInLobby () {
  return status === 'LOBBY'
}

/**
 * Loads the current game-settings
 * @return {Settings}
 */
function loadSettings () {
  clearModule(process.env.SETTINGSPATH)
  return require(process.env.SETTINGSPATH)
}

/**
 * Starts a new game-server
 * @returns {GameServer}
 */
function startGameServer () {
  clearModule(process.env.GAMESERVERLOGICPATH)
  const initServerLogic = require(process.env.GAMESERVERLOGICPATH)

  const settings = loadSettings()
  const currentPlayers = JSON.parse(JSON.stringify(players)) // Make a deep copy of the current players

  return initServerLogic(emitToAll, emitToOne, endGame, currentPlayers, settings)
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
 * @param {PlayerId} id The id of the socket
 * @param {string} eventName The name of the event
 * @param {Object} data The data to be emitted
 */
function emitToOne (id, eventName, data) {
  console.log(`Server sent "${eventName}" to ${getPlayerName(id)} with ${JSON.stringify(data)}`)
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

  const gameServer = startGameServer()

  getPlayerSockets().forEach(socket => {
    const events = gameServer.events
    Object.keys(events).forEach(event => {
      socket.on(event, data => {
        console.log(`${getPlayerName(socket.id)} sent "${event}" to the server with ${JSON.stringify(data)}`)
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
    } else {
      console.log(`Socket ${socket.id} attempted to join, but the game has already started.`)
    }
  } else {
    console.log(`Socket ${socket.id} attempted to join, but the room is already full.`)
  }

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
