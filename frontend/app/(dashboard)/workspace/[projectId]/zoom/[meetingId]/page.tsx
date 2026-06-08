'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Video, RefreshCw, Crown, Users } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { get } from '@/app/lib/api'
import { useAuth } from '@/app/context/AuthContext'

interface Meeting {
  id: string | number
  topic: string
  password?: string
  join_url?: string
  joinUrl?: string
  start_url?: string
  start_time?: string
  startTime?: string
  isHost?: boolean
}

function extractPwd(meeting: Meeting): string {
  const joinUrl = meeting.join_url || meeting.joinUrl
  if (joinUrl) {
    try {
      const pwd = new URL(joinUrl).searchParams.get('pwd')
      if (pwd) return pwd
    } catch {}
  }
  return meeting.password || ''
}

// Web client URL. With a ZAK token the user starts as host; without it they join as participant.
function buildWebClientUrl(meeting: Meeting, userName?: string, zak?: string): string {
  const id = encodeURIComponent(String(meeting.id))
  const pwd = extractPwd(meeting)
  const params = new URLSearchParams()
  params.set('prefer', '1')
  if (pwd) params.set('pwd', pwd)
  if (userName) params.set('uname', userName)
  if (zak) params.set('zak', zak)
  return `https://app.zoom.us/wc/${id}/join?${params.toString()}`
}

export default function ZoomMeetingPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const meetingId = params?.meetingId as string
  const projectId = params?.projectId as string

  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [embedUrl, setEmbedUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!meetingId) return
    const fetchMeeting = async () => {
      try {
        // Use the ACL-filtered project endpoint so non-eligible users can't join
        const meetings = await get(`/zoom/projects/${projectId}/meetings`)
        const found: Meeting | null = Array.isArray(meetings)
          ? meetings.find((m: Meeting) => String(m.id) === String(meetingId))
          : null
        if (found) {
          setMeeting(found)
          if (found.isHost) {
            // Host: fetch a fresh ZAK so the web client starts the meeting under host control
            try {
              const { zak } = await get('/zoom/zak')
              setEmbedUrl(buildWebClientUrl(found, user?.name, zak))
            } catch {
              // Fall back to participant join if ZAK fetch fails
              setEmbedUrl(buildWebClientUrl(found, user?.name))
            }
          } else {
            setEmbedUrl(buildWebClientUrl(found, user?.name))
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchMeeting()
  }, [meetingId, projectId, user?.name])

  const isHost = meeting?.isHost
  const externalUrl = isHost ? meeting?.start_url || meeting?.join_url : meeting?.join_url

  return (
    <div className="flex h-screen flex-col bg-black">
      {/* Minimal top bar */}
      <div className="flex shrink-0 items-center justify-between bg-[#111] px-4 py-2.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={15} /> Back
        </Button>

        <div className="flex items-center gap-3">
          {meeting && (
            <span className="hidden text-sm font-semibold text-white/80 sm:inline">{meeting.topic}</span>
          )}
          {meeting && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                isHost ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-white/70'
              }`}
            >
              {isHost ? <><Crown size={12} /> Host</> : <><Users size={12} /> Participant</>}
            </span>
          )}
          {externalUrl && (
            <a href={externalUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="gap-1.5 text-white/70 hover:bg-white/10 hover:text-white">
                <Video size={13} fill="currentColor" /> Open in Zoom app
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Participant hint banner */}
      {!loading && meeting && !isHost && (
        <div className="shrink-0 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
          You're joining as a participant. If the meeting hasn't started, you'll wait in the lobby until the host begins.
        </div>
      )}

      {/* Zoom web client iframe */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : embedUrl ? (
        <iframe
          src={embedUrl}
          title={meeting?.topic || 'Zoom Meeting'}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-read; clipboard-write"
          className="flex-1"
          style={{ border: 'none' }}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-white">
          <Video size={48} className="opacity-40" />
          <p className="font-semibold opacity-60">Meeting not found, or you don't have access</p>
          <p className="max-w-sm text-center text-sm opacity-40">
            This may be a team-only meeting. Only the organizing team and board members can join.
          </p>
          <Button onClick={() => router.back()} variant="outline" className="text-white border-white/30 hover:bg-white/10">
            Go back
          </Button>
        </div>
      )}
    </div>
  )
}
