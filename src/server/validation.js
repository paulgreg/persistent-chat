const generateUuid = require("uuid/v1")

const { maxLength } = require("../config.json")

module.exports.validateMessage = function validateMessage(m) {
  if (!m || !m.message) throw new Error("no text or message")
  const { uuid, user, message } = m
  return {
    uuid: uuid ? String(uuid) : generateUuid(),
    user: user ? String(user).substring(0, maxLength || 10) : "unknown",
    message: String(message).substring(0, 2048),
    timestamp: Date.now(),
    validated: true
  }
}
