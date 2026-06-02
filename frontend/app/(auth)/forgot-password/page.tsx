'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { post } from '@/app/lib/api'

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
    <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-8 border border-border">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-center mb-2">Forgot Password</h1>
        <p className="text-center text-muted-foreground">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="block mb-2 text-foreground">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>

      <p className="mt-6 text-center text-muted-foreground">
        Remember your password?{' '}
        <Link href="/" className="text-primary hover:underline font-medium">
          Login
        </Link>
      </p>
    </div>
  )
}
