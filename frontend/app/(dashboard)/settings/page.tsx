'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Sun, Moon, Github, Fingerprint, LogOut } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import Link from 'next/link'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const [githubConnected, setGithubConnected] = useState(false)
  const { user, logout } = useAuth()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    setGithubConnected(Boolean(user?.githubUsername))

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('github') === 'connected') {
        setGithubConnected(true)
        toast.success('GitHub connected successfully!')
        router.replace('/dashboard/settings')
      }
    }
  }, [router, user?.githubUsername])

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    toast.success(`Switched to ${newTheme} mode`)
  }

  const handleGithubOAuth = () => {
    if (githubConnected) {
      setGithubConnected(false)
      toast.success('GitHub disconnected')
    } else {
      if (!user) {
        toast.error('You need to be logged in to connect GitHub')
        return
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      window.location.href = `${apiBaseUrl}/auth/github?userId=${encodeURIComponent(user.id)}`
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/')
  }

  if (!mounted) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">Manage your account and preferences</p>

        <div className="bg-card rounded-lg shadow-md border border-border divide-y divide-border">
          {/* Theme Settings */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'light' ? (
                  <Sun size={24} className="text-yellow-500" />
                ) : (
                  <Moon size={24} className="text-blue-400" />
                )}
                <div>
                  <h3 className="font-semibold">Theme</h3>
                  <p className="text-sm text-muted-foreground">Currently using {theme} mode</p>
                </div>
              </div>
              <button
                onClick={handleThemeToggle}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* GitHub OAuth */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Github size={24} className="text-foreground" />
                <div>
                  <h3 className="font-semibold">GitHub Integration</h3>
                  <p className="text-sm text-muted-foreground">
                    {githubConnected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleGithubOAuth}
                variant={githubConnected ? 'destructive' : 'default'}
              >
                {githubConnected ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
          </div>

          {/* Passkey Setup */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Fingerprint size={24} className="text-foreground" />
                <div>
                  <h3 className="font-semibold">Passkey Authentication</h3>
                  <p className="text-sm text-muted-foreground">Add biometric authentication</p>
                </div>
              </div>
              <Link href="/dashboard/passkey-setup">
                <Button variant="outline">Setup</Button>
              </Link>
            </div>
          </div>

          {/* Logout */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LogOut size={24} className="text-red-500" />
                <div>
                  <h3 className="font-semibold">Sign Out</h3>
                  <p className="text-sm text-muted-foreground">Logout from your account</p>
                </div>
              </div>
              <Button onClick={handleLogout} variant="destructive">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
