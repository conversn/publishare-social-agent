'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth, useAppToast } from '@/app/providers'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, ArrowLeft, Save, Eye, Sparkles } from 'lucide-react'
import Link from 'next/link'
import ContentEditor from '@/components/cms/ContentEditor'
import AIGeneratedContentForm from '@/components/cms/AIGeneratedContentForm'


import { checkOnboardingStatus } from '@/utils/onboardingUtils'

function NewArticlePageContent() {
  const { user } = useAuth()
  const { toast } = useAppToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingContent, setIsGeneratingContent] = useState(false)
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null)
  const [showAIGeneratedForm, setShowAIGeneratedForm] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'financial',
    status: 'draft',
    author_id: '',
    meta_title: '',
    meta_description: '',
    focus_keyword: '',
    tags: [] as string[],
    persona: '',
    og_title: '',
    og_description: '',
    og_image: '',
    twitter_title: '',
    twitter_description: '',
    twitter_image: '',
    linkedin_title: '',
    linkedin_description: '',
    linkedin_image: '',
    featured_image_url: '',
    featured_image_alt: '',
    // AEO fields
    aeo_summary: '',
    aeo_content_type: '',
    aeo_answer_first: false,
    speakable_summary: ''
  })
  const [authors, setAuthors] = useState<Array<{id: string, name: string}>>([])
  const [personas, setPersonas] = useState<Array<{id: string, name: string}>>([])
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(true)
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true)

  useEffect(() => {
    if (user) {
      loadAuthors()
      loadPersonas()
      loadOnboardingStatus()
      
      // Check if user came from AI-generated content method
      const method = searchParams.get('method')
      if (method === 'ai') {
        setShowAIGeneratedForm(true)
      }
    }
  }, [user, searchParams])

  const loadAuthors = async () => {
    if (!user) return

    try {
      setIsLoadingAuthors(true)
      const { data, error } = await supabase
        .rpc('get_user_authors', { user_uuid: user.id })

      if (error) {
        console.error('Error loading authors:', error)
      } else {
        setAuthors(data || [])
        // Set default author if available
        if (data && data.length > 0) {
          setFormData(prev => ({ ...prev, author_id: data[0].id }))
        }
      }
    } catch (error) {
      console.error('Error loading authors:', error)
    } finally {
      setIsLoadingAuthors(false)
    }
  }

  const loadPersonas = async () => {
    if (!user) return

    try {
      setIsLoadingPersonas(true)
      const { data, error } = await supabase
        .from('personas')
        .select('id, name')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error loading personas:', error)
      } else {
        setPersonas(data || [])
      }
    } catch (error) {
      console.error('Error loading personas:', error)
    } finally {
      setIsLoadingPersonas(false)
    }
  }

  const loadOnboardingStatus = async () => {
    if (!user) return

    try {
      const status = await checkOnboardingStatus(user.id)
      setOnboardingStatus(status)
    } catch (error) {
      console.error('Error loading onboarding status:', error)
    }
  }



  const handleAIGeneratedContent = async (aiFormData: any) => {
    setIsGeneratingContent(true)
    
    try {
      // Show toast notification
      toast({
        title: 'Generating Content...',
        description: 'AI is creating your content based on your specifications.',
        variant: 'default'
      })

      // Call the Supabase Edge Function
      // Get the user session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error("No active session found. Please sign in again.")
      }
      const response = await fetch('https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/ai-content-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          topic: aiFormData.topic,
          title: aiFormData.title,
          targetAudience: aiFormData.targetAudience,
          contentType: aiFormData.contentType,
          tone: aiFormData.tone,
          length: aiFormData.length,
          keyPoints: aiFormData.keyPoints,
          callToAction: aiFormData.callToAction,
          aiContext: aiFormData.aiContext
        })
      })
      
            if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const generatedContent = data.content || data
      // Update form data with generated content
      setFormData(prev => {
        return {
          ...prev,
          title: aiFormData.title,
          content: generatedContent,
          meta_title: aiFormData.title,
          meta_description: `Learn about ${aiFormData.topic} with expert insights and actionable advice.`,
          focus_keyword: aiFormData.topic,
          tags: [],
          persona: aiFormData.targetAudience
        }
      })

      // Switch to content editor
      setShowAIGeneratedForm(false)
      
      toast({
        title: 'Content Generated!',
        description: 'Your AI-generated content is ready for review and editing.',
        variant: 'success'
      })
    } catch (error) {
      console.error('Error generating content:', error)
      toast({
        title: 'Generation Failed',
        description: `Failed to generate content: ${error instanceof Error ? error.message : String(error)}. Please try again.`,
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingContent(false)
    }
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSaving(true)

    try {
      const { data, error } = await supabase
        .from('articles')
        .insert({
          title: formData.title,
          excerpt: formData.excerpt,
          content: formData.content,
          category: formData.category,
          status: formData.status,
          user_id: user.id,
          author_id: formData.author_id,
          meta_title: formData.meta_title,
          meta_description: formData.meta_description,
          focus_keyword: formData.focus_keyword,
          tags: formData.tags,
          persona: formData.persona,
          og_title: formData.og_title,
          og_description: formData.og_description,
          og_image: formData.og_image,
          twitter_title: formData.twitter_title,
          twitter_description: formData.twitter_description,
          twitter_image: formData.twitter_image,
          linkedin_title: formData.linkedin_title,
          linkedin_description: formData.linkedin_description,
          linkedin_image: formData.linkedin_image,
          featured_image_url: formData.featured_image_url || null,
          featured_image_alt: formData.featured_image_alt || null,
          // AEO fields
          aeo_summary: formData.aeo_summary || null,
          aeo_content_type: formData.aeo_content_type || null,
          aeo_answer_first: formData.aeo_answer_first || false,
          speakable_summary: formData.speakable_summary || null,
          seo_score: 0 // Initialize engagement rate as 0
        })
        .select()

      if (error) {
        console.error('Error creating article:', error)
        toast({
          title: 'Error',
          description: 'Failed to create article. Please try again.',
          variant: 'destructive'
        })
      } else {
        console.log('Article created successfully:', data)
        
        // Convert markdown to HTML using edge function
        if (data && data[0] && formData.content) {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
              const articleId = data[0].id
              const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vpysqshhafthuxvokwqj.supabase.co'
              
              const htmlResponse = await fetch(`${SUPABASE_URL}/functions/v1/markdown-to-html`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  markdown: formData.content,
                  article_id: articleId,
                  conversionType: 'enhanced',
                  styling: 'modern',
                  includeCss: false // CSS handled by frontend
                })
              })

              if (htmlResponse.ok) {
                const htmlData = await htmlResponse.json()
                if (htmlData.success && htmlData.html_body) {
                  // Update article with html_body (edge function should have saved it, but verify)
                  const { error: updateError } = await supabase
                    .from('articles')
                    .update({ html_body: htmlData.html_body })
                    .eq('id', articleId)

                  if (updateError) {
                    console.warn('Could not update article with html_body:', updateError.message)
                  } else {
                    console.log('Article html_body updated successfully')
                  }
                }
              } else {
                console.warn('HTML conversion failed, but article was created:', htmlResponse.status)
              }
            }
          } catch (htmlError) {
            // Don't fail article creation if HTML conversion fails
            console.warn('Error converting markdown to HTML:', htmlError)
          }
        }
        
        toast({
          title: 'Success',
          description: 'Article created successfully!',
          variant: 'success'
        })
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error creating article:', error)
      toast({
        title: 'Error',
        description: 'Failed to create article. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTitleChange = async (title: string) => {
    // This function is required by ContentEditor
    // Could be used for auto-saving or other title-related operations
    console.log('Title changed:', title)
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to create articles</h1>
          <Button asChild>
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Show AI-generated content form if requested
  if (showAIGeneratedForm) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AIGeneratedContentForm
          businessType={onboardingStatus?.businessType}
          persona={onboardingStatus?.persona}
          onGenerate={handleAIGeneratedContent}
          onCancel={() => {
            setShowAIGeneratedForm(false)
            router.push('/cms')
          }}
          isLoading={isGeneratingContent}
        />
      </div>
    )
  }



  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/cms">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to CMS
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Create New Article</h1>
              <p className="text-muted-foreground">
                Use the advanced content editor to create engaging, SEO-optimized content
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/cms')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? 'Creating...' : 'Create Article'}
            </Button>
          </div>
        </div>

        {/* Advanced Content Editor */}
        <ContentEditor
          formData={formData}
          setFormData={setFormData}
          onTitleChange={handleTitleChange}
          personas={personas}
          personasLoading={isLoadingPersonas}
          optimizeDrawerOpen={false}
        />
              </div>
      </div>
    )
}

export default function NewArticlePage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    }>
      <NewArticlePageContent />
    </Suspense>
  )
}
