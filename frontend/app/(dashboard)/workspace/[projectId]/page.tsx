'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { io, type Socket } from 'socket.io-client'
import {
  Video, Calendar, ExternalLink, Sparkles, RefreshCw, UserPlus, Trash2,
  Github, MessageSquare, Settings, CheckCircle2, Link2, ChevronDown, Pencil, X, Crown,
  Shield, ChevronRight, Send, Users, GitBranch, Loader2, History, PlayCircle, CalendarClock,
} from 'lucide-react'
import { get, patch, post, del } from '@/app/lib/api'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { toast } from 'sonner'
import { useAuth } from '@/app/context/AuthContext'
import { useLocale } from '@/app/context/LocaleContext'

interface ProjectRepository {
  id: string
  githubOwner: string
  githubRepo: string
  githubUrl: string
}

interface ProjectRole {
  id: string
  name: string
  displayName: string
  level: number   // 0=PM, 1=board, 2=lead, 3=member
  isLead: boolean
  color: string
}

interface ProjectMember {
  id: string
  role: string            // "OWNER" | "MEMBER" — permission
  projectRole?: ProjectRole | null
  user: { id?: string; name: string; email: string; avatarUrl?: string }
}

interface RoleRequest {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  message?: string | null
  createdAt: string
  user: { id: string; name: string; email: string; avatarUrl?: string }
  role: ProjectRole
}

interface Project {
  status: string
  id: string
  name: string
  description: string
  notionDbId?: string
  repositories?: ProjectRepository[]
  members?: ProjectMember[]
}

interface Meeting {
  id: string
  topic: string
  startTime?: string
  start_time?: string
  duration?: number
  joinUrl?: string
  join_url?: string
  password?: string
  isHost?: boolean
  start_url?: string
  organizerTeam?: string | null
  allowedTeams?: string[]
  scope?: 'project' | 'team' | 'global'
}

interface GitActivity {
  id: string
  type: string
  title: string
  description?: string
  author: string
  createdAt: string
  url?: string
}

interface ChatMessage {
  id: string
  senderName?: string
  content: string
  createdAt: string
}

interface GitBranchInfo {
  repoId: string
  repoFullName: string
  name: string
  linked: boolean
  linkId: string | null
  linkedTaskPageId: string | null
  linkedTaskTitle: string | null
  syncState: string | null
}

// Sync-state badge styling (mirrors backend SyncState enum)
const SYNC_STATE_STYLE: Record<string, { label: string; className: string }> = {
  LINKED: { label: 'Linked', className: 'bg-white/10 text-white/70' },
  IN_PROGRESS: { label: 'In progress', className: 'bg-blue-500/20 text-blue-300' },
  IN_REVIEW: { label: 'In review', className: 'bg-amber-500/20 text-amber-300' },
  DONE: { label: 'Done', className: 'bg-green-500/20 text-green-300' },
}

interface NotionTask {
  id: string
  notionPageId: string
  notionDatabaseId: string
  title: string
  status: string | null
  statusGroup: 'todo' | 'in_progress' | 'done'
  assigneeNames: string[]
}

interface SchemaProp {
  name: string
  type: string
  options?: string[]
}

interface ProjectSchema {
  databaseId: string
  title: string
  properties: SchemaProp[]
}

// Notion property types we can drive completion from (matches backend DTO enum)
const COMPLETION_TYPES = ['status', 'select', 'checkbox']

