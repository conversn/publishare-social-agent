'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAppToast } from '@/app/providers'
import { supabase } from '@/integrations/supabase/client'
import { Sparkles, Target, FileText, Users, Calendar, Tag, TrendingUp, Search, Zap, Wand2, Link, MessageSquare, BookOpen, Send, Eye, Edit3, AlertTriangle, CheckCircle, Image, Copy, ArrowDownToLine, Facebook, Twitter, Linkedin, Globe, ImageIcon, Loader2, ArrowRight, Settings, ChevronDown, ChevronUp, Brain, Cpu, Workflow } from 'lucide-react'

interface AgenticWorkflowModalProps {
  businessType?: string
  persona?: string
  onComplete: (content: any) => void
  onCancel: () => void
  isLoading?: boolean
}

const workflowTypes = [
  {
    id: 'content-strategy',
    title: 'Content Strategy',
    description: 'AI analyzes your business and creates a comprehensive content strategy',
    estimatedTime: '5-7 minutes',
    icon: Brain,
    features: ['Business analysis', 'Content calendar', 'Topic suggestions', 'SEO strategy']
  },
  {
    id: 'multi-content-generation',
    title: 'Multi-Content Generation',
    description: 'Generate multiple pieces of content from a single topic',
    estimatedTime: '8-12 minutes',
    icon: Cpu,
    features: ['Article generation', 'Social media posts', 'Email sequences', 'Landing pages']
  },
  {
    id: 'full-workflow',
    title: 'Full Agentic Workflow',
    description: 'Complete automated content creation and distribution pipeline',
    estimatedTime: '15-20 minutes',
    icon: Workflow,
    features: ['Content creation', 'SEO optimization', 'Social scheduling', 'Analytics setup']
  }
]

const contentTypes = [
  { value: 'blog-post', label: 'Blog Post', description: 'Long-form article' },
  { value: 'social-media', label: 'Social Media Post', description: 'Short-form content' },
  { value: 'newsletter', label: 'Newsletter', description: 'Email newsletter' },
  { value: 'landing-page', label: 'Landing Page', description: 'Conversion-focused page' },
  { value: 'case-study', label: 'Case Study', description: 'Success story' },
  { value: 'how-to-guide', label: 'How-To Guide', description: 'Step-by-step instructions' }
]

