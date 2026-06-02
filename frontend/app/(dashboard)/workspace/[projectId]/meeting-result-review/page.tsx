'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FileText, CheckCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { get, post } from '@/app/lib/api'

interface Meeting {
  id: string
  topic: string
  startTime: string
  endTime?: string
  status: 'upcoming' | 'completed'
  aiSummary?: string
  actionItems?: { task: string; assignee: string; deadline: string }[]
  transcriptVtt?: string
}

export default function MeetingResultReview() {
  const params = useParams()
  const projectId = params?.projectId as string

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [selectedTranscriptParts, setSelectedTranscriptParts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (projectId) {
      fetchMeetings()
    }
  }, [projectId])

  const fetchMeetings = async () => {
    try {
      const data = await get(`/meetings?projectId=${projectId}&status=completed`)
      setMeetings(data)
      if (data.length > 0) {
        setSelectedMeeting(data[0])
      }
    } catch (error) {
      toast.error('Failed to load meetings')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTranscriptSelection = (line: string) => {
    setSelectedTranscriptParts((prev) =>
      prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line]
    )
  }

  const handleTransferToNotion = async () => {
    if (selectedTranscriptParts.length === 0) {
      toast.error('Please select transcript parts first')
      return
    }

    setSyncing(true)
    try {
      await post(`/meetings/${selectedMeeting?.id}/sync-to-notion`, {
        transcriptParts: selectedTranscriptParts,
      })
      toast.success(`Transferred ${selectedTranscriptParts.length} items to Notion!`)
      setSelectedTranscriptParts([])
    } catch (error) {
      toast.error('Failed to transfer to Notion')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground mt-4">Loading meetings...</p>
        </div>
      </div>
    )
  }

  if (meetings.length === 0 || !selectedMeeting) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <p className="text-muted-foreground">No completed meetings found for this project</p>
      </div>
    )
  }

  const transcriptLines =
    selectedMeeting.transcriptVtt?.split('\n\n').filter((line) => line.trim()) || []

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Meeting Result Review</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meeting History Sidebar */}
        <div className="lg:col-span-1 bg-card rounded-lg shadow-md border border-border p-6">
          <h2 className="font-bold mb-4">Meeting History</h2>
          <div className="space-y-2">
            {meetings.map((meeting) => (
              <button
                key={meeting.id}
                onClick={() => {
                  setSelectedMeeting(meeting)
                  setSelectedTranscriptParts([])
                }}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedMeeting.id === meeting.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <FileText size={16} className="mt-1 flex-shrink-0" />
                  <h3 className="text-sm font-medium">{meeting.topic}</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(meeting.startTime).toLocaleDateString()}
                </p>
                <span className="inline-block mt-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                  {meeting.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Meeting Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Summary & Action Items */}
          <div className="bg-card rounded-lg shadow-md border border-border p-6">
            <h2 className="font-bold mb-4">AI Summary & Key Decisions</h2>

            {selectedMeeting.aiSummary && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                <h3 className="text-sm font-semibold mb-2">Summary</h3>
                <div className="text-sm whitespace-pre-line text-foreground">
                  {selectedMeeting.aiSummary}
                </div>
              </div>
            )}

            {selectedMeeting.actionItems && selectedMeeting.actionItems.length > 0 && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <h3 className="text-sm font-semibold mb-3">Action Items</h3>
                <div className="space-y-2">
                  {selectedMeeting.actionItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 mt-1 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium mb-1">{item.task}</p>
                        <p className="text-xs text-muted-foreground">
                          Assigned to: {item.assignee} | Due: {item.deadline}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className="bg-card rounded-lg shadow-md border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Transcript</h2>
              {selectedTranscriptParts.length > 0 && (
                <Button
                  onClick={handleTransferToNotion}
                  disabled={syncing}
                  size="sm"
                  className="gap-2"
                >
                  <Send size={16} />
                  Transfer to Notion ({selectedTranscriptParts.length})
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Click on transcript parts to select them for meeting notes
            </p>

            {transcriptLines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transcript available</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transcriptLines.map((line, index) => {
                  const isSelected = selectedTranscriptParts.includes(line)
                  return (
                    <button
                      key={index}
                      onClick={() => toggleTranscriptSelection(line)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-line">{line}</div>
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                          <CheckCircle size={14} />
                          Selected for meeting notes
                        </div>
                      )}
                    </button>
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
