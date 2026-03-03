'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/integrations/supabase/client'
import { useAuth, useAppToast } from '@/app/providers'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Eye, 
  TrendingUp, 
  Clock, 
  Plus,
  Sparkles,
  Target,
  BarChart3,
  Calendar,
  Users
} from 'lucide-react'

interface Article {
  id: string
  title: string
  status: string | null
  created_at: string | null
  updated_at: string | null
  category: string
  excerpt?: string | null
  author?: any
}

export default function CMSDashboard() {
  const { user } = useAuth()
  const { toast } = useAppToast()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    views: 0
  })

  useEffect(() => {
    if (user) {
      loadArticles()
      loadStats()
    }
  }, [user])

  const loadArticles = async () => {
    try {
      setLoading(true)
      if (!user) {
        setArticles([])
        setLoading(false)
        return
      }
      
      const { data, error } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          category,
          excerpt,
          user_id,
          author_id
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setArticles(data || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to load articles: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Get total articles
      const { count: total } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })

      // Get published articles
      const { count: published } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')

      // Get draft articles
      const { count: draft } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft')

      setStats({
        total: total || 0,
        published: published || 0,
        draft: draft || 0,
        views: 0 // TODO: Implement view tracking
      })
    } catch (error: any) {
      console.error('Failed to load stats:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Published</Badge>
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'review':
        return <Badge className="bg-yellow-100 text-yellow-800">Review</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening with your content.
            </p>
          </div>
          <div className="flex space-x-2">
            <Button asChild>
              <Link href="/cms/new">
                <Plus className="w-4 h-4 mr-2" />
                New Article
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/cms/new?method=ai">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Generate
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.published}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">
                In progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.views.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Articles */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Articles</CardTitle>
                <CardDescription>
                  Your latest content updates and drafts
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/cms/articles">
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No articles yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first article.
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link href="/cms/new">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Article
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <div key={article.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {article.title}
                        </h3>
                        {getStatusBadge(article.status || 'draft')}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                                 <span className="flex items-center">
                           <Calendar className="w-3 h-3 mr-1" />
                           {formatDate(article.updated_at || article.created_at || null)}
                         </span>
                        {article.author && (
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {article.author.name}
                          </span>
                        )}
                        <span className="capitalize">{article.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/cms/preview/${article.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/cms/edit/${article.id}`}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Content Strategy
              </CardTitle>
              <CardDescription>
                Manage your content planning and strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/cms/strategy">
                  View Strategy
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Analytics
              </CardTitle>
              <CardDescription>
                Track performance and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/cms/analytics">
                  View Analytics
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                AI Tools
              </CardTitle>
              <CardDescription>
                Generate content with AI assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/cms/new?method=ai">
                  Start AI Generation
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
              </div>
      </div>
    )
}
