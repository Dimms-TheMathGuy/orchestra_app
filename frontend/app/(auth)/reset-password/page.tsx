'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { post } from '@/app/lib/api'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = searchParams.get('token')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error('Reset link is missing or invalid')
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match!")
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await post('/auth/reset-password', {
        token,
        newPassword: password,
      })
      toast.success('Password reset successfully!')
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-8 border border-border">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-center mb-2">Reset Password</h1>
        <p className="text-center text-muted-foreground">Enter your new password</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password" className="block mb-2 text-foreground">
            New Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="block mb-2 text-foreground">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            className="w-full"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>
    </div>
  )
}
