'use client'

import { useState, useEffect } from 'react'
import { useAuth, useAppToast } from '@/app/providers'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  HelpCircle, 
  Plus, 
  Search,
  Filter,
  Calendar,
  Users,
  BarChart3,
  Edit,
  Eye,
  MoreHorizontal,
  Trash2,
  Play
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface Quiz {
  id: string
  title: string
  description: string
  status: 'draft' | 'published' | 'archived'
  category: string
  questions_count: number
  estimated_time: number
  created_at: string
  updated_at: string
  total_attempts: number
  avg_score: number
  completion_rate: number
}

export default function QuizzesPage() {
  const { user } = useAuth()
  const { toast } = useAppToast()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadQuizzes()
  }, [sortBy, sortOrder])

  const loadQuizzes = async () => {
    try {
      setLoading(true)
      // Mock data for now - replace with actual Supabase query when quizzes table is ready
      const mockQuizzes: Quiz[] = [
        {
          id: '1',
          title: 'Retirement Planning Knowledge Check',
          description: 'Test your knowledge about retirement planning strategies and options',
          status: 'published',
          category: 'Retirement',
          questions_count: 15,
          estimated_time: 10,
          created_at: '2024-11-15T10:00:00Z',
          updated_at: '2024-12-10T14:30:00Z',
          total_attempts: 245,
          avg_score: 78,
          completion_rate: 85
        },
        {
          id: '2',
          title: 'Annuity Basics Quiz',
          description: 'Learn about different types of annuities and their benefits',
          status: 'published',
          category: 'Annuities',
          questions_count: 12,
          estimated_time: 8,
          created_at: '2024-11-20T15:30:00Z',
          updated_at: '2024-12-05T09:15:00Z',
          total_attempts: 189,
          avg_score: 72,
          completion_rate: 78
        },
        {
          id: '3',
          title: 'Tax Strategy Assessment',
          description: 'Evaluate your understanding of tax strategies for retirement',
          status: 'draft',
          category: 'Tax',
          questions_count: 20,
          estimated_time: 15,
          created_at: '2024-12-01T11:20:00Z',
          updated_at: '2024-12-15T16:45:00Z',
          total_attempts: 0,
          avg_score: 0,
          completion_rate: 0
        },
        {
          id: '4',
          title: 'Insurance Knowledge Test',
          description: 'Test your knowledge about life insurance and related products',
          status: 'published',
          category: 'Insurance',
          questions_count: 18,
          estimated_time: 12,
          created_at: '2024-11-25T13:45:00Z',
          updated_at: '2024-12-08T10:20:00Z',
          total_attempts: 156,
          avg_score: 81,
          completion_rate: 92
        }
      ]

      setQuizzes(mockQuizzes)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to load quizzes: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Published</Badge>
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-800">Archived</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const handleDelete = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return

    try {
      // Mock deletion - replace with actual Supabase delete
      setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId))
      
      toast({
        title: 'Success',
        description: 'Quiz deleted successfully',
        variant: 'success'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to delete quiz: ${error.message}`,
        variant: 'destructive'
      })
    }
  }

  // Filter quizzes based on search and filters
  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = !searchTerm || 
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || quiz.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || quiz.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  const categories = Array.from(new Set(quizzes.map(q => q.category)))
  const statuses = Array.from(new Set(quizzes.map(q => q.status)))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
            <p className="text-muted-foreground">
              Create and manage interactive quizzes to engage your audience
            </p>
          </div>
          <div className="flex space-x-2">
            <Button asChild>
              <Link href="/cms/quizzes/new">
                <Plus className="w-4 h-4 mr-2" />
                New Quiz
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search quizzes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-')
                setSortBy(field)
                setSortOrder(order as 'asc' | 'desc')
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at-desc">Recently Updated</SelectItem>
                  <SelectItem value="updated_at-asc">Oldest Updated</SelectItem>
                  <SelectItem value="created_at-desc">Recently Created</SelectItem>
                  <SelectItem value="created_at-asc">Oldest Created</SelectItem>
                  <SelectItem value="title-asc">Title A-Z</SelectItem>
                  <SelectItem value="title-desc">Title Z-A</SelectItem>
                  <SelectItem value="total_attempts-desc">Most Attempts</SelectItem>
                  <SelectItem value="avg_score-desc">Highest Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quizzes List */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>All Quizzes</CardTitle>
                <CardDescription>
                  {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 'zes' : ''} found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' 
                    ? 'No quizzes match your filters' 
                    : 'No quizzes yet'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first quiz.'}
                </p>
                {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
                  <div className="mt-6">
                    <Button asChild>
                      <Link href="/cms/quizzes/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Quiz
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuizzes.map((quiz) => (
                  <div key={quiz.id} className="flex items-center justify-between p-6 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {quiz.title}
                        </h3>
                        {getStatusBadge(quiz.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {quiz.description}
                      </p>
                      <div className="flex items-center space-x-6 text-xs text-gray-500">
                        <span className="flex items-center">
                          <HelpCircle className="w-3 h-3 mr-1" />
                          {quiz.questions_count} questions
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatTime(quiz.estimated_time)}
                        </span>
                        <span className="capitalize">{quiz.category}</span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Updated {formatDate(quiz.updated_at)}
                        </span>
                      </div>
                      
                      {/* Performance Metrics */}
                      {quiz.status === 'published' && (
                        <div className="flex items-center space-x-6 mt-3 text-xs">
                          <div className="flex items-center space-x-2">
                            <Users className="w-3 h-3 text-blue-500" />
                            <span>{quiz.total_attempts} attempts</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="w-3 h-3 text-green-500" />
                            <span>{quiz.avg_score}% avg score</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Play className="w-3 h-3 text-purple-500" />
                            <span>{quiz.completion_rate}% completion</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/cms/quizzes/preview/${quiz.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/cms/quizzes/edit/${quiz.id}`}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/cms/quizzes/preview/${quiz.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/cms/quizzes/edit/${quiz.id}`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(quiz.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
              </div>
      </div>
    )
}
