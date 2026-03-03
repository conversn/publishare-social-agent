'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAppToast } from '@/app/providers'
import { checkOnboardingStatus } from '@/utils/onboardingUtils'
import ContentMethodSelector from '@/components/features/onboarding/ContentMethodSelector'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ContentMethodSelectorPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { toast } = useAppToast()
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null)
  const [selectedMethod, setSelectedMethod] = useState<string>('')

  useEffect(() => {
    if (user && !loading) {
      loadOnboardingStatus()
    }
  }, [user, loading])

  const loadOnboardingStatus = async () => {
    if (!user) return

    try {
      const status = await checkOnboardingStatus(user.id)
      setOnboardingStatus(status)
    } catch (error) {
      console.error('Error loading onboarding status:', error)
    }
  }

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method)
  }

  const handleStartCreating = () => {
    if (!selectedMethod) {
      toast({
        title: 'Selection Required',
        description: 'Please select a content creation method to continue.',
        variant: 'destructive'
      })
      return
    }

    // Show success toast
    toast({
      title: 'Content Method Selected!',
      description: `Starting ${selectedMethod.replace('-', ' ')} creation...`,
      variant: 'success'
    })

    // Navigate based on content method
    switch (selectedMethod) {
      case 'custom-content':
        router.push('/cms/new')
        break
      case 'generated-content':
        router.push('/cms/new?method=ai')
        break
      case 'superagent-workflow':
        router.push('/cms/new?method=agentic')
        break
      default:
        router.push('/cms/new')
    }
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
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Content Method Selector */}
        <ContentMethodSelector
          businessType={onboardingStatus?.businessType || 'financial-advisor'}
          persona={onboardingStatus?.persona}
          onSelect={handleMethodSelect}
          selectedMethod={selectedMethod}
          onNext={handleStartCreating}
        />
      </div>
    </div>
  )
}
