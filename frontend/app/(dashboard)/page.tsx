'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Calendar } from 'lucide-react'
import { get } from '@/app/lib/api'
import { Button } from '@/app/components/ui/button'
import { toast } from 'sonner'

interface Project {
  id: string
  name: string
  description: string | null
  status?: 'ongoing' | 'completed'
  owner: { name: string }
  members?: { role: string; user: { name: string } }[]
  createdAt: string
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const data = await get('/projects')
      setProjects(data)
    } catch (error) {
      toast.error('Failed to load projects')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const ongoingProjects = projects.filter((p) => p.status !== 'completed')
  const completedProjects = projects.filter((p) => p.status === 'completed')

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-muted-foreground mt-4">Loading projects...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Manage your projects and collaborations</p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No projects yet</p>
          <Link href="/dashboard/add-project">
            <Button>Create Your First Project</Button>
          </Link>
        </div>
      ) : (
        <>
          {ongoingProjects.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Ongoing Projects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ongoingProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/workspace/${project.id}`}
                    className="bg-card border border-border rounded-lg shadow-sm p-6 hover:shadow-md transition-all hover:border-primary/50"
                  >
                    <h3 className="font-bold mb-2 line-clamp-1">{project.name}</h3>
                    <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">{project.description}</p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-primary" />
                        <span>Owner: {project.owner?.name}</span>
                      </div>
                      {project.members && (
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-primary" />
                          <span>{project.members.length} members</span>
                        </div>
                      )}
                      {project.createdAt && (
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-primary" />
                          <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {completedProjects.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Completed Projects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/workspace/${project.id}`}
                    className="bg-card border border-border rounded-lg shadow-sm p-6 hover:shadow-md transition-all opacity-75 hover:opacity-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold line-clamp-1">{project.name}</h3>
                      <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded">
                        Completed
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">{project.description}</p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-primary" />
                        <span>Owner: {project.owner?.name}</span>
                      </div>
                      {project.members && (
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-primary" />
                          <span>{project.members.length} members</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
