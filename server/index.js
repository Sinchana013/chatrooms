import 'dotenv/config'
import express from 'express'
import http from 'http'
import cors from 'cors'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import Room from './models/Room.js'
import Message from './models/Message.js'

const app = express()
const server = http.createServer(app)

const PORT = process.env.PORT || 5000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const MONGODB_URI = process.env.MONGODB_URI

app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json())

// --- connect DB ---
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env')
  process.exit(1)
}
await mongoose.connect(MONGODB_URI).then(()=>console.log('🗄️  MongoDB connected'))

// --- socket.io ---
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET','POST'] }
})

// in-memory map for live presence
const usersInRoom = {} // { room: { socketId: displayName } }

io.on('connection', (socket) => {
  // create room (open / protected)
  socket.on('create-room', async ({ room, type, password }) => {
    try {
      if (!room || !type) return socket.emit('create-status', { ok:false, error:'Missing fields' })
      const existing = await Room.findOne({ name: room })
      if (existing) return socket.emit('create-status', { ok:false, error:'Room already exists' })

      await Room.create({ name: room, type: type === 'protected' ? 'protected' : 'open', password: type === 'protected' ? String(password || '') : null })
      socket.emit('create-status', { ok:true, message:'Room created' })
      io.emit('rooms-updated')
    } catch (e) {
      socket.emit('create-status', { ok:false, error:'Server error' })
    }
  })

  // join room with name + optional password
  socket.on('join-room', async ({ room, name, password }) => {
    try {
      if (!room || !name) return socket.emit('join-status', { ok:false, error:'Room & name required' })
      const data = await Room.findOne({ name: room })
      if (!data) return socket.emit('join-status', { ok:false, error:'Room does not exist' })

      if (data.type === 'protected' && data.password !== String(password || ''))
        return socket.emit('join-status', { ok:false, error:'Wrong room password' })

      socket.join(room)
      usersInRoom[room] ||= {}
      usersInRoom[room][socket.id] = name

      socket.emit('join-status', { ok:true })
      io.to(room).emit('system-msg', `${name} joined`)
      io.to(room).emit('users', Object.values(usersInRoom[room]))
    } catch {
      socket.emit('join-status', { ok:false, error:'Server error' })
    }
  })

  // chat message → broadcast & save to DB
  socket.on('chat-message', async ({ room, message }) => {
    if (!room || !message) return
    const name = usersInRoom[room]?.[socket.id] || 'Unknown'
    const payload = { name, message, ts: Date.now() }
    io.to(room).emit('chat-message', payload)
    try { await Message.create({ room, name, message }) } catch {}
  })

  // leave
  socket.on('leave-room', (room) => {
    leaveRoom(socket, room)
  })

  socket.on('disconnect', () => {
    for (const r of Object.keys(usersInRoom)) {
      if (usersInRoom[r][socket.id]) leaveRoom(socket, r)
    }
  })
})

function leaveRoom(socket, room) {
  const name = usersInRoom[room]?.[socket.id]
  if (!name) return
  delete usersInRoom[room][socket.id]
  socket.leave(room)
  io.to(room).emit('system-msg', `${name} left`)
  io.to(room).emit('users', Object.values(usersInRoom[room]))
}

// --- REST endpoints (rooms list + recent messages) ---
app.get('/rooms', async (_req, res) => {
  const list = await Room.find({}, { _id:0, name:1, type:1 }).sort({ name:1 })
  res.json(list)
})

app.get('/rooms/:name', async (req, res) => {
  const r = await Room.findOne({ name: req.params.name }, { _id:0, name:1, type:1 })
  if (!r) return res.status(404).json({ ok:false, error:'Not found' })
  res.json({ ok:true, ...r.toObject() })
})

app.get('/rooms/:name/messages', async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200)
  const msgs = await Message.find({ room: req.params.name })
    .sort({ ts: 1 })      // oldest → newest
    .limit(limit)
    .lean()
  res.json(msgs)
})

server.listen(PORT, () => {
  console.log(`🚀 server http://localhost:${PORT}`)
  console.log(`CORS origin → ${CLIENT_ORIGIN}`)
})
