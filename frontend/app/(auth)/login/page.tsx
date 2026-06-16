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
import { Fingerprint } from 'lucide-react'

export default function Login() {
  const { t } = useLocale()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const { login, loginWithToken } = useAuth()
  const router = useRouter()

  const handlePasskeyLogin = async () => {
    if (!('credentials' in navigator)) {
      toast.error(t.login.passkeyNotSupported)
      return
    }
    if (!email) {
      toast.error(t.login.email)
      return
    }
    setPasskeyLoading(true)
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser')

      const optRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/passkey/auth/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const options = await optRes.json()
      if (options.error) throw new Error(options.error)

      const assertion = await startAuthentication({ optionsJSON: options })

      const verRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/passkey/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, response: assertion }),
      })
      const result = await verRes.json()
      if (!result.verified) throw new Error(result.error ?? t.login.passkeyError)

      loginWithToken(result.access_token, result.user)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err?.message ?? t.login.passkeyError)
    } finally {
      setPasskeyLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.login.error)
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
            {t.login.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            {t.login.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email" className="block mb-2 text-sm font-medium">
              {t.login.email}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.login.emailPlaceholder}
              required
              className="h-12 rounded-xl"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t.login.password}
              </Label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                {t.login.forgotPassword}
              </Link>
            </div>
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

          <Button
            type="submit"
            disabled={loading}
            className="brand-gradient h-12 w-full rounded-full text-base font-semibold text-white shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] active:scale-[0.99] border-0"
          >
            {loading ? t.login.submitting : t.login.submit}
          </Button>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={passkeyLoading}
            onClick={handlePasskeyLogin}
            className="h-12 w-full rounded-full text-base font-semibold gap-2"
          >
            <Fingerprint className="h-5 w-5" />
            {passkeyLoading ? t.login.passkeyLoading : t.login.usePasskey}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t.login.noAccount}{' '}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline underline-offset-4"
          >
            {t.login.createAccount}
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground/70">
        © {new Date().getFullYear()} {t.login.footer}
      </p>
    </div>
  )
}
