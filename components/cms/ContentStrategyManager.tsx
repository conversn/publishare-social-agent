'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useAppToast } from '@/app/providers'

interface ContentStrategy {
  id: string
  target_date: string | null
  content_title: string | null
  content_type: string | null
  category: string | null
  priority_level: 'Critical' | 'High' | 'Medium' | 'Low' | null
  status: 'Planned' | 'In Progress' | 'Completed' | 'Failed' | null
  target_audience: string | null
  primary_keyword: string | null
  search_volume: number | null
  competition: string | null
  funnel_stage: string | null
  content_pillar: string | null
  lead_magnet: string | null
  call_to_action: string | null
  word_count: number | null
  created_at: string
  updated_at: string
  last_generation_attempt: string | null
}

export default function ContentStrategyManager() {
  const { toast } = useAppToast()
  const [isLoading, setIsLoading] = useState(true)
  const [strategies, setStrategies] = useState<ContentStrategy[]>([])
  const [processingStrategy, setProcessingStrategy] = useState<string | null>(null)

  useEffect(() => {
    loadContentStrategies()
  }, [])

  const loadContentStrategies = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('content_strategy')
        .select('*')
        .order('priority_level', { ascending: false })
        .order('target_date', { ascending: true })

      if (error) throw error
      setStrategies((data || []) as ContentStrategy[])
    } catch (error) {
      console.error('Error loading content strategies:', error)
      toast({
        title: 'Error',
        description: 'Failed to load content strategies',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const triggerAgenticWorkflow = async (strategyId: string) => {
    setProcessingStrategy(strategyId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No active session found. Please sign in again.')
      }

      toast({
        title: 'Starting Workflow',
        description: 'Initiating agentic content generation...',
        variant: 'default'
      })

      const response = await fetch('https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/agentic-content-gen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          strategyId: strategyId, 
          action: 'process-strategy' 
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Edge Function error: ${response.status} - ${errorData}`)
      }

      const result = await response.json()
      
      toast({
        title: 'Workflow Started',
        description: 'Agentic content generation has been initiated successfully',
        variant: 'success'
      })

      // Refresh the strategies to show updated status
      await loadContentStrategies()

    } catch (error) {
      console.error('Error triggering agentic workflow:', error)
      toast({
        title: 'Workflow Error',
        description: error instanceof Error ? error.message : 'Failed to start workflow',
        variant: 'destructive'
      })
    } finally {
      setProcessingStrategy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Strategy Manager</h1>
        <p className="text-muted-foreground">
          Manage your content strategy and trigger AI-powered content generation
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Content Strategies</h2>
          <Button variant="outline" onClick={loadContentStrategies} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Loading content strategies...</p>
            </CardContent>
          </Card>
        ) : strategies.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No content strategies found</p>
              <p className="text-sm text-gray-400 mb-4">Content strategies can be added directly to the database</p>
              <div className="text-xs text-gray-400 space-y-1">
                <p>To add a content strategy, insert into the <code>content_strategy</code> table:</p>
                <p>• content_title: "Your article title"</p>
                <p>• category: "Retirement", "Annuities", etc.</p>
                <p>• priority_level: "Critical", "High", "Medium", "Low"</p>
                <p>• status: "Planned"</p>
                <p>• target_audience: "Your target audience"</p>
                <p>• primary_keyword: "Main SEO keyword"</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {strategies.map((strategy) => (
              <Card key={strategy.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{strategy.content_title || 'Untitled'}</h3>
                        <Badge className="bg-gray-100 text-gray-800">
                          {strategy.status || 'Planned'}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800">
                          {strategy.priority_level || 'Medium'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Category: {strategy.category || 'General'} • 
                        Audience: {strategy.target_audience || 'General'} • 
                        Keyword: {strategy.primary_keyword || 'None'}
                      </p>
                      {strategy.target_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Target Date: {new Date(strategy.target_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex gap-2">
                      {strategy.status === 'Planned' && (
                        <Button 
                          size="sm" 
                          onClick={() => triggerAgenticWorkflow(strategy.id)}
                          disabled={processingStrategy === strategy.id}
                        >
                          {processingStrategy === strategy.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                              Starting...
                            </>
                          ) : (
                            'Start Workflow'
                          )}
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
