'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { useLocale } from '@/app/context/LocaleContext'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Camera, Github, CheckCircle2, ShieldCheck, FolderKanban, Users, Fingerprint } from 'lucide-react'
import { patch, get } from '@/app/lib/api'

export default function EditProfile() {
  const { user, updateProfile } = useAuth()
  const { t } = useLocale()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [company, setCompany] = useState(user?.company || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ owned: 0, memberships: 0 })
  const [hasPasskey, setHasPasskey] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
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
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/passkey/status/${user.id}`)
      .then((r) => r.json())
      .then((d) => setHasPasskey(d.hasPasskey ?? false))
      .catch(() => {})
  }, [user])

  const handleAddPasskey = async () => {
    if (!user) return
    setPasskeyLoading(true)
    try {
      const { startRegistration } = await import('@simplewebauthn/browser')

      const optRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/passkey/register/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const options = await optRes.json()
      if (options.error) throw new Error(options.error)

      const attResp = await startRegistration({ optionsJSON: options })

      const verRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/passkey/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, response: attResp }),
      })
      const result = await verRes.json()
      if (!result.verified) throw new Error(t.editProfile.passkeyRegisterError)

      setHasPasskey(true)
      toast.success(t.editProfile.passkeyRegistered)
    } catch (err: any) {
      toast.error(err?.message ?? t.editProfile.passkeyRegisterError)
    } finally {
      setPasskeyLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error(t.editProfile.notLoggedIn)
      return
    }

    setLoading(true)
    try {
      await patch(`/users/${user.id}`, { name, company, avatarUrl })
      updateProfile({ name, company, avatarUrl })
      toast.success(t.editProfile.success)
      router.push('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.editProfile.error)
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
      toast.error(t.editProfile.chooseImage)
      return
    }

    try {
      const resizedAvatar = await resizeAvatar(file)
      setAvatarUrl(resizedAvatar)
      toast.success(t.editProfile.avatarUpdated)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.editProfile.failedImage)
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
            <h1 className="text-2xl font-extrabold tracking-tight">{name || t.editProfile.yourName}</h1>
            <p className="mt-1 text-muted-foreground">{email}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              {company && (
                <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {company}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                <ShieldCheck size={12} /> {t.editProfile.verified}
              </span>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
        {/* Personal info form */}
        <form onSubmit={handleSubmit} className="flex flex-col lg:col-span-7">
          <section className="flex-1 rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h3 className="mb-6 text-lg font-bold">{t.editProfile.title}</h3>
            <div className="space-y-5">
              <div>
                <Label htmlFor="name" className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t.editProfile.fullName}
                </Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-12 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="email" className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t.editProfile.emailAddress}
                </Label>
                <Input id="email" type="email" value={email} disabled className="h-12 rounded-xl opacity-70" />
              </div>
              <div>
                <Label htmlFor="company" className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t.editProfile.company}
                </Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={t.editProfile.companyPlaceholder}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="brand-gradient h-11 rounded-full px-8 font-semibold text-white shadow-lg shadow-primary/20 border-0"
                >
                  {loading ? t.editProfile.submitting : t.editProfile.submit}
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.push('/dashboard')} className="rounded-full px-6">
                  {t.editProfile.cancel}
                </Button>
              </div>
            </div>
          </section>
        </form>

        {/* Connected accounts */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h3 className="mb-6 text-lg font-bold">{t.editProfile.connectedAccounts}</h3>
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card">
                  <Github size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold">GitHub</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.githubUsername ? `@${user.githubUsername}` : t.editProfile.notConnected}
                  </p>
                </div>
              </div>
              {user?.githubUsername ? (
                <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-600">
                  <CheckCircle2 size={12} /> {t.editProfile.connected}
                </span>
              ) : (
                <Link href="/dashboard/settings" className="text-xs font-bold text-primary hover:underline">
                  {t.editProfile.connect}
                </Link>
              )}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t.editProfile.manageIntegrations}{' '}
              <Link href="/dashboard/settings" className="font-semibold text-primary hover:underline">
                Settings
              </Link>
              .
            </p>
          </section>

          {/* Security */}
          <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h3 className="mb-6 text-lg font-bold">{t.editProfile.security}</h3>
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card">
                  <Fingerprint size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold">Passkey</p>
                  <p className="text-xs text-muted-foreground">
                    {hasPasskey ? t.editProfile.hasPasskey : t.editProfile.notConnected}
                  </p>
                </div>
              </div>
              {hasPasskey ? (
                <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-600">
                  <CheckCircle2 size={12} /> {t.editProfile.connected}
                </span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddPasskey}
                  disabled={passkeyLoading}
                  className="rounded-lg text-xs gap-1"
                >
                  <Fingerprint size={13} />
                  {passkeyLoading ? '...' : t.editProfile.addPasskey}
                </Button>
              )}
            </div>
          </section>

          {/* Workspace Summary */}
          <section className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="brand-blob right-[-15%] top-[-40%] h-40 w-40 bg-primary/10" />
            <h3 className="mb-6 text-lg font-bold">{t.editProfile.workspaceSummary}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                  <FolderKanban size={14} />
                </div>
                <p className="text-3xl font-extrabold text-primary">{stats.owned}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t.editProfile.projectsOwned}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                  <Users size={14} />
                </div>
                <p className="text-3xl font-extrabold text-primary">{stats.memberships}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t.editProfile.memberships}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
