'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  Sparkles,
  Send,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Database,
  Save,
  ChevronRight,
  Search,
  MessageSquare,
  Code2,
  FormInput,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'
import { get, post, patch } from '@/app/lib/api'

interface ZoomMeeting {
  id: string
  topic: string
  start_time?: string
  duration?: number
  join_url?: string
}

interface DraftEntry {
  properties: Record<string, unknown>
}

interface MeetingDraft {
  draftId: string
  status: 'pending' | 'approved' | 'cancelled'
  databaseId: string
  title: string
  entries: DraftEntry[]
  _rawEdit?: string
}

interface Summary {
  id: number
  meetingId: string
  drafts: MeetingDraft[]
}

interface AISummary {
  summary: string
  keyDecisions: string[]
}

interface TranscriptSegment {
  speaker?: string
  time?: string
  text: string
}

function initialsOf(name?: string) {
  return (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function parseTranscript(raw: string): TranscriptSegment[] {
  if (!raw.trim()) return []
  const lines = raw.split(/\r?\n/)
  const segments: TranscriptSegment[] = []
  let pendingTime: string | undefined

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed === 'WEBVTT' || /^\d+$/.test(trimmed)) continue

    const tsMatch = trimmed.match(/(\d{2}:\d{2}:\d{2})[.,]\d{3}\s*-->/)
    if (tsMatch) {
      pendingTime = tsMatch[1]
      continue
    }

    const speakerMatch = trimmed.match(/^([A-Za-z][\w .'-]{0,40}?):\s+(.*)$/)
    if (speakerMatch) {
      segments.push({ speaker: speakerMatch[1], time: pendingTime, text: speakerMatch[2] })
    } else {
      segments.push({ time: pendingTime, text: trimmed })
    }
    pendingTime = undefined
  }
  return segments
}

/** Extract a human-readable string from a Notion property value */
function extractPropValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  const v = value as Record<string, unknown>
  if (Array.isArray(v.title))
    return (v.title as Array<{ text?: { content?: string } }>).map((t) => t?.text?.content ?? '').join('')
  if (Array.isArray(v.rich_text))
    return (v.rich_text as Array<{ text?: { content?: string } }>).map((t) => t?.text?.content ?? '').join('')
  if (v.select && typeof v.select === 'object') return ((v.select as Record<string, unknown>).name as string) ?? ''
  if (Array.isArray(v.multi_select))
    return (v.multi_select as Array<{ name?: string }>).map((s) => s.name ?? '').join(', ')
  if (v.date && typeof v.date === 'object') return ((v.date as Record<string, unknown>).start as string) ?? ''
  if (v.status && typeof v.status === 'object') return ((v.status as Record<string, unknown>).name as string) ?? ''
  if (typeof v.number === 'number') return String(v.number)
  if (typeof v.checkbox === 'boolean') return v.checkbox ? 'Yes' : 'No'
  if (typeof v.url === 'string') return v.url
  return JSON.stringify(value)
}

/** Minimalist card showing one draft entry as a key-value form */
function DraftEntryForm({ entry }: { entry: DraftEntry }) {
  return (
    <div className="divide-y divide-border/60">
      {Object.entries(entry.properties).map(([key, val]) => {
        const display = extractPropValue(val)
        return (
          <div key={key} className="grid grid-cols-[140px_1fr] items-start gap-3 py-2.5 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pt-0.5 truncate">{key}</span>
            <span className="text-sm text-foreground break-words min-w-0">
              {display || <span className="italic text-muted-foreground/50">—</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function MeetingResultReview() {
  const params = useParams()
  const projectId = params?.projectId as string

  const [meetings, setMeetings] = useState<ZoomMeeting[]>([])
  const [selectedMeetingId, setSelectedMeetingId] = useState('')
  const [transcript, setTranscript] = useState('')
  const [blockId, setBlockId] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null)
  const [transcriptSearch, setTranscriptSearch] = useState('')

  const [loadingMeetings, setLoadingMeetings] = useState(true)
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [loadingAISummary, setLoadingAISummary] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  // Track which draft cards are in JSON edit mode
  const [jsonEditSet, setJsonEditSet] = useState<Set<string>>(new Set())

  const toggleJsonEdit = (draftId: string) => {
    setJsonEditSet((prev) => {
      const next = new Set(prev)
      if (next.has(draftId)) next.delete(draftId)
      else next.add(draftId)
      return next
    })
  }

  useEffect(() => {
    if (!projectId) return

    const init = async () => {
      try {
        const [project, zoomMeetings] = await Promise.all([
          get(`/projects/${projectId}`).catch(() => null),
          get('/zoom/meetings').catch(() => []),
        ])

        if (project?.notionDbId) setBlockId(project.notionDbId)
        setMeetings(Array.isArray(zoomMeetings) ? zoomMeetings : [])
        if (Array.isArray(zoomMeetings) && zoomMeetings.length > 0) {
          setSelectedMeetingId(String(zoomMeetings[0].id))
        }
      } catch (error) {
        console.error(error)
        toast.error('Failed to load meetings')
      } finally {
        setLoadingMeetings(false)
      }
    }

    init()
  }, [projectId])

  const handlePullFromZoom = async () => {
    if (!selectedMeetingId) { toast.error('Select a meeting first'); return }
    setLoadingTranscript(true)
    setAiSummary(null)
    try {
      const data = await get(`/zoom/meetings/${selectedMeetingId}/transcript`)
      setTranscript(data.transcript || '')
      toast.success('Transcript pulled from Zoom')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No Zoom transcript yet — upload a .vtt instead')
    } finally {
      setLoadingTranscript(false)
    }
  }

  const handleUploadVtt = async (file: File) => {
    if (!selectedMeetingId) { toast.error('Select a meeting first'); return }
    setLoadingTranscript(true)
    setAiSummary(null)
    try {
      const text = await file.text()
      await post('/transcripts', { meetingId: selectedMeetingId, text })
      setTranscript(text)
      toast.success('Transcript uploaded')
    } catch {
      toast.error('Failed to upload transcript')
    } finally {
      setLoadingTranscript(false)
    }
  }

  const handleGenerateAISummary = async () => {
    if (!selectedMeetingId) { toast.error('Select a meeting first'); return }
    setLoadingAISummary(true)
    try {
      const result = await post(`/summaries/${selectedMeetingId}/ai-summary`, {})
      if (result?.error) { toast.error(result.error); return }
      setAiSummary(result)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate AI summary')
    } finally {
      setLoadingAISummary(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedMeetingId) { toast.error('Select a meeting first'); return }
    if (!blockId.trim()) { toast.error('Enter the Notion page/template block ID'); return }
    setGenerating(true)
    try {
      const result = await post(`/summaries/${selectedMeetingId}`, { blockId })
      if (result?.error) { toast.error(result.error); return }
      setSummary(result)
      setJsonEditSet(new Set())
      toast.success('Draft generated from transcript')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate draft')
    } finally {
      setGenerating(false)
    }
  }

  const handleEntriesChange = (draftId: string, value: string) => {
    setSummary((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        drafts: prev.drafts.map((d) =>
          d.draftId === draftId ? { ...d, _rawEdit: value } : d,
        ),
      }
    })
  }

  const handleSaveEdit = async (draft: MeetingDraft) => {
    if (draft._rawEdit === undefined) return
    let entries: DraftEntry[]
    try {
      entries = JSON.parse(draft._rawEdit)
    } catch {
      toast.error('Invalid JSON in draft entries')
      return
    }
    try {
      await patch(`/summaries/${selectedMeetingId}/drafts/${draft.draftId}`, { entries })
      setSummary((prev) =>
        prev
          ? { ...prev, drafts: prev.drafts.map((d) => (d.draftId === draft.draftId ? { ...d, entries, _rawEdit: undefined } : d)) }
          : prev,
      )
      setJsonEditSet((prev) => { const next = new Set(prev); next.delete(draft.draftId); return next })
      toast.success('Draft updated')
    } catch {
      toast.error('Failed to update draft')
    }
  }

  const handleCancelDraft = async (draftId: string) => {
    try {
      await post(`/summaries/${selectedMeetingId}/drafts/${draftId}/cancel`, {})
      setSummary((prev) =>
        prev
          ? { ...prev, drafts: prev.drafts.map((d) => (d.draftId === draftId ? { ...d, status: 'cancelled' } : d)) }
          : prev,
      )
      toast.success('Draft discarded')
    } catch {
      toast.error('Failed to discard draft')
    }
  }

  const handleSyncToNotion = async (draftId: string) => {
    setApprovingId(draftId)
    try {
      const result = await post(`/summaries/${selectedMeetingId}/drafts/${draftId}/approve`, {})
      if (result?.error) { toast.error(result.error); return }
      setSummary((prev) =>
        prev
          ? { ...prev, drafts: prev.drafts.map((d) => (d.draftId === draftId ? { ...d, status: 'approved' } : d)) }
          : prev,
      )
      toast.success(`Synced ${result.syncedPages ?? ''} page(s) to Notion`.trim())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync to Notion')
    } finally {
      setApprovingId(null)
    }
  }

  const handleSyncAll = async () => {
    const pending = summary?.drafts.filter((d) => d.status === 'pending') ?? []
    for (const d of pending) {
      await handleSyncToNotion(d.draftId)
    }
  }

  const pendingCount = summary?.drafts.filter((d) => d.status === 'pending').length ?? 0
  const selectedMeeting = meetings.find((m) => String(m.id) === String(selectedMeetingId))

  const segments = useMemo(() => parseTranscript(transcript), [transcript])
  const filteredSegments = useMemo(() => {
    if (!transcriptSearch.trim()) return segments
    const q = transcriptSearch.toLowerCase()
    return segments.filter((s) => s.text.toLowerCase().includes(q) || s.speaker?.toLowerCase().includes(q))
  }, [segments, transcriptSearch])

  return (
    <div className="flex h-full min-h-[calc(100vh-0px)]">
      {/* ── Center: review workspace ── */}
      <section className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumb + title */}
          <nav className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Link href={`/workspace/${projectId}`} className="hover:text-primary">Workspace</Link>
            <ChevronRight size={11} />
            <span className="flex items-center gap-1 text-primary"><Sparkles size={11} /> AI Note Taker</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight">Meeting Result Review</h1>
          <p className="mt-2 mb-8 max-w-2xl text-muted-foreground">
            Generate a schema-aware draft from the transcript, review and edit it, then sync to your Notion template.
          </p>

          {/* Setup card */}
          <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Meeting + transcript */}
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <FileText size={14} className="text-primary" /> 1. Meeting &amp; Transcript
                </h2>
                <select
                  value={selectedMeetingId}
                  onChange={(e) => {
                    setSelectedMeetingId(e.target.value)
                    setTranscript('')
                    setSummary(null)
                    setAiSummary(null)
                  }}
                  className="mb-3 w-full rounded-xl border border-border bg-input-background p-2.5 text-sm"
                  disabled={loadingMeetings}
                >
                  <option value="">{loadingMeetings ? 'Loading meetings...' : 'Select a meeting'}</option>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>{m.topic} ({m.id})</option>
                  ))}
                </select>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" onClick={handlePullFromZoom} disabled={loadingTranscript || !selectedMeetingId} className="gap-2 rounded-xl">
                    {loadingTranscript ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />} Pull from Zoom
                  </Button>
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept=".vtt,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUploadVtt(file)
                      }}
                    />
                    <span className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm transition-colors hover:bg-muted">
                      <Upload size={14} /> Upload .vtt
                    </span>
                  </label>
                </div>
              </div>

              {/* Notion template + generate */}
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Sparkles size={14} className="text-primary" /> 2. Notion template
                </h2>
                <Input
                  value={blockId}
                  onChange={(e) => setBlockId(e.target.value)}
                  placeholder="Notion page / block ID"
                  className="mb-2 rounded-xl font-mono text-xs"
                />
                <p className="mb-3 text-xs text-muted-foreground">
                  The AI reads this template's database schema, then generates a draft that matches it.
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !transcript || !blockId}
                  className="brand-gradient w-full gap-2 rounded-full font-semibold text-white border-0"
                >
                  {generating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Generate Draft
                </Button>
              </div>
            </div>
          </div>

          {/* ── AI Summary card (appears once transcript is loaded) ── */}
          {transcript && (
            <div className="mb-8 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 to-blue-500/5 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <Sparkles size={15} className="text-primary" /> AI Summary
                </h3>
                {!aiSummary && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateAISummary}
                    disabled={loadingAISummary}
                    className="gap-1.5 rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                  >
                    {loadingAISummary
                      ? <><RefreshCw size={13} className="animate-spin" /> Generating…</>
                      : <><Sparkles size={13} /> Generate Summary</>}
                  </Button>
                )}
                {aiSummary && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleGenerateAISummary}
                    disabled={loadingAISummary}
                    className="gap-1.5 rounded-lg text-muted-foreground hover:text-primary text-xs"
                  >
                    {loadingAISummary ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Regenerate
                  </Button>
                )}
              </div>

              {!aiSummary && !loadingAISummary && (
                <p className="text-sm text-muted-foreground italic">
                  Click "Generate Summary" to get an AI-powered meeting summary and key decisions.
                </p>
              )}

              {loadingAISummary && !aiSummary && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
                  <RefreshCw size={15} className="animate-spin text-primary" />
                  Analyzing transcript…
                </div>
              )}

              {aiSummary && (
                <div className="space-y-4">
                  {/* Summary paragraph */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Overview</p>
                    <p className="text-sm leading-relaxed text-foreground">{aiSummary.summary}</p>
                  </div>

                  {/* Key decisions */}
                  {aiSummary.keyDecisions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Lightbulb size={11} /> Key Decisions
                      </p>
                      <ul className="space-y-1.5">
                        {aiSummary.keyDecisions.map((decision, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary/70" />
                            <span>{decision}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Structured Notion Drafts */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              <Database size={15} /> Structured Notion Drafts
            </h3>
            {summary && <span className="text-[11px] font-medium text-muted-foreground">{pendingCount} pending</span>}
          </div>

          <div className="space-y-5">
            {!summary ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 py-20 text-center text-sm text-muted-foreground">
                No draft yet. Load a transcript and generate a draft to begin.
              </div>
            ) : summary.drafts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 py-20 text-center text-sm text-muted-foreground">
                The AI returned no entries for this template.
              </div>
            ) : (
              summary.drafts.map((draft) => {
                const isApproved = draft.status === 'approved'
                const isCancelled = draft.status === 'cancelled'
                const isJsonMode = jsonEditSet.has(draft.draftId)
                const rawValue = draft._rawEdit ?? JSON.stringify(draft.entries, null, 2)

                return (
                  <div
                    key={draft.draftId}
                    className={`overflow-hidden rounded-xl border shadow-sm transition-all ${
                      isApproved ? 'border-green-500/40' : isCancelled ? 'border-border opacity-60' : 'border-primary/10 hover:border-primary/30'
                    }`}
                    style={{ background: '#F8F9FE' }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border/60 bg-white px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-foreground text-background">
                          <Database size={15} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Notion Template</p>
                          <h4 className="text-xs font-bold">{draft.title}</h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* View toggle (only when pending) */}
                        {!isApproved && !isCancelled && (
                          <button
                            onClick={() => toggleJsonEdit(draft.draftId)}
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                              isJsonMode
                                ? 'border-primary/30 bg-primary/10 text-primary'
                                : 'border-border bg-white text-muted-foreground hover:border-primary/30 hover:text-primary'
                            }`}
                          >
                            {isJsonMode ? <><FormInput size={11} /> Form</> : <><Code2 size={11} /> Edit JSON</>}
                          </button>
                        )}

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                            isApproved ? 'border-green-200/50 bg-green-50 text-green-700'
                              : isCancelled ? 'border-border bg-muted text-muted-foreground'
                              : 'border-amber-200/50 bg-amber-50 text-amber-700'
                          }`}
                        >
                          {isApproved ? 'Synced' : isCancelled ? 'Discarded' : 'Ready to Sync'}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5">
                      {isJsonMode ? (
                        /* JSON editor view */
                        <>
                          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            Draft entries (JSON)
                          </label>
                          <Textarea
                            value={rawValue}
                            onChange={(e) => handleEntriesChange(draft.draftId, e.target.value)}
                            rows={Math.min(14, rawValue.split('\n').length + 1)}
                            className="rounded-lg border-border/60 bg-white font-mono text-xs"
                            disabled={isApproved || isCancelled}
                          />
                        </>
                      ) : (
                        /* Minimalist form view */
                        <div className="space-y-4">
                          {draft.entries.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic py-2">No entries in this draft.</p>
                          ) : (
                            draft.entries.map((entry, ei) => (
                              <div key={ei} className="rounded-xl border border-border/60 bg-white overflow-hidden">
                                {draft.entries.length > 1 && (
                                  <div className="px-4 py-2 bg-muted/40 border-b border-border/60">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Entry {ei + 1}</span>
                                  </div>
                                )}
                                <div className="px-4 py-1">
                                  <DraftEntryForm entry={entry} />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-border/60 bg-muted/40 px-5 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground/70">
                        <Send size={11} className="rotate-45" />
                        <span className="font-mono text-[10px]">{draft.databaseId}</span>
                      </div>
                      {!isApproved && !isCancelled && (
                        <div className="flex items-center gap-2">
                          {isJsonMode && draft._rawEdit !== undefined && (
                            <Button size="sm" variant="outline" onClick={() => handleSaveEdit(draft)} className="gap-1.5">
                              <Save size={13} /> Save
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleCancelDraft(draft.draftId)} className="gap-1.5 text-destructive hover:text-destructive">
                            <Trash2 size={13} /> Discard
                          </Button>
                          <Button size="sm" onClick={() => handleSyncToNotion(draft.draftId)} disabled={approvingId === draft.draftId} className="brand-gradient gap-1.5 text-white border-0">
                            <Send size={13} />
                            {approvingId === draft.draftId ? 'Syncing...' : 'Sync'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Primary CTA — commit & sync all */}
          {summary && pendingCount > 0 && (
            <div className="pt-8 pb-12">
              <Button
                onClick={handleSyncAll}
                disabled={Boolean(approvingId)}
                className="brand-gradient flex h-14 w-full items-center justify-center gap-3 rounded-xl text-base font-bold text-white border-0 shadow-lg"
              >
                <Send size={18} />
                Commit &amp; Sync {pendingCount} draft{pendingCount > 1 ? 's' : ''} to Notion
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── Right: transcript panel ── */}
      <aside className="hidden w-96 shrink-0 flex-col border-l border-border bg-card xl:flex">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h3 className="flex items-center gap-2 font-bold">
            <MessageSquare size={16} className="text-primary" /> Transcript
          </h3>
          {selectedMeeting && (
            <span className="max-w-[140px] truncate text-xs text-muted-foreground">{selectedMeeting.topic}</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {filteredSegments.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {transcript ? 'No matching lines.' : 'Pull or upload a transcript to see it here.'}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredSegments.map((seg, i) => (
                <div key={i} className="space-y-1.5">
                  {seg.speaker && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                        {initialsOf(seg.speaker)}
                      </div>
                      <h4 className="text-xs font-bold">{seg.speaker}</h4>
                      {seg.time && <span className="text-[10px] text-muted-foreground">{seg.time}</span>}
                    </div>
                  )}
                  <p className={`text-sm leading-relaxed text-muted-foreground ${seg.speaker ? 'pl-9' : ''}`}>
                    {seg.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-muted/40 p-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={transcriptSearch}
              onChange={(e) => setTranscriptSearch(e.target.value)}
              placeholder="Search transcript..."
              className="rounded-lg pl-9 text-sm"
            />
          </div>
        </div>
      </aside>
    </div>
  )
}
