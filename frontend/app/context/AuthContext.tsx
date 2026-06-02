'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  company?: string
  githubUsername?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  updateProfile: (updates: Partial<User>) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (savedToken && savedUser && savedUser !== 'undefined') {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Invalid user data in localStorage', error)

        localStorage.removeItem('user')
        localStorage.removeItem('token')
      }
    }
    
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      let errorMessage = 'Login failed'
      
      if (!res.ok) {
        try {
          const contentType = res.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            const error = await res.json()
            errorMessage = error.message || `HTTP ${res.status}: Login failed`
          } else {
            errorMessage = `HTTP ${res.status}: Backend error. Please ensure backend is running on http://localhost:3000`
          }
        } catch (e) {
          errorMessage = `HTTP ${res.status}: Backend error. Response was not JSON.`
        }
        throw new Error(errorMessage)
      }

      const data = await res.json()
      
      setToken(data.access_token)
      setUser(data.user)
      
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('userId', data.user.id)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const register = async (email: string, password: string, name: string) => {
    try {
      const res = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })

      let errorMessage = 'Registration failed'
      
      if (!res.ok) {
        try {
          const contentType = res.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            const error = await res.json()
            errorMessage = error.message || `HTTP ${res.status}: Registration failed`
          } else {
            errorMessage = `HTTP ${res.status}: Backend error. Please ensure backend is running on http://localhost:3000`
          }
        } catch (e) {
          errorMessage = `HTTP ${res.status}: Backend error. Response was not JSON.`
        }
        throw new Error(errorMessage)
      }

      const data = await res.json()
      
      setToken(data.access_token)
      setUser(data.user)
      
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('userId', data.user.id)
    } catch (error) {
      console.error('Register error:', error)
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userId')
  }

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updates }
      setUser(updated)
      localStorage.setItem('user', JSON.stringify(updated))
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
