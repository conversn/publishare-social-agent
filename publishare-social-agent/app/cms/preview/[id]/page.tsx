'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Edit,
  Eye,
  Loader2,
  AlertCircle,
  Calendar,
  User,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/app/providers'
import { supabase } from '@/integrations/supabase/client'
import { Label } from '@/components/ui/label'

interface Article {
  id: string
  title: string
  content: string
  html_body?: string
  excerpt: string
  status: 'draft' | 'published' | 'archived' | 'scheduled' | 'pending' | 'private'
  meta_title?: string
  meta_description?: string
  focus_keyword?: string
  author_id?: string
  created_at: string
  updated_at: string
  featured_image_url?: string
  featured_image_alt?: string
}

interface Author {
  id: string
  name: string
  email: string
}

export default function PreviewArticlePage() {
  const params = useParams()
  const { user, loading } = useAuth()
  const [article, setArticle] = useState<Article | null>(null)
  const [author, setAuthor] = useState<Author | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const articleId = params.id as string

  useEffect(() => {
    if (user && !loading && articleId) {
      loadArticle()
    }
  }, [user, loading, articleId])

  const loadArticle = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .eq('user_id', user!.id)
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

      setArticle(data as any)

      // Load author information if available
      if (data.author_id) {
        const { data: authorData, error: authorError } = await supabase
          .from('authors')
          .select('id, name, email')
          .eq('id', data.author_id)
          .single()

        if (!authorError && authorData) {
          setAuthor(authorData as any)
        }
      }
    } catch (error) {
      console.error('Error loading article:', error)
      setError('Error loading article')
    } finally {
      setIsLoading(false)
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
          <h1 className="text-2xl font-bold mb-4">Please sign in to preview articles</h1>
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
            <h1 className="text-3xl font-bold tracking-tight">Article Preview</h1>
            <p className="text-muted-foreground">
              Preview your article as it will appear to readers
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/cms/edit/${article.id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Article
            </Link>
          </Button>
        </div>
      </div>

      {/* Article Meta Info */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
            {article.status}
          </Badge>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Created: {new Date(article.created_at).toLocaleDateString()}</span>
          </div>
          {article.updated_at !== article.created_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Updated: {new Date(article.updated_at).toLocaleDateString()}</span>
            </div>
          )}
          {author && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>By: {author.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Article Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-8">
              {/* Featured Image */}
              {article.featured_image_url && (
                <div className="mb-8">
                  <img
                    src={article.featured_image_url}
                    alt={article.featured_image_alt || article.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}

              {/* Title */}
              <h1 className="text-4xl font-bold mb-4">{article.title}</h1>

              {/* Excerpt */}
              {article.excerpt && (
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  {article.excerpt}
                </p>
              )}

              {/* Content */}
              {article.html_body ? (
                // html_body already includes <div class="prose"> wrapper, so render it directly
                <div 
                  className="text-gray-800 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: article.html_body }}
                  style={{
                    fontSize: '18px',
                    lineHeight: '1.8',
                  }}
                />
              ) : (
                // Fallback to markdown content with prose wrapper
                <div className="prose prose-lg max-w-none">
                  <div 
                    className="whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SEO Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                SEO Preview
              </CardTitle>
              <CardDescription>
                How your article appears in search results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Meta Title</Label>
                <p className="text-sm text-blue-600 mt-1">
                  {article.meta_title || article.title}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Meta Description</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {article.meta_description || article.excerpt || 'No description available'}
                </p>
              </div>
              {article.focus_keyword && (
                <div>
                  <Label className="text-sm font-medium">Focus Keyword</Label>
                  <Badge variant="outline" className="mt-1">
                    {article.focus_keyword}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Article Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Article Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                  {article.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Word Count</span>
                <span className="text-sm font-medium">
                  {(article.html_body || article.content).split(' ').length} words
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reading Time</span>
                <span className="text-sm font-medium">
                  ~{Math.ceil((article.html_body || article.content).split(' ').length / 200)} min read
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">HTML Format</span>
                <Badge variant={article.html_body ? 'default' : 'secondary'}>
                  {article.html_body ? '✅ HTML' : '📝 Markdown'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" asChild>
                <Link href={`/cms/edit/${article.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Article
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
