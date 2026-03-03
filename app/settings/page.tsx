'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/app/providers'
import { checkOnboardingStatus, saveOnboardingPreferences } from '@/utils/onboardingUtils'
import BusinessTypeSelector from '@/components/features/onboarding/BusinessTypeSelector'
import PersonaSelector from '@/components/features/onboarding/PersonaSelector'
import { 
  Settings, 
  Building2, 
  Users, 
  Save, 
  CheckCircle,
  ArrowLeft 
} from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState<'view' | 'business' | 'persona'>('view')
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('')
  const [selectedPersona, setSelectedPersona] = useState<string>('')

  useEffect(() => {
    if (user) {
      loadOnboardingStatus()
    }
  }, [user])

  const loadOnboardingStatus = async () => {
    if (!user) return

    try {
      const status = await checkOnboardingStatus(user.id)
      setOnboardingStatus(status)
      setSelectedBusinessType(status.businessType || '')
      setSelectedPersona(status.persona || '')
    } catch (error) {
      console.error('Error loading onboarding status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePreferences = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      const success = await saveOnboardingPreferences(
        user.id,
        selectedBusinessType,
        selectedPersona
      )

      if (success) {
        await loadOnboardingStatus() // Reload to get updated data
        setCurrentStep('view')
        alert('Preferences saved successfully!')
      } else {
        alert('Error saving preferences. Please try again.')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Error saving preferences. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const getBusinessTypeName = (type: string) => {
    const types: Record<string, string> = {
      'financial-advisor': 'Financial Advisor',
      'life-insurance': 'Life Insurance',
      'annuity': 'Annuity',
      'mortgage': 'Mortgage',
      'real-estate': 'Real Estate',
      'fiduciary': 'Fiduciary',
      'other': 'Other'
    }
    return types[type] || type
  }

  const getPersonaName = (persona: string) => {
    const personas: Record<string, string> = {
      'seniors': 'Seniors',
      'young-professionals': 'Young Professionals',
      'high-net-worth': 'High-Net-Worth Individuals',
      'families': 'Families',
      'small-business': 'Small Business Owners'
    }
    return personas[persona] || persona
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (currentStep === 'business') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setCurrentStep('view')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
        </div>
        
        <BusinessTypeSelector
          onSelect={setSelectedBusinessType}
          selectedType={selectedBusinessType}
          onNext={() => setCurrentStep('persona')}
        />
      </div>
    )
  }

  if (currentStep === 'persona') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setCurrentStep('business')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Business Type
          </Button>
        </div>
        
        <PersonaSelector
          businessType={selectedBusinessType}
          onSelect={setSelectedPersona}
          selectedPersona={selectedPersona}
          onNext={handleSavePreferences}
          onSkip={handleSavePreferences}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and content creation settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Business Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Business Preferences
            </CardTitle>
            <CardDescription>
              Your business type and target audience preferences help us customize your experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Business Type</h4>
                <p className="text-sm text-muted-foreground">
                  {onboardingStatus?.businessType 
                    ? getBusinessTypeName(onboardingStatus.businessType)
                    : 'Not set'
                  }
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep('business')}
              >
                Update
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Target Audience</h4>
                <p className="text-sm text-muted-foreground">
                  {onboardingStatus?.persona 
                    ? getPersonaName(onboardingStatus.persona)
                    : 'Not set (optional)'
                  }
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep('persona')}
              >
                Update
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content Creation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Content Creation Settings
            </CardTitle>
            <CardDescription>
              Manage your content creation preferences and templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Content Creation Hub</h4>
                  <p className="text-sm text-muted-foreground">
                    Your dashboard shows a content creation hub for quick access to different content types
                  </p>
                </div>
                <Badge variant="secondary">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
