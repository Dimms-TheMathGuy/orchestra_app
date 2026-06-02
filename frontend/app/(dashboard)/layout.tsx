'use client'

import { useAuth } from '@/app/context/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Sidebar } from '@/app/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isWorkspace = pathname.startsWith('/workspace/')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen">
      <Sidebar isWorkspace={isWorkspace} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
