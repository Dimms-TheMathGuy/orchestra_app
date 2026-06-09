'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/app/context/LocaleContext'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { post } from '@/app/lib/api'
import { Logo } from '@/app/components/Logo'

export default function ForgotPassword() {
  const { t } = useLocale()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await post('/auth/forgot-password', { email })
      toast.success(t.forgotPassword.success)
      const resetUrl = typeof data?.resetLink === 'string' ? new URL(data.resetLink) : null
      const token = resetUrl?.searchParams.get('token')

      if (token) {
        setTimeout(() => {
          router.push(`/reset-password?token=${token}`)
        }, 1500)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.forgotPassword.error)
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
            {t.forgotPassword.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            {t.forgotPassword.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email" className="block mb-2 text-sm font-medium">
              {t.forgotPassword.email}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              className="h-12 rounded-xl"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="brand-gradient h-12 w-full rounded-full text-base font-semibold text-white shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] active:scale-[0.99] border-0"
          >
            {loading ? t.forgotPassword.submitting : t.forgotPassword.submit}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t.forgotPassword.rememberPassword}{' '}
          <Link href="/" className="font-semibold text-primary hover:underline underline-offset-4">
            {t.forgotPassword.signIn}
          </Link>
        </p>
      </div>
    </div>
  )
}
