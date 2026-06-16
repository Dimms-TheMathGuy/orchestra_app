'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FolderKanban, Plus, Video, Loader2,
  PieChart, MoreHorizontal, CheckSquare, BadgeCheck, AlertTriangle, RefreshCw,
  X, ExternalLink,
} from 'lucide-react'
import { get, post } from '@/app/lib/api'
import { Button } from '@/app/components/ui/button'
import { toast } from 'sonner'
import { useAuth } from '@/app/context/AuthContext'
import { useLocale } from '@/app/context/LocaleContext'

interface DashUser { id: string; name: string; email: string; avatarUrl?: string }
interface DashMember { id?: string; name: string; email: string; avatarUrl?: string }
interface DashProject {
  id: string
  name: string
  description: string | null
  status: string
  notionDbId?: string | null
  progress: number
  isMember: boolean
  role: string | null
  leader?: DashUser
  members: DashMember[]
  lastActivity?: string
}
interface PerfPoint { month: string; performance: number }
interface ContribPoint { name: string; value: number }
interface NotionTaskItem {
  notionPageId: string
  projectId: string
  title: string
  status: string | null
  statusGroup: string
  url: string | null
  dueDate: string | null
}
interface DashboardData {
  user: DashUser
  performanceData: PerfPoint[]
  contributionData: ContribPoint[]
  projects: DashProject[]
  tasks: { active: number; completed: number; inProgress: number; list: NotionTaskItem[] }
}
interface ZoomMeeting {
  id: string
  topic: string
  start_time?: string
  isHost?: boolean
  join_url?: string
  start_url?: string
  projectId?: string | null
}

