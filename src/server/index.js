const app = require("express")()
const server = require("http").Server(app)
const io = require("socket.io")(server, { path: "/persistent-chat-ws" })
const { validateMessage } = require("./validation")

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

const { port, cleanupTimeInHours } = require("../config.json")

let persistentMessages = []
let users = []

const getUsernames = () => users.map(({ user }) => user)

io.on("connection", function (socket) {
  socket.emit("initialMessages", persistentMessages)

  socket.on("incomingMessage", function (incomingMessage) {
    try {
      const validatedMessage = validateMessage(incomingMessage)
      persistentMessages.push(validatedMessage)
      io.emit("pushMessage", validatedMessage)
      socket.emit("pushMessage", validatedMessage)
    } catch (e) {
      console.error("error on incoming message", e)
    }
  })

  socket.on("checkMissingMessages", function (uuids) {
    const clientUuids = (uuids || []).sort()
    const missing = persistentMessages.filter(
      ({ uuid }) => !clientUuids.includes(uuid)
    )
    if (missing.length) {
      console.log(new Date(), `Sending ${missing.length} missed messages to a client`)
      missing.map(message => socket.emit("pushMessage", message))
    }
  })

  socket.on("userOnline", function (username) {
    const userEntry = { user: username, timestamp: Date.now(), s: socket }
    const idx = users.findIndex(({ user }) => user === username)
    if (idx >= 0) users[idx] = userEntry
    else users.push(userEntry)
    io.emit('usersOnline', getUsernames())
    console.log(new Date(), 'new user online - current users :', getUsernames())
  })

  socket.on('disconnect', function () {
    users = users.filter(({ s }) => s !== socket)
    io.emit('usersOnline', getUsernames())
    console.log(new Date(), 'user offline - current users :', getUsernames())
  })
})

server.listen(port)
console.log(`Server listeming on port ${port}`)
console.log("NODE_ENV=", process.env.NODE_ENV)

function cleanupOldMessages() {
  const beforeMessagesNb = persistentMessages.length
  const now = Date.now()
  const cleanupTimeStamp = cleanupTimeInHours * HOUR
  persistentMessages = persistentMessages.filter(({ timestamp }) => now - timestamp < cleanupTimeStamp)
  const afterMessagesNb = persistentMessages.length
  console.log(
    new Date(),
    `Purged ${beforeMessagesNb} message(s) (after ${cleanupTimeStamp} ms). ${afterMessagesNb} message(s) still in memory`
  )
  setTimeout(cleanupOldMessages, HOUR)
}
cleanupOldMessages()
