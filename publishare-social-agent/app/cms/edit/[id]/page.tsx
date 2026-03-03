'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Save,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/app/providers'
import { supabase } from '@/integrations/supabase/client'
import ContentEditor from '@/components/cms/ContentEditor'

interface Article {
  id: string
  title: string
  content: string
  excerpt: string
  status: 'draft' | 'published' | 'archived' | 'scheduled' | 'pending' | 'private'
  meta_title?: string
  meta_description?: string
  focus_keyword?: string
  author_id?: string
  created_at: string
  updated_at: string
  category?: string
  tags?: string[]
  persona?: string
  og_title?: string
  og_description?: string
  og_image?: string
  twitter_title?: string
  twitter_description?: string
  twitter_image?: string
  linkedin_title?: string
  linkedin_description?: string
  linkedin_image?: string
  featured_image_url?: string
  featured_image_alt?: string
  // AEO fields
  aeo_summary?: string
  aeo_content_type?: string
  aeo_answer_first?: boolean
  speakable_summary?: string
}

interface Author {
  id: string
  name: string
  email: string
}

export default function EditArticlePage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [article, setArticle] = useState<Article | null>(null)
  const [authors, setAuthors] = useState<Author[]>([])
  const [personas, setPersonas] = useState<Array<{id: string, name: string}>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(true)
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'financial',
    status: 'draft' as const,
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

  const articleId = params.id as string

  const loadArticle = useCallback(async () => {
    if (!user || !articleId) return
    
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Article not found')
        } else {
          setError('Error loading article: ' + error.message)
        }
        return
      }

      if (!data) {
        setError('Article not found')
        return
      }

      // Cast the database response to our Article type and handle null values
      const articleData: Article = {
        id: data.id,
        title: data.title || '',
        content: data.content || '',
        excerpt: data.excerpt || '',
        status: (data.status as Article['status']) || 'draft',
        author_id: data.author_id || '',
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        focus_keyword: data.focus_keyword || '',
        category: data.category || 'financial',
        tags: data.tags || [],
        persona: data.persona || '',
        og_title: data.og_title || '',
        og_description: data.og_description || '',
        og_image: data.og_image || '',
        twitter_title: data.twitter_title || '',
        twitter_description: data.twitter_description || '',
        twitter_image: data.twitter_image || '',
        linkedin_title: (data as any).linkedin_title || '',
        linkedin_description: (data as any).linkedin_description || '',
        linkedin_image: (data as any).linkedin_image || '',
        featured_image_url: (data as any).featured_image_url || '',
        featured_image_alt: (data as any).featured_image_alt || '',
        // AEO fields
        aeo_summary: (data as any).aeo_summary || '',
        aeo_content_type: (data as any).aeo_content_type || '',
        aeo_answer_first: (data as any).aeo_answer_first || false,
        speakable_summary: (data as any).speakable_summary || ''
      }

      setArticle(articleData)
      setFormData({
        title: articleData.title || '',
        content: articleData.content || '',
        excerpt: articleData.excerpt || '',
        category: articleData.category || 'financial',
        status: (articleData.status as any) || 'draft',
        author_id: articleData.author_id || '',
        meta_title: articleData.meta_title || '',
        meta_description: articleData.meta_description || '',
        focus_keyword: articleData.focus_keyword || '',
        tags: articleData.tags || [],
        persona: articleData.persona || '',
        og_title: articleData.og_title || '',
        og_description: articleData.og_description || '',
        og_image: articleData.og_image || '',
        twitter_title: articleData.twitter_title || '',
        twitter_description: articleData.twitter_description || '',
        twitter_image: articleData.twitter_image || '',
        linkedin_title: articleData.linkedin_title || '',
        linkedin_description: articleData.linkedin_description || '',
        linkedin_image: articleData.linkedin_image || '',
        featured_image_url: articleData.featured_image_url || '',
        featured_image_alt: articleData.featured_image_alt || '',
        // AEO fields
        aeo_summary: articleData.aeo_summary || '',
        aeo_content_type: articleData.aeo_content_type || '',
        aeo_answer_first: articleData.aeo_answer_first || false,
        speakable_summary: articleData.speakable_summary || ''
      })
    } catch (error) {
      console.error('Error loading article:', error)
      setError('Error loading article')
    } finally {
      setIsLoading(false)
    }
  }, [user, articleId])

  const loadAuthors = useCallback(async () => {
    if (!user) return

    try {
      setIsLoadingAuthors(true)
      const { data, error } = await supabase
        .rpc('get_user_authors', { user_uuid: user.id })

      if (error) {
        console.error('Error loading authors:', error)
      } else {
        setAuthors(data || [])
      }
    } catch (error) {
      console.error('Error loading authors:', error)
    } finally {
      setIsLoadingAuthors(false)
    }
  }, [user])

  const loadPersonas = useCallback(async () => {
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
  }, [user])

  useEffect(() => {
    if (user && !loading && articleId) {
      loadArticle()
      loadAuthors()
      loadPersonas()
    }
  }, [user, loading, articleId, loadArticle, loadAuthors, loadPersonas])

  const handleSave = async () => {
    if (!article) return

    try {
      setIsSaving(true)
      setError(null)

      const { error } = await supabase
        .from('articles')
        .update({
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt,
          category: formData.category,
          status: formData.status,
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
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId)
        .eq('user_id', user!.id)

      if (error) {
        setError('Error saving article: ' + error.message)
        return
      }

      // Convert markdown to HTML using edge function if content changed
      if (formData.content && formData.content !== article.content) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
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
              console.warn('HTML conversion failed:', htmlResponse.status)
            }
          }
        } catch (htmlError) {
          // Don't fail article save if HTML conversion fails
          console.warn('Error converting markdown to HTML:', htmlError)
        }
      }

      // Update local state
      setArticle(prev => prev ? { ...prev, ...formData } : null)
      
      // Show success message (you could add a toast here)
      alert('Article saved successfully!')
    } catch (error) {
      console.error('Error saving article:', error)
      setError('Error saving article')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!article) return

    try {
      setIsSaving(true)
      setError(null)

      const { error } = await supabase
        .from('articles')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId)
        .eq('user_id', user!.id)

      if (error) {
        setError('Error publishing article: ' + error.message)
        return
      }

      // Update local state
      setArticle(prev => prev ? { ...prev, status: 'published' } : null)
      
      alert('Article published successfully!')
    } catch (error) {
      console.error('Error publishing article:', error)
      setError('Error publishing article')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!article) return

    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId)
        .eq('user_id', user!.id)

      if (error) {
        setError('Error deleting article: ' + error.message)
        return
      }

      alert('Article deleted successfully!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Error deleting article:', error)
      setError('Error deleting article')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreview = () => {
    // For now, just show the content in a modal or new tab
    // In a real app, you'd want a proper preview system
    const previewWindow = window.open('', '_blank')
    if (previewWindow) {
      previewWindow.document.write(`
        <html>
          <head>
            <title>${formData.title} - Preview</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              h1 { color: #333; }
              .meta { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .content { line-height: 1.6; }
            </style>
          </head>
          <body>
            <h1>${formData.title}</h1>
            <div class="meta">
              <p><strong>Status:</strong> ${formData.status}</p>
              <p><strong>Excerpt:</strong> ${formData.excerpt}</p>
              ${formData.meta_title ? `<p><strong>Meta Title:</strong> ${formData.meta_title}</p>` : ''}
              ${formData.meta_description ? `<p><strong>Meta Description:</strong> ${formData.meta_description}</p>` : ''}
              ${formData.focus_keyword ? `<p><strong>Focus Keyword:</strong> ${formData.focus_keyword}</p>` : ''}
            </div>
            <div class="content">
              ${formData.content}
            </div>
          </body>
        </html>
      `)
      previewWindow.document.close()
    }
  }

  if (loading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading article...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to edit articles</h1>
          <Button asChild>
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Article not found</h1>
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Article</h1>
            <p className="text-muted-foreground">
              Update your article content and settings
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Article Info */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
            {article.status}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Created: {new Date(article.created_at).toLocaleDateString()}
          </span>
          {article.updated_at !== article.created_at && (
            <span className="text-sm text-muted-foreground">
              Updated: {new Date(article.updated_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Advanced Content Editor */}
      <ContentEditor
        formData={formData}
        setFormData={setFormData}
        onTitleChange={async (title: string) => {
          setFormData(prev => ({ ...prev, title }));
        }}
        personas={personas}
        personasLoading={isLoadingPersonas}
        optimizeDrawerOpen={true}
      />
    </div>
  )
}
