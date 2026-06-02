'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (error) {
      toast.error('Invalid credentials. Click "Forgot Password" to reset.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-8 border border-border">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-center mb-2">Welcome Back</h1>
        <p className="text-center text-muted-foreground">Sign in to your account</p>
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

        <div>
          <Label htmlFor="password" className="block mb-2 text-foreground">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full"
          />
        </div>

        <div className="text-right">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot Password?
          </Link>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>

      <p className="mt-6 text-center text-muted-foreground">
        Don't have an account?{' '}
        <Link href="/register" className="text-primary hover:underline font-medium">
          Register
        </Link>
      </p>
    </div>
  )
}
