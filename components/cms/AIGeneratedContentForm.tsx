'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAppToast } from '@/app/providers'
import { Sparkles, Target, FileText, Users, Calendar, Tag, TrendingUp, Search, Zap, Wand2, Link, MessageSquare, BookOpen, Send, Eye, Edit3, AlertTriangle, CheckCircle, Image, Copy, ArrowDownToLine, Facebook, Twitter, Linkedin, Globe, ImageIcon, Loader2, ArrowRight, Settings, ChevronDown, ChevronUp } from 'lucide-react'

interface AIGeneratedContentFormProps {
  businessType?: string
  persona?: string
  onGenerate: (formData: any) => void
  onCancel: () => void
  isLoading?: boolean
}

const contentTypes = [
  {
    id: 'blog-post',
    title: 'Blog Post',
    description: 'Informative article for your website',
    estimatedTime: '5-7 minutes',
    icon: FileText
  },
  {
    id: 'social-media',
    title: 'Social Media Post',
    description: 'Engaging content for social platforms',
    estimatedTime: '2-3 minutes',
    icon: MessageSquare
  },
  {
    id: 'newsletter',
    title: 'Newsletter',
    description: 'Email newsletter content',
    estimatedTime: '3-5 minutes',
    icon: Send
  },
  {
    id: 'landing-page',
    title: 'Landing Page',
    description: 'Conversion-focused page content',
    estimatedTime: '4-6 minutes',
    icon: Eye
  },
  {
    id: 'case-study',
    title: 'Case Study',
    description: 'Detailed success story',
    estimatedTime: '8-10 minutes',
    icon: BookOpen
  },
  {
    id: 'how-to-guide',
    title: 'How-To Guide',
    description: 'Step-by-step instructions',
    estimatedTime: '6-8 minutes',
    icon: Edit3
  }
]

