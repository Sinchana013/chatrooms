import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { SERVER_URL } from './api'
import JoinRoom from './components/JoinRoom'
import ChatRoom from './components/ChatRoom'

export default function App() {
  const [socket, setSocket] = useState(null)
  const [joined, setJoined] = useState(false)
  const [room, setRoom] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    const s = io(SERVER_URL, { transports: ['websocket', 'polling'] })
    setSocket(s)
    return () => s.disconnect()
  }, [])

  return (
    <div className="container">
      <header>
        <h1>Realtime Rooms Chat</h1>
        <p className="subtitle">Open rooms or password rooms • Join with a display name</p>
      </header>

      {!joined && socket && (
        <JoinRoom
          socket={socket}
          onJoin={(r, n) => { setRoom(r); setName(n); setJoined(true) }}
        />
      )}

      {joined && socket && (
        <ChatRoom
          socket={socket}
          room={room}
          name={name}
          onLeave={() => { setJoined(false); setRoom(''); setName('') }}
        />
      )}

      <footer>React • Socket.IO</footer>
    </div>
  )
}
