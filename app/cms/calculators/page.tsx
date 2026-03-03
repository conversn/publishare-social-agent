'use client'

import { useState, useEffect } from 'react'
import { useAuth, useAppToast } from '@/app/providers'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calculator, 
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
  Play,
  TrendingUp,
  Clock
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

interface FinancialCalculator {
  id: string
  title: string
  description: string
  status: 'draft' | 'published' | 'archived'
  category: string
  type: 'retirement' | 'annuity' | 'mortgage' | 'investment' | 'tax'
  created_at: string
  updated_at: string
  total_uses: number
  avg_session_time: number
  conversion_rate: number
  inputs_count: number
}

export default function CalculatorsPage() {
  const { user } = useAuth()
  const { toast } = useAppToast()
  const [calculators, setCalculators] = useState<FinancialCalculator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadCalculators()
  }, [sortBy, sortOrder])

  const loadCalculators = async () => {
    try {
      setLoading(true)
      // Mock data for now - replace with actual Supabase query when calculators table is ready
      const mockCalculators: FinancialCalculator[] = [
        {
          id: '1',
          title: 'Retirement Savings Calculator',
          description: 'Calculate how much you need to save for retirement based on your goals and timeline',
          status: 'published',
          category: 'Retirement',
          type: 'retirement',
          created_at: '2024-11-10T10:00:00Z',
          updated_at: '2024-12-12T14:30:00Z',
          total_uses: 1245,
          avg_session_time: 180,
          conversion_rate: 23,
          inputs_count: 8
        },
        {
          id: '2',
          title: 'Annuity Payment Calculator',
          description: 'Calculate monthly annuity payments based on principal, rate, and term',
          status: 'published',
          category: 'Annuities',
          type: 'annuity',
          created_at: '2024-11-15T15:30:00Z',
          updated_at: '2024-12-08T09:15:00Z',
          total_uses: 892,
          avg_session_time: 120,
          conversion_rate: 18,
          inputs_count: 6
        },
        {
          id: '3',
          title: 'Mortgage Payment Calculator',
          description: 'Calculate monthly mortgage payments and see amortization schedule',
          status: 'published',
          category: 'Mortgage',
          type: 'mortgage',
          created_at: '2024-11-20T11:20:00Z',
          updated_at: '2024-12-05T16:45:00Z',
          total_uses: 1567,
          avg_session_time: 150,
          conversion_rate: 31,
          inputs_count: 7
        },
        {
          id: '4',
          title: 'Investment Growth Calculator',
          description: 'Project investment growth over time with compound interest',
          status: 'draft',
          category: 'Investment',
          type: 'investment',
          created_at: '2024-12-01T13:45:00Z',
          updated_at: '2024-12-15T10:20:00Z',
          total_uses: 0,
          avg_session_time: 0,
          conversion_rate: 0,
          inputs_count: 5
        },
        {
          id: '5',
          title: 'Tax Bracket Calculator',
          description: 'Calculate your effective tax rate and tax bracket',
          status: 'published',
          category: 'Tax',
          type: 'tax',
          created_at: '2024-11-25T13:45:00Z',
          updated_at: '2024-12-10T10:20:00Z',
          total_uses: 678,
          avg_session_time: 90,
          conversion_rate: 15,
          inputs_count: 4
        }
      ]

      setCalculators(mockCalculators)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to load calculators: ${error.message}`,
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'retirement':
        return <Badge className="bg-blue-100 text-blue-800">Retirement</Badge>
      case 'annuity':
        return <Badge className="bg-purple-100 text-purple-800">Annuity</Badge>
      case 'mortgage':
        return <Badge className="bg-green-100 text-green-800">Mortgage</Badge>
      case 'investment':
        return <Badge className="bg-orange-100 text-orange-800">Investment</Badge>
      case 'tax':
        return <Badge className="bg-red-100 text-red-800">Tax</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const handleDelete = async (calculatorId: string) => {
    if (!confirm('Are you sure you want to delete this calculator?')) return

    try {
      // Mock deletion - replace with actual Supabase delete
      setCalculators(prev => prev.filter(calc => calc.id !== calculatorId))
      
      toast({
        title: 'Success',
        description: 'Calculator deleted successfully',
        variant: 'success'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to delete calculator: ${error.message}`,
        variant: 'destructive'
      })
    }
  }

  // Filter calculators based on search and filters
  const filteredCalculators = calculators.filter(calculator => {
    const matchesSearch = !searchTerm || 
      calculator.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      calculator.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || calculator.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || calculator.category === categoryFilter
    const matchesType = typeFilter === 'all' || calculator.type === typeFilter

    return matchesSearch && matchesStatus && matchesCategory && matchesType
  })

  const categories = Array.from(new Set(calculators.map(c => c.category)))
  const types = Array.from(new Set(calculators.map(c => c.type)))
  const statuses = Array.from(new Set(calculators.map(c => c.status)))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calculators</h1>
            <p className="text-muted-foreground">
              Create and manage financial calculators to help your audience
            </p>
          </div>
          <div className="flex space-x-2">
            <Button asChild>
              <Link href="/cms/calculators/new">
                <Plus className="w-4 h-4 mr-2" />
                New Calculator
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search calculators..."
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

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Calculators List */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>All Calculators</CardTitle>
                <CardDescription>
                  {filteredCalculators.length} calculator{filteredCalculators.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-')
                setSortBy(field)
                setSortOrder(order as 'asc' | 'desc')
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at-desc">Recently Updated</SelectItem>
                  <SelectItem value="updated_at-asc">Oldest Updated</SelectItem>
                  <SelectItem value="created_at-desc">Recently Created</SelectItem>
                  <SelectItem value="created_at-asc">Oldest Created</SelectItem>
                  <SelectItem value="title-asc">Title A-Z</SelectItem>
                  <SelectItem value="title-desc">Title Z-A</SelectItem>
                  <SelectItem value="total_uses-desc">Most Used</SelectItem>
                  <SelectItem value="conversion_rate-desc">Highest Conversion</SelectItem>
                </SelectContent>
              </Select>
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
            ) : filteredCalculators.length === 0 ? (
              <div className="text-center py-12">
                <Calculator className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || typeFilter !== 'all'
                    ? 'No calculators match your filters' 
                    : 'No calculators yet'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first calculator.'}
                </p>
                {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && typeFilter === 'all' && (
                  <div className="mt-6">
                    <Button asChild>
                      <Link href="/cms/calculators/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Calculator
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCalculators.map((calculator) => (
                  <div key={calculator.id} className="flex items-center justify-between p-6 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {calculator.title}
                        </h3>
                        {getStatusBadge(calculator.status)}
                        {getTypeBadge(calculator.type)}
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {calculator.description}
                      </p>
                      <div className="flex items-center space-x-6 text-xs text-gray-500">
                        <span className="capitalize">{calculator.category}</span>
                        <span className="flex items-center">
                          <Calculator className="w-3 h-3 mr-1" />
                          {calculator.inputs_count} inputs
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Updated {formatDate(calculator.updated_at)}
                        </span>
                      </div>
                      
                      {/* Performance Metrics */}
                      {calculator.status === 'published' && (
                        <div className="flex items-center space-x-6 mt-3 text-xs">
                          <div className="flex items-center space-x-2">
                            <Users className="w-3 h-3 text-blue-500" />
                            <span>{calculator.total_uses.toLocaleString()} uses</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3 h-3 text-green-500" />
                            <span>{formatTime(calculator.avg_session_time)} avg session</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="w-3 h-3 text-purple-500" />
                            <span>{calculator.conversion_rate}% conversion</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/cms/calculators/preview/${calculator.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/cms/calculators/edit/${calculator.id}`}>
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
                            <Link href={`/cms/calculators/preview/${calculator.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/cms/calculators/edit/${calculator.id}`}>
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
                            onClick={() => handleDelete(calculator.id)}
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