const DONUT_COLORS = ['#6d28d9', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe']

function initialsOf(name?: string) {
  return (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function MemberAvatars({ members, max = 3 }: { members?: DashMember[]; max?: number }) {
  if (!members?.length) return null
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  return (
    <div className="flex -space-x-2">
      {shown.map((m, i) =>
        m.avatarUrl ? (
          <img key={i} src={m.avatarUrl} alt={m.name} title={m.name} className="h-8 w-8 rounded-full border-2 border-card object-cover" />
        ) : (
          <div key={i} title={m.name} className="brand-gradient flex h-8 w-8 items-center justify-center rounded-full border-2 border-card text-[10px] font-bold text-white">
            {initialsOf(m.name)}
          </div>
        ),
      )}
      {extra > 0 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground">
          +{extra}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useLocale()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'ongoing' | 'completed'>('ongoing')
  const [syncingTasks, setSyncingTasks] = useState(false)
  const [taskModal, setTaskModal] = useState<'all' | 'done' | 'in_progress' | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const loadDash = async () => {
    try {
      const dash = await post('/dashboard', { userId: user?.id })
      setData(dash)
    } catch (error) {
      toast.error(t.dashboard.failedLoad)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncTasks = async () => {
    if (!data) return
    setSyncingTasks(true)
    const notionProjects = data.projects.filter((p) => p.notionDbId)
    const results = await Promise.allSettled(
      notionProjects.map((p) => post(`/projects/${p.id}/notion/sync-tasks`, {})),
    )
    await loadDash()
    setSyncingTasks(false)

    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      toast.error(`${failed}/${notionProjects.length} project gagal sync`)
    } else {
      toast.success(t.dashboard.syncedTasks)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    // Dashboard data comes from our DB (fast) — render as soon as it arrives.
    const load = async () => {
      try {
        const dash = await post('/dashboard', { userId: user.id })
        setData(dash)
      } catch (error) {
        toast.error(t.dashboard.failedLoad)
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    load()

    // Zoom meetings hit the external Zoom API (slow) — fetch independently so a
    // slow Zoom response never holds up the dashboard.
    get('/zoom/meetings')
      .then((zoom) => setMeetings(Array.isArray(zoom) ? zoom : []))
      .catch(() => {})
  }, [user?.id])

  const myProjects = useMemo(() => (data?.projects ?? []).filter((p) => p.isMember), [data])
  const ongoing = myProjects.filter((p) => p.status !== 'completed')
  const completed = myProjects.filter((p) => p.status === 'completed')
  const visible = tab === 'ongoing' ? ongoing : completed

  // Upcoming Zoom meetings (future first, then most recent)
  const upcoming = useMemo(() => {
    const now = Date.now()
    const withTime = meetings.map((m) => ({ ...m, ts: m.start_time ? new Date(m.start_time).getTime() : 0 }))
    const future = withTime.filter((m) => m.ts >= now).sort((a, b) => a.ts - b.ts)
    const past = withTime.filter((m) => m.ts < now).sort((a, b) => b.ts - a.ts)
    return [...future, ...past]
  }, [meetings])

  const nextMeeting = upcoming[0]

  // Mini week calendar (current week, Mon–Sun), mark days that have meetings
  // or task deadlines.
  const weekDays = useMemo(() => {
    const today = new Date()
    const day = (today.getDay() + 6) % 7 // Monday = 0
    const monday = new Date(today)
    monday.setDate(today.getDate() - day)
    const meetingDays = new Set(
      meetings
        .filter((m) => m.start_time)
        .map((m) => new Date(m.start_time as string).toDateString()),
    )
    const deadlineDays = new Set(
      (data?.tasks.list ?? [])
        .filter((t) => t.dueDate)
        .map((t) => new Date(t.dueDate as string).toDateString()),
    )
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const key = d.toDateString()
      return {
        date: d.getDate(),
        fullDate: key,
        label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
        isToday: key === today.toDateString(),
        hasMeeting: meetingDays.has(key),
        hasDeadline: deadlineDays.has(key),
      }
    })
  }, [meetings, data])

  // Items (meetings + task deadlines) for the day the user clicked in the calendar.
  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return { meetings: [], tasks: [] }
    const dayMeetings = meetings.filter(
      (m) => m.start_time && new Date(m.start_time).toDateString() === selectedDay,
    )
    const dayTasks = (data?.tasks.list ?? []).filter(
      (t) => t.dueDate && new Date(t.dueDate).toDateString() === selectedDay,
    )
    return { meetings: dayMeetings, tasks: dayTasks }
  }, [selectedDay, meetings, data])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">{t.dashboard.loading}</p>
        </div>
      </div>
    )
  }

  const perf = data?.performanceData ?? []
  const maxPerf = Math.max(1, ...perf.map((p) => p.performance))
  const contrib = (data?.contributionData ?? []).filter((c) => c.value > 0)
  const contribTotal = contrib.reduce((s, c) => s + c.value, 0) || 1
  const topContribPct = contrib.length ? Math.round((Math.max(...contrib.map((c) => c.value)) / contribTotal) * 100) : 0

  return (
    <>
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        {/* ── LEFT COLUMN ── */}
        <div className="col-span-12 space-y-8 lg:col-span-8">
          {/* Hero */}
          <section className="brand-gradient relative overflow-hidden rounded-2xl p-8 text-white shadow-xl shadow-primary/20 lg:p-10">
            <div className="relative z-10">
              <span className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                {t.dashboard.systemActive}
              </span>
              <h1 className="text-3xl font-extrabold leading-tight lg:text-4xl">
                {t.dashboard.greeting} {user?.name?.split(' ')[0] || 'there'}, {t.dashboard.welcomeBack} 👋
              </h1>
              <p className="mt-2 max-w-md text-sm font-medium text-white/80">
                {t.dashboard.ongoingProjects(ongoing.length)} {t.dashboard.keepInSync}
              </p>
              <Link href="/dashboard/add-project" className="mt-5 inline-block">
                <Button className="gap-2 rounded-full bg-white px-5 font-semibold text-primary hover:bg-white/90 border-0">
                  <Plus size={16} /> {t.dashboard.newProject}
                </Button>
              </Link>
            </div>
            <div className="brand-blob right-[-10%] top-[-40%] h-64 w-64 bg-white/20" />
            <div className="brand-blob bottom-[-60%] left-[20%] h-64 w-64 bg-black/10" />
          </section>

          {/* Top row widgets */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Performance bars */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-sm font-bold">{t.dashboard.yourPerformance}</h3>
                <MoreHorizontal size={18} className="text-muted-foreground/50" />
              </div>
              <div className="flex h-32 items-end gap-2 px-1">
                {perf.map((p) => {
                  const pct = Math.round((p.performance / maxPerf) * 100)
                  const isPeak = p.performance === maxPerf
                  return (
                    <div key={p.month} className="group relative flex-1">
                      <div
                        className={`w-full rounded-t-lg transition-all ${isPeak ? 'brand-gradient' : 'bg-muted'}`}
                        style={{ height: `${Math.max(8, pct)}%`, minHeight: 8 }}
                      />
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-foreground px-2 py-0.5 text-[10px] text-background opacity-0 transition-opacity group-hover:opacity-100">
                        {p.performance}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex gap-2 px-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                {perf.map((p) => <span key={p.month} className="flex-1 truncate text-center">{p.month}</span>)}
              </div>
            </div>

            {/* Contribution donut */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-sm font-bold">{t.dashboard.yourContribution}</h3>
                <PieChart size={18} className="text-muted-foreground/50" />
              </div>
              {contrib.length === 0 ? (
                <div className="flex h-28 items-center justify-center text-center text-xs text-muted-foreground">
                  {t.dashboard.noContribution}
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="relative h-28 w-28 shrink-0">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" stroke="var(--muted)" strokeWidth="4" />
                      {(() => {
                        let offset = 0
                        return contrib.slice(0, 5).map((c, i) => {
                          const frac = (c.value / contribTotal) * 100
                          const el = (
                            <circle
                              key={c.name}
                              cx="18" cy="18" r="16" fill="none"
                              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                              strokeWidth="4"
                              strokeDasharray={`${frac}, 100`}
                              strokeDashoffset={-offset}
                            />
                          )
                          offset += frac
                          return el
                        })
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-black">{topContribPct}%</span>
                    </div>
                  </div>
                  <div className="min-w-0 space-y-2">
                    {contrib.slice(0, 4).map((c, i) => (
                      <div key={c.name} className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <span className="truncate">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Projects */}
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-extrabold tracking-tight">{t.dashboard.projects}</h2>
              <div className="flex rounded-full border border-border bg-muted p-1">
                <button onClick={() => setTab('ongoing')}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${tab === 'ongoing' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
                  {t.dashboard.ongoing} ({ongoing.length})
                </button>
                <button onClick={() => setTab('completed')}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${tab === 'completed' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
                  {t.dashboard.completed} ({completed.length})
                </button>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
                <p className="mb-4 text-muted-foreground">
                  {tab === 'ongoing' ? t.dashboard.noOngoing : t.dashboard.noCompleted}
                </p>
                {tab === 'ongoing' && (
                  <Link href="/dashboard/add-project">
                    <Button className="gap-2"><Plus size={16} /> {t.dashboard.createFirst}</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {visible.map((project) => (
                  <Link key={project.id} href={`/workspace/${project.id}`}
                    className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <div className="mb-6 flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {project.role === 'owner' ? t.dashboard.owner : project.role || t.dashboard.member}
                        </p>
                        <h4 className="truncate text-lg font-bold">{project.name}</h4>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FolderKanban size={18} />
                      </div>
                    </div>
                    <div className="mb-6"><MemberAvatars members={project.members} /></div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted-foreground">{t.dashboard.progress}</span>
                        <span className={project.progress >= 70 ? 'text-primary' : 'text-foreground'}>
                          {project.progress}%{project.progress >= 70 ? ` ${t.dashboard.almostDone}` : ''}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${project.progress >= 70 ? 'brand-gradient' : 'bg-primary/60'}`} style={{ width: `${project.progress}%` }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="col-span-12 space-y-6 lg:col-span-4">
          {/* Next / live meeting */}
          {nextMeeting ? (
            <div className="rounded-2xl p-6 text-white shadow-xl" style={{ background: '#0047D1', boxShadow: '0 20px 40px -12px rgba(0,71,209,0.4)' }}>
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                  {nextMeeting.isHost ? t.dashboard.youHost : t.dashboard.upcoming}
                </span>
                <Video size={20} />
              </div>
              <h3 className="mb-1 text-lg font-bold">{nextMeeting.topic}</h3>
              <p className="mb-6 text-xs text-white/80">
                {nextMeeting.start_time ? new Date(nextMeeting.start_time).toLocaleString() : t.dashboard.scheduledMeeting}
              </p>
              <div className="flex items-center justify-end">
                <button
                  onClick={() => router.push(`/workspace/${myProjects[0]?.id || ''}/zoom/${nextMeeting.id}`)}
                  disabled={!myProjects.length}
                  className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0047D1] transition-colors hover:bg-white/90 disabled:opacity-50"
                >
                  {t.dashboard.joinCall}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
              {t.dashboard.noUpcomingMeetings}
            </div>
          )}

          {/* Upcoming Meet calendar */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest">{t.dashboard.upcomingMeet}</h3>
            </div>
            <div className="mb-4 grid grid-cols-7 gap-1 text-center">
              {weekDays.map((d, i) => (
                <span key={`l${i}`} className="text-[9px] font-bold text-muted-foreground">{d.label}</span>
              ))}
              {weekDays.map((d, i) => {
                const hasItems = d.hasMeeting || d.hasDeadline
                const isSelected = selectedDay === d.fullDate
                return (
                  <button
                    key={`d${i}`}
                    type="button"
                    onClick={() => setSelectedDay((prev) => (prev === d.fullDate ? null : d.fullDate))}
                    className={`relative py-2 rounded-lg transition-colors hover:bg-muted/60 ${isSelected ? 'bg-muted ring-1 ring-primary/40' : ''}`}
                  >
                    <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg text-xs ${d.isToday ? 'brand-gradient font-bold text-white' : 'text-foreground'}`}>
                      {d.date}
                    </span>
                    {hasItems && !d.isToday && (
                      <span className="absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-0.5">
                        {d.hasMeeting && <span className="h-1 w-1 rounded-full bg-primary" />}
                        {d.hasDeadline && <span className="h-1 w-1 rounded-full bg-amber-500" />}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {/* Fixed-height region so the widget never resizes with item count */}
            <div className="flex h-[150px] flex-col">
              {selectedDay ? (
                /* A calendar day is selected → show that day's meetings + deadlines inline */
                <>
                  <div className="mb-3 flex shrink-0 items-center justify-between">
                    <p className="text-[11px] font-bold text-foreground">
                      {new Date(selectedDay).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <button
                      onClick={() => setSelectedDay(null)}
                      className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary"
                    >
                      {t.dashboard.upcomingMeet}
                    </button>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {selectedDayItems.meetings.length === 0 && selectedDayItems.tasks.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nothing scheduled.</p>
                    )}

                    {selectedDayItems.meetings.map((m) => {
                      const isFuture = m.start_time ? new Date(m.start_time).getTime() > Date.now() : false
                      return (
                        <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                          <div className="h-8 w-1 rounded-full bg-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-bold">{m.topic}</p>
                            <p className="text-[9px] text-muted-foreground">
                              {m.start_time ? new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              // Deep-link to the project's in-app meeting window when known;
                              // otherwise fall back to the raw Zoom URL.
                              if (m.projectId) {
                                router.push(`/workspace/${m.projectId}/zoom/${m.id}`)
                              } else {
                                const url = m.isHost ? m.start_url : m.join_url
                                if (url) window.open(url, '_blank', 'noopener,noreferrer')
                              }
                            }}
                            className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[9px] font-bold text-white hover:opacity-90"
                          >
                            {m.isHost && isFuture ? t.dashboard.startMeeting : t.dashboard.joinMeeting}
                          </button>
                        </div>
                      )
                    })}

                    {selectedDayItems.tasks.map((task) => (
                      <button
                        key={task.notionPageId}
                        onClick={() => router.push(`/workspace/${task.projectId}`)}
                        className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-left hover:border-primary/30 hover:bg-primary/5"
                      >
                        <div className="h-8 w-1 rounded-full bg-amber-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-bold">{task.title}</p>
                          <p className="text-[9px] text-muted-foreground">{task.status ?? 'Deadline'}</p>
                        </div>
                        <ExternalLink size={12} className="shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                /* Default view → upcoming meetings */
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {upcoming.slice(0, 3).map((m) => {
                    const isFuture = m.start_time ? new Date(m.start_time).getTime() > Date.now() : false
                    const actionUrl = isFuture ? (m.isHost ? m.start_url : m.join_url) : undefined
                    return (
                      <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                        <div className="h-8 w-1 rounded-full bg-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-bold">{m.topic}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {m.start_time ? new Date(m.start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </p>
                        </div>
                        {actionUrl && (
                          <a
                            href={actionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[9px] font-bold text-white hover:opacity-90"
                          >
                            {m.isHost ? t.dashboard.startMeeting : t.dashboard.joinMeeting}
                          </a>
                        )}
                      </div>
                    )
                  })}
                  {upcoming.length === 0 && <p className="text-xs text-muted-foreground">{t.dashboard.noUpcomingMeetings}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Task summary */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.dashboard.tasks}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={syncingTasks}
                onClick={handleSyncTasks}
                className="h-7 gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:text-primary"
              >
                <RefreshCw size={12} className={syncingTasks ? 'animate-spin' : ''} />
                {syncingTasks ? t.dashboard.syncing : t.dashboard.syncTasks}
              </Button>
            </div>
            <TaskCard icon={CheckSquare} label={t.dashboard.activeTasks} value={data?.tasks.active ?? 0} suffix={t.dashboard.tasks} tone="muted" onClick={() => setTaskModal('all')} />
            <TaskCard icon={BadgeCheck} label={t.dashboard.completedTasks} value={data?.tasks.completed ?? 0} suffix={t.dashboard.items} tone="card" onClick={() => setTaskModal('done')} />
            <TaskCard icon={AlertTriangle} label={t.dashboard.inProgress} value={data?.tasks.inProgress ?? 0} suffix={t.dashboard.active} tone="alert" onClick={() => setTaskModal('in_progress')} />
          </div>
        </div>
      </div>
    </div>

    {/* Task list modal */}
    {taskModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl" style={{ maxHeight: '80vh' }}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-bold text-slate-900">
              {taskModal === 'done' ? 'Completed Tasks' : taskModal === 'in_progress' ? 'In-Progress Tasks' : 'All My Tasks'}
            </h3>
            <button
              onClick={() => setTaskModal(null)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-3">
            {(() => {
              const list = data?.tasks.list ?? []
              const filtered = taskModal === 'all'
                ? list.filter((t) => t.statusGroup !== 'done')
                : list.filter((t) => t.statusGroup === taskModal)
              if (filtered.length === 0) {
                return (
                  <p className="py-8 text-center text-sm text-slate-400">No tasks here.</p>
                )
              }
              return (
                <ul className="space-y-2">
                  {filtered.map((task) => (
                    <li
                      key={task.notionPageId}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{task.title}</p>
                        {task.status && (
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            task.statusGroup === 'done'
                              ? 'bg-green-100 text-green-700'
                              : task.statusGroup === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-200 text-slate-600'
                          }`}>
                            {task.status}
                          </span>
                        )}
                      </div>
                      {task.url && (
                        <a
                          href={task.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 shrink-0 text-slate-400 hover:text-primary"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )
            })()}
          </div>
        </div>
      </div>
    )}

    </>
  )
}

function TaskCard({
  icon: Icon, label, value, suffix, tone, onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: number
  suffix: string
  tone: 'muted' | 'card' | 'alert'
  onClick?: () => void
}) {
  const styles =
    tone === 'alert'
      ? 'border-red-100 bg-red-50'
      : tone === 'muted'
        ? 'border-border bg-muted/50'
        : 'border-border bg-card shadow-sm'
  const valueColor = tone === 'alert' ? 'text-red-600' : 'text-foreground'
  const labelColor = tone === 'alert' ? 'text-red-500/70' : 'text-muted-foreground'
  const iconColor = tone === 'alert' ? 'text-red-500' : 'text-muted-foreground'
  return (
    <div
      className={`rounded-xl border p-5 ${styles} ${onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`mb-1 text-xs font-bold ${labelColor}`}>{label}</p>
          <h4 className={`text-2xl font-black ${valueColor}`}>{value} <span className="text-base font-bold">{suffix}</span></h4>
        </div>
        <Icon size={22} className={iconColor} />
      </div>
    </div>
  )
}
