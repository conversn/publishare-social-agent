'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText,
  Calculator,
  Mail,
  ChevronRight,
  CheckCircle,
  Sparkles,
  Zap
} from 'lucide-react'

interface ContentPathway {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  userIntent: string
  contentTypes: string[]
}

const contentPathways: ContentPathway[] = [
  {
    id: 'create-share-content',
    title: 'Create & Share Content',
    description: 'Write articles and blog posts to build your audience',
    icon: FileText,
    color: 'bg-blue-500',
    userIntent: 'I want to create content that gets shared and discovered',
    contentTypes: ['article']
  },
  {
    id: 'create-quizzes-calculators',
    title: 'Create Quizzes & Calculators',
    description: 'Build interactive tools that capture leads',
    icon: Calculator,
    color: 'bg-green-500',
    userIntent: 'I want to generate leads with interactive content',
    contentTypes: ['quiz', 'calculator']
  },
  {
    id: 'create-newsletters',
    title: 'Create Newsletters',
    description: 'Send newsletters to nurture your subscribers',
    icon: Mail,
    color: 'bg-purple-500',
    userIntent: 'I want to keep my audience engaged with regular updates',
    contentTypes: ['newsletter']
  }
]

interface PathwaySelectorProps {
  businessType: string
  persona?: string
  onSelect: (pathway: string) => void
  selectedPathway?: string
  onNext: () => void
}

export default function PathwaySelector({ 
  businessType,
  persona,
  onSelect, 
  selectedPathway, 
  onNext 
}: PathwaySelectorProps) {
  const [hoveredPathway, setHoveredPathway] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">What would you like to create first?</h2>
        <p className="text-muted-foreground">
          Choose your first content type to get started. You can always create different types later from your dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contentPathways.map((pathway) => {
          const Icon = pathway.icon
          const isSelected = selectedPathway === pathway.id
          const isHovered = hoveredPathway === pathway.id

          return (
            <Card
              key={pathway.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary shadow-lg' 
                  : isHovered 
                    ? 'ring-1 ring-border shadow-md' 
                    : 'hover:shadow-md'
              }`}
              onClick={() => onSelect(pathway.id)}
              onMouseEnter={() => setHoveredPathway(pathway.id)}
              onMouseLeave={() => setHoveredPathway(null)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${pathway.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
                <CardTitle className="text-xl">{pathway.title}</CardTitle>
                <CardDescription className="text-sm">
                  {pathway.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground italic">
                    "{pathway.userIntent}"
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {pathway.contentTypes.map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedPathway && (
        <div className="flex justify-center pt-4">
          <Button onClick={onNext} className="px-8">
            Start Creating
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Quick access to existing AI features */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <div className="text-center space-y-2">
          <h3 className="text-sm font-medium">Quick Access</h3>
          <p className="text-xs text-muted-foreground">
            You can also access AI-powered content generation from the main dashboard
          </p>
          <div className="flex justify-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Article Generation
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Agentic Workflow
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
