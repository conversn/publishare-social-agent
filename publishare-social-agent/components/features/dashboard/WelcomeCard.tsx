'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText,
  Calculator,
  Mail,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle,
  Settings
} from 'lucide-react'
import Link from 'next/link'

interface WelcomeCardProps {
  businessType?: string
  persona?: string
}

export default function WelcomeCard({ businessType, persona }: WelcomeCardProps) {
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

  const contentPathways = [
    {
      id: 'create-share-content',
      title: 'Create & Share Content',
      description: 'Write articles and blog posts',
      icon: FileText,
      color: 'bg-blue-500',
      href: '/content-method-selector'
    },
    {
      id: 'create-quizzes-calculators',
      title: 'Create Quizzes & Calculators',
      description: 'Build interactive tools',
      icon: Calculator,
      color: 'bg-green-500',
      href: '/calculator/new'
    },
    {
      id: 'create-newsletters',
      title: 'Create Newsletters',
      description: 'Send newsletters to subscribers',
      icon: Mail,
      color: 'bg-purple-500',
      href: '/newsletter/new'
    }
  ]

  return (
    <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl">Content Creation Hub 🚀</CardTitle>
            <CardDescription className="text-base">
              Ready to create amazing content? Choose your path below:
            </CardDescription>
          </div>
        </div>

        {/* User Preferences Display */}
        {(businessType || persona) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {businessType && (
              <Badge variant="secondary" className="text-sm">
                {getBusinessTypeName(businessType)}
              </Badge>
            )}
            {persona && (
              <Badge variant="outline" className="text-sm">
                Target: {getPersonaName(persona)}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Content Pathways - Jumping Off Point */}
        <div>
          <h3 className="text-lg font-semibold mb-4">What would you like to create today?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Choose your content creation path:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contentPathways.map((pathway) => {
              const Icon = pathway.icon
              return (
                <Link key={pathway.id} href={pathway.href}>
                  <Card className="cursor-pointer hover:shadow-md transition-all duration-200 border-2 border-transparent hover:border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pathway.color}`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-lg">{pathway.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {pathway.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* AI Features Highlight */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">AI-Powered Content Creation</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Speed up your content creation with our AI features:
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Article Generation
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Agentic Workflow
            </Badge>
            <Badge variant="outline" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Smart Templates
            </Badge>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/cms">
              <FileText className="w-4 h-4 mr-2" />
              View All Articles
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/calculator">
              <Calculator className="w-4 h-4 mr-2" />
              View Calculators
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings">
              <Settings className="w-4 h-4 mr-2" />
              Update Preferences
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
