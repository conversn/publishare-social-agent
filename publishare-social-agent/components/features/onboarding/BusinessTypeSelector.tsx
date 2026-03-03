'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Shield, 
  Calculator, 
  Home, 
  Scale, 
  Users,
  ChevronRight,
  CheckCircle
} from 'lucide-react'

interface BusinessType {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const businessTypes: BusinessType[] = [
  {
    id: 'financial-advisor',
    name: 'Financial Advisor',
    description: 'Investment planning, retirement strategies, and wealth management',
    icon: Building2,
    color: 'bg-blue-500'
  },
  {
    id: 'life-insurance',
    name: 'Life Insurance',
    description: 'Life insurance policies, coverage planning, and family protection',
    icon: Shield,
    color: 'bg-green-500'
  },
  {
    id: 'annuity',
    name: 'Annuity',
    description: 'Annuity products, retirement income, and guaranteed payments',
    icon: Calculator,
    color: 'bg-purple-500'
  },
  {
    id: 'mortgage',
    name: 'Mortgage',
    description: 'Home loans, refinancing, and mortgage planning',
    icon: Home,
    color: 'bg-orange-500'
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'Property investment, market analysis, and real estate planning',
    icon: Building2,
    color: 'bg-red-500'
  },
  {
    id: 'fiduciary',
    name: 'Fiduciary',
    description: 'Fiduciary services, trust management, and estate planning',
    icon: Scale,
    color: 'bg-indigo-500'
  },
  {
    id: 'other',
    name: 'Other',
    description: 'Other financial services or professional services',
    icon: Users,
    color: 'bg-gray-500'
  }
]

interface BusinessTypeSelectorProps {
  onSelect: (businessType: string) => void
  selectedType?: string
  onNext: () => void
}

export default function BusinessTypeSelector({ 
  onSelect, 
  selectedType, 
  onNext 
}: BusinessTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">What type of business are you?</h2>
        <p className="text-muted-foreground">
          This will be saved as your preference and helps us customize your experience with industry-specific templates and suggestions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businessTypes.map((type) => {
          const Icon = type.icon
          const isSelected = selectedType === type.id
          const isHovered = hoveredType === type.id

          return (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary shadow-lg' 
                  : isHovered 
                    ? 'ring-1 ring-border shadow-md' 
                    : 'hover:shadow-md'
              }`}
              onClick={() => onSelect(type.id)}
              onMouseEnter={() => setHoveredType(type.id)}
              onMouseLeave={() => setHoveredType(null)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${type.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
                <CardTitle className="text-lg">{type.name}</CardTitle>
                <CardDescription className="text-sm">
                  {type.description}
                </CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {selectedType && (
        <div className="flex justify-center pt-4">
          <Button onClick={onNext} className="px-8">
            Continue
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
