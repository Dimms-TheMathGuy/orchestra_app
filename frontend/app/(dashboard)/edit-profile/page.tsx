'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Camera, Upload } from 'lucide-react'
import { patch } from '@/app/lib/api'

export default function EditProfile() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [company, setCompany] = useState(user?.company || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setCompany(user.company || '')
      setAvatarUrl(user.avatarUrl || '')
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('You need to be logged in to update your profile')
      return
    }

    setLoading(true)
    try {
      await patch(`/users/${user.id}`, { name, company, avatarUrl })
      updateProfile({ name, company, avatarUrl })
      toast.success('Profile updated successfully!')
      router.push('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = () => {
    fileInputRef.current?.click()
  }

  const resizeAvatar = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const image = new Image()
      const reader = new FileReader()

      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Failed to read image file'))
          return
        }

        image.onload = () => {
          const size = 256
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')

          if (!context) {
            reject(new Error('Failed to prepare avatar image'))
            return
          }

          canvas.width = size
          canvas.height = size

          const sourceSize = Math.min(image.width, image.height)
          const sourceX = (image.width - sourceSize) / 2
          const sourceY = (image.height - sourceSize) / 2

          context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size)
          resolve(canvas.toDataURL('image/jpeg', 0.82))
        }

        image.onerror = () => reject(new Error('Failed to load image file'))
        image.src = reader.result
      }

      reader.onerror = () => reject(new Error('Failed to read image file'))
      reader.readAsDataURL(file)
    })

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }

    try {
      const resizedAvatar = await resizeAvatar(file)
      setAvatarUrl(resizedAvatar)
      toast.success('Avatar preview updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to read image file')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Edit Profile</h1>
        <p className="text-muted-foreground mb-8">Update your personal information</p>

        <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow-md border border-border p-6 space-y-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <img
                src={avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                alt="Profile"
                className="w-24 h-24 rounded-full border-4 border-border object-cover"
              />
              <button
                type="button"
                onClick={handleAvatarChange}
                aria-label="Upload avatar"
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/90"
              >
                <Camera size={16} />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
            <Button type="button" variant="outline" onClick={handleAvatarChange} className="mt-4">
              <Upload size={16} className="mr-2" />
              Upload Picture
            </Button>
          </div>

          <div>
            <Label htmlFor="name" className="block mb-2">
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="email" className="block mb-2">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="company" className="block mb-2">
              Company
            </Label>
            <Input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Your company or organization"
              className="w-full"
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="px-6"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
