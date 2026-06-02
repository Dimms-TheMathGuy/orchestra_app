'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(email, password, name)
      toast.success('Account created! Redirecting to dashboard...')
      router.push('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-8 border border-border">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-center mb-2">Create Account</h1>
        <p className="text-center text-muted-foreground">Join Orchestra today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name" className="block mb-2 text-foreground">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            className="w-full"
          />
        </div>

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

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating Account...' : 'Register'}
        </Button>
      </form>

      <p className="mt-6 text-center text-muted-foreground">
        Already have an account?{' '}
        <Link href="/" className="text-primary hover:underline font-medium">
          Login
        </Link>
      </p>
    </div>
  )
}
