'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Edit3,
  Sparkles,
  Zap,
  ChevronRight,
  CheckCircle,
  Clock,
  Target,
  FileText
} from 'lucide-react'

interface ContentMethod {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  timeEstimate: string
  bestFor: string
  features: string[]
}

const contentMethods: ContentMethod[] = [
  {
    id: 'custom-content',
    title: 'Custom Content',
    description: 'Write your content from scratch with full control',
    icon: Edit3,
    color: 'bg-blue-500',
    timeEstimate: '30-60 minutes',
    bestFor: 'Unique ideas, personal touch, complete control',
    features: ['Full creative control', 'Personal voice', 'Unique perspectives', 'SEO optimization tools']
  },
  {
    id: 'generated-content',
    title: 'AI-Generated Content',
    description: 'Let AI help you create content with your guidance',
    icon: Sparkles,
    color: 'bg-purple-500',
    timeEstimate: '10-20 minutes',
    bestFor: 'Quick content, topic ideas, first drafts',
    features: ['AI-powered writing', 'Topic suggestions', 'SEO optimization', 'Quick turnaround']
  },
  {
    id: 'superagent-workflow',
    title: 'SuperAgent Workflow',
    description: 'Automated content creation with strategic planning',
    icon: Zap,
    color: 'bg-green-500',
    timeEstimate: '5-10 minutes',
    bestFor: 'Strategic content, automated planning, batch creation',
    features: ['Strategic planning', 'Automated research', 'Content calendar', 'Performance tracking']
  }
]

interface ContentMethodSelectorProps {
  businessType: string
  persona?: string
  onSelect: (method: string) => void
  selectedMethod?: string
  onNext: () => void
}

export default function ContentMethodSelector({ 
  businessType,
  persona,
  onSelect, 
  selectedMethod, 
  onNext 
}: ContentMethodSelectorProps) {
  const [hoveredMethod, setHoveredMethod] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">How would you like to create your content?</h2>
        <p className="text-muted-foreground">
          Choose the method that best fits your workflow and time constraints.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contentMethods.map((method) => {
          const Icon = method.icon
          const isSelected = selectedMethod === method.id
          const isHovered = hoveredMethod === method.id

          return (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary shadow-lg' 
                  : isHovered 
                    ? 'ring-1 ring-border shadow-md' 
                    : 'hover:shadow-md'
              }`}
              onClick={() => onSelect(method.id)}
              onMouseEnter={() => setHoveredMethod(method.id)}
              onMouseLeave={() => setHoveredMethod(null)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${method.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
                <CardTitle className="text-xl">{method.title}</CardTitle>
                <CardDescription className="text-sm">
                  {method.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Time Estimate */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{method.timeEstimate}</span>
                  </div>

                  {/* Best For */}
                  <div className="flex items-start gap-2 text-sm">
                    <Target className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <span className="font-medium">Best for:</span>
                      <p className="text-muted-foreground">{method.bestFor}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Features:</p>
                    <ul className="space-y-1">
                      {method.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedMethod && (
        <div className="flex justify-center pt-4">
          <Button onClick={onNext} className="px-8">
            Start Creating
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Context Info */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <div className="text-center space-y-2">
          <h3 className="text-sm font-medium">Your Context</h3>
          <div className="flex justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              {businessType}
            </Badge>
            {persona && (
              <Badge variant="outline" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                {persona}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Your business type and target audience will help customize the content creation experience.
          </p>
        </div>
      </div>
    </div>
  )
}
