'use client'

import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { Home, Settings, PlusCircle, User, FileText, LogOut, MessageSquare } from 'lucide-react'
import { useAuth } from '@/app/context/AuthContext'

interface SidebarProps {
  isWorkspace?: boolean
}

export function Sidebar({ isWorkspace = false }: SidebarProps) {
  const pathname = usePathname()
  const params = useParams()
  const { user, logout } = useAuth()
  const router = useRouter()

  const projectId = params?.projectId as string

  const basePath = isWorkspace ? `/workspace/${projectId}` : '/dashboard'

  const navItems = isWorkspace
    ? [
        { href: basePath, icon: Home, label: 'Workspace' },
        { href: `${basePath}/meeting-result-review`, icon: FileText, label: 'Meeting Result Review' },
        { href: `${basePath}/chat`, icon: MessageSquare, label: 'Chat' },
        { href: '/dashboard', icon: Home, label: 'Back to Dashboard' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
        { href: '/dashboard/edit-profile', icon: User, label: 'Edit Profile' },
      ]
    : [
        { href: '/dashboard', icon: Home, label: 'Dashboard' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
        { href: '/dashboard/add-project', icon: PlusCircle, label: 'Add Project' },
        { href: '/dashboard/edit-profile', icon: User, label: 'Edit Profile' },
      ]

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground min-h-screen flex flex-col border-r border-sidebar-border">
      <div className="p-6 border-b border-sidebar-border">
        <h2 className="text-xl font-bold">Orchestra</h2>
        <p className="text-sm text-sidebar-foreground/70 mt-1">{user?.name}</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

export default Sidebar
