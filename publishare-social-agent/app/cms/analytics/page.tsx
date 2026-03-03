'use client'

import { useState, useEffect } from 'react'
import { useAuth, useAppToast } from '@/app/providers'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  Eye, 
  Clock, 
  Users, 
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

interface AnalyticsData {
  totalViews: number
  totalArticles: number
  avgTimeOnPage: number
  uniqueVisitors: number
  topArticles: Array<{
    id: string
    title: string
    views: number
    engagement: number
    publishedDate: string
  }>
  viewsByCategory: Array<{
    category: string
    views: number
    percentage: number
  }>
  monthlyViews: Array<{
    month: string
    views: number
    change: number
  }>
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { toast } = useAppToast()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      // Mock data for now - replace with actual analytics API calls
      const mockData: AnalyticsData = {
        totalViews: 15420,
        totalArticles: 24,
        avgTimeOnPage: 245,
        uniqueVisitors: 3240,
        topArticles: [
          {
            id: '1',
            title: 'Complete Guide to Retirement Planning in 2024',
            views: 2840,
            engagement: 78,
            publishedDate: '2024-11-15'
          },
          {
            id: '2',
            title: 'Understanding Annuities: A Comprehensive Overview',
            views: 2150,
            engagement: 82,
            publishedDate: '2024-11-20'
          },
          {
            id: '3',
            title: 'Tax Strategies for Retirement: What You Need to Know',
            views: 1890,
            engagement: 71,
            publishedDate: '2024-11-25'
          },
          {
            id: '4',
            title: 'Life Insurance vs. Annuities: Making the Right Choice',
            views: 1650,
            engagement: 69,
            publishedDate: '2024-12-01'
          },
          {
            id: '5',
            title: 'Social Security Benefits: Maximizing Your Retirement Income',
            views: 1420,
            engagement: 75,
            publishedDate: '2024-12-05'
          }
        ],
        viewsByCategory: [
          { category: 'Retirement', views: 5840, percentage: 38 },
          { category: 'Annuities', views: 4230, percentage: 27 },
          { category: 'Tax', views: 3120, percentage: 20 },
          { category: 'Insurance', views: 2230, percentage: 15 }
        ],
        monthlyViews: [
          { month: 'Oct', views: 12400, change: 12 },
          { month: 'Nov', views: 13800, change: 11 },
          { month: 'Dec', views: 15420, change: 12 }
        ]
      }

      setAnalyticsData(mockData)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to load analytics: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-green-600" />
    if (change < 0) return <ArrowDown className="w-4 h-4 text-red-600" />
    return <Minus className="w-4 h-4 text-gray-600" />
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
              <p className="text-muted-foreground">
                Track your content performance and audience engagement
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Track your content performance and audience engagement
            </p>
          </div>
          <div className="flex space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadAnalyticsData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analyticsData?.totalViews || 0)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                {getChangeIcon(12)}
                <span className={`ml-1 ${getChangeColor(12)}`}>+12% from last month</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analyticsData?.uniqueVisitors || 0)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                {getChangeIcon(8)}
                <span className={`ml-1 ${getChangeColor(8)}`}>+8% from last month</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Time on Page</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(analyticsData?.avgTimeOnPage || 0)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                {getChangeIcon(-3)}
                <span className={`ml-1 ${getChangeColor(-3)}`}>-3% from last month</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.totalArticles || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                {getChangeIcon(4)}
                <span className={`ml-1 ${getChangeColor(4)}`}>+4 new this month</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Articles */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Articles</CardTitle>
            <CardDescription>
              Your most viewed content in the last {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : timeRange === '90d' ? '90 days' : 'year'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData?.topArticles.map((article, index) => (
                <div key={article.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-medium">{article.title}</h3>
                      <p className="text-sm text-gray-500">
                        Published {new Date(article.publishedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="font-medium">{formatNumber(article.views)} views</div>
                      <div className="text-sm text-gray-500">{article.engagement}% engagement</div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Views by Category */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Views by Category</CardTitle>
              <CardDescription>
                Content performance breakdown by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.viewsByCategory.map((category) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">{category.category}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-16 text-right">
                        {formatNumber(category.views)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Views Trend</CardTitle>
              <CardDescription>
                View growth over the past few months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.monthlyViews.map((month) => (
                  <div key={month.month} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{month.month}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{formatNumber(month.views)}</span>
                      <div className="flex items-center">
                        {getChangeIcon(month.change)}
                        <span className={`text-sm ml-1 ${getChangeColor(month.change)}`}>
                          {month.change > 0 ? '+' : ''}{month.change}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
              </div>
      </div>
    )
  }
