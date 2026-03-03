'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useAppToast } from '@/app/providers'
import { supabase } from '@/integrations/supabase/client'
import { Share2, Calendar, Target, TrendingUp, Loader2, CheckCircle, AlertCircle, Clock, Users, BarChart3, Send, Settings, Globe, Facebook, Twitter, Linkedin, Instagram, Youtube, Copy, Tag } from 'lucide-react'

interface PromotionManagerProps {
  content: {
    title: string
    content: string
    excerpt?: string
    featured_image?: string
    category?: string
    tags?: string[]
  }
  onClose: () => void
}

const platforms = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
  { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'text-blue-400' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-600' }
]

const promotionTypes = [
  { value: 'social-media', label: 'Social Media Posts', description: 'Optimized posts for each platform' },
  { value: 'email-newsletter', label: 'Email Newsletter', description: 'Newsletter content and subject lines' },
  { value: 'content-calendar', label: 'Content Calendar', description: 'Scheduling recommendations' },
  { value: 'seo-optimization', label: 'SEO Optimization', description: 'Search engine optimization tips' },
  { value: 'paid-advertising', label: 'Paid Advertising', description: 'Ad copy and targeting suggestions' }
]

const targetAudiences = [
  { value: 'general', label: 'General Audience', description: 'Broad appeal content' },
  { value: 'professionals', label: 'Professionals', description: 'Business and career-focused' },
  { value: 'investors', label: 'Investors', description: 'Financial and investment content' },
  { value: 'families', label: 'Families', description: 'Family-oriented content' },
  { value: 'seniors', label: 'Seniors', description: 'Retirement and senior-focused' }
]

export default function PromotionManager({
  content,
  onClose
}: PromotionManagerProps) {
  const { toast } = useAppToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [promotionResults, setPromotionResults] = useState<any>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'twitter', 'linkedin'])
  const [formData, setFormData] = useState({
    promotionType: 'social-media',
    targetAudience: 'general',
    budget: 'low',
    timeline: '1-week',
    customMessage: '',
    includeHashtags: true,
    includeCallToAction: true
  })

  const generatePromotion = async () => {
    if (selectedPlatforms.length === 0) {
      toast({
        title: 'No Platforms Selected',
        description: 'Please select at least one platform for promotion.',
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)

    try {
      // Get the user's session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No active session found. Please sign in again.')
      }

      console.log('🎯 Calling promotion-manager Edge Function')
      
      const response = await fetch('https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/promotion-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: content,
          platforms: selectedPlatforms,
          promotionType: formData.promotionType,
          targetAudience: formData.targetAudience,
          budget: formData.budget,
          timeline: formData.timeline,
          customMessage: formData.customMessage,
          includeHashtags: formData.includeHashtags,
          includeCallToAction: formData.includeCallToAction
        })
      })

      console.log('📡 Promotion Manager API Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📡 Promotion Manager API Response data:', data)

      if (data.promotionPlan) {
        setPromotionResults(data)
        
        toast({
          title: 'Promotion Plan Generated!',
          description: `Successfully created ${formData.promotionType} promotion plan.`,
          variant: 'success'
        })
      } else {
        throw new Error('No promotion plan returned')
      }

    } catch (error) {
      console.error('Error generating promotion plan:', error)
      toast({
        title: 'Generation Failed',
        description: `Failed to generate promotion plan: ${error instanceof Error ? error.message : String(error)}. Please try again.`,
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copied!',
        description: `${type} copied to clipboard.`,
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Share2 className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Promotion Manager</h1>
            <p className="text-muted-foreground">
              Create and manage content promotion strategies
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Promotion Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Promotion Settings
            </CardTitle>
            <CardDescription>
              Configure your promotion strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Platforms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Platforms
              </label>
              <div className="grid grid-cols-2 gap-3">
                {platforms.map((platform) => {
                  const Icon = platform.icon
                  return (
                    <div
                      key={platform.id}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPlatforms.includes(platform.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => togglePlatform(platform.id)}
                    >
                      <Checkbox
                        checked={selectedPlatforms.includes(platform.id)}
                        onChange={() => togglePlatform(platform.id)}
                      />
                      <Icon className={`w-5 h-5 ${platform.color}`} />
                      <span className="text-sm font-medium">{platform.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Promotion Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Promotion Type
              </label>
              <Select
                value={formData.promotionType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, promotionType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {promotionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <Select
                value={formData.targetAudience}
                onValueChange={(value) => setFormData(prev => ({ ...prev, targetAudience: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targetAudiences.map((audience) => (
                    <SelectItem key={audience.value} value={audience.value}>
                      <div>
                        <div className="font-medium">{audience.label}</div>
                        <div className="text-xs text-gray-500">{audience.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Message (Optional)
              </label>
              <Textarea
                value={formData.customMessage}
                onChange={(e) => setFormData(prev => ({ ...prev, customMessage: e.target.value }))}
                placeholder="Add a custom message to include in your promotions..."
                rows={3}
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hashtags"
                  checked={formData.includeHashtags}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeHashtags: !!checked }))}
                />
                <label htmlFor="hashtags" className="text-sm font-medium">
                  Include relevant hashtags
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cta"
                  checked={formData.includeCallToAction}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeCallToAction: !!checked }))}
                />
                <label htmlFor="cta" className="text-sm font-medium">
                  Include call-to-action
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={generatePromotion}
                disabled={isGenerating || selectedPlatforms.length === 0}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Generate Promotion Plan
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Promotion Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Promotion Plan
            </CardTitle>
            <CardDescription>
              Your generated promotion strategy
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!promotionResults ? (
              <div className="text-center py-8 text-gray-500">
                <Share2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No promotion plan generated yet</p>
                <p className="text-sm">Configure settings and generate your plan</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Platform Posts */}
                {promotionResults.platformPosts && Object.keys(promotionResults.platformPosts).map((platform) => (
                  <div key={platform} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {(() => {
                        const platformInfo = platforms.find(p => p.id === platform)
                        if (platformInfo) {
                          const Icon = platformInfo.icon
                          return <Icon className={`w-5 h-5 ${platformInfo.color}`} />
                        }
                        return <Globe className="w-5 h-5" />
                      })()}
                      <h3 className="font-medium capitalize">{platform}</h3>
                    </div>
                    <div className="space-y-3">
                      {promotionResults.platformPosts[platform].map((post: any, index: number) => (
                        <div key={index} className="bg-gray-50 rounded p-3">
                          <p className="text-sm text-gray-700 mb-2">{post.content}</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(post.content, `${platform} post`)}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                            {post.hashtags && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(post.hashtags.join(' '), 'hashtags')}
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                Copy Hashtags
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Content Calendar */}
                {promotionResults.contentCalendar && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5" />
                      <h3 className="font-medium">Content Calendar</h3>
                    </div>
                    <div className="space-y-2">
                      {promotionResults.contentCalendar.map((item: any, index: number) => (
                        <div key={index} className="flex items-center gap-3 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{item.date}</span>
                          <span className="text-gray-600">{item.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analytics Insights */}
                {promotionResults.analytics && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-5 h-5" />
                      <h3 className="font-medium">Analytics Insights</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      {promotionResults.analytics.map((insight: any, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
