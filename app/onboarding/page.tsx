'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import OnboardingFlow from '@/components/features/onboarding/OnboardingFlow'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    // If user is not authenticated, redirect to sign in
    if (!loading && !user) {
      router.push('/auth/signin')
      return
    }

    // If user has already completed onboarding, redirect to dashboard
    if (user && user.user_metadata?.onboarding_completed) {
      router.push('/dashboard')
      return
    }
  }, [user, loading, router])

  const handleOnboardingComplete = (data: any) => {
    console.log('Onboarding completed:', data)
    // The OnboardingFlow component will handle navigation
  }

  const handleSkipOnboarding = () => {
    router.push('/dashboard')
  }

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if user is not authenticated
  if (!user) {
    return null
  }

  return (
    <OnboardingFlow
      onComplete={handleOnboardingComplete}
      onSkip={handleSkipOnboarding}
    />
  )
}
