'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import { post, get } from '@/app/lib/api'
import { Search, X, PlusCircle, FolderKanban, FileText, Github, Video, Info } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export default function AddProject() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [notionDbId, setNotionDbId] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<User[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchingUsers, setSearchingUsers] = useState(false)
  const router = useRouter()

  const searchUsers = async () => {
    const query = memberEmail.trim()
    if (query.length < 2) {
      toast.error('Type at least 2 characters of an email')
      return
    }

    setSearchingUsers(true)
    try {
      const data = await get(`/users?email=${encodeURIComponent(query)}`)
      setUsers(data.filter((user: User) => !selectedMembers.some((member) => member.id === user.id)))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to search users')
    } finally {
      setSearchingUsers(false)
    }
  }

  const addMember = (user: User) => {
    setSelectedMembers((prev) => [...prev, user])
    setUsers((prev) => prev.filter((candidate) => candidate.id !== user.id))
  }

  const removeMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((member) => member.id !== userId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await post('/projects', {
        name,
        description,
        notionDatabaseId: notionDbId,
        githubRepository: githubRepo,
        memberIds: selectedMembers.map((member) => member.id),
      })
      toast.success('Project created successfully!')
      router.push('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      {/* Heading */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <PlusCircle size={18} />
          <span className="text-xs font-bold uppercase tracking-widest">New Workspace</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Add Project</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Start by creating your project container. You can connect Notion, GitHub, and Zoom afterwards from the workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: form */}
        <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-7">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
            <div>
              <Label htmlFor="name" className="mb-2 block text-sm font-semibold">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., Q1 Infrastructure Refactor"
                className="h-12 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="description" className="mb-2 block text-sm font-semibold">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                placeholder="Describe the goals and scope of this project..."
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="notionDbId" className="mb-2 block text-sm font-semibold">
                  Notion Database ID
                </Label>
                <Input
                  id="notionDbId"
                  value={notionDbId}
                  onChange={(e) => setNotionDbId(e.target.value)}
                  placeholder="Optional — add later"
                  className="h-11 rounded-xl font-mono text-xs"
                />
              </div>
              <div>
                <Label htmlFor="githubRepo" className="mb-2 block text-sm font-semibold">
                  GitHub Repository
                </Label>
                <Input
                  id="githubRepo"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="username/repository"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <Label htmlFor="memberEmail" className="mb-2 block text-sm font-semibold">
              Team Members
            </Label>
            <div className="flex gap-2">
              <Input
                id="memberEmail"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    searchUsers()
                  }
                }}
                placeholder="Search by member email"
                className="h-11 rounded-xl"
              />
              <Button type="button" variant="outline" onClick={searchUsers} disabled={searchingUsers} className="shrink-0">
                <Search size={16} />
              </Button>
            </div>

            {users.length > 0 && (
              <div className="mt-3 space-y-2">
                {users.map((user) => (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => addMember(user)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{user.name}</div>
                      <div className="truncate text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedMembers.length > 0 && (
              <div className="mt-4 space-y-2">
                {selectedMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{member.name}</div>
                        <div className="truncate text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeMember(member.id)}>
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="brand-gradient h-12 flex-1 rounded-full font-semibold text-white shadow-lg shadow-primary/20 border-0"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard')} className="h-12 rounded-full px-6">
              Cancel
            </Button>
          </div>
        </form>

        {/* Right: live preview + integrations */}
        <div className="space-y-6 lg:col-span-5">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Live Preview</span>
            </div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderKanban size={24} />
            </div>
            <h3 className={`text-xl font-bold leading-tight ${name ? '' : 'opacity-40'}`}>
              {name || 'Project Title'}
            </h3>
            <p className={`mt-2 text-sm leading-relaxed ${description ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
              {description || 'Your project description will appear here as you type.'}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <div className="flex -space-x-2">
                {selectedMembers.slice(0, 4).map((m) => (
                  <div key={m.id} className="brand-gradient flex h-8 w-8 items-center justify-center rounded-full border-2 border-card text-[10px] font-bold text-white">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {selectedMembers.length === 0 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-muted-foreground">
                    <PlusCircle size={14} />
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedMembers.length > 0 ? `${selectedMembers.length} collaborator(s)` : 'Invite collaborators'}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-bold">Integrations</h4>
            <div className="space-y-3">
              {[
                { icon: FileText, label: 'Notion', note: notionDbId ? 'Will connect on create' : 'Connect after setup' },
                { icon: Github, label: 'GitHub', note: githubRepo ? 'Will connect on create' : 'Connect after setup' },
                { icon: Video, label: 'Zoom', note: 'Connect from workspace' },
              ].map((it) => {
                const Icon = it.icon
                return (
                  <div key={it.label} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-card text-foreground">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{it.label}</p>
                      <p className="text-[11px] text-muted-foreground">{it.note}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-primary/5 p-4 text-xs text-muted-foreground">
              <Info size={14} className="mt-0.5 shrink-0 text-primary" />
              You can skip integrations now and add them later from the project workspace.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