// ── helpers ──
function initialsOf(name?: string) {
  return (name || 'U').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

// Team derivation (mirrors backend roles.service)
const TEAM_LABEL: Record<string, string> = {
  frontend: 'Frontend', backend: 'Backend', qa: 'QA', design: 'Design', devops: 'DevOps',
}
const ROLE_TEAM: Record<string, string | null> = {
  project_manager: null, tech_lead: null, project_secretary: null,
  frontend_lead: 'frontend', frontend_dev: 'frontend',
  backend_lead: 'backend', backend_dev: 'backend',
  qa_lead: 'qa', qa_engineer: 'qa',
  design_lead: 'design', designer: 'design',
  devops_lead: 'devops', devops_engineer: 'devops',
}
function teamForRoleName(name?: string | null): string | null {
  return name ? (ROLE_TEAM[name] ?? null) : null
}

function Avatar({ name, url, size = 40 }: { name?: string; url?: string; size?: number }) {
  if (url) {
    return <img src={url} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <div
      className="brand-gradient flex items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initialsOf(name)}
    </div>
  )
}

function notionEmbedFrom(value?: string): string | null {
  if (!value) return null
  const v = value.trim()
  // Accept full <iframe src="..."> HTML pasted from Notion's "Embed this page"
  const srcMatch = v.match(/src=["']([^"']+)["']/)
  if (srcMatch) return srcMatch[1]
  // Accept bare URL
  if (v.startsWith('http')) return v
  return null
}

export default function Workspace() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useLocale()
  const projectId = params?.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [repos, setRepos] = useState<any[]>([])
  const [selectedRepo, setSelectedRepo] = useState('')
  const [notionDbId, setNotionDbId] = useState('')
  const [activities, setActivities] = useState<GitActivity[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [zoomTab, setZoomTab] = useState<'upcoming' | 'past'>('upcoming')
  const [creatingMeeting, setCreatingMeeting] = useState(false)
  const [schedulingMeeting, setSchedulingMeeting] = useState(false)
  const [scheduleTopic, setScheduleTopic] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleDuration, setScheduleDuration] = useState(60)
  const [scheduleScope, setScheduleScope] = useState<'project' | 'team'>('project')
  const [scheduleInvitedTeams, setScheduleInvitedTeams] = useState<string[]>([])
  const [syncingGithub, setSyncingGithub] = useState(false)
  const [repairingRepo, setRepairingRepo] = useState<string | null>(null)
  // GitHub widget: "activity" feed vs "tasks" (link branch ↔ Notion task)
  const [githubTab, setGithubTab] = useState<'activity' | 'tasks'>('activity')
  const [branches, setBranches] = useState<GitBranchInfo[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [notionTasks, setNotionTasks] = useState<NotionTask[]>([])
  const [syncingTasks, setSyncingTasks] = useState(false)
  const [projectSchema, setProjectSchema] = useState<ProjectSchema | null>(null)
  // Link-task-to-branch modal
  const [linkBranch, setLinkBranch] = useState<GitBranchInfo | null>(null)
  const [linkTaskId, setLinkTaskId] = useState('')
  const [linkTargetBranch, setLinkTargetBranch] = useState('main')
  const [linkCompletionProp, setLinkCompletionProp] = useState('')
  const [linkCompletionValue, setLinkCompletionValue] = useState('')
  const [linkInProgressValue, setLinkInProgressValue] = useState('')
  const [linkRequireApproval, setLinkRequireApproval] = useState(false)
  const [submittingLink, setSubmittingLink] = useState(false)
  const [loading, setLoading] = useState(true)
  const [addingMember, setAddingMember] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSearchResults, setMemberSearchResults] = useState<{ id: string; name: string; email: string; avatarUrl?: string }[]>([])
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<{ id: string; name: string; email: string; avatarUrl?: string } | null>(null)
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([])
  const [claimingForMember, setClaimingForMember] = useState<string | null>(null)
  const [submittingRoleId, setSubmittingRoleId] = useState<string | null>(null)
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([])
  const [reviewingRequest, setReviewingRequest] = useState<string | null>(null)

  // Notion embed (public notion.site URL) — stored per project in localStorage
  const [notionEmbedUrl, setNotionEmbedUrl] = useState('')
  const [editingEmbed, setEditingEmbed] = useState(false)
  const [embedDraft, setEmbedDraft] = useState('')
  // Bumped to force a full iframe reload — Notion's public embed is CDN-cached
  // and won't reflect status changes until the frame is remounted.
  const [embedReloadKey, setEmbedReloadKey] = useState(0)

  useEffect(() => {
    if (projectId) fetchProjectData()
  }, [projectId])

  useEffect(() => {
    if (projectId) setNotionEmbedUrl(localStorage.getItem(`notion-embed-${projectId}`) || '')
  }, [projectId])

  // The GitHub repo picker only appears when no repo is linked yet. Listing the
  // user's repos hits the GitHub API (slow), so fetch it lazily and only when
  // the picker will actually be shown — never block the initial render on it.
  useEffect(() => {
    if (!project) return
    if ((project.repositories?.length ?? 0) > 0) return // picker hidden → skip
    let cancelled = false
    get('/api/github/repos')
      .then((r) => { if (!cancelled) setRepos(Array.isArray(r) ? r : []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [project])

  // Debounced user search for add-member
  useEffect(() => {
    if (!memberSearch.trim() || memberSearch.length < 2) {
      setMemberSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearchingUsers(true)
      try {
        const results = await get(`/users?email=${encodeURIComponent(memberSearch.trim())}`)
        // Filter out existing members
        const existingIds = new Set(project?.members?.map((m) => m.user.id))
        setMemberSearchResults((results ?? []).filter((u: { id: string }) => !existingIds.has(u.id)))
      } catch {
        setMemberSearchResults([])
      } finally {
        setSearchingUsers(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [memberSearch])

  const fetchProjectData = async () => {
    try {
      // Only fast local-DB endpoints are awaited here so the page paints quickly.
      const [projectData, activitiesData, messagesData, rolesData, requestsData] = await Promise.all([
        get(`/projects/${projectId}`),
        get(`/api/github/projects/${projectId}/github-activity`).catch(() => []),
        get(`/projects/${projectId}/messages`).catch(() => []),
        get(`/projects/${projectId}/roles`).catch(() => []),
        get(`/projects/${projectId}/roles/requests`).catch(() => []), // owner-only; 403 → []
      ])
      setProject(projectData)
      setActivities(activitiesData || [])
      setMessages(Array.isArray(messagesData) ? messagesData : [])
      setProjectRoles(Array.isArray(rolesData) ? rolesData : [])
      setRoleRequests(Array.isArray(requestsData) ? requestsData : [])
    } catch (error) {
      toast.error(t.workspace.failedLoad)
      console.error(error)
    } finally {
      setLoading(false)
    }

    // Zoom meetings hit the external Zoom API (slow) — load out-of-band so the
    // workspace renders immediately and the list fills in when Zoom responds.
    get(`/zoom/projects/${projectId}/meetings`)
      .then((m) => setMeetings(Array.isArray(m) ? m : []))
      .catch(() => {})
  }

  const handleGithubSync = async () => {
    setSyncingGithub(true)
    try {
      const result = await post(`/api/github/projects/${projectId}/sync`, {})
      const data = await get(`/api/github/projects/${projectId}/github-activity`)
      setActivities(data || [])
      // Reconcile may have advanced linked-task states — refresh the branch badges.
      loadBranches()
      const updated = result?.tasksUpdated ?? 0
      // Task statuses changed in Notion — reload the cached embed to show them.
      if (updated > 0) setEmbedReloadKey((k) => k + 1)
      toast.success(updated > 0 ? t.workspace.githubSyncedTasks(updated) : t.workspace.githubSynced)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.workspace.failedSyncGithub)
    } finally {
      setSyncingGithub(false)
    }
  }

  const handleRepairWebhook = async (repoId: string) => {
    setRepairingRepo(repoId)
    try {
      await post(`/api/github/${projectId}/repository/${repoId}/repair-webhook`, {})
      toast.success(t.workspace.webhookRepaired)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.workspace.failedRepairWebhook)
    } finally {
      setRepairingRepo(null)
    }
  }

  // ── Link task ↔ branch ──
  const loadBranches = async () => {
    setLoadingBranches(true)
    try {
      const data = await get(`/api/github/${projectId}/branches`)
      setBranches(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.workspace.failedLoadBranches)
    } finally {
      setLoadingBranches(false)
    }
  }

  const loadNotionTasks = async () => {
    try {
      const data = await get(`/projects/${projectId}/notion/tasks`)
      setNotionTasks(Array.isArray(data) ? data : [])
    } catch {
      /* no tasks synced yet — non-fatal */
    }
  }

  const handleSyncTasks = async () => {
    setSyncingTasks(true)
    try {
      const data = await post(`/projects/${projectId}/notion/sync-tasks`, {})
      setNotionTasks(Array.isArray(data) ? data : [])
      toast.success(t.workspace.syncedTasks(Array.isArray(data) ? data.length : 0))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.workspace.failedSyncTasks)
    } finally {
      setSyncingTasks(false)
    }
  }

  // Load branches + tasks the first time the Tasks tab opens
  useEffect(() => {
    if (githubTab !== 'tasks' || !projectId) return
    loadBranches()
    loadNotionTasks()
  }, [githubTab, projectId])

  // Live task-sync updates: when a webhook advances or completes a linked task,
  // the backend pushes 'taskSyncUpdate' — refresh the branch badges (and the
  // Notion embed when a task just completed) without a manual Sync.
  useEffect(() => {
    if (!projectId) return
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const socket: Socket = io(apiBaseUrl)
    socket.emit('joinProject', projectId)
    socket.on('taskSyncUpdate', (payload: { syncState?: string }) => {
      loadBranches()
      if (payload?.syncState === 'DONE') setEmbedReloadKey((k) => k + 1)
    })
    return () => { socket.disconnect() }
  }, [projectId])

  const openLinkModal = (branch: GitBranchInfo) => {
    setLinkBranch(branch)
    setLinkTaskId('')
    setLinkTargetBranch('main')
    setLinkCompletionProp('')
    setLinkCompletionValue('')
    setLinkInProgressValue('')
    setLinkRequireApproval(false)
    setProjectSchema(null)
  }

  // Picking a task loads that task's database schema (tasks may span databases)
  const selectTaskForLink = async (taskId: string) => {
    setLinkTaskId(taskId)
    setLinkCompletionProp('')
    setLinkCompletionValue('')
    setLinkInProgressValue('')
    setProjectSchema(null)
    if (!taskId) return
    const task = notionTasks.find((nt) => nt.notionPageId === taskId)
    if (!task) return
    try {
      const schema = await get(`/projects/${projectId}/notion/schema/${task.notionDatabaseId}`)
      setProjectSchema(schema)
    } catch {
      toast.error(t.workspace.failedLoadSchema)
    }
  }

  // Only status/select/checkbox props can drive completion
  const completionProps = (projectSchema?.properties ?? []).filter((p) =>
    COMPLETION_TYPES.includes(p.type),
  )
  const selectedProp = completionProps.find((p) => p.name === linkCompletionProp)

  const handleSubmitLink = async () => {
    if (!linkBranch || !linkTaskId || !linkCompletionProp || !selectedProp) {
      toast.error(t.workspace.pickTaskAndProp)
      return
    }
    const task = notionTasks.find((nt) => nt.notionPageId === linkTaskId)
    if (!task) {
      toast.error(t.workspace.taskNotFound)
      return
    }
    const completionValue =
      selectedProp.type === 'checkbox' ? linkCompletionValue === 'true' : linkCompletionValue
    if (selectedProp.type !== 'checkbox' && !linkCompletionValue) {
      toast.error(t.workspace.pickCompletionValue)
      return
    }

    setSubmittingLink(true)
    try {
      await post(`/api/github/${projectId}/task-branch-sync`, {
        repoId: linkBranch.repoId,
        taskId: task.notionPageId,
        branchName: linkBranch.name,
        targetBranch: linkTargetBranch || 'main',
        databaseId: task.notionDatabaseId,
        completionPropertyName: linkCompletionProp,
        completionPropertyType: selectedProp.type,
        completionValue,
        // In-progress sync only applies to status/select props with a chosen value.
        ...(selectedProp.type !== 'checkbox' && linkInProgressValue
          ? { inProgressValue: linkInProgressValue }
          : {}),
        requireApproval: linkRequireApproval,
      })
      toast.success(t.workspace.linked(task.title, linkBranch.name))
      setLinkBranch(null)
      loadBranches()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.workspace.failedLinkTask)
    } finally {
      setSubmittingLink(false)
    }
  }

  const handleUnlink = async (branch: GitBranchInfo) => {
    if (!branch.linkId) return
    try {
      await del(`/api/github/${projectId}/task-branch-sync/${branch.linkId}`)
      toast.success(t.workspace.unlinked(branch.name))
      loadBranches()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.workspace.failedUnlink)
    }
  }

  // Current user's team within this project (null = management / no team)
  const myTeam = (() => {
    const me = project?.members?.find((m) => m.user.email === user?.email)
    return teamForRoleName(me?.projectRole?.name)
  })()

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
        projectId,
        organizerTeam: null, // instant meetings are project-wide
        allowedTeams: [],
      })
      setMeetings((prev) => [meeting, ...prev])
      toast.success(t.workspace.zoomCreated)
      router.push(`/workspace/${projectId}/zoom/${meeting.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.workspace.failedCreateMeeting)
    } finally {
      setCreatingMeeting(false)
    }
  }

  const handleScheduleMeeting = async () => {
    if (!project) return
    if (!scheduleDate) { toast.error(t.workspace.pickDate); return }
    // Team-scoped meeting requires the organizer to belong to a team
    const organizerTeam = scheduleScope === 'team' ? myTeam : null
    if (scheduleScope === 'team' && !organizerTeam) {
      toast.error(t.workspace.noTeam)
      return
    }
    setCreatingMeeting(true)
    try {
      const meeting = await post('/zoom/meetings', {
        topic: scheduleTopic.trim() || `${project.name} Meeting`,
        start_time: new Date(scheduleDate).toISOString(),
        duration_minutes: scheduleDuration,
        projectId,
        organizerTeam,
        allowedTeams: scheduleScope === 'team' ? scheduleInvitedTeams : [],
      })
      setMeetings((prev) => [...prev, meeting])
      setSchedulingMeeting(false)
      setScheduleTopic('')
      setScheduleDate('')
      setScheduleDuration(60)
      setScheduleScope('project')
      setScheduleInvitedTeams([])
      toast.success(t.workspace.meetingScheduled)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.workspace.failedScheduleMeeting)
    } finally {
      setCreatingMeeting(false)
    }
  }

  const handleConnectRepo = async () => {
    try {
      const repo = repos.find((r) => r.full_name === selectedRepo)
      if (!repo) {
        toast.error(t.workspace.selectRepo)
        return
      }
      await post(`/api/github/${projectId}/repository`, repo)
      toast.success(t.workspace.repoConnected)
      fetchProjectData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.workspace.failedConnectRepo)
    }
  }

  const handleConnectNotion = async () => {
    try {
      await post(`/projects/${projectId}/notion`, { databaseId: notionDbId })
      toast.success(t.workspace.notionConnected)
      setNotionDbId('')
      fetchProjectData()
    } catch {
      toast.error(t.workspace.failedConnectNotion)
    }
  }

  const handleSaveEmbed = () => {
    const raw = embedDraft.trim()
    if (raw && !raw.startsWith('http') && !raw.includes('src=')) {
      toast.error(t.workspace.notionEmbedError)
      return
    }
    setNotionEmbedUrl(raw)
    localStorage.setItem(`notion-embed-${projectId}`, raw)
    setEditingEmbed(false)
    toast.success(raw ? t.workspace.notionEmbedSaved : t.workspace.notionEmbedCleared)
  }

  const handleCompleteProject = async () => {
    try {
      await patch(`/projects/${projectId}/status`, { status: 'completed' })
      toast.success(t.workspace.markedComplete)
      fetchProjectData()
    } catch {
      toast.error(t.workspace.failedComplete)
    }
  }

  const handleDeleteProject = async () => {
    if (!confirm(t.workspace.deleteConfirm)) return
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      toast.success(t.workspace.deleted)
      router.push('/dashboard')
    } catch {
      toast.error(t.workspace.failedDelete)
    }
  }

  const handleAddMember = async () => {
    if (!selectedUserToAdd) return
    setAddingMember(true)
    try {
      await post(`/projects/${projectId}/members`, { email: selectedUserToAdd.email })
      toast.success(t.workspace.added(selectedUserToAdd.name))
      setSelectedUserToAdd(null)
      setMemberSearch('')
      setMemberSearchResults([])
      fetchProjectData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.workspace.failedAddMember)
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!confirm(t.workspace.removeConfirm(memberName))) return
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/projects/${projectId}/members/${memberUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      toast.success(t.workspace.removed(memberName))
      fetchProjectData()
    } catch {
      toast.error(t.workspace.failedRemoveMember)
    }
  }

  const handleAssignRole = async (memberUserId: string, roleId: string | null) => {
    setSubmittingRoleId(roleId)
    try {
      await patch(`/projects/${projectId}/roles/members/${memberUserId}/assign`, { roleId })
      toast.success(t.workspace.roleAssigned)
      setClaimingForMember(null)
      fetchProjectData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.workspace.failedAssignRole)
    } finally {
      setSubmittingRoleId(null)
    }
  }

  const handleRequestRole = async (roleId: string) => {
    setSubmittingRoleId(roleId)
    try {
      await post(`/projects/${projectId}/roles/request`, { roleId })
      toast.success(t.workspace.requestSubmitted)
      setClaimingForMember(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.workspace.failedSubmitRequest)
    } finally {
      setSubmittingRoleId(null)
    }
  }

  const handleReviewRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setReviewingRequest(requestId)
    try {
      await patch(`/projects/${projectId}/roles/requests/${requestId}/review`, { action })
      toast.success(action === 'approve' ? t.workspace.roleApproved : t.workspace.requestRejected)
      fetchProjectData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.workspace.failedReviewRequest)
    } finally {
      setReviewingRequest(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">{t.workspace.loading}</p>
        </div>
      </div>
    )
  }

  if (!project) return <div className="p-8">{t.workspace.notFound}</div>

  const myMembership = project.members?.find((m) => m.user.email === user?.email)
  const isOwner = myMembership?.role === 'OWNER'
  const hasRepo = (project.repositories?.length ?? 0) > 0

  // A meeting counts as "past" once its scheduled end (start + duration) has
  // elapsed — so a freshly-started instant meeting stays under Upcomings until
  // it actually wraps up, instead of jumping straight to Past.
  const meetingStartTs = (m: Meeting) => {
    const raw = m.startTime || m.start_time
    return raw ? new Date(raw).getTime() : 0
  }
  const meetingEndTs = (m: Meeting) =>
    meetingStartTs(m) + (m.duration ? m.duration * 60_000 : 0)

  // Split by tab, then order each list "closest to today first": upcoming ascending
  // (soonest next), past descending (most recently ended).
  const now = Date.now()
  const visibleMeetings = (() => {
    if (zoomTab === 'past') {
      return meetings
        .filter((m) => meetingEndTs(m) < now)
        .sort((a, b) => meetingStartTs(b) - meetingStartTs(a))
    }
    return meetings
      .filter((m) => meetingEndTs(m) >= now)
      .sort((a, b) => meetingStartTs(a) - meetingStartTs(b))
  })()

  // Group members by role level for hierarchy display
  const levelLabel: Record<number, string> = { 0: 'Management', 1: 'Board', 2: 'Team Leads', 3: 'Members' }
  type GroupedMembers = { level: number; label: string; members: typeof project.members }
  const membersGrouped: GroupedMembers[] = (() => {
    const all = project.members ?? []
    const withRole = all.filter((m) => m.projectRole)
    const noRole = all.filter((m) => !m.projectRole)
    const byLevel = new Map<number, typeof all>()
    for (const m of withRole) {
      const lvl = m.projectRole!.level
      if (!byLevel.has(lvl)) byLevel.set(lvl, [])
      byLevel.get(lvl)!.push(m)
    }
    const groups: GroupedMembers[] = []
    for (const [lvl, members] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
      groups.push({ level: lvl, label: levelLabel[lvl] ?? `Level ${lvl}`, members })
    }
    if (noRole.length > 0) groups.push({ level: 99, label: 'Unassigned', members: noRole })
    return groups
  })()
  const embedSrc = notionEmbedFrom(notionEmbedUrl)

  return (
    <>
    <div className="min-h-full bg-gradient-to-br from-[#f6f7fb] via-white to-[#eef1fb] text-slate-900">
      <div className="@container/page mx-auto max-w-[1400px] p-5 lg:p-7">
        {/* Top bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{project.name}</h1>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
              project.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'
            }`}>
              {project.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {project.status !== 'completed' && (
              <Button variant="outline" size="sm" onClick={handleCompleteProject} className="gap-2 bg-white">
                <CheckCircle2 size={15} /> {t.workspace.markComplete}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDeleteProject} className="gap-2 bg-white text-destructive hover:text-destructive">
              <Trash2 size={15} /> {t.workspace.delete}
            </Button>
            <Link href={`/workspace/${projectId}/settings`}>
              <Button variant="ghost" size="icon" className="text-slate-500"><Settings size={20} /></Button>
            </Link>
          </div>
        </div>

        {/* Two-zone layout (container-query based → adapts to sidebar collapse) */}
        <div className="grid grid-cols-1 gap-5 @5xl/page:grid-cols-[340px_minmax(0,1fr)]">
          {/* ── LEFT RAIL ── */}
          <div className="flex flex-col gap-5 @5xl/page:sticky @5xl/page:top-7 @5xl/page:h-[calc(100vh-3.5rem)]">
            {/* Personal Info */}
            <div
              className="shrink-0 rounded-[17px] border border-white/50 p-5 shadow-[0px_4px_20px_-1px_rgba(0,0,0,0.15)] backdrop-blur"
              style={{ background: 'linear-gradient(117deg, rgba(219,255,246,0.9) -2%, rgba(240,240,240,0.4) 100%)' }}
            >
              <div className="flex items-center gap-4">
                <Avatar name={user?.name} url={user?.avatarUrl} size={64} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-slate-900">{user?.name}</p>
                  <p className="truncate text-sm font-semibold text-slate-600">{myMembership?.role || 'Member'}</p>
                  <p className="truncate text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>
              {user?.company && (
                <div className="mt-4 border-t border-black/5 pt-3">
                  <p className="text-sm font-bold text-slate-600">{user.company}</p>
                </div>
              )}
            </div>

            {/* Members */}
            <div
              className="flex min-h-0 flex-1 flex-col rounded-[17px] border border-white/50 p-5 shadow-[0px_4px_20px_-1px_rgba(0,0,0,0.15)] backdrop-blur"
              style={{ background: 'linear-gradient(118deg, rgba(255,244,229,0.9) -42%, rgba(240,240,240,0.4) 100%)' }}
            >
              <h2 className="mb-4 text-xl font-bold text-slate-900">{t.workspace.projectMembers}</h2>

              {/* Add member — only owner */}
              {isOwner && (
                <div className="mb-4">
                  {/* Search input */}
                  <div className="relative">
                    <Input
                      type="email"
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value)
                        setSelectedUserToAdd(null)
                      }}
                      placeholder={t.workspace.searchByEmail}
                      className="h-9 rounded-xl border-white/60 bg-white/70 pr-8 text-sm"
                    />
                    {searchingUsers && (
                      <RefreshCw size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                    )}
                  </div>

                  {/* Search results dropdown */}
                  {memberSearchResults.length > 0 && !selectedUserToAdd && (
                    <div className="mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      {memberSearchResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setSelectedUserToAdd(u)
                            setMemberSearch(u.email)
                            setMemberSearchResults([])
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                        >
                          <Avatar name={u.name} url={u.avatarUrl} size={32} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">{u.name}</p>
                            <p className="truncate text-xs text-slate-400">{u.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected user preview + confirm */}
                  {selectedUserToAdd && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                      <Avatar name={selectedUserToAdd.name} url={selectedUserToAdd.avatarUrl} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">{selectedUserToAdd.name}</p>
                        <p className="truncate text-xs text-slate-400">{selectedUserToAdd.email}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleAddMember}
                        disabled={addingMember}
                        className="shrink-0 gap-1.5"
                      >
                        <UserPlus size={13} />
                        {t.workspace.add}
                      </Button>
                      <button
                        onClick={() => { setSelectedUserToAdd(null); setMemberSearch('') }}
                        className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* No results hint */}
                  {memberSearch.length >= 2 && !searchingUsers && memberSearchResults.length === 0 && !selectedUserToAdd && (
                    <p className="mt-1.5 text-xs text-slate-400">No users found for "{memberSearch}"</p>
                  )}
                </div>
              )}

              {/* Pending role requests — owner only */}
              {isOwner && roleRequests.filter((r) => r.status === 'PENDING').length > 0 && (
                <div className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50/80 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Shield size={13} className="text-amber-600" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
                      Role Requests
                    </span>
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                      {roleRequests.filter((r) => r.status === 'PENDING').length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {roleRequests
                      .filter((r) => r.status === 'PENDING')
                      .map((r) => (
                        <div key={r.id} className="flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-2 shadow-sm">
                          <Avatar name={r.user.name} url={r.user.avatarUrl} size={30} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-800">{r.user.name}</p>
                            <p className="truncate text-[11px] text-slate-500">
                              wants{' '}
                              <span
                                className="font-semibold"
                                style={{ color: r.role.color }}
                              >
                                {r.role.displayName}
                              </span>
                            </p>
                          </div>
                          <button
                            onClick={() => handleReviewRequest(r.id, 'approve')}
                            disabled={reviewingRequest === r.id}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200 disabled:opacity-50"
                            aria-label="Approve"
                            title="Approve"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                          <button
                            onClick={() => handleReviewRequest(r.id, 'reject')}
                            disabled={reviewingRequest === r.id}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600 transition-colors hover:bg-red-200 disabled:opacity-50"
                            aria-label="Reject"
                            title="Reject"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Hierarchical member list */}
              <div className="-mr-2 flex-1 space-y-5 overflow-y-auto pr-2">
                {membersGrouped.length === 0 && (
                  <p className="text-sm text-slate-400">{t.workspace.noMembers}</p>
                )}
                {membersGrouped.map((group) => (
                  <div key={group.level}>
                    {/* Section header */}
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.label}</span>
                      <div className="h-px flex-1 bg-slate-200/60" />
                    </div>

                    <div className="space-y-2">
                      {group.members?.map((m) => {
                        const pr = m.projectRole
                        const badgeColor = pr?.color ?? '#64748b'
                        const isMe = m.user.email === user?.email
                        const rolePanelOpen = claimingForMember === m.id

                        return (
                          <div key={m.id} className="group relative">
                            <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/60">
                              {/* Avatar */}
                              <div className="relative shrink-0">
                                <Avatar name={m.user.name} url={m.user.avatarUrl} size={40} />
                                {pr && pr.level === 0 && (
                                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600">
                                    <Crown size={9} className="text-white" />
                                  </span>
                                )}
                                {pr && pr.level === 1 && (
                                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500">
                                    <Shield size={9} className="text-white" />
                                  </span>
                                )}
                              </div>

                              {/* Info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-bold text-slate-900">
                                    {m.user.name} {isMe && <span className="font-normal text-slate-400">(you)</span>}
                                  </p>
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  {/* Role badge */}
                                  {pr ? (
                                    <span
                                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                                      style={{ background: badgeColor }}
                                    >
                                      {pr.isLead && <ChevronRight size={9} className="shrink-0" />}
                                      {pr.displayName}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                                      No Role
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 truncate text-[11px] text-slate-400">{m.user.email}</p>
                              </div>

                              {/* Actions */}
                              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {/* PM: assign role dropdown */}
                                {isOwner && (
                                  <button
                                    onClick={() => setClaimingForMember(rolePanelOpen ? null : m.id)}
                                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-primary/40 hover:text-primary"
                                  >
                                    <Pencil size={11} />
                                    Role
                                  </button>
                                )}
                                {/* Non-owner without a role: request role */}
                                {!isOwner && isMe && !pr && (
                                  <button
                                    onClick={() => setClaimingForMember(rolePanelOpen ? null : m.id)}
                                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-primary/40 hover:text-primary"
                                  >
                                    <Send size={11} />
                                    Claim Role
                                  </button>
                                )}
                                {/* PM: remove member */}
                                {isOwner && m.role !== 'OWNER' && m.user.id && (
                                  <button
                                    onClick={() => handleRemoveMember(m.user.id!, m.user.name)}
                                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-destructive"
                                    aria-label="Remove member"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Role selection panel */}
                            {rolePanelOpen && (
                              <div className="mt-1 ml-[52px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                  {isOwner ? 'Assign Role' : 'Request Role'}
                                </p>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                  {projectRoles.map((role) => (
                                    <button
                                      key={role.id}
                                      disabled={submittingRoleId === role.id}
                                      onClick={() =>
                                        isOwner && m.user.id
                                          ? handleAssignRole(m.user.id, role.id)
                                          : handleRequestRole(role.id)
                                      }
                                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-slate-50"
                                    >
                                      <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ background: role.color }}
                                      />
                                      <span className="flex-1 font-medium">{role.displayName}</span>
                                      <span className="text-[10px] text-slate-400">Lv.{role.level}</span>
                                    </button>
                                  ))}
                                  {isOwner && pr && (
                                    <button
                                      onClick={() => m.user.id && handleAssignRole(m.user.id, null)}
                                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-red-50"
                                    >
                                      <X size={12} className="shrink-0" />
                                      Remove Role
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT AREA ── */}
          <div className="@container/right flex flex-col gap-5">
            {/* Notion widget */}
            <div
              className="overflow-hidden rounded-[17px] border border-white/50 shadow-[0px_4px_40px_rgba(0,0,0,0.18)] backdrop-blur"
              style={{ background: 'linear-gradient(179deg, rgba(255,196,166,0.36) -12%, rgba(255,221,209,0.28) 109%)' }}
            >
              <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <svg width="30" height="30" viewBox="0 0 100 100" fill="none">
                    <path d="M6 4.3l55.3-4.1c6.8-.6 8.5-.2 12.8 2.9l17.7 12.4c2.9 2.1 3.9 2.7 3.9 5.1v68.2c0 4.3-1.6 6.8-7 7.2L24.5 100c-4.1.2-6-.4-8.2-3.1L3.3 79.9C1 76.8 0 74.5 0 71.8V11.1c0-3.5 1.6-6.4 6-6.8z" fill="rgba(0,0,0,0.8)"/>
                    <path d="M61.4.2L6 4.3C1.6 4.7 0 7.6 0 11.1v60.7c0 2.7 1 5 3.3 8.2l13 16.9c2.1 2.7 4 3.3 8.2 3.1l64.3-3.9c5.4-.4 7-2.9 7-7.2V20.6c0-2.2-.9-2.8-3.4-4.7L75.9 3.4C71.4 0 69.6-.4 61.4.2zM25.7 19.1c-5.5.4-6.7.4-9.9-2L8.9 11.5c-.8-.8-.4-1.8 1.6-1.9l53.2-3.9c4.5-.4 6.8 1.2 8.5 2.5l8.2 5.9c.4.2 1.4 1.4.2 1.4l-54.9 3.6zM19.8 88.3V30.4c0-2.5.8-3.7 3.1-3.9L86 22.8c2.1-.2 3.1 1.2 3.1 3.7v57.5c0 2.5-.4 4.7-3.9 4.9l-60.4 3.5c-3.5.2-5-1-5-4.1zm59.6-54.8c.4 1.8 0 3.5-1.8 3.7l-2.9.6v42.8c-2.5 1.4-4.9 2.1-6.8 2.1-3.1 0-3.9-1-6.2-3.9l-19-29.9V79l6.1 1.4s0 3.5-4.9 3.5l-13.4.8c-.4-.8 0-2.7 1.4-3.1l3.5-1V42.3l-4.9-.4c-.4-1.8.6-4.3 3.3-4.5l14.2-1 19.8 30.3V37.7l-5-.6c-.4-2.1 1.2-3.7 3.1-3.9z" fill="white"/>
                  </svg>
                  <h2 className="text-xl font-bold text-slate-900/80">Project and Task Manager</h2>
                </div>
                <div className="flex items-center gap-2">
                  {embedSrc && (
                    <a href={embedSrc} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-primary">
                      Open <ExternalLink size={12} />
                    </a>
                  )}
                  {embedSrc && (
                    <button onClick={() => setEmbedReloadKey((k) => k + 1)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-white/60" aria-label="Refresh Notion embed" title="Refresh">
                      <RefreshCw size={15} />
                    </button>
                  )}
                  <button onClick={() => { setEditingEmbed((v) => !v); setEmbedDraft(notionEmbedUrl) }}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-white/60" aria-label="Edit embed">
                    <Pencil size={15} />
                  </button>
                </div>
              </div>

              {/* Embed area */}
              <div className="px-3 pb-3">
                {editingEmbed && (
                  <div className="mb-3 flex flex-col gap-2 rounded-xl bg-white/70 p-3 sm:flex-row">
                    <Input
                      value={embedDraft}
                      onChange={(e) => setEmbedDraft(e.target.value)}
                      placeholder='Paste embed code (<iframe src="...">) or public Notion URL'
                      className="h-9 rounded-lg bg-white text-sm"
                    />
                    <Button size="sm" onClick={handleSaveEmbed} className="shrink-0">Save</Button>
                  </div>
                )}
                <div className="overflow-hidden rounded-xl bg-white" style={{ height: 560 }}>
                  {embedSrc ? (
                    // Use iframe — works with official Notion /ebd/ embed URLs
                    <div className="relative h-full w-full">
                      <iframe
                        key={embedReloadKey}
                        src={embedReloadKey === 0 ? embedSrc : `${embedSrc}${embedSrc.includes('?') ? '&' : '?'}_r=${embedReloadKey}`}
                        title="Notion page"
                        className="h-full w-full"
                        allow="fullscreen"
                        style={{ border: 'none' }}
                      />
                      {/* Always-visible "Open in Notion" chip */}
                      <a
                        href={embedSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-md backdrop-blur hover:bg-white"
                      >
                        <ExternalLink size={11} /> Open in Notion
                      </a>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <svg width="28" height="28" viewBox="0 0 100 100" fill="currentColor"><path d="M19.8 88.3V30.4c0-2.5.8-3.7 3.1-3.9L86 22.8c2.1-.2 3.1 1.2 3.1 3.7v57.5c0 2.5-.4 4.7-3.9 4.9l-60.4 3.5c-3.5.2-5-1-5-4.1z"/></svg>
                      </div>
                      <p className="font-semibold text-slate-700">Embed your Notion page</p>
                      <p className="mt-1 max-w-sm text-sm text-slate-400">
                        {project.notionDbId
                          ? 'Notion is connected. Paste your page\'s public "Share to web" link to open it here.'
                          : 'Connect Notion below, then paste your public page link.'}
                      </p>
                      <Button size="sm" className="mt-4 gap-2" onClick={() => { setEditingEmbed(true); setEmbedDraft(notionEmbedUrl) }}>
                        <Link2 size={14} /> Paste Notion link
                      </Button>
                    </div>
                  )}
                </div>
                {/* Connect Notion (compact, only if not connected) */}
                {!project.notionDbId && (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl bg-white/60 p-3 sm:flex-row">
                    <Input value={notionDbId} onChange={(e) => setNotionDbId(e.target.value)}
                      placeholder="Notion database ID" className="h-9 rounded-lg bg-white font-mono text-xs" />
                    <Button size="sm" onClick={handleConnectNotion} className="shrink-0">Connect Notion</Button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: Zoom | comms stack — splits when the right area is wide enough */}
            <div className="grid grid-cols-1 gap-5 @3xl/right:grid-cols-[minmax(0,1fr)_360px]">
              {/* Zoom */}
              <div className="flex flex-col">
                <div
                  className="relative z-10 rounded-t-[17px] rounded-b-[30px] border border-white/40 px-6 pt-5 pb-7 shadow-[0px_4px_35px_rgba(0,0,0,0.35)] backdrop-blur"
                  style={{ background: 'rgba(43,94,214,0.85)' }}
                >
                  <div className="mb-4 flex items-center gap-2.5">
                    <h2
                      className="font-lato text-2xl font-bold text-white"
                      style={{ textShadow: '0px 3px 4px rgba(0,0,0,0.4)' }}
                    >
                      Zoom Meetings
                    </h2>
                    <Video
                      size={22}
                      className="text-white"
                      fill="white"
                      style={{ filter: 'drop-shadow(0px 3px 3px rgba(0,0,0,0.45))' }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleCreateZoomMeeting} disabled={creatingMeeting}
                      className="font-lato rounded-2xl bg-white font-medium text-[#49257E] shadow-[0px_4px_10px_-3px_rgba(0,0,0,0.25)] hover:bg-white/90">
                      {creatingMeeting ? 'Starting...' : 'Start new meeting'}
                    </Button>
                    <Button size="sm" onClick={() => setSchedulingMeeting(true)}
                      className="font-lato gap-1.5 rounded-2xl bg-white font-medium text-[#49257E] shadow-[0px_4px_10px_-3px_rgba(0,0,0,0.25)] hover:bg-white/90">
                      <Calendar size={13} /> Schedule a meeting
                    </Button>
                  </div>
                </div>

                <div
                  className="relative z-0 -mt-4 flex-1 rounded-[17px] border border-white/50 p-4 pt-7 shadow-[0px_4px_20px_-1px_rgba(0,0,0,0.2)] backdrop-blur"
                  style={{ background: 'linear-gradient(339deg, rgba(83,124,221,0.9) -98%, rgba(240,240,240,0.4) 175%)' }}
                >
                  <div className="mb-4 flex gap-2">
                    <button onClick={() => setZoomTab('upcoming')}
                      className={`h-7 w-[110px] rounded-[9px] text-[13px] font-bold ${zoomTab === 'upcoming' ? 'bg-[#537DDE] text-white' : 'bg-[#B0B0B0] text-[#4A4A4A]'}`}>
                      Upcomings
                    </button>
                    <button onClick={() => setZoomTab('past')}
                      className={`h-7 w-[110px] rounded-[9px] text-[13px] font-bold ${zoomTab === 'past' ? 'bg-[#537DDE] text-white' : 'bg-[#B0B0B0] text-[#4A4A4A]'}`}>
                      Past
                    </button>
                  </div>

                  <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
                    {visibleMeetings.length === 0 ? (
                      <p className="py-8 text-center text-sm text-white/90">
                        {zoomTab === 'past' ? 'No past meetings yet' : 'No upcoming meetings'}
                      </p>
                    ) : (
                      visibleMeetings.map((meeting) => {
                        const isPast = zoomTab === 'past'
                        return (
                        <div key={meeting.id} className="relative overflow-hidden rounded-[9px]" style={{ minHeight: 96 }}>
                          <div
                            className="absolute inset-0"
                            style={{ background: isPast ? 'linear-gradient(180deg,#8E9AAE 0%,#C7CDD8 100%)' : 'linear-gradient(180deg,#527CDD 0%,#BCD0FF 100%)' }}
                          />
                          <div className="absolute bottom-0 right-0 top-0 rounded-r-[9px] bg-white" style={{ left: 9 }} />
                          <div className="relative z-10 p-4" style={{ marginLeft: 9 }}>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className={`text-base font-semibold ${isPast ? 'text-slate-600' : 'text-slate-900/80'}`}>{meeting.topic}</h3>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {isPast ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                    <History size={10} /> Ended
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <CalendarClock size={10} /> Upcoming
                                  </span>
                                )}
                                {meeting.isHost && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                    <Crown size={10} /> Host
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className={`mt-0.5 text-xs ${isPast ? 'text-slate-500' : 'text-slate-900/50'}`}>
                              {new Date(meeting.startTime || meeting.start_time || Date.now()).toLocaleString()}
                            </p>
                            {meeting.organizerTeam && (
                              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                <Users size={10} /> {TEAM_LABEL[meeting.organizerTeam] ?? meeting.organizerTeam} team
                                {meeting.allowedTeams && meeting.allowedTeams.length > 0 &&
                                  ` +${meeting.allowedTeams.length}`}
                              </span>
                            )}
                            <div className="mt-3 flex items-center justify-between">
                              <button
                                onClick={() => router.push(`/workspace/${projectId}/zoom/${meeting.id}`)}
                                className={`rounded-full border bg-white px-3 py-1 text-xs ${isPast ? 'border-slate-300 text-slate-500 hover:bg-slate-100' : 'border-[#B18BB8] text-slate-900/60 hover:bg-[#B18BB8]/10'}`}
                              >
                                {isPast ? 'View recording' : 'Open in workspace'}
                              </button>
                              {isPast ? (
                                <button
                                  onClick={() => router.push(`/workspace/${projectId}/zoom/${meeting.id}`)}
                                  title="View recording / transcript"
                                  className="rounded-lg p-1 text-slate-500 transition-opacity hover:opacity-70"
                                >
                                  <PlayCircle size={20} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    const url = meeting.joinUrl || meeting.join_url
                                    if (url) window.open(url, '_blank')
                                  }}
                                  title="Open in Zoom app"
                                  className="rounded-lg p-1 transition-opacity hover:opacity-70"
                                >
                                  <Video size={20} style={{ color: '#2D62DA' }} fill="#2D62DA" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Comms stack */}
              <div className="flex h-full flex-col gap-5">
                {/* Group Chat — grows to fill remaining height */}
                <div className="flex flex-1 flex-col rounded-[17px] border border-white/50 p-4 shadow-[0px_4px_40px_1px_rgba(0,0,0,0.15)] backdrop-blur" style={{ background: '#EFEEF0' }}>
                  <div className="mb-3 flex shrink-0 items-center justify-between">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900/70">
                      <MessageSquare size={18} /> Group Chat
                    </h3>
                    <Link href={`/workspace/${projectId}/chat`}>
                      <span className="rounded-2xl bg-[#F9F9F9] px-3 py-1 text-xs font-medium text-[#49257E] shadow-sm hover:bg-white">Enter chat</span>
                    </Link>
                  </div>
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                    {messages.length === 0 ? (
                      <p className="py-2 text-xs text-slate-400">No messages yet — start the conversation.</p>
                    ) : (
                      messages.slice(-3).map((m) => (
                        <div key={m.id} className="flex items-start gap-2.5">
                          <Avatar name={m.senderName} size={32} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{m.senderName || 'Member'}</span>
                              <span className="text-[10px] text-slate-400">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="line-clamp-2 text-xs text-slate-600">{m.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* GitHub + AI Note Taker — equal height pair */}
                <div className="flex flex-none flex-col gap-5">
                  {/* GitHub */}
                  <div
                    className="flex flex-col rounded-[17px] p-5 text-white shadow-[0px_4px_40px_1px_rgba(0,0,0,0.25)] backdrop-blur-xl"
                    style={{
                      background: 'rgba(30,30,30,0.75)',
                      border: '1.5px solid rgba(255,249,249,0.5)',
                      minHeight: 210,
                    }}
                  >
                    <div className="mb-4 flex shrink-0 items-center justify-between">
                      <h3
                        className="font-geist-mono flex items-center gap-2 font-semibold"
                        style={{ textShadow: '0px 4px 10px rgba(0,0,0,0.5)' }}
                      >
                        <Github size={18} style={{ filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.5))' }} /> GitHub
                      </h3>
                      {hasRepo && (
                        <div className="flex items-center gap-1.5">
                          <div className="flex rounded-lg border border-white/15 bg-white/5 p-0.5">
                            <button
                              onClick={() => setGithubTab('activity')}
                              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${githubTab === 'activity' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'}`}
                            >
                              Activity
                            </button>
                            <button
                              onClick={() => setGithubTab('tasks')}
                              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${githubTab === 'tasks' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'}`}
                            >
                              Tasks
                            </button>
                          </div>
                          {githubTab === 'activity' ? (
                            <Button size="sm" variant="ghost" onClick={handleGithubSync} disabled={syncingGithub}
                              className="font-geist-mono h-7 gap-1.5 font-normal text-white/70 hover:bg-white/10 hover:text-white">
                              <RefreshCw size={13} className={syncingGithub ? 'animate-spin' : ''} /> Sync
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={handleSyncTasks} disabled={syncingTasks}
                              className="font-geist-mono h-7 gap-1.5 font-normal text-white/70 hover:bg-white/10 hover:text-white">
                              <RefreshCw size={13} className={syncingTasks ? 'animate-spin' : ''} /> Sync tasks
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {!hasRepo ? (
                      <div className="flex flex-1 flex-col items-center justify-center text-center">
                        <Github size={44} className="mb-3 text-white" style={{ filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.55))' }} />
                        <p className="font-geist-mono font-semibold" style={{ textShadow: '0px 4px 10px rgba(0,0,0,0.5)' }}>
                          No Repository Linked
                        </p>
                        <div className="mt-3 flex w-full flex-col gap-2">
                          <select value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)}
                            className="font-geist-mono rounded-lg border border-white/20 bg-white/10 p-2 text-xs font-normal text-white">
                            <option value="" className="text-black">Select repository</option>
                            {repos.map((r) => <option key={r.id} value={r.full_name} className="text-black">{r.full_name}</option>)}
                          </select>
                          <Button size="sm" onClick={handleConnectRepo} className="font-geist-mono gap-1.5 font-normal">
                            <Link2 size={13} /> Link repo
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-0 flex-1 flex-col">
                        {project.repositories!.map((r) => (
                          <div key={r.id} className="mb-2 flex shrink-0 items-center gap-2">
                            <p className="font-geist-mono truncate text-xs font-normal text-green-400">✓ {r.githubOwner}/{r.githubRepo}</p>
                            <button
                              onClick={() => handleRepairWebhook(r.id)}
                              disabled={repairingRepo === r.id}
                              title="Re-create the GitHub webhook for this repo (needed if real-time sync isn't working)"
                              className="font-geist-mono ml-auto inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-normal text-white/50 hover:bg-white/10 hover:text-white/80 disabled:opacity-50"
                            >
                              <RefreshCw size={10} className={repairingRepo === r.id ? 'animate-spin' : ''} /> {t.workspace.repairWebhook}
                            </button>
                          </div>
                        ))}
                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                          {githubTab === 'activity' ? (
                            activities.length === 0 ? (
                              <p className="font-geist-mono text-xs font-normal text-white/50">No activity yet — hit Sync.</p>
                            ) : (
                              activities.slice(0, 6).map((a) => (
                                <div key={a.id} className="font-geist-mono flex items-start gap-2 text-xs font-normal text-white/75">
                                  <Link2 size={11} className="mt-0.5 shrink-0" />
                                  <span className="truncate">
                                    <span className="text-white/50">{a.type}</span> — {a.title || 'No title'}
                                  </span>
                                </div>
                              ))
                            )
                          ) : loadingBranches ? (
                            <div className="font-geist-mono flex items-center gap-2 text-xs text-white/50">
                              <Loader2 size={13} className="animate-spin" /> Loading branches…
                            </div>
                          ) : branches.length === 0 ? (
                            <p className="font-geist-mono text-xs font-normal text-white/50">No branches found.</p>
                          ) : (
                            branches.map((b) => {
                              const state = b.syncState
                                ? SYNC_STATE_STYLE[b.syncState] ?? SYNC_STATE_STYLE.LINKED
                                : null
                              return (
                                <div key={`${b.repoId}-${b.name}`} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <GitBranch size={12} className="shrink-0 text-white/50" />
                                      <span className="font-geist-mono truncate text-xs text-white/80">{b.name}</span>
                                    </div>
                                    {b.linked ? (
                                      <div className="flex shrink-0 items-center gap-1.5">
                                        {state && (
                                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${state.className}`}>
                                            {state.label}
                                          </span>
                                        )}
                                        <button
                                          onClick={() => handleUnlink(b)}
                                          title="Unlink task"
                                          className="rounded-full p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
                                        >
                                          <X size={11} />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => openLinkModal(b)}
                                        className="font-geist-mono shrink-0 rounded-full border border-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                                      >
                                        Link
                                      </button>
                                    )}
                                  </div>
                                  {b.linked && b.linkedTaskTitle && (
                                    <div className="mt-1 flex items-center gap-1.5 pl-[18px]">
                                      <Link2 size={10} className="shrink-0 text-white/30" />
                                      <span className="font-geist-mono truncate text-[10px] text-white/50">{b.linkedTaskTitle}</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Note Taker */}
                  <Link href={`/workspace/${projectId}/meeting-result-review`}
                    className="flex flex-col justify-center rounded-[17px] border border-white/50 p-5 shadow-[0px_4px_40px_1px_rgba(0,0,0,0.15)] backdrop-blur transition-transform hover:scale-[1.01]"
                    style={{ background: 'linear-gradient(256deg, rgba(231,82,96,0.35) -3%, rgba(114,189,115,0.15) 22%, rgba(23,136,255,0.3) 64%)', minHeight: 210 }}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles size={26} className="text-[#9B72CB]" />
                      <div>
                        <h3 className="text-lg font-bold text-slate-900/80">AI Note Taker</h3>
                        <p className="text-xs text-slate-600">Transcript → schema-aware Notion draft</p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs leading-relaxed text-slate-500">
                      Upload or pull a Zoom transcript, generate a schema-aware draft, then sync directly to your Notion databases.
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Schedule Meeting Modal */}
    {schedulingMeeting && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Schedule a Meeting</h3>
            <button
              onClick={() => setSchedulingMeeting(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Topic</label>
              <Input
                value={scheduleTopic}
                onChange={(e) => setScheduleTopic(e.target.value)}
                placeholder={project?.name ? `${project.name} Meeting` : 'Meeting topic'}
                className="h-11 rounded-xl"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Date &amp; Time</label>
              <Input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="h-11 rounded-xl"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Duration (minutes)</label>
              <select
                value={scheduleDuration}
                onChange={(e) => setScheduleDuration(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {[15, 30, 45, 60, 90, 120, 180].map((d) => (
                  <option key={d} value={d}>{d} min{d >= 60 ? ` (${d / 60}h)` : ''}</option>
                ))}
              </select>
            </div>

            {/* Meeting scope (ACL) */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Who can join?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleScope('project')}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    scheduleScope === 'project'
                      ? 'border-primary bg-primary/5 font-semibold text-primary'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-bold">Whole project</span>
                  <span className="text-[11px] text-slate-400">Everyone can join</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleScope('team')}
                  disabled={!myTeam}
                  title={myTeam ? undefined : 'You are not assigned to a team'}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    scheduleScope === 'team'
                      ? 'border-primary bg-primary/5 font-semibold text-primary'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-bold">My team only</span>
                  <span className="text-[11px] text-slate-400">
                    {myTeam ? `${TEAM_LABEL[myTeam]} + Board` : 'No team'}
                  </span>
                </button>
              </div>

              {/* Invite other teams (team scope only) */}
              {scheduleScope === 'team' && (
                <div className="mt-3">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Invite other teams (optional)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(TEAM_LABEL)
                      .filter((tm) => tm !== myTeam)
                      .map((tm) => {
                        const selected = scheduleInvitedTeams.includes(tm)
                        return (
                          <button
                            key={tm}
                            type="button"
                            onClick={() =>
                              setScheduleInvitedTeams((prev) =>
                                selected ? prev.filter((x) => x !== tm) : [...prev, tm],
                              )
                            }
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              selected
                                ? 'border-primary bg-primary text-white'
                                : 'border-slate-200 text-slate-500 hover:border-primary/40'
                            }`}
                          >
                            {TEAM_LABEL[tm]}
                          </button>
                        )
                      })}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Board members (PM, leads) can always join any meeting.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              onClick={handleScheduleMeeting}
              disabled={creatingMeeting || !scheduleDate}
              className="brand-gradient flex-1 rounded-full font-semibold text-white border-0"
            >
              {creatingMeeting ? <RefreshCw size={14} className="animate-spin" /> : <Calendar size={14} />}
              &nbsp;{creatingMeeting ? 'Scheduling...' : 'Schedule Meeting'}
            </Button>
            <Button variant="outline" onClick={() => setSchedulingMeeting(false)} className="rounded-full px-5">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Link Task to Branch Modal */}
    {linkBranch && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <GitBranch size={18} className="text-primary" /> Link Task to Branch
            </h3>
            <button
              onClick={() => setLinkBranch(null)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            {/* How it flows: GitHub action drives the Notion task, never the reverse */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
              When this branch&apos;s PR is merged into the target branch, Orchestra updates the
              Notion task for you — setting the property below to the chosen value. Optionally,
              it can also mark the task in-progress on the first commit. GitHub drives Notion, never the reverse.
            </div>

            {/* Branch (fixed) */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Branch</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <GitBranch size={14} className="shrink-0 text-slate-400" />
                <span className="truncate font-mono text-slate-700">{linkBranch.name}</span>
                <span className="ml-auto shrink-0 truncate text-[11px] text-slate-400">{linkBranch.repoFullName}</span>
              </div>
            </div>

            {/* Notion task */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Notion task</label>
              {notionTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">
                  No tasks synced yet. Close this and hit <span className="font-semibold">Sync tasks</span> first.
                </div>
              ) : (
                <select
                  value={linkTaskId}
                  onChange={(e) => selectTaskForLink(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select a task…</option>
                  {notionTasks.map((t) => (
                    <option key={t.notionPageId} value={t.notionPageId}>
                      {t.title}{t.status ? ` · ${t.status}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Target branch */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Target branch (merge into)</label>
              <Input
                value={linkTargetBranch}
                onChange={(e) => setLinkTargetBranch(e.target.value)}
                placeholder="main"
                className="h-11 rounded-xl font-mono"
              />
            </div>

            {/* Completion property */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Notion property to update</label>
              {!linkTaskId ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">
                  Pick a task first.
                </div>
              ) : !projectSchema ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">
                  <Loader2 size={12} className="animate-spin" /> Loading properties…
                </div>
              ) : completionProps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">
                  No status / select / checkbox property found in this database.
                </div>
              ) : (
                <select
                  value={linkCompletionProp}
                  onChange={(e) => {
                    setLinkCompletionProp(e.target.value)
                    setLinkCompletionValue('')
                    setLinkInProgressValue('')
                  }}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select a property…</option>
                  {completionProps.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Completion value */}
            {selectedProp && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Set value to (on merge)</label>
                {selectedProp.type === 'checkbox' ? (
                  <select
                    value={linkCompletionValue}
                    onChange={(e) => setLinkCompletionValue(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select…</option>
                    <option value="true">Checked (true)</option>
                    <option value="false">Unchecked (false)</option>
                  </select>
                ) : (
                  <select
                    value={linkCompletionValue}
                    onChange={(e) => setLinkCompletionValue(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select a value…</option>
                    {(selectedProp.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* In-progress value — optional, status/select only. When set, the task
                moves to this value as soon as the first commit lands on the branch. */}
            {selectedProp && selectedProp.type !== 'checkbox' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Set value to (when work starts) <span className="font-normal text-slate-400">· optional</span>
                </label>
                <select
                  value={linkInProgressValue}
                  onChange={(e) => setLinkInProgressValue(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Don&apos;t update until done</option>
                  {(selectedProp.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Applied on the first commit pushed to this branch (or now, if it already has commits).
                </p>
              </div>
            )}

            {/* Require approval — opt-in review gate before a merge completes the task */}
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <input
                type="checkbox"
                checked={linkRequireApproval}
                onChange={(e) => setLinkRequireApproval(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-xs leading-relaxed text-slate-600">
                <span className="font-medium text-slate-700">Require an approving review to complete</span>
                <br />
                Off: any merge into the target branch marks the task done. On: the PR must have an approving GitHub review first.
              </span>
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              onClick={handleSubmitLink}
              disabled={submittingLink || !linkTaskId || !linkCompletionProp}
              className="brand-gradient flex-1 rounded-full font-semibold text-white border-0"
            >
              {submittingLink ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
              &nbsp;{submittingLink ? 'Linking...' : 'Link task'}
            </Button>
            <Button variant="outline" onClick={() => setLinkBranch(null)} className="rounded-full px-5">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
