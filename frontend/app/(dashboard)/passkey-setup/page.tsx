'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { startRegistration } from '@simplewebauthn/browser'
import { Fingerprint, Smartphone, Shield, Check } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { post } from '@/app/lib/api'
import { useAuth } from '@/app/context/AuthContext'

type Step = 'intro' | 'creating' | 'success'

export default function PasskeySetup() {
  const [step, setStep] = useState<Step>('intro')
  const router = useRouter()
  const { user } = useAuth()

  const handleCreatePasskey = async () => {
    setStep('creating')

    try {
      if (!user) {
        throw new Error('You need to be logged in to create a passkey')
      }

      const options = await post('/passkey/register/options', { userId: user.id })
      if (options.error) {
        throw new Error(options.error)
      }

      const response = await startRegistration({ optionsJSON: options })
      const result = await post('/passkey/register/verify', {
        userId: user.id,
        response,
      })

      if (!result.verified) {
        throw new Error(result.error || 'Passkey verification failed')
      }

      setStep('success')
      toast.success('Passkey created successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create passkey')
      setStep('intro')
    }
  }

  const handleComplete = () => {
    router.push('/dashboard/settings')
  }

  return (
    <div className="p-8 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-2xl">
        {step === 'intro' && (
          <div className="bg-card rounded-lg shadow-lg border border-border p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Fingerprint className="text-primary" size={32} />
              </div>
            </div>

            <h1 className="text-center text-3xl font-bold mb-4">Setup Passkey Authentication</h1>
            <p className="text-center text-muted-foreground mb-8">
              Enhance your account security with device passkey authentication. Use your fingerprint,
              face ID, or device PIN to login securely.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-4 bg-secondary/50 rounded-lg">
                <Shield className="text-primary flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold mb-1">Enhanced Security</h3>
                  <p className="text-sm text-muted-foreground">
                    Passkeys are more secure than passwords and cannot be phished or stolen.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-secondary/50 rounded-lg">
                <Smartphone className="text-primary flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold mb-1">Device-Based Authentication</h3>
                  <p className="text-sm text-muted-foreground">
                    Your passkey is stored securely on your device and never leaves it.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-secondary/50 rounded-lg">
                <Check className="text-primary flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold mb-1">Quick & Convenient</h3>
                  <p className="text-sm text-muted-foreground">
                    Login instantly with your fingerprint or face ID - no password needed.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Button onClick={handleCreatePasskey} className="w-full">
                Create Passkey
              </Button>
              <Button onClick={() => router.push('/dashboard/settings')} variant="outline" className="w-full">
                Maybe Later
              </Button>
            </div>
          </div>
        )}

        {step === 'creating' && (
          <div className="bg-card rounded-lg shadow-lg border border-border p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                <Fingerprint className="text-primary" size={32} />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-4">Creating Your Passkey</h2>
            <p className="text-muted-foreground mb-8">
              Please use your device's biometric sensor or PIN to authenticate...
            </p>

            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-card rounded-lg shadow-lg border border-border p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <Check className="text-green-600 dark:text-green-400" size={32} />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-4">Passkey Created Successfully!</h2>
            <p className="text-muted-foreground mb-8">
              Your device passkey has been registered. You can now use it to login securely.
            </p>

            <div className="bg-secondary/50 rounded-lg p-4 mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Device Name</span>
                <span className="text-sm font-medium">
                  {typeof navigator !== 'undefined'
                    ? navigator.userAgent.includes('Mac')
                      ? 'MacBook Pro'
                      : navigator.userAgent.includes('Windows')
                        ? 'Windows PC'
                        : 'Device'
                    : 'Device'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Created</span>
                <span className="text-sm font-medium">{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <Button onClick={handleComplete} className="w-full">
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
