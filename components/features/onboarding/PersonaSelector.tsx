'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  User,
  Users,
  GraduationCap,
  Crown,
  Briefcase,
  ChevronRight,
  CheckCircle,
  SkipForward
} from 'lucide-react'

interface Persona {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const personas: Persona[] = [
  {
    id: 'seniors',
    name: 'Seniors',
    description: 'Retirement planning, estate planning, and legacy protection',
    icon: User,
    color: 'bg-blue-500'
  },
  {
    id: 'young-professionals',
    name: 'Young Professionals',
    description: 'Early career planning, debt management, and wealth building',
    icon: GraduationCap,
    color: 'bg-green-500'
  },
  {
    id: 'high-net-worth',
    name: 'High-Net-Worth Individuals',
    description: 'Wealth preservation, tax optimization, and legacy planning',
    icon: Crown,
    color: 'bg-purple-500'
  },
  {
    id: 'families',
    name: 'Families',
    description: 'Family protection, education planning, and generational wealth',
    icon: Users,
    color: 'bg-orange-500'
  },
  {
    id: 'small-business',
    name: 'Small Business Owners',
    description: 'Business succession, key person insurance, and retirement planning',
    icon: Briefcase,
    color: 'bg-red-500'
  }
]

interface PersonaSelectorProps {
  businessType: string
  onSelect: (persona: string) => void
  selectedPersona?: string
  onNext: () => void
  onSkip: () => void
}

export default function PersonaSelector({ 
  businessType,
  onSelect, 
  selectedPersona, 
  onNext,
  onSkip
}: PersonaSelectorProps) {
  const [hoveredPersona, setHoveredPersona] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Who is your target audience?</h2>
        <p className="text-muted-foreground">
          This will be saved as your preference and helps us suggest content topics and messaging that resonates with your ideal clients.
        </p>
        <Badge variant="secondary" className="mt-2">
          Optional - You can skip this step
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {personas.map((persona) => {
          const Icon = persona.icon
          const isSelected = selectedPersona === persona.id
          const isHovered = hoveredPersona === persona.id

          return (
            <Card
              key={persona.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary shadow-lg' 
                  : isHovered 
                    ? 'ring-1 ring-border shadow-md' 
                    : 'hover:shadow-md'
              }`}
              onClick={() => onSelect(persona.id)}
              onMouseEnter={() => setHoveredPersona(persona.id)}
              onMouseLeave={() => setHoveredPersona(null)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${persona.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
                <CardTitle className="text-lg">{persona.name}</CardTitle>
                <CardDescription className="text-sm">
                  {persona.description}
                </CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline" onClick={onSkip} className="px-6">
          <SkipForward className="w-4 h-4 mr-2" />
          Skip for now
        </Button>
        
        {selectedPersona && (
          <Button onClick={onNext} className="px-8">
            Continue
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
