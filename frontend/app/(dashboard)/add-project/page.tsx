'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import { post, get } from '@/app/lib/api'
import { Search, X } from 'lucide-react'

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
    <div className="p-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Add New Project</h1>
        <p className="text-muted-foreground mb-8">Create a new project to start collaborating</p>

        <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow-md border border-border p-6 space-y-6">
          <div>
            <Label htmlFor="name" className="block mb-2">
              Project Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="E.g., Mobile App Redesign"
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="description" className="block mb-2">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Describe your project..."
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="notionDbId" className="block mb-2">
              Notion Database ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="notionDbId"
              type="text"
              value={notionDbId}
              onChange={(e) => setNotionDbId(e.target.value)}
              required
              placeholder="paste-your-notion-database-id-here"
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="githubRepo" className="block mb-2">
              GitHub Repository (Optional)
            </Label>
            <Input
              id="githubRepo"
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="username/repository"
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="memberEmail" className="block mb-2">
              Team Members
            </Label>
            <div className="flex gap-2">
              <Input
                id="memberEmail"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="Search by member email"
                className="w-full"
              />
              <Button type="button" variant="outline" onClick={searchUsers} disabled={searchingUsers}>
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
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted"
                  >
                    {user.avatarUrl && (
                      <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                    )}
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedMembers.length > 0 && (
              <div className="mt-4 space-y-2">
                {selectedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeMember(member.id)}>
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="px-6"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
