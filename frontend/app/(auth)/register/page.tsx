'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { useLocale } from '@/app/context/LocaleContext'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Logo } from '@/app/components/Logo'

export default function Register() {
  const { t } = useLocale()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error(t.register.passwordMismatch)
      return
    }
    setLoading(true)
    try {
      await register(email, password, name)
      toast.success(t.register.success)
      router.push('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.register.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[440px]">
      <div className="glass-panel ethereal-shadow rounded-3xl border border-border p-8 sm:p-10">
        <div className="flex flex-col items-center mb-8">
          <Logo height={68} className="mb-5" />
          <h1 className="text-2xl font-bold tracking-tight text-center">
            {t.register.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            {t.register.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name" className="block mb-2 text-sm font-medium">
              {t.register.name}
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.register.namePlaceholder}
              required
              className="h-12 rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="email" className="block mb-2 text-sm font-medium">
              {t.register.email}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.register.emailPlaceholder}
              required
              className="h-12 rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="password" className="block mb-2 text-sm font-medium">
              {t.register.password}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="h-12 rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium">
              {t.register.confirmPassword}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`h-12 rounded-xl ${confirmPassword && confirmPassword !== password ? 'border-destructive ring-1 ring-destructive' : ''}`}
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="mt-1.5 text-xs text-destructive">{t.register.passwordMismatch}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || (!!confirmPassword && confirmPassword !== password)}
            className="brand-gradient h-12 w-full rounded-full text-base font-semibold text-white shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] active:scale-[0.99] border-0"
          >
            {loading ? t.register.submitting : t.register.submit}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t.register.hasAccount}{' '}
          <Link href="/" className="font-semibold text-primary hover:underline underline-offset-4">
            {t.register.signIn}
          </Link>
        </p>
      </div>
    </div>
  )
}
