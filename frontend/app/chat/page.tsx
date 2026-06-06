'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const PROJECT_ID = 'b227c01e-1546-4b66-8960-27498f907ff5'

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const socketRef = useRef<Socket | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    fetch(`http://localhost:3000/projects/${PROJECT_ID}/messages`)
      .then(res => res.json())
      .then(setMessages)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return

    const socket = io('http://localhost:3000', {
      transports: ['websocket']
    })

    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_project', PROJECT_ID)
    })

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg])
    })

    return () => {
      socket.disconnect()
    }
  }, [mounted])

  const sendMessage = async () => {
    if (!text.trim()) return

    const res = await fetch(
      `http://localhost:3000/projects/${PROJECT_ID}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      }
    )

    setText('')
  }

  const formatTime = (date?: string) => {
    if (!date) return ''

    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!mounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 20 }}>
      
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #ddd', padding: 10 }}>
        
        {messages.map((m) => (
          <div
            key={m.id}   
            style={{
              marginBottom: 10,
              padding: 8,
              background: '#f5f5f5',
              borderRadius: 6
            }}
          >

            <div style={{ fontSize: 12, color: '#666' }}>
              {m.senderName || 'Unknown'} • {formatTime(m.createdAt)}
            </div>

            <div style={{ fontSize: 14 }}>
              {m.content}
            </div>

          </div>
        ))}

      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message..."
          style={{ flex: 1, padding: 10 }}
        />

        <button onClick={sendMessage}>
          Send
        </button>

      </div>
    </div>
  )
}