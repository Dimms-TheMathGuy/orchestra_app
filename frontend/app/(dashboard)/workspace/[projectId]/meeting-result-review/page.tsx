'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FileText, Sparkles, Send, Download, Upload, Trash2, RefreshCw } from 'lucide-react'
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
}

interface Summary {
  id: number
  meetingId: string
  drafts: MeetingDraft[]
}

export default function MeetingResultReview() {
  const params = useParams()
  const projectId = params?.projectId as string

  const [meetings, setMeetings] = useState<ZoomMeeting[]>([])
  const [selectedMeetingId, setSelectedMeetingId] = useState('')
  const [transcript, setTranscript] = useState('')
  const [blockId, setBlockId] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)

  const [loadingMeetings, setLoadingMeetings] = useState(true)
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  // Load the project's connected Notion id (used as default blockId) + Zoom meetings
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

  // --- Transcript sources ---

  const handlePullFromZoom = async () => {
    if (!selectedMeetingId) {
      toast.error('Select a meeting first')
      return
    }
    setLoadingTranscript(true)
    try {
      const data = await get(`/zoom/meetings/${selectedMeetingId}/transcript`)
      setTranscript(data.transcript || '')
      toast.success('Transcript pulled from Zoom')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No Zoom transcript yet — upload a .vtt instead',
      )
    } finally {
      setLoadingTranscript(false)
    }
  }

  const handleUploadVtt = async (file: File) => {
    if (!selectedMeetingId) {
      toast.error('Select a meeting first')
      return
    }
    setLoadingTranscript(true)
    try {
      const text = await file.text()
      await post('/transcripts', { meetingId: selectedMeetingId, text })
      setTranscript(text)
      toast.success('Transcript uploaded')
    } catch (error) {
      toast.error('Failed to upload transcript')
    } finally {
      setLoadingTranscript(false)
    }
  }

  // --- Generate schema-aware drafts ---

  const handleGenerate = async () => {
    if (!selectedMeetingId) {
      toast.error('Select a meeting first')
      return
    }
    if (!blockId.trim()) {
      toast.error('Enter the Notion page/template block ID')
      return
    }
    setGenerating(true)
    try {
      const result = await post(`/summaries/${selectedMeetingId}`, { blockId })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      setSummary(result)
      toast.success('Draft generated from transcript')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate draft',
      )
    } finally {
      setGenerating(false)
    }
  }

  // --- Edit a draft's entries (raw JSON for now) ---

  const handleEntriesChange = (draftId: string, value: string) => {
    setSummary((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        drafts: prev.drafts.map((d) =>
          d.draftId === draftId ? { ...d, _rawEdit: value } as MeetingDraft & { _rawEdit: string } : d,
        ),
      }
    })
  }

  const handleSaveEdit = async (draft: MeetingDraft & { _rawEdit?: string }) => {
    if (draft._rawEdit === undefined) return
    let entries: DraftEntry[]
    try {
      entries = JSON.parse(draft._rawEdit)
    } catch {
      toast.error('Invalid JSON in draft entries')
      return
    }
    try {
      await patch(`/summaries/${selectedMeetingId}/drafts/${draft.draftId}`, {
        entries,
      })
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              drafts: prev.drafts.map((d) =>
                d.draftId === draft.draftId ? { ...d, entries } : d,
              ),
            }
          : prev,
      )
      toast.success('Draft updated')
    } catch (error) {
      toast.error('Failed to update draft')
    }
  }

  const handleCancelDraft = async (draftId: string) => {
    try {
      await post(`/summaries/${selectedMeetingId}/drafts/${draftId}/cancel`, {})
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              drafts: prev.drafts.map((d) =>
                d.draftId === draftId ? { ...d, status: 'cancelled' } : d,
              ),
            }
          : prev,
      )
      toast.success('Draft cancelled')
    } catch (error) {
      toast.error('Failed to cancel draft')
    }
  }

  // --- The single "Sync to Notion" action = approve ---

  const handleSyncToNotion = async (draftId: string) => {
    setApprovingId(draftId)
    try {
      const result = await post(
        `/summaries/${selectedMeetingId}/drafts/${draftId}/approve`,
        {},
      )

      if (result?.error) {
        toast.error(result.error)
        return
      }

      setSummary((prev) =>
        prev
          ? {
              ...prev,
              drafts: prev.drafts.map((d) =>
                d.draftId === draftId ? { ...d, status: 'approved' } : d,
              ),
            }
          : prev,
      )
      toast.success(
        `Synced ${result.syncedPages ?? ''} page(s) to Notion`.trim(),
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to sync to Notion',
      )
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Meeting Result Review</h1>
      <p className="text-muted-foreground mb-8">
        Generate a schema-aware draft from the meeting transcript, review it, then
        sync it to your Notion template.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: setup */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-lg shadow-md border border-border p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <FileText size={18} /> 1. Meeting & Transcript
            </h2>

            <label className="text-sm font-medium">Meeting</label>
            <select
              value={selectedMeetingId}
              onChange={(e) => {
                setSelectedMeetingId(e.target.value)
                setTranscript('')
                setSummary(null)
              }}
              className="w-full border rounded p-2 mt-1 mb-4 bg-input-background"
              disabled={loadingMeetings}
            >
              <option value="">
                {loadingMeetings ? 'Loading meetings...' : 'Select a meeting'}
              </option>
              {meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.topic} ({m.id})
                </option>
              ))}
            </select>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handlePullFromZoom}
                disabled={loadingTranscript || !selectedMeetingId}
                className="gap-2"
              >
                <Download size={14} /> Pull transcript from Zoom
              </Button>

              <label className="text-xs text-muted-foreground text-center">
                — or fallback —
              </label>

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
                <span className="w-full inline-flex items-center justify-center gap-2 border rounded-md h-9 px-3 text-sm cursor-pointer hover:bg-muted">
                  <Upload size={14} /> Upload .vtt manually
                </span>
              </label>
            </div>

            {transcript && (
              <div className="mt-4">
                <label className="text-xs text-muted-foreground">
                  Transcript preview
                </label>
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={6}
                  className="mt-1 text-xs font-mono"
                />
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg shadow-md border border-border p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-purple-600" /> 2. Notion template
            </h2>
            <label className="text-sm font-medium">Notion page / block ID</label>
            <Input
              value={blockId}
              onChange={(e) => setBlockId(e.target.value)}
              placeholder="Notion page block ID containing your databases"
              className="mt-1 mb-2 font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mb-4">
              The AI reads this template's database schema first, then generates a
              draft that matches it.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generating || !transcript || !blockId}
              className="w-full gap-2"
            >
              {generating ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              Generate Draft
            </Button>
          </div>
        </div>

        {/* Right: drafts */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-md border border-border p-6 min-h-[300px]">
            <h2 className="font-bold mb-4">3. Review & Sync</h2>

            {!summary ? (
              <p className="text-sm text-muted-foreground">
                No draft yet. Load a transcript and generate a draft to begin.
              </p>
            ) : summary.drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The AI returned no entries for this template.
              </p>
            ) : (
              <div className="space-y-6">
                {summary.drafts.map((draft) => {
                  const editable = draft as MeetingDraft & { _rawEdit?: string }
                  const rawValue =
                    editable._rawEdit ?? JSON.stringify(draft.entries, null, 2)
                  const isApproved = draft.status === 'approved'
                  const isCancelled = draft.status === 'cancelled'

                  return (
                    <div
                      key={draft.draftId}
                      className={`border rounded-lg p-4 ${
                        isApproved
                          ? 'border-green-500/40 bg-green-500/5'
                          : isCancelled
                            ? 'border-border bg-muted/40 opacity-60'
                            : 'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-sm">{draft.title}</h3>
                          <p className="text-xs text-muted-foreground font-mono">
                            {draft.databaseId}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            isApproved
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : isCancelled
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-primary/20 text-primary'
                          }`}
                        >
                          {draft.status}
                        </span>
                      </div>

                      <Textarea
                        value={rawValue}
                        onChange={(e) =>
                          handleEntriesChange(draft.draftId, e.target.value)
                        }
                        rows={Math.min(14, rawValue.split('\n').length + 1)}
                        className="text-xs font-mono"
                        disabled={isApproved || isCancelled}
                      />

                      {!isApproved && !isCancelled && (
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleSyncToNotion(draft.draftId)}
                            disabled={approvingId === draft.draftId}
                            className="gap-2"
                          >
                            <Send size={14} />
                            {approvingId === draft.draftId
                              ? 'Syncing...'
                              : 'Sync to Notion'}
                          </Button>
                          {editable._rawEdit !== undefined && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveEdit(editable)}
                            >
                              Save edits
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelDraft(draft.draftId)}
                            className="gap-2 text-destructive"
                          >
                            <Trash2 size={14} /> Discard
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
