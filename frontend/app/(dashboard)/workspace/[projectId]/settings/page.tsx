'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Settings, ChevronRight, Save, UserPlus, Trash2, Crown, FileText, Github,
  Video, CheckCircle2, AlertTriangle, RefreshCw, Archive, Unlink,
} from 'lucide-react'
import { toast } from 'sonner'
import { get, patch, post } from '@/app/lib/api'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import { useAuth } from '@/app/context/AuthContext'

interface ProjectMember {
  id: string
  role: string
  user: { id?: string; name: string; email: string; avatarUrl?: string }
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
  ownerId: string
  notionDbId?: string | null
  repositories?: { id: string; githubOwner: string; githubRepo: string }[]
  members?: ProjectMember[]
}

function initialsOf(name?: string) {
  return (name || 'U').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export default function ProjectSettings() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const projectId = params?.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [disconnectingRepo, setDisconnectingRepo] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      const data = await get(`/projects/${projectId}`)
      setProject(data)
      setName(data.name || '')
      setDescription(data.description || '')
    } catch {
      toast.error('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const isOwner = project?.ownerId === user?.id

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Project name cannot be empty')
      return
    }
    setSaving(true)
    try {
      const updated = await patch(`/projects/${projectId}`, { name, description })
      setProject(updated)
      toast.success('Project updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update project')
    } finally {
      setSaving(false)
    }
  }

  const handleAddMember = async () => {
    if (!memberEmail.trim()) return
    setAddingMember(true)
    try {
      await post(`/projects/${projectId}/members`, { email: memberEmail.trim() })
      toast.success(`${memberEmail} added`)
      setMemberEmail('')
      loadProject()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add member')
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from project?`)) return
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/projects/${projectId}/members/${memberUserId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      )
      toast.success(`${memberName} removed`)
      loadProject()
    } catch {
      toast.error('Failed to remove member')
    }
  }

  const handleComplete = async () => {
    try {
      const next = project?.status === 'completed' ? 'ongoing' : 'completed'
      await patch(`/projects/${projectId}/status`, { status: next })
      toast.success(next === 'completed' ? 'Project marked complete' : 'Project reopened')
      loadProject()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this project permanently? This cannot be undone.')) return
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      toast.success('Project deleted')
      router.push('/dashboard')
    } catch {
      toast.error('Failed to delete project')
    }
  }

  const handleDisconnectRepo = async (repoId: string, repoName: string) => {
    if (!confirm(`Disconnect ${repoName} from this project? All task-branch links will be removed.`)) return
    setDisconnectingRepo(repoId)
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/github/${projectId}/repository/${repoId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      )
      toast.success(`${repoName} disconnected`)
      loadProject()
    } catch {
      toast.error('Failed to disconnect repository')
    } finally {
      setDisconnectingRepo(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!project) return <div className="p-8">Project not found</div>

  const integrations = [
    { icon: FileText, label: 'Notion', connected: Boolean(project.notionDbId), detail: project.notionDbId ? 'Database connected' : 'Not connected' },
    { icon: Video, label: 'Zoom', connected: true, detail: 'Available in workspace' },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 lg:p-10">
      {/* Header */}
      <div>
        <nav className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <Link href={`/workspace/${projectId}`} className="hover:text-primary">{project.name}</Link>
          <ChevronRight size={12} />
          <span>Settings</span>
        </nav>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings size={20} />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Project Settings</h1>
        </div>
      </div>

      {!isOwner && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200/50 bg-amber-50 p-4 text-sm text-amber-700">
          <AlertTriangle size={16} /> You're a member of this project. Only the owner can change these settings.
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: general + members */}
        <div className="space-y-8 lg:col-span-7">
          {/* General */}
          <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h3 className="mb-6 text-lg font-bold">General</h3>
            <div className="space-y-5">
              <div>
                <Label htmlFor="name" className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Project Name
                </Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!isOwner} className="h-12 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="description" className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Description
                </Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!isOwner} rows={4} className="rounded-xl" />
              </div>
              {isOwner && (
                <Button onClick={handleSave} disabled={saving} className="brand-gradient h-11 rounded-full px-8 font-semibold text-white border-0">
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  &nbsp;{saving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </section>

          {/* Members */}
          <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold">Team Members</h3>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                {project.members?.length ?? 0} members
              </span>
            </div>

            {isOwner && (
              <div className="mb-5 flex gap-2">
                <Input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                  placeholder="Add member by email"
                  className="h-11 rounded-xl"
                />
                <Button onClick={handleAddMember} disabled={addingMember || !memberEmail.trim()} className="shrink-0 gap-1.5 rounded-xl">
                  <UserPlus size={15} /> Add
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {project.members?.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  {m.user.avatarUrl ? (
                    <img src={m.user.avatarUrl} alt={m.user.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white">
                      {initialsOf(m.user.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{m.user.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{m.user.email}</p>
                  </div>
                  {m.role === 'OWNER' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                      <Crown size={11} /> Owner
                    </span>
                  ) : (
                    <>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">Member</span>
                      {isOwner && m.user.id && (
                        <button
                          onClick={() => handleRemoveMember(m.user.id!, m.user.name)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove member"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: integrations + danger zone */}
        <div className="space-y-8 lg:col-span-5">
          {/* Integrations */}
          <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h3 className="mb-6 text-lg font-bold">Integrations</h3>
            <div className="space-y-3">
              {/* GitHub repos — each row has a disconnect button */}
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card">
                    <Github size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">GitHub</p>
                    <p className="text-xs text-muted-foreground">
                      {project.repositories?.length ? `${project.repositories.length} repo(s) connected` : 'Not connected'}
                    </p>
                  </div>
                </div>
                {(project.repositories?.length ?? 0) > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-600">
                    <CheckCircle2 size={12} /> Connected
                  </span>
                ) : (
                  <span className="rounded bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">Off</span>
                )}
              </div>

              {/* Per-repo rows with disconnect */}
              {isOwner && project.repositories?.map((repo) => (
                <div key={repo.id} className="ml-4 flex items-center justify-between rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Github size={14} className="shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">{repo.githubOwner}/{repo.githubRepo}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disconnectingRepo === repo.id}
                    onClick={() => handleDisconnectRepo(repo.id, `${repo.githubOwner}/${repo.githubRepo}`)}
                    className="shrink-0 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Unlink size={13} />
                    {disconnectingRepo === repo.id ? '...' : 'Disconnect'}
                  </Button>
                </div>
              ))}

              {integrations.map((it) => {
                const Icon = it.icon
                return (
                  <div key={it.label} className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card">
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{it.label}</p>
                        <p className="text-xs text-muted-foreground">{it.detail}</p>
                      </div>
                    </div>
                    {it.connected ? (
                      <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-600">
                        <CheckCircle2 size={12} /> Connected
                      </span>
                    ) : (
                      <span className="rounded bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">Off</span>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Connect integrations from the{' '}
              <Link href={`/workspace/${projectId}`} className="font-semibold text-primary hover:underline">workspace</Link>.
            </p>
          </section>

          {/* Danger zone */}
          {isOwner && (
            <section className="rounded-2xl border border-destructive/30 bg-card p-8 shadow-sm">
              <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-destructive">
                <AlertTriangle size={18} /> Danger Zone
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold">
                      {project.status === 'completed' ? 'Reopen project' : 'Mark as complete'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {project.status === 'completed' ? 'Move this project back to ongoing.' : 'Archive this project as completed.'}
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleComplete} className="shrink-0 gap-2">
                    {project.status === 'completed' ? <RefreshCw size={14} /> : <Archive size={14} />}
                    {project.status === 'completed' ? 'Reopen' : 'Complete'}
                  </Button>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold">Delete project</p>
                      <p className="text-xs text-muted-foreground">Permanently remove this project and all its data.</p>
                    </div>
                    <Button variant="destructive" onClick={handleDelete} className="shrink-0 gap-2">
                      <Trash2 size={14} /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
