'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { GitBranch, Video, Calendar, Users, ExternalLink, Sparkles, RefreshCw, Plus } from 'lucide-react'
import { get, patch, post } from '@/app/lib/api'
import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Input } from '@/app/components/ui/input'

interface Project {
  status: string
  id: string
  name: string
  description: string
  notionDbId?: string
  githubRepository?: string
  members?: {
    id: string
    role: string
    user: {
      name: string
      email: string
      avatarUrl?: string
    }
  }[]
}

interface Meeting {
  id: string
  topic: string
  startTime?: string
  start_time?: string
  joinUrl?: string
  join_url?: string
  password?: string
  transcript?: string
}

interface GitActivity {
  id: string
  type: 'PR' | 'ISSUE'
  title: string
  description: string
  author: string
  createdAt: string
}

export default function Workspace() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [repos, setRepos] = useState<any[]>([])
  const [selectedRepo, setSelectedRepo] = useState('')
  const [notionDbId, setNotionDbId] = useState('')
  const [activities, setActivities] = useState<GitActivity[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [geminiResponse, setGeminiResponse] = useState('')
  const [geminiPrompt, setGeminiPrompt] = useState('')
  const [activeZoomUrl, setActiveZoomUrl] = useState('')
  const [creatingMeeting, setCreatingMeeting] = useState(false)
  const [syncingGithub, setSyncingGithub] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      fetchProjectData()
    }
  }, [projectId])

  const fetchProjectData = async () => {
    try {
      const [projectData, activitiesData, meetingsData] = await Promise.all([
        get(`/projects/${projectId}`),
        get(`/api/github/projects/${projectId}/github-activity`).catch(() => []),
        get('/zoom/meetings').catch(() => []),
      ])
      const fetchRepos = async () => {
        try {
          const data = await get('/api/github/repos')
          setRepos(data)
        } catch (error) {
          console.error(error)
        }
      }

      await fetchRepos()

      setProject(projectData)
      setActivities(activitiesData || [])
      setMeetings(meetingsData || [])
    } catch (error) {
      toast.error('Failed to load project data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const buildZoomWebClientUrl = (meeting: Meeting) => {
    const meetingId = encodeURIComponent(String(meeting.id))
    const password = meeting.password ? `&pwd=${encodeURIComponent(meeting.password)}` : ''
    return `https://app.zoom.us/wc/${meetingId}/join?prefer=1${password}`
  }

  const handleGithubSync = async () => {
    setSyncingGithub(true)
    try {
      await post(`/api/github/projects/${projectId}/sync`, {})
      const data = await get(`/api/github/projects/${projectId}/github-activity`)
      setActivities(data || [])
      toast.success('GitHub activity synced')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync GitHub activity')
    } finally {
      setSyncingGithub(false)
    }
  }

  const handleCreateZoomMeeting = async () => {
    if (!project) return

    setCreatingMeeting(true)
    try {
      const start = new Date(Date.now() + 5 * 60 * 1000).toISOString()
      const meeting = await post('/zoom/meetings', {
        topic: `${project.name} Meeting`,
        start_time: start,
        duration_minutes: 60,
        agenda: project.description || undefined,
      })

      setMeetings((prev) => [meeting, ...prev])
      setActiveZoomUrl(buildZoomWebClientUrl(meeting))
      toast.success('Zoom meeting created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create Zoom meeting')
    } finally {
      setCreatingMeeting(false)
    }
  }

  const handleNotionSync = async () => {
    try {
      await post(`/projects/${projectId}/sync-notion`, {})
      toast.success('Synced with Notion database!')
      fetchProjectData()
    } catch (error) {
      toast.error('Failed to sync with Notion')
    }
  }

  const handleGeminiQuery = async () => {
    if (!geminiPrompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }
    try {
      const response = await post('/gemini/query', {
        projectId,
        prompt: geminiPrompt,
      })
      setGeminiResponse(response.response)
    } catch (error) {
      toast.error('Failed to query Gemini')
    }
  }

  const handleConnectRepo = async () => {
    try {
      const repo = repos.find(
        (r) => r.full_name === selectedRepo
      )

      if (!repo) {
        toast.error('Select repository')
        return
      }

      await post(
        `/api/github/${projectId}/repository`,
        repo
      )

      toast.success('Repository connected')

      fetchProjectData()
    } catch (error) {
      toast.error('Failed to connect repository')
    }
  }

  const handleConnectNotion = async () => {
    try {
      await post(
        `/projects/${projectId}/notion`,
        {
          databaseId: notionDbId,
        }
      )

      toast.success('Notion connected')

      fetchProjectData()
    } catch {
      toast.error('Failed to connect Notion')
    }
  }

  const handleCompleteProject = async () => {
    try {
      await patch(
          `/projects/${projectId}/status`,
          {
            status: 'completed',
          }
      )

      toast.success('Project completed')

      fetchProjectData()
    } catch {
      toast.error('Failed to complete project')
    }
  }

  const handleDeleteProject = async () => {
    const confirmed = confirm(
      'Delete this project?'
    )

    if (!confirmed) return

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}`,
        {
          method: 'DELETE',
        }
      )

      toast.success('Project deleted')

      router.push('/dashboard')
    } catch {
      toast.error('Failed to delete project')
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-muted-foreground mt-4">Loading project...</p>
      </div>
    )
  }

  if (!project) {
    return <div className="p-8">Project not found</div>
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {project.name}
          </h1>

          <p className="text-muted-foreground">
            {project.description}
          </p>

          <span className="px-2 py-1 rounded text-xs border">
            {project.status}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCompleteProject}
          >
            Mark Complete
          </Button>

          <Button
            variant="destructive"
            onClick={handleDeleteProject}
          >
            Delete Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-lg shadow-md border border-border p-6">
          <h2 className="font-semibold mb-4">
            GitHub Integration
          </h2>

          <select
            value={selectedRepo}
            onChange={(e) =>
              setSelectedRepo(e.target.value)
            }
            className="w-full border rounded p-2"
          >
            <option value="">
              Select Repository
            </option>

            {repos.map((repo) => (
              <option
                key={repo.id}
                value={repo.full_name}
              >
                {repo.full_name}
              </option>
            ))}
          </select>

          <Button
            className="mt-3"
            onClick={handleConnectRepo}
          >
            Connect Repository
          </Button>
        </div>
        {/* GitHub Activity */}
        <div className="bg-card rounded-lg shadow-md border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GitBranch className="text-foreground" size={20} />
              <h2 className="font-semibold">GitHub Activity</h2>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleGithubSync}
              disabled={syncingGithub}
              className="gap-2"
            >
              <RefreshCw size={14} />
              Sync
            </Button>
          </div>
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activities yet</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activities.map((activity) => (
                <div key={activity.id} className="border-l-4 border-primary pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                      {activity.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium mb-1">{activity.title}</h4>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <div className="flex items-center justify-between gap-3 mt-1">
                    <p className="text-xs text-muted-foreground">by {activity.author}</p>
                    {'url' in activity && typeof activity.url === 'string' && (
                      <a
                        href={activity.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Open <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg shadow-md border border-border p-6">
          <h2 className="font-semibold mb-4">
            Notion Integration
          </h2>

          <Input
            value={notionDbId}
            onChange={(e) =>
              setNotionDbId(e.target.value)
            }
            placeholder="Database ID"
          />

          <Button
            className="mt-3"
            onClick={handleConnectNotion}
          >
            Connect Notion
          </Button>
        </div>
        {/* Notion Database */}
        <div className="bg-card rounded-lg shadow-md border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-foreground rounded"></div>
            <h2 className="font-semibold">Notion Database</h2>
          </div>
          {project.notionDbId ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded">
                <p className="text-xs text-muted-foreground mb-2">Database ID:</p>
                <p className="text-xs break-all font-mono">{project.notionDbId}</p>
              </div>
              <Button onClick={handleNotionSync} className="w-full">
                Sync with Notion
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Notion database not configured</p>
          )}
        </div>

        {/* Gemini AI Assistant */}
        <div className="bg-card rounded-lg shadow-md border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-purple-600" size={20} />
            <h2 className="font-semibold">Gemini AI Assistant</h2>
          </div>
          <div className="space-y-4">
            <Textarea
              value={geminiPrompt}
              onChange={(e) => setGeminiPrompt(e.target.value)}
              placeholder="Ask Gemini about your project..."
              rows={3}
              className="w-full"
            />
            <Button onClick={handleGeminiQuery} className="w-full">
              Ask Gemini
            </Button>
            {geminiResponse && (
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <p className="text-sm whitespace-pre-line">{geminiResponse}</p>
              </div>
            )}
          </div>
        </div>

        {/* Zoom Meetings */}
        <div className="bg-card rounded-lg shadow-md border border-border p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Video className="text-blue-600" size={20} />
              <h2 className="font-semibold">Zoom Meetings</h2>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateZoomMeeting}
              disabled={creatingMeeting}
              className="gap-2"
            >
              <Plus size={14} />
              Create
            </Button>
          </div>
          {activeZoomUrl && (
            <div className="mb-4 overflow-hidden rounded-lg border border-border bg-background">
              <iframe
                src={activeZoomUrl}
                title="Zoom meeting"
                allow="camera; microphone; fullscreen; display-capture"
                className="h-80 w-full"
              />
            </div>
          )}
          {meetings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No meetings yet</p>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="p-3 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium">{meeting.topic}</h4>
                    <Calendar size={16} className="text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {new Date(meeting.startTime || meeting.start_time || Date.now()).toLocaleString()}
                  </p>
                  {(meeting.joinUrl || meeting.join_url) && (
                    <button
                      type="button"
                      onClick={() => setActiveZoomUrl(buildZoomWebClientUrl(meeting))}
                      className="text-xs text-primary hover:underline"
                    >
                      Open in workspace
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-card rounded-lg shadow-md border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} />
          <h2 className="font-semibold">Team Members</h2>
        </div>

        {project.members?.length ? (
          <div className="space-y-3">
            {project.members.map((member: any) => (
              <div
                key={member.id}
                className="flex items-center gap-3 border border-border rounded-lg p-3"
              >
                {member.user.avatarUrl && (
                  <img
                    src={member.user.avatarUrl}
                    alt={member.user.name}
                    className="w-10 h-10 rounded-full"
                  />
                )}

                <div>
                  <p className="font-medium">{member.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.user.email}
                  </p>
                  <p className="text-xs text-primary">
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No members found
          </p>
        )}
      </div>
    </div>
  )
}
