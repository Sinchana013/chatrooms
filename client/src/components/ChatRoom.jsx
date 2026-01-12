// client/src/components/ChatRoom.jsx
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { SERVER_URL } from '../api'

export default function ChatRoom({ socket, room, name, onLeave }) {
  const [users, setUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  // load recent messages from DB when entering the room
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${SERVER_URL}/rooms/${room}/messages?limit=50`)
        setMessages(data || [])
      } catch (e) {
        console.warn('Failed loading messages', e)
      }
    })()
  }, [room])

  useEffect(() => {
    const onChat = (m) => setMessages((prev) => [...prev, m])
    const onSystem = (msg) => setMessages((prev) => [...prev, { system: true, message: msg, ts: Date.now() }])
    const onUsers = (list) => setUsers(list || [])

    socket.on('chat-message', onChat)
    socket.on('system-msg', onSystem)
    socket.on('users', onUsers)

    return () => {
      socket.off('chat-message', onChat)
      socket.off('system-msg', onSystem)
      socket.off('users', onUsers)
    }
  }, [socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    if (!text.trim()) return
    socket.emit('chat-message', { room, message: text })
    setText('')
  }

  const leave = () => {
    socket.emit('leave-room', room)
    onLeave()
  }

  function initials(n) {
    if (!n) return ''
    return n.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="roomTitle">
          <h2>{room}</h2>
        </div>

        <div className="userList">
          <div className="small">People in room</div>
          {users.map(u => (
            <div className="user" key={u}>
              <div className="avatar">{initials(u)}</div>
              <div>
                <div style={{fontWeight:700,color:'white'}}>{u}</div>
                <div className="small">online</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{marginTop:12}}>
          <button className="secondary" onClick={leave}>Leave</button>
        </div>
      </aside>

      <main className="chat">
        <div className="chatHeader">Signed in as <b>{name}</b></div>

        <div className="messages">
          {messages.map((m, i) => {
            if (m.system) {
              return <div key={i} className="msg system">• {m.message}</div>
            }

            const sender = m.name || m.sender || 'Unknown'
            const isMe = sender === name

            return (
              <div
                key={i}
                className={`msg ${isMe ? 'me' : 'other'}`}
                title={new Date(m.ts || Date.now()).toLocaleString()}
              >
                <div className="msg-head">{sender}</div>
                <div className="msg-body">{m.message}</div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <div className="composer">
          <input
            value={text}
            onChange={e=>setText(e.target.value)}
            onKeyDown={e=>e.key==='Enter' && send()}
            placeholder="Type your message..."
          />
          <button className="sendBtn" onClick={send}>Send</button>
        </div>
      </main>
    </div>
  )
}
