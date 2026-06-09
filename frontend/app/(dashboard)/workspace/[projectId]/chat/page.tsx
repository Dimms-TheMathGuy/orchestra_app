'use client'

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Send, MessageSquare, ChevronRight, Hash, Shield, Users, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { get, post } from '@/app/lib/api'
import { useAuth } from '@/app/context/AuthContext'
import { useLocale } from '@/app/context/LocaleContext'

interface ChatMessage {
  id: string
  senderId: string
  senderName?: string
  content: string
  createdAt: string
}

interface Channel {
  id: string
  name: string
  type: 'GENERAL' | 'MANAGEMENT' | 'TEAM'
  team: string | null
}

interface Member {
  id: string
  user: { id?: string; name: string; email: string; avatarUrl?: string }
}

interface Project {
  id: string
  name: string
  members?: Member[]
}

function initialsOf(name?: string) {
  return (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

const ACCENTS = ['#6d28d9', '#2563eb', '#0891b2', '#db2777', '#ea580c', '#16a34a']
function accentFor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]
}

function channelIcon(type: Channel['type']) {
  if (type === 'GENERAL') return Hash
  if (type === 'MANAGEMENT') return Shield
  return Users
}

export default function ProjectChat() {
  const params = useParams()
  const projectId = params?.projectId as string
  const { user } = useAuth()
  const { t, locale } = useLocale()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string>('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const dayLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return t.chat.today
    if (d.toDateString() === yesterday.toDateString()) return t.chat.yesterday
    return d.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  // Initial load: project + channels
  useEffect(() => {
    if (!projectId) return
    get(`/projects/${projectId}`).then(setProject).catch(() => {})

    get(`/projects/${projectId}/channels`)
      .then((data: Channel[]) => {
        const list = Array.isArray(data) ? data : []
        setChannels(list)
        if (list.length > 0) setActiveChannelId(list[0].id)
      })
      .catch(() => toast.error(t.chat.failedLoadChannels))
      .finally(() => setLoading(false))
  }, [projectId])

  // Load messages whenever the active channel changes
  useEffect(() => {
    if (!projectId || !activeChannelId) return
    setLoadingMessages(true)
    get(`/projects/${projectId}/channels/${activeChannelId}/messages`)
      .then((data: ChatMessage[]) => setMessages(Array.isArray(data) ? data : []))
      .catch((e) => toast.error(e instanceof Error ? e.message : t.chat.failedLoadChat))
      .finally(() => setLoadingMessages(false))
  }, [projectId, activeChannelId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const activeChannel = channels.find((c) => c.id === activeChannelId)

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || !activeChannelId) return

    setSending(true)
    try {
      const message = await post(`/projects/${projectId}/channels/${activeChannelId}/messages`, { content: trimmed })
      setMessages((prev) => [...prev, message])
      setContent('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.chat.failedSend)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const grouped = useMemo(() => {
    let lastSender: string | null = null
    let lastDay: string | null = null
    const result: Array<
      | { kind: 'day'; label: string; key: string }
      | { kind: 'msg'; message: ChatMessage; showHeader: boolean }
    > = []

    for (const m of messages) {
      const day = new Date(m.createdAt).toDateString()
      if (day !== lastDay) {
        result.push({ kind: 'day', label: dayLabel(m.createdAt), key: `day-${day}` })
        lastDay = day
        lastSender = null
      }
      const showHeader = m.senderId !== lastSender
      result.push({ kind: 'msg', message: m, showHeader })
      lastSender = m.senderId
    }
    return result
  }, [messages, locale])

  // Split channels into sections for the sidebar
  const generalChannels = channels.filter((c) => c.type === 'GENERAL')
  const managementChannels = channels.filter((c) => c.type === 'MANAGEMENT')
  const teamChannels = channels.filter((c) => c.type === 'TEAM')

  const ChannelButton = ({ c }: { c: Channel }) => {
    const Icon = channelIcon(c.type)
    const active = c.id === activeChannelId
    return (
      <button
        onClick={() => setActiveChannelId(c.id)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
          active
            ? 'bg-primary/10 font-semibold text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Icon size={15} className="shrink-0" />
        <span className="truncate">{c.name}</span>
      </button>
    )
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-0px)]">
      {/* ── Channel sidebar ── */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/60 md:flex">
        <div className="border-b border-border px-4 py-4">
          <nav className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Link href={`/workspace/${projectId}`} className="hover:text-primary">{project?.name || 'Workspace'}</Link>
          </nav>
          <h2 className="text-base font-extrabold tracking-tight">{t.chat.channels}</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {loading ? (
            <p className="px-2 text-xs text-muted-foreground">{t.chat.loading}</p>
          ) : (
            <div className="space-y-4">
              {generalChannels.length > 0 && (
                <div className="space-y-0.5">
                  {generalChannels.map((c) => <ChannelButton key={c.id} c={c} />)}
                </div>
              )}

              {managementChannels.length > 0 && (
                <div>
                  <p className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {t.chat.management}
                  </p>
                  <div className="space-y-0.5">
                    {managementChannels.map((c) => <ChannelButton key={c.id} c={c} />)}
                  </div>
                </div>
              )}

              {teamChannels.length > 0 && (
                <div>
                  <p className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {t.chat.teams}
                  </p>
                  <div className="space-y-0.5">
                    {teamChannels.map((c) => <ChannelButton key={c.id} c={c} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Chat column ── */}
      <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-muted/30 to-background">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 py-4 backdrop-blur">
          <div>
            <nav className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Link href={`/workspace/${projectId}`} className="hover:text-primary">{project?.name || 'Workspace'}</Link>
              <ChevronRight size={11} />
              <span>{t.sidebar.chat}</span>
            </nav>
            <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
              {activeChannel ? (
                <>
                  {(() => { const Icon = channelIcon(activeChannel.type); return <Icon size={18} className="text-primary" /> })()}
                  {activeChannel.name}
                </>
              ) : (
                <><Hash size={18} className="text-primary" /> {t.sidebar.chat}</>
              )}
            </h1>
          </div>

          {/* Channel access hint */}
          {activeChannel && activeChannel.type !== 'GENERAL' && (
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <Lock size={11} />
              {activeChannel.type === 'MANAGEMENT' ? t.chat.boardOnly : t.chat.teamAndBoard}
            </span>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-3xl">
            {loadingMessages ? (
              <div className="py-20 text-center text-sm text-muted-foreground">{t.chat.loadingChat}</div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MessageSquare size={28} />
                </div>
                <p className="font-semibold">{t.chat.noMessages}</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  {t.chat.startConversation} <span className="font-semibold">{activeChannel?.name}</span>. {t.chat.encrypted}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {grouped.map((item) =>
                  item.kind === 'day' ? (
                    <div key={item.key} className="flex items-center gap-3 py-4">
                      <div className="h-px flex-1 bg-border" />
                      <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {item.label}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  ) : (
                    (() => {
                      const m = item.message
                      const isOwn = m.senderId === user?.id
                      const showHeader = item.showHeader
                      return (
                        <div key={m.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} ${showHeader ? 'mt-4' : 'mt-0.5'}`}>
                          <div className="w-9 shrink-0">
                            {showHeader && !isOwn && (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white"
                                style={{ background: accentFor(m.senderId) }}>
                                {initialsOf(m.senderName)}
                              </div>
                            )}
                          </div>

                          <div className={`flex max-w-[75%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                            {showHeader && (
                              <div className={`mb-1 flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                <span className="text-xs font-bold">{isOwn ? t.chat.you : m.senderName || t.chat.member}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            )}
                            <div
                              className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                isOwn
                                  ? 'brand-gradient rounded-tr-sm text-white'
                                  : 'rounded-tl-sm border border-border bg-card text-foreground'
                              }`}
                            >
                              {m.content}
                            </div>
                          </div>
                        </div>
                      )
                    })()
                  ),
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <form onSubmit={handleSubmit} className="shrink-0 border-t border-border bg-card/80 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-end gap-3">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
              }}
              onKeyDown={handleKeyDown}
              placeholder={activeChannel ? `${t.chat.writeMessage.replace('...', '')}${activeChannel.name}…  ${t.chat.messageHint}` : t.chat.writeMessage}
              rows={1}
              disabled={!activeChannelId}
              className="max-h-40 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={sending || !content.trim() || !activeChannelId}
              className="brand-gradient h-12 w-12 shrink-0 rounded-full p-0 text-white border-0"
              aria-label="Send"
            >
              <Send size={18} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