const toneOptions = [
  { value: 'professional', label: 'Professional', description: 'Formal and authoritative' },
  { value: 'conversational', label: 'Conversational', description: 'Friendly and approachable' },
  { value: 'educational', label: 'Educational', description: 'Clear and instructional' },
  { value: 'persuasive', label: 'Persuasive', description: 'Compelling and convincing' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and informal' }
]

export default function AgenticWorkflowModal({
  businessType,
  persona,
  onComplete,
  onCancel,
  isLoading = false
}: AgenticWorkflowModalProps) {
  const { toast } = useAppToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [formData, setFormData] = useState({
    workflowType: '',
    topic: '',
    businessContext: '',
    targetAudience: '',
    contentType: 'blog-post',
    tone: 'professional',
    goals: '',
    timeline: '1-week',
    budget: 'low',
    additionalRequirements: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Agentic workflow submitted with data:', formData)

    if (!formData.workflowType || !formData.topic) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in the workflow type and topic.',
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)

    try {
      // Get the user's session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No active session found. Please sign in again.')
      }

      console.log('📡 Making API call to agentic-content-gen Edge Function')
      console.log("📡 Request body:", JSON.stringify({
        workflowType: formData.workflowType,
        topic: formData.topic,
        businessContext: formData.businessContext,
        targetAudience: formData.targetAudience,
        contentType: formData.contentType,
        tone: formData.tone,
        goals: formData.goals,
        timeline: formData.timeline,
        budget: formData.budget,
        additionalRequirements: formData.additionalRequirements,
        businessType: businessType,
        userId: session.user.id,
        persona: persona
      }, null, 2))
      
      // Call the agentic-content-gen Edge Function
      const response = await fetch('https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/agentic-content-gen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          workflowType: formData.workflowType,
          topic: formData.topic,
          businessContext: formData.businessContext,
          targetAudience: formData.targetAudience,
          contentType: formData.contentType,
          tone: formData.tone,
          goals: formData.goals,
          timeline: formData.timeline,
          budget: formData.budget,
          additionalRequirements: formData.additionalRequirements,
          businessType: businessType,
          userId: session.user.id,
          persona: persona
        })
      })

      console.log('📡 Agentic workflow API Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📡 Agentic workflow API Response data:', data)

      // Handle the response based on workflow type
      if (data.success) {
        toast({
          title: 'Agentic Workflow Complete!',
          description: `Successfully generated ${data.contentType || 'content'} using ${formData.workflowType} workflow.`,
          variant: 'success'
        })

        // Pass the generated content back to the parent
        onComplete({
          content: data.content,
          strategy: data.strategy,
          calendar: data.calendar,
          recommendations: data.recommendations,
          workflowType: formData.workflowType
        })
      } else {
        throw new Error(data.error || 'Workflow failed to complete')
      }

    } catch (error) {
      console.error('Error in agentic workflow:', error)
      toast({
        title: 'Workflow Failed',
        description: `Failed to complete agentic workflow: ${error instanceof Error ? error.message : String(error)}. Please try again.`,
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Workflow className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agentic Content Workflow</h1>
            <p className="text-muted-foreground">
              Let AI orchestrate your entire content creation and distribution process
            </p>
          </div>
        </div>

        {(businessType || persona) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {businessType && (
              <Badge variant="secondary" className="text-sm">
                <Target className="w-3 h-3 mr-1" />
                {getBusinessTypeName(businessType)}
              </Badge>
            )}
            {persona && (
              <Badge variant="outline" className="text-sm">
                <Users className="w-3 h-3 mr-1" />
                {getPersonaName(persona)}
              </Badge>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Workflow Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Step 1: Choose Your Workflow
            </CardTitle>
            <CardDescription>
              Select the type of agentic workflow that best fits your needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {workflowTypes.map((workflow) => {
                const Icon = workflow.icon
                const isSelected = formData.workflowType === workflow.id
                
                return (
                  <div
                    key={workflow.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, workflowType: workflow.id }))}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-purple-600' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{workflow.title}</h3>
                        <p className="text-xs text-gray-600 mt-1">{workflow.description}</p>
                        <p className="text-xs text-purple-600 mt-2">{workflow.estimatedTime}</p>
                        <div className="mt-2">
                          {workflow.features.map((feature, index) => (
                            <div key={index} className="text-xs text-gray-500 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Content Brief */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Step 2: Content Brief
            </CardTitle>
            <CardDescription>
              Provide the essential information for your content strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Main Topic *
                </label>
                <Input
                  value={formData.topic}
                  onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="e.g., Retirement planning strategies for young professionals"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <Input
                  value={formData.targetAudience}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="e.g., Young professionals aged 25-35"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Context
              </label>
              <Textarea
                value={formData.businessContext}
                onChange={(e) => setFormData(prev => ({ ...prev, businessContext: e.target.value }))}
                placeholder="Describe your business, unique value proposition, and any specific requirements..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Goals
              </label>
              <Textarea
                value={formData.goals}
                onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                placeholder="What do you want to achieve with this content? (e.g., generate leads, educate clients, build authority...)"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Step 3: Configuration
            </CardTitle>
            <CardDescription>
              Fine-tune your content strategy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Type
                </label>
                <Select
                  value={formData.contentType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, contentType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tone
                </label>
                <Select
                  value={formData.tone}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {toneOptions.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeline
                </label>
                <Select
                  value={formData.timeline}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, timeline: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-week">1 Week</SelectItem>
                    <SelectItem value="2-weeks">2 Weeks</SelectItem>
                    <SelectItem value="1-month">1 Month</SelectItem>
                    <SelectItem value="3-months">3 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Requirements
              </label>
              <Textarea
                value={formData.additionalRequirements}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalRequirements: e.target.value }))}
                placeholder="Any specific requirements, compliance needs, or special instructions..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isProcessing || !formData.workflowType || !formData.topic}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Workflow...
              </>
            ) : (
              <>
                <Workflow className="w-4 h-4 mr-2" />
                Start Agentic Workflow
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
