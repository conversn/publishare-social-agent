'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppToast } from '@/app/providers'
import OnboardingFlow from '@/components/features/onboarding/OnboardingFlow'
import BusinessTypeSelector from '@/components/features/onboarding/BusinessTypeSelector'
import PersonaSelector from '@/components/features/onboarding/PersonaSelector'
import PathwaySelector from '@/components/features/onboarding/PathwaySelector'
import ContentMethodSelector from '@/components/features/onboarding/ContentMethodSelector'

export default function TestOnboardingPage() {
  const { toast } = useAppToast()
  const [testMode, setTestMode] = useState<'flow' | 'business' | 'persona' | 'pathway' | 'content-method'>('flow')
  const [onboardingData, setOnboardingData] = useState<any>({})

  const handleOnboardingComplete = (data: any) => {
    console.log('Onboarding completed:', data)
    setOnboardingData(data)
    toast({
      title: 'Onboarding Completed!',
      description: `Business: ${data.businessType}, Persona: ${data.persona || 'None'}, Pathway: ${data.pathway}`,
      variant: 'success'
    })
  }

  const handleSkip = () => {
    toast({
      title: 'Onboarding Skipped',
      description: 'You can complete onboarding later from your dashboard.',
      variant: 'default'
    })
  }

  const renderTestComponent = () => {
    switch (testMode) {
      case 'flow':
        return (
          <OnboardingFlow
            onComplete={handleOnboardingComplete}
            onSkip={handleSkip}
          />
        )
      case 'business':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <BusinessTypeSelector
              onSelect={(type) => console.log('Selected business type:', type)}
              selectedType={onboardingData.businessType}
              onNext={() => setTestMode('persona')}
            />
          </div>
        )
      case 'persona':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <PersonaSelector
              businessType={onboardingData.businessType || 'financial-advisor'}
              onSelect={(persona) => console.log('Selected persona:', persona)}
              selectedPersona={onboardingData.persona}
              onNext={() => setTestMode('pathway')}
              onSkip={() => setTestMode('pathway')}
            />
          </div>
        )
              case 'pathway':
          return (
            <div className="max-w-4xl mx-auto p-6">
              <PathwaySelector
                businessType={onboardingData.businessType || 'financial-advisor'}
                persona={onboardingData.persona}
                onSelect={(pathway) => console.log('Selected pathway:', pathway)}
                selectedPathway={onboardingData.pathway}
                onNext={() => toast({
                  title: 'Pathway Selected!',
                  description: 'Pathway selection completed successfully.',
                  variant: 'success'
                })}
              />
            </div>
          )
        case 'content-method':
          return (
            <div className="max-w-4xl mx-auto p-6">
              <ContentMethodSelector
                businessType={onboardingData.businessType || 'financial-advisor'}
                persona={onboardingData.persona}
                onSelect={(method) => console.log('Selected content method:', method)}
                selectedMethod={onboardingData.contentMethod}
                onNext={() => toast({
                  title: 'Content Method Selected!',
                  description: 'Content method selection completed successfully.',
                  variant: 'success'
                })}
              />
            </div>
          )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Test Controls */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Test Controls</CardTitle>
            <CardDescription>
              Test individual components or the complete flow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={testMode === 'flow' ? 'default' : 'outline'}
                onClick={() => setTestMode('flow')}
              >
                Complete Flow
              </Button>
              <Button 
                variant={testMode === 'business' ? 'default' : 'outline'}
                onClick={() => setTestMode('business')}
              >
                Business Type Only
              </Button>
              <Button 
                variant={testMode === 'persona' ? 'default' : 'outline'}
                onClick={() => setTestMode('persona')}
              >
                Persona Only
              </Button>
              <Button 
                variant={testMode === 'pathway' ? 'default' : 'outline'}
                onClick={() => setTestMode('pathway')}
              >
                Pathway Only
              </Button>
              <Button 
                variant={testMode === 'content-method' ? 'default' : 'outline'}
                onClick={() => setTestMode('content-method')}
              >
                Content Method Only
              </Button>
            </div>

            {Object.keys(onboardingData).length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Onboarding Data:</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(onboardingData).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <Badge variant="outline">{key}:</Badge>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Component */}
      {renderTestComponent()}
    </div>
  )
}
