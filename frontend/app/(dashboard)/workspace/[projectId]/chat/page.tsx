'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { get, post } from '@/app/lib/api'
import { useAuth } from '@/app/context/AuthContext'

interface ChatMessage {
  id: string
  senderId: string
  senderName?: string
  content: string
  createdAt: string
}

export default function ProjectChat() {
  const params = useParams()
  const projectId = params?.projectId as string
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (projectId) {
      fetchMessages()
    }
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    try {
      const data = await get(`/projects/${projectId}/messages`)
      setMessages(data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load chat')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const trimmed = content.trim()
    if (!trimmed) return

    setSending(true)
    try {
      const message = await post(`/projects/${projectId}/messages`, { content: trimmed })
      setMessages((prev) => [...prev, message])
      setContent('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] flex-col p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Chat</h1>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card shadow-md">
        <div className="h-[calc(100vh-18rem)] overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading chat...</div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No messages yet</div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.senderId === user?.id

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      <div className="mb-1 text-xs opacity-75">
                        {message.senderName || 'Unknown'} ·{' '}
                        {new Date(message.createdAt).toLocaleString()}
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border p-4">
          <div className="flex gap-3">
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write a message..."
              rows={2}
              className="resize-none"
            />
            <Button type="submit" disabled={sending || !content.trim()} className="h-auto gap-2">
              <Send size={16} />
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