const toneOptions = [
  { value: 'professional', label: 'Professional', description: 'Formal and authoritative' },
  { value: 'conversational', label: 'Conversational', description: 'Friendly and approachable' },
  { value: 'educational', label: 'Educational', description: 'Clear and instructional' },
  { value: 'persuasive', label: 'Persuasive', description: 'Compelling and convincing' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and informal' }
]

const lengthOptions = [
  { value: 'short', label: 'Short', description: '300-500 words' },
  { value: 'medium', label: 'Medium', description: '800-1200 words' },
  { value: 'long', label: 'Long', description: '1500-2500 words' }
]

const personaOptions = [
  { value: 'seniors', label: 'Seniors', description: 'Retirement planning and security' },
  { value: 'young-professionals', label: 'Young Professionals', description: 'Career growth and early investing' },
  { value: 'high-net-worth', label: 'High-Net-Worth Individuals', description: 'Wealth preservation and growth' },
  { value: 'families', label: 'Families', description: 'Family financial planning' },
  { value: 'small-business', label: 'Small Business Owners', description: 'Business financial management' }
]

const ctaOptions = [
  { value: 'schedule-consultation', label: 'Schedule a Consultation', description: 'Book a meeting or call' },
  { value: 'download-guide', label: 'Download Guide', description: 'Free resource download' },
  { value: 'get-quote', label: 'Get a Quote', description: 'Request pricing information' },
  { value: 'learn-more', label: 'Learn More', description: 'Additional information' },
  { value: 'contact-us', label: 'Contact Us', description: 'General inquiry' },
  { value: 'other', label: 'Other', description: 'Custom call to action' }
]

export default function AIGeneratedContentForm({
  businessType,
  persona,
  onGenerate,
  onCancel,
  isLoading = false
}: AIGeneratedContentFormProps) {
  const { toast } = useAppToast()
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    keyPoints: '',
    contentType: '',
    tone: 'professional',
    length: 'medium',
    targetAudience: persona || '',
    callToAction: '',
    customCTA: '',
    aiContext: '',
    includeSEO: true,
    includeInternalLinks: true,
    includeExamples: true,
    model: 'gpt-4'
  })
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    console.log('🎯 Form submit event triggered!')
    e.preventDefault()
    console.log('📝 AIGeneratedContentForm submitted with data:', formData)

    if (!formData.title || !formData.topic || !formData.contentType) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in the title, topic, and content type.',
        variant: 'destructive'
      })
      return
    }

    const finalFormData = {
      ...formData,
      callToAction: formData.callToAction === 'other' ? formData.customCTA : formData.callToAction,
      keywords: '',
    }

    onGenerate(finalFormData)
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
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI-Generated Content</h1>
            <p className="text-muted-foreground">
              Let AI help you create engaging content with your guidance
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Essential Information
            </CardTitle>
            <CardDescription>
              Provide the core details for your content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter a compelling title..."
                  className="text-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Main Topic *
                </label>
                <Input
                  value={formData.topic}
                  onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="e.g., Retirement planning strategies"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key Points to Cover (optional)
              </label>
              <Textarea
                value={formData.keyPoints}
                onChange={(e) => setFormData(prev => ({ ...prev, keyPoints: e.target.value }))}
                placeholder="List the main points you want the article to cover..."
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to let AI determine the key points based on your topic
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Content Type *
            </CardTitle>
            <CardDescription>
              Choose the type of content you want to create
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contentTypes.map((type) => {
                const Icon = type.icon
                const isSelected = formData.contentType === type.id
                
                return (
                  <div
                    key={type.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, contentType: type.id }))}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-purple-600' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{type.title}</h3>
                        <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                        <p className="text-xs text-purple-600 mt-2">{type.estimatedTime}</p>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Audience & Style
            </CardTitle>
            <CardDescription>
              Define your target audience and content style
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, targetAudience: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target audience" />
                  </SelectTrigger>
                  <SelectContent>
                    {personaOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call to Action
                </label>
                <Select
                  value={formData.callToAction}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, callToAction: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select call to action" />
                  </SelectTrigger>
                  <SelectContent>
                    {ctaOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.callToAction === 'other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Call to Action
                </label>
                <Input
                  value={formData.customCTA}
                  onChange={(e) => setFormData(prev => ({ ...prev, customCTA: e.target.value }))}
                  placeholder="Enter your custom call to action..."
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {toneOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Length
                </label>
                <Select
                  value={formData.length}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, length: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lengthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Advanced Options
            </CardTitle>
            <CardDescription>
              Customize AI behavior and content optimization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center gap-2 text-sm w-full justify-between"
              >
                <span>Show Advanced Options</span>
                {showAdvancedOptions ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>

            {showAdvancedOptions && (
              <div className="space-y-6 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom AI Instructions
                  </label>
                  <Textarea
                    value={formData.aiContext}
                    onChange={(e) => setFormData(prev => ({ ...prev, aiContext: e.target.value }))}
                    placeholder="Describe specific improvements you want AI to make..."
                    rows={3}
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Model
                  </label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4 (Best Quality)</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</SelectItem>
                      <SelectItem value="claude">Claude (Alternative)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Content Optimization
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="includeSEO"
                        checked={formData.includeSEO}
                        onChange={(e) => setFormData(prev => ({ ...prev, includeSEO: e.target.checked }))}
                        className="rounded"
                      />
                      <label htmlFor="includeSEO" className="text-sm font-medium text-gray-700">
                        Include SEO optimization
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="includeInternalLinks"
                        checked={formData.includeInternalLinks}
                        onChange={(e) => setFormData(prev => ({ ...prev, includeInternalLinks: e.target.checked }))}
                        className="rounded"
                      />
                      <label htmlFor="includeInternalLinks" className="text-sm font-medium text-gray-700">
                        Include internal link suggestions
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="includeExamples"
                        checked={formData.includeExamples}
                        onChange={(e) => setFormData(prev => ({ ...prev, includeExamples: e.target.checked }))}
                        className="rounded"
                      />
                      <label htmlFor="includeExamples" className="text-sm font-medium text-gray-700">
                        Include examples and case studies
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">AI-Generated Keywords</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    Keywords will be automatically generated based on your topic and content type for optimal SEO performance.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Content...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Content
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
