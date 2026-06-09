'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useLocale } from '@/app/context/LocaleContext'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { post } from '@/app/lib/api'
import { Logo } from '@/app/components/Logo'

export default function ResetPassword() {
  const { t } = useLocale()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = searchParams.get('token')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error(t.resetPassword.invalidToken)
      return
    }

    if (password !== confirmPassword) {
      toast.error(t.resetPassword.mismatch)
      return
    }

    if (password.length < 8) {
      toast.error(t.resetPassword.tooShort)
      return
    }

    setLoading(true)
    try {
      await post('/auth/reset-password', { token, newPassword: password })
      toast.success(t.resetPassword.success)
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.resetPassword.error)
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
            {t.resetPassword.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            {t.resetPassword.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="password" className="block mb-2 text-sm font-medium">
              {t.resetPassword.newPassword}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="h-12 rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium">
              {t.resetPassword.confirmPassword}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="h-12 rounded-xl"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="brand-gradient h-12 w-full rounded-full text-base font-semibold text-white shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] active:scale-[0.99] border-0"
          >
            {loading ? t.resetPassword.submitting : t.resetPassword.submit}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t.resetPassword.backTo}{' '}
          <Link href="/" className="font-semibold text-primary hover:underline underline-offset-4">
            {t.resetPassword.signIn}
          </Link>
        </p>
      </div>
    </div>
  )
}
