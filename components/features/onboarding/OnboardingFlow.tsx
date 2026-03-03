'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useRouter } from 'next/navigation'
import { useAuth, useAppToast } from '@/app/providers'
import { saveOnboardingPreferences, markOnboardingCompleted } from '@/utils/onboardingUtils'
import BusinessTypeSelector from './BusinessTypeSelector'
import PersonaSelector from './PersonaSelector'
import PathwaySelector from './PathwaySelector'
import ContentMethodSelector from './ContentMethodSelector'

interface OnboardingData {
  businessType: string
  persona?: string
  pathway: string
  contentMethod?: string
}

interface OnboardingFlowProps {
  onComplete?: (data: OnboardingData) => void
  onSkip?: () => void
}

export default function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useAppToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    businessType: '',
    pathway: ''
  })
  const [isSaving, setIsSaving] = useState(false)

  const totalSteps = onboardingData.pathway === 'create-share-content' ? 4 : 3

  const handleBusinessTypeSelect = (businessType: string) => {
    setOnboardingData(prev => ({ ...prev, businessType }))
  }

  const handlePersonaSelect = (persona: string) => {
    setOnboardingData(prev => ({ ...prev, persona }))
  }

  const handlePathwaySelect = (pathway: string) => {
    setOnboardingData(prev => ({ ...prev, pathway }))
  }

  const handleContentMethodSelect = (contentMethod: string) => {
    setOnboardingData(prev => ({ ...prev, contentMethod }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePathwayNext = () => {
    if (onboardingData.pathway === 'create-share-content') {
      // If they selected "Create & Share Content", go to content method selection
      setCurrentStep(4)
    } else {
      // For other pathways, complete onboarding
      handleComplete()
    }
  }

  const handleSkip = () => {
    if (currentStep === 2) {
      // Skip persona selection
      setCurrentStep(3)
    }
  }

  const handleComplete = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      // Save user preferences (business type and persona are permanent)
      const preferencesSaved = await saveOnboardingPreferences(
        user.id,
        onboardingData.businessType,
        onboardingData.persona
      )

      if (!preferencesSaved) {
        toast({
          title: 'Error',
          description: 'Failed to save onboarding preferences',
          variant: 'destructive'
        })
      }

      // Mark onboarding as completed
      const onboardingMarked = await markOnboardingCompleted(user.id)

      if (!onboardingMarked) {
        toast({
          title: 'Error',
          description: 'Failed to mark onboarding as completed',
          variant: 'destructive'
        })
      }

      // Show success toast
      toast({
        title: 'Onboarding Completed!',
        description: `Business: ${onboardingData.businessType}, Persona: ${onboardingData.persona || 'None'}, Pathway: ${onboardingData.pathway}`,
        variant: 'success'
      })

      // Call completion callback
      onComplete?.(onboardingData)

      // Navigate based on selected pathway and content method
      switch (onboardingData.pathway) {
        case 'create-share-content':
          // Navigate based on content method
          switch (onboardingData.contentMethod) {
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
          break
        case 'create-quizzes-calculators':
          router.push('/calculator/new')
          break
        case 'create-newsletters':
          router.push('/newsletter/new')
          break
        default:
          router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
      toast({
        title: 'Error',
        description: 'Failed to complete onboarding. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BusinessTypeSelector
            onSelect={handleBusinessTypeSelect}
            selectedType={onboardingData.businessType}
            onNext={handleNext}
          />
        )
      case 2:
        return (
          <PersonaSelector
            businessType={onboardingData.businessType}
            onSelect={handlePersonaSelect}
            selectedPersona={onboardingData.persona}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        )
      case 3:
        return (
          <PathwaySelector
            businessType={onboardingData.businessType}
            persona={onboardingData.persona}
            onSelect={handlePathwaySelect}
            selectedPathway={onboardingData.pathway}
            onNext={handlePathwayNext}
          />
        )
      case 4:
        return (
          <ContentMethodSelector
            businessType={onboardingData.businessType}
            persona={onboardingData.persona}
            onSelect={handleContentMethodSelect}
            selectedMethod={onboardingData.contentMethod}
            onNext={handleComplete}
          />
        )
      default:
        return null
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Business Type'
      case 2:
        return 'Target Audience'
      case 3:
        return 'Content Pathway'
      case 4:
        return 'Content Method'
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Welcome to Publishare</h1>
            <Button variant="ghost" onClick={onSkip}>
              Skip Setup
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{getStepTitle()}</span>
            </div>
            <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
          </div>
        </div>

        {/* Main Content */}
        <Card className="p-6">
          <CardContent className="p-0">
            {renderCurrentStep()}
          </CardContent>
        </Card>

        {/* Loading State */}
        {isSaving && (
          <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">Setting up your account...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
