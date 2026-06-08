'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { post } from '@/app/lib/api'
import { Logo } from '@/app/components/Logo'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await post('/auth/forgot-password', { email })
      toast.success('Password reset link sent to your email!')
      const resetUrl = typeof data?.resetLink === 'string' ? new URL(data.resetLink) : null
      const token = resetUrl?.searchParams.get('token')

      if (token) {
        setTimeout(() => {
          router.push(`/reset-password?token=${token}`)
        }, 1500)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[440px]">
      <div className="glass-panel ethereal-shadow rounded-3xl border border-border p-8 sm:p-10">
        <div className="flex flex-col items-center mb-8">
          <Logo height={44} className="mb-5" />
          <h1 className="text-2xl font-bold tracking-tight text-center">
            Forgot password?
          </h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email" className="block mb-2 text-sm font-medium">
              Email address
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
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link href="/" className="font-semibold text-primary hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
