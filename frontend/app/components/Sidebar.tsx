'use client'

import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Home,
  Settings,
  PlusCircle,
  User,
  FileText,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
} from 'lucide-react'
import { useAuth } from '@/app/context/AuthContext'
import { Logo, LogoMark } from '@/app/components/Logo'

interface SidebarProps {
  isWorkspace?: boolean
}

export function Sidebar({ isWorkspace = false }: SidebarProps) {
  const pathname = usePathname()
  const params = useParams()
  const { user, logout } = useAuth()
  const router = useRouter()

  const [collapsed, setCollapsed] = useState(false)

  // Persist collapse preference across navigation/reloads
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  const projectId = params?.projectId as string
  const basePath = isWorkspace ? `/workspace/${projectId}` : '/dashboard'

  const navItems = isWorkspace
    ? [
        { href: basePath, icon: Home, label: 'Workspace' },
        { href: `${basePath}/meeting-result-review`, icon: FileText, label: 'Meeting Review' },
        { href: `${basePath}/chat`, icon: MessageSquare, label: 'Chat' },
        { href: `${basePath}/settings`, icon: Settings, label: 'Project Settings' },
        { href: '/dashboard/edit-profile', icon: User, label: 'Edit Profile' },
      ]
    : [
        { href: '/dashboard', icon: Home, label: 'Dashboard' },
        { href: '/dashboard/add-project', icon: PlusCircle, label: 'Add Project' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
        { href: '/dashboard/edit-profile', icon: User, label: 'Edit Profile' },
      ]

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } shrink-0 bg-sidebar text-sidebar-foreground h-screen flex flex-col border-r border-sidebar-border transition-[width] duration-300 ease-in-out`}
    >
      {/* Brand + collapse toggle */}
      <div className={`flex items-center gap-2 px-4 h-16 border-b border-sidebar-border ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {collapsed ? (
          /* Logo mark doubles as the expand trigger on hover */
          <button
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="group relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-sidebar-accent"
          >
            <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-150 group-hover:opacity-0">
              <LogoMark size={36} />
            </span>
            <PanelLeftOpen size={18} className="absolute opacity-0 transition-opacity duration-150 group-hover:opacity-100 text-sidebar-foreground" />
          </button>
        ) : (
          <>
            <Logo height={44} />
            <button
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="p-1.5 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <PanelLeftClose size={18} />
            </button>
          </>
        )}
      </div>

      {/* Back to Dashboard — separated from project nav */}
      {isWorkspace && (
        <div className="px-3 pt-4">
          <Link
            href="/dashboard"
            title={collapsed ? 'Back to Dashboard' : undefined}
            className={`flex items-center gap-3 rounded-xl border border-sidebar-border px-3 py-2.5 text-sidebar-foreground/80 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <ArrowLeft size={18} className="shrink-0" />
            {!collapsed && <span className="text-sm font-semibold">Back to Dashboard</span>}
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === basePath || item.href === '/dashboard'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span className="text-sm truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div
          className={`flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-2.5 ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? user?.name : undefined}
        >
          <div className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name || 'User'}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">{user?.email}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sidebar-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
