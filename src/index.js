const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require("./utils/messages")
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')
// Create the Express application
const app = express()
// Create the HTTP server using the Express app
const server = http.createServer(app)
// Connect socket.io to the HTTP server
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))


// Listen for new connections to Socket.io
io.on('connection', (socket) => {
    console.log('New Websocket Connection')

    socket.on('join', ({ username, room }, callback) => {

        const { error, user } = addUser({ id: socket.id, username, room })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage("admin", `Welcome to room: ${user.room}`))
        socket.broadcast.to(user.room).emit('message', generateMessage("admin", `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()

        //socket.emit io.emit socket.broadcast.emit
        //io.to.emit, socket.broadcast.to.emit
    })

    socket.on('sendMessage', (message, callback) => {

        // const filter = new Filter()
        // if (filter.isProfane(message)) {
        //     return callback('Profanity in not allowed')
        // }

        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', ({ lat, long }, callback) => {

        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${lat},${long}`))
        callback()

    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage("admin", `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

    })
})

server.listen(port, () => {
    console.log('Server is up on port ' + port)
})