'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Calculator,
  FileText,
  BarChart3,
  Users,
  TrendingUp,
  Plus,
  Eye,
  Edit,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/app/providers'
import { supabase } from '@/integrations/supabase/client'
import WelcomeCard from '@/components/features/dashboard/WelcomeCard'
import { checkOnboardingStatus } from '@/utils/onboardingUtils'

interface DashboardStats {
  total_articles: number
  total_calculators: number
  total_views: number
  engagement_rate: number
}

interface RecentArticle {
  id: string
  title: string
  status: string
  created_at: string
  views: number
  author_name?: string
}

interface PopularCalculator {
  id: string
  quiz_type: string
  uses: number
  conversion_rate: number
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([])
  const [popularCalculators, setPopularCalculators] = useState<PopularCalculator[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [adminViewingAs, setAdminViewingAs] = useState<any>(null)
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null)
  const [showWelcomeCard, setShowWelcomeCard] = useState(true)

  useEffect(() => {
    if (user && !loading) {
      // Check if admin is viewing as another user
      const adminViewData = localStorage.getItem('adminViewingAs')
      if (adminViewData) {
        try {
          const parsed = JSON.parse(adminViewData)
          setAdminViewingAs(parsed)
          setTargetUserId(parsed.user_id)
        } catch (error) {
          console.error('Error parsing admin view data:', error)
        }
      }
    }
  }, [user, loading])

  useEffect(() => {
    if (user && !loading) {
      loadDashboardData()
      loadOnboardingStatus()
    }
  }, [user, loading, targetUserId])

  const loadOnboardingStatus = async () => {
    if (!user) return

    try {
      const status = await checkOnboardingStatus(user.id)
      setOnboardingStatus(status)
      
      // Show welcome card for users who have completed onboarding
      // This serves as a permanent "jumping off point" for content creation
      setShowWelcomeCard(Boolean(status.onboardingCompleted))
    } catch (error) {
      console.error('Error loading onboarding status:', error)
    }
  }

  const loadDashboardData = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Use target user ID if admin is viewing as another user
      const userId = targetUserId || user.id

      // Load dashboard stats using direct queries
      const { data: articlesData, error: articlesError } = await supabase
        .from('articles')
        .select('id, meta_description, seo_score')
        .eq('user_id', userId)

      const { data: calculatorsData, error: calculatorsError } = await supabase
        .from('quiz_sessions')
        .select('id, status')
        .eq('user_id', userId)

      if (articlesError) {
        console.error('Error loading articles:', articlesError)
      }

      if (calculatorsError) {
        console.error('Error loading calculators:', calculatorsError)
      }

      // Calculate stats
      const totalArticles = articlesData?.length || 0
      const totalCalculators = calculatorsData?.length || 0
      const totalViews = articlesData?.reduce((sum, article) => {
        const views = parseInt(article.meta_description || '0')
        return sum + (isNaN(views) ? 0 : views)
      }, 0) || 0
      const engagementRate = articlesData && articlesData.length > 0 
        ? (articlesData.reduce((sum, article) => sum + (article.seo_score || 0), 0) / articlesData.length)
        : 0

      setStats({
        total_articles: totalArticles,
        total_calculators: totalCalculators,
        total_views: totalViews,
        engagement_rate: engagementRate
      })

      // Load recent articles
      const { data: recentArticlesData, error: recentArticlesError } = await supabase
        .from('articles')
        .select('id, title, status, created_at, meta_description, author_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentArticlesError) {
        console.error('Error loading recent articles:', recentArticlesError)
      } else {
        const formattedArticles: RecentArticle[] = (recentArticlesData || []).map(article => ({
          id: article.id,
          title: article.title,
          status: article.status || 'draft',
          created_at: article.created_at || '',
          views: parseInt(article.meta_description || '0') || 0,
          author_name: 'Author' // Will be populated after author system is set up
        }))
        setRecentArticles(formattedArticles)
      }

      // Load popular calculators
      const { data: popularCalculatorsData, error: popularCalculatorsError } = await supabase
        .from('quiz_sessions')
        .select('id, quiz_type, status')
        .eq('user_id', userId)

      if (popularCalculatorsError) {
        console.error('Error loading popular calculators:', popularCalculatorsError)
      } else {
        // Group by quiz_type and calculate stats
        const calculatorStats = new Map<string, { uses: number; completed: number }>()
        
        popularCalculatorsData?.forEach(session => {
          const current = calculatorStats.get(session.quiz_type) || { uses: 0, completed: 0 }
          current.uses += 1
          if (session.status === 'completed') {
            current.completed += 1
          }
          calculatorStats.set(session.quiz_type, current)
        })

        const formattedCalculators: PopularCalculator[] = Array.from(calculatorStats.entries())
          .map(([quizType, stats]) => ({
            id: quizType, // Using quiz_type as ID for now
            quiz_type: quizType,
            uses: stats.uses,
            conversion_rate: stats.uses > 0 ? (stats.completed / stats.uses) * 100 : 0
          }))
          .sort((a, b) => b.uses - a.uses)
          .slice(0, 5)

        setPopularCalculators(formattedCalculators)
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, targetUserId])

  if (loading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to access your dashboard</h1>
          <Button asChild>
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  const exitAdminView = () => {
    localStorage.removeItem('adminViewingAs')
    setAdminViewingAs(null)
    setTargetUserId(null)
    window.location.reload()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Admin View Banner */}
      {adminViewingAs && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Eye className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-blue-900">
                  Admin View: Viewing as {adminViewingAs.user_email}
                </p>
                <p className="text-sm text-blue-700">
                  You're seeing the dashboard as this user. All data shown belongs to them.
                </p>
              </div>
            </div>
            <Button onClick={exitAdminView} variant="outline" size="sm">
              Exit Admin View
            </Button>
          </div>
        </div>
      )}

      {/* Content Creation Hub - Permanent Jumping Off Point */}
      {showWelcomeCard && onboardingStatus && (
        <WelcomeCard
          businessType={onboardingStatus.businessType}
          persona={onboardingStatus.persona}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Publishare Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {adminViewingAs ? adminViewingAs.user_email : user.email}! Here's an overview of your content and engagement.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/cms/new">
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/calculator/new">
              <Calculator className="h-4 w-4 mr-2" />
              New Calculator
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/authors">
              <Users className="h-4 w-4 mr-2" />
              Manage Authors
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_articles || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats && stats.total_articles > 0 ? 'Your published content' : 'No articles yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Calculators</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_calculators || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats && stats.total_calculators > 0 ? 'Interactive tools' : 'No calculators yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.total_views || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats && stats.total_views > 0 ? 'Content engagement' : 'No views yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.engagement_rate || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats && stats.engagement_rate > 0 ? 'Average performance' : 'No data yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Articles */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Articles</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/cms">View All</Link>
              </Button>
            </div>
            <CardDescription>
              Your latest published content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentArticles.length > 0 ? (
              recentArticles.map((article) => (
                <div key={article.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{article.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {article.views} views • {article.status}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/cms/edit/${article.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/cms/preview/${article.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No articles yet</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href="/cms/new">Create your first article</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Calculators */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Popular Calculators</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/calculator">View All</Link>
              </Button>
            </div>
            <CardDescription>
              Your most used calculators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {popularCalculators.length > 0 ? (
              popularCalculators.map((calculator) => (
                <div key={calculator.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{calculator.quiz_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {calculator.uses} uses • {calculator.conversion_rate.toFixed(1)}% conversion
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/calculator/analytics/${calculator.id}`}>
                      <BarChart3 className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No calculators yet</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href="/calculator/new">Create your first calculator</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

