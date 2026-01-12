import { useEffect, useState } from 'react'
import axios from 'axios'
import { SERVER_URL } from '../api'

export default function JoinRoom({ socket, onJoin }) {
  const [rooms, setRooms] = useState([])
  const [tab, setTab] = useState('join') // 'join' | 'create'

  // join state
  const [joinRoom, setJoinRoom] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [joinError, setJoinError] = useState('')

  // create state
  const [newRoom, setNewRoom] = useState('')
  const [newType, setNewType] = useState('open') // open | protected
  const [newPass, setNewPass] = useState('')
  const [createMsg, setCreateMsg] = useState('')

  const loadRooms = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/rooms`)
      setRooms(res.data)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadRooms()
    const onRoomsUpdated = () => loadRooms()
    socket.on('rooms-updated', onRoomsUpdated)
    return () => socket.off('rooms-updated', onRoomsUpdated)
  }, [socket])

  const handleCreate = () => {
    setCreateMsg('')
    if (!newRoom) return setCreateMsg('Room name required')
    if (newType === 'protected' && !newPass) return setCreateMsg('Password required')

    socket.emit('create-room', { room: newRoom, type: newType, password: newPass })
    socket.once('create-status', (res) => {
      if (res.ok) {
        setCreateMsg('Room created ✔')
        setTab('join')
        setJoinRoom(newRoom)
        loadRooms()
      } else {
        setCreateMsg(res.error || 'Failed to create')
      }
    })
  }

  const handleJoin = () => {
    setJoinError('')
    if (!joinRoom || !joinName) return setJoinError('Room & name required')

    socket.emit('join-room', { room: joinRoom, name: joinName, password: joinPassword })
    socket.once('join-status', (res) => {
      if (res.ok) onJoin(joinRoom, joinName)
      else setJoinError(res.error || 'Failed to join')
    })
  }

  return (
    <div className="card">
      <div className="tabs">
        <button className={tab==='join'?'active':''} onClick={()=>setTab('join')}>Join</button>
        <button className={tab==='create'?'active':''} onClick={()=>setTab('create')}>Create</button>
      </div>

      {tab === 'join' && (
        <div className="form">
          <label>Room</label>
          <input list="rooms" value={joinRoom} onChange={e=>setJoinRoom(e.target.value)} placeholder="e.g. public-chat" />
          <datalist id="rooms">
            {rooms.map(r => <option key={r.name} value={r.name}>{r.type}</option>)}
          </datalist>

          <label>Display Name</label>
          <input value={joinName} onChange={e=>setJoinName(e.target.value)} placeholder="Your name" />

          <label>Password (only for protected rooms)</label>
          <input type="password" value={joinPassword} onChange={e=>setJoinPassword(e.target.value)} placeholder="Password" />

          {joinError && <div className="error">{joinError}</div>}
          <button className="primary" onClick={handleJoin}>Join</button>
        </div>
      )}

      {tab === 'create' && (
        <div className="form">
          <label>Room Name</label>
          <input value={newRoom} onChange={e=>setNewRoom(e.target.value)} placeholder="e.g. coding-group" />

          <label>Type</label>
          <select value={newType} onChange={e=>setNewType(e.target.value)}>
            <option value="open">Open (no password)</option>
            <option value="protected">Password protected</option>
          </select>

          {newType === 'protected' && (
            <>
              <label>Password</label>
              <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Choose a password" />
            </>
          )}

          {createMsg && <div className="hint">{createMsg}</div>}
          <button className="primary" onClick={handleCreate}>Create</button>
        </div>
      )}
    </div>
  )
}
