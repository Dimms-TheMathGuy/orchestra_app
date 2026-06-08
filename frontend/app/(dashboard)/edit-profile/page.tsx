'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Camera, Github, CheckCircle2, ShieldCheck, FolderKanban, Users, Share2 } from 'lucide-react'
import { patch, get } from '@/app/lib/api'

export default function EditProfile() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [company, setCompany] = useState(user?.company || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ owned: 0, memberships: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setCompany(user.company || '')
      setAvatarUrl(user.avatarUrl || '')
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    get('/projects')
      .then((projects) => {
        if (!Array.isArray(projects)) return
        const owned = projects.filter((p) => p.ownerId === user.id).length
        setStats({ owned, memberships: projects.length })
      })
      .catch(() => {})
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('You need to be logged in to update your profile')
      return
    }

    setLoading(true)
    try {
      await patch(`/users/${user.id}`, { name, company, avatarUrl })
      updateProfile({ name, company, avatarUrl })
      toast.success('Profile updated successfully!')
      router.push('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = () => fileInputRef.current?.click()

  const resizeAvatar = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const image = new Image()
      const reader = new FileReader()

      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Failed to read image file'))
          return
        }

        image.onload = () => {
          const size = 256
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')

          if (!context) {
            reject(new Error('Failed to prepare avatar image'))
            return
          }

          canvas.width = size
          canvas.height = size

          const sourceSize = Math.min(image.width, image.height)
          const sourceX = (image.width - sourceSize) / 2
          const sourceY = (image.height - sourceSize) / 2

          context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size)
          resolve(canvas.toDataURL('image/jpeg', 0.82))
        }

        image.onerror = () => reject(new Error('Failed to load image file'))
        image.src = reader.result
      }

      reader.onerror = () => reject(new Error('Failed to read image file'))
      reader.readAsDataURL(file)
    })

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }

    try {
      const resizedAvatar = await resizeAvatar(file)
      setAvatarUrl(resizedAvatar)
      toast.success('Avatar preview updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to read image file')
    } finally {
      event.target.value = ''
    }
  }

  const initials = (name || 'U').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 lg:p-10">
      {/* Profile header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="brand-blob right-[-10%] top-[-60%] h-48 w-48 bg-primary/10" />
        <div className="relative flex flex-col items-center gap-6 md:flex-row">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="h-28 w-28 rounded-2xl object-cover ring-4 ring-muted"
              />
            ) : (
              <div className="brand-gradient flex h-28 w-28 items-center justify-center rounded-2xl text-3xl font-extrabold text-white ring-4 ring-muted">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={handleAvatarChange}
              aria-label="Change avatar"
              className="absolute -bottom-2 -right-2 rounded-xl border border-border bg-card p-2 shadow-md transition-colors hover:bg-muted"
            >
              <Camera size={16} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
          </div>

          <div className="text-center md:text-left">
            <h1 className="text-2xl font-extrabold tracking-tight">{name || 'Your Name'}</h1>
            <p className="mt-1 text-muted-foreground">{email}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              {company && (
                <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {company}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                <ShieldCheck size={12} /> Verified
              </span>
            </div>
          </div>

          <div className="md:ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(email)
                toast.success('Email copied to clipboard')
              }}
              className="gap-2 rounded-lg"
            >
              <Share2 size={15} /> Share Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Personal info form */}
        <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-7">
          <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h3 className="mb-6 text-lg font-bold">Personal Information</h3>
            <div className="space-y-5">
              <div>
                <Label htmlFor="name" className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-12 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="email" className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </Label>
                <Input id="email" type="email" value={email} disabled className="h-12 rounded-xl opacity-70" />
              </div>
              <div>
                <Label htmlFor="company" className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Company
                </Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Your company or organization"
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="brand-gradient h-11 rounded-full px-8 font-semibold text-white shadow-lg shadow-primary/20 border-0"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.push('/dashboard')} className="rounded-full px-6">
                  Cancel
                </Button>
              </div>
            </div>
          </section>
        </form>

        {/* Connected accounts */}
        <div className="space-y-6 lg:col-span-5">
          <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h3 className="mb-6 text-lg font-bold">Connected Accounts</h3>
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card">
                  <Github size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold">GitHub</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.githubUsername ? `@${user.githubUsername}` : 'Not connected'}
                  </p>
                </div>
              </div>
              {user?.githubUsername ? (
                <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-600">
                  <CheckCircle2 size={12} /> Connected
                </span>
              ) : (
                <Link href="/dashboard/settings" className="text-xs font-bold text-primary hover:underline">
                  Connect
                </Link>
              )}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Manage integrations and security from{' '}
              <Link href="/dashboard/settings" className="font-semibold text-primary hover:underline">
                Settings
              </Link>
              .
            </p>
          </section>

          {/* Workspace Summary */}
          <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="brand-blob right-[-15%] top-[-40%] h-40 w-40 bg-primary/10" />
            <h3 className="mb-6 text-lg font-bold">Workspace Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                  <FolderKanban size={14} />
                </div>
                <p className="text-3xl font-extrabold text-primary">{stats.owned}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Projects Owned</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                  <Users size={14} />
                </div>
                <p className="text-3xl font-extrabold text-primary">{stats.memberships}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Memberships</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
