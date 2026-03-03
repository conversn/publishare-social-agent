'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/integrations/supabase/client'
import { useAuth, useAppToast } from '@/app/providers'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileText, 
  Eye, 
  Edit, 
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  MoreHorizontal,
  Trash2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Article {
  id: string
  title: string
  status: string | null
  created_at: string | null
  updated_at: string | null
  category: string
  excerpt: string
  tags: string[] | null
  meta_title: string | null
  meta_description: string | null
  focus_keyword: string | null
  user_id: string
  author_id: string | null
}

export default function ArticlesPage() {
  const { user } = useAuth()
  const { toast } = useAppToast()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (user) {
      loadArticles()
    }
  }, [user, sortBy, sortOrder])

  const loadArticles = async () => {
    try {
      setLoading(true)
      if (!user) {
        setArticles([])
        setLoading(false)
        return
      }
      
      let query = supabase
        .from('articles')
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          category,
          excerpt,
          tags,
          meta_title,
          meta_description,
          focus_keyword,
          user_id,
          author_id
        `)
        .eq('user_id', user.id)  // Filter by current user

      // Apply sorting
      if (sortBy === 'updated_at') {
        query = query.order('updated_at', { ascending: sortOrder === 'asc' })
      } else if (sortBy === 'created_at') {
        query = query.order('created_at', { ascending: sortOrder === 'asc' })
      } else if (sortBy === 'title') {
        query = query.order('title', { ascending: sortOrder === 'asc' })
      }

      const { data, error } = await query

      if (error) {
        console.error('Supabase query error:', error)
        throw error
      }
      
      console.log('Loaded articles:', data?.length || 0, 'articles')
      setArticles(data || [])
    } catch (error: any) {
      console.error('Error loading articles:', error)
      toast({
        title: 'Error',
        description: `Failed to load articles: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Published</Badge>
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'review':
        return <Badge className="bg-yellow-100 text-yellow-800">Review</Badge>
      default:
        return <Badge variant="outline">{status || 'Draft'}</Badge>
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

  const handleDelete = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Article deleted successfully',
        variant: 'success'
      })

      loadArticles()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to delete article: ${error.message}`,
        variant: 'destructive'
      })
    }
  }

  const handleStatusUpdate = async (articleId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ status: newStatus })
        .eq('id', articleId)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Article status updated to ${newStatus}`,
        variant: 'success'
      })

      loadArticles()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to update article status: ${error.message}`,
        variant: 'destructive'
      })
    }
  }

  // Filter articles based on search and filters
  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchTerm || 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (article.excerpt && article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  const categories = Array.from(new Set(articles.map(a => a.category)))
  const statuses = Array.from(new Set(articles.map(a => a.status).filter(Boolean)))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
            <p className="text-muted-foreground">
              Manage and organize your content
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
                <FileText className="w-4 h-4 mr-2" />
                AI Generate
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
                  placeholder="Search articles..."
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
                    <SelectItem key={status} value={status || ''}>
                      {status || 'Draft'}
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
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Articles List */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>All Articles</CardTitle>
                <CardDescription>
                  {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
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
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' 
                    ? 'No articles match your filters' 
                    : 'No articles yet'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first article.'}
                </p>
                {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
                  <div className="mt-6">
                    <Button asChild>
                      <Link href="/cms/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Article
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredArticles.map((article) => (
                  <div key={article.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {article.title}
                        </h3>
                        {getStatusBadge(article.status)}
                      </div>
                                             <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                         <span className="flex items-center">
                           <Calendar className="w-3 h-3 mr-1" />
                           {formatDate(article.updated_at || article.created_at || null)}
                         </span>
                         {article.user_id && (
                           <span className="flex items-center">
                             <Users className="w-3 h-3 mr-1" />
                             User ID: {article.user_id.slice(0, 8)}...
                           </span>
                         )}
                         <span className="capitalize">{article.category}</span>
                         {article.focus_keyword && (
                           <span className="flex items-center">
                             <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                             {article.focus_keyword}
                           </span>
                         )}
                       </div>
                       {article.tags && article.tags.length > 0 && (
                         <div className="flex flex-wrap gap-1 mt-2">
                           {article.tags.slice(0, 3).map((tag, index) => (
                             <Badge key={index} variant="outline" className="text-xs">
                               {tag}
                             </Badge>
                           ))}
                           {article.tags.length > 3 && (
                             <Badge variant="outline" className="text-xs">
                               +{article.tags.length - 3}
                             </Badge>
                           )}
                         </div>
                       )}
                      {article.excerpt && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/cms/preview/${article.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/cms/edit/${article.id}`}>
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
                             <Link href={`/cms/preview/${article.id}`}>
                               <Eye className="w-4 h-4 mr-2" />
                               Preview
                             </Link>
                           </DropdownMenuItem>
                           <DropdownMenuItem asChild>
                             <Link href={`/cms/edit/${article.id}`}>
                               <Edit className="w-4 h-4 mr-2" />
                               Edit
                             </Link>
                           </DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem 
                             onClick={() => handleStatusUpdate(article.id, 'draft')}
                             disabled={article.status === 'draft'}
                           >
                             <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                             Set to Draft
                           </DropdownMenuItem>
                           <DropdownMenuItem 
                             onClick={() => handleStatusUpdate(article.id, 'review')}
                             disabled={article.status === 'review'}
                           >
                             <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                             Set to Review
                           </DropdownMenuItem>
                           <DropdownMenuItem 
                             onClick={() => handleStatusUpdate(article.id, 'published')}
                             disabled={article.status === 'published'}
                           >
                             <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                             Publish
                           </DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem 
                             onClick={() => handleDelete(article.id)}
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
