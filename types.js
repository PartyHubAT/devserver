/**
 * @typedef {Object} Settings
 * @property {Object} defaultValues
 */

/**
 * @typedef {string} PlayerId
 */

/**
 * @callback SocketEvent
 * @param {PlayerId} playerId
 * @param {*} data
 */

/**
 * @typedef {Object.<string, SocketEvent>} Events
 */

/**
 * @typedef {Object} GameServer
 * @property {Events} events
 * @property {function()} startGame
 */

/**
 * @typedef {Object} Player
 * @property {PlayerId} _id
 * @property {string} name
 */
