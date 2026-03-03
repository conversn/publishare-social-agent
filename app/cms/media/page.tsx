'use client'

import { useState, useEffect } from 'react'
import { useAuth, useAppToast } from '@/app/providers'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Upload, 
  Image, 
  Video, 
  File, 
  Search,
  Filter,
  Calendar,
  Download,
  Trash2,
  Plus,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MediaItem {
  id: string
  name: string
  type: 'image' | 'video' | 'document'
  url: string
  size: number
  created_at: string
  category?: string
  alt_text?: string
  description?: string
}

export default function MediaPage() {
  const { user } = useAuth()
  const { toast } = useAppToast()
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadMediaItems()
  }, [sortBy, sortOrder])

  const loadMediaItems = async () => {
    try {
      setLoading(true)
      // Mock data for now - replace with actual Supabase query when media table is ready
      const mockMedia: MediaItem[] = [
        {
          id: '1',
          name: 'retirement-planning-hero.jpg',
          type: 'image',
          url: '/images/retirement-planning-hero.jpg',
          size: 245760,
          created_at: '2024-12-15T10:00:00Z',
          category: 'hero',
          alt_text: 'Retirement planning concept',
          description: 'Hero image for retirement planning articles'
        },
        {
          id: '2',
          name: 'annuity-explainer-video.mp4',
          type: 'video',
          url: '/videos/annuity-explainer-video.mp4',
          size: 5242880,
          created_at: '2024-12-14T15:30:00Z',
          category: 'educational',
          description: 'Video explaining annuity basics'
        },
        {
          id: '3',
          name: 'tax-strategies-infographic.png',
          type: 'image',
          url: '/images/tax-strategies-infographic.png',
          size: 102400,
          created_at: '2024-12-13T09:15:00Z',
          category: 'infographic',
          alt_text: 'Tax strategies infographic',
          description: 'Visual guide to tax strategies'
        }
      ]

      setMediaItems(mockMedia)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to load media items: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-4 h-4" />
      case 'video':
        return <Video className="w-4 h-4" />
      case 'document':
        return <File className="w-4 h-4" />
      default:
        return <File className="w-4 h-4" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'image':
        return <Badge className="bg-blue-100 text-blue-800">Image</Badge>
      case 'video':
        return <Badge className="bg-purple-100 text-purple-800">Video</Badge>
      case 'document':
        return <Badge className="bg-gray-100 text-gray-800">Document</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const handleDelete = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this media item?')) return

    try {
      // Mock deletion - replace with actual Supabase delete
      setMediaItems(prev => prev.filter(item => item.id !== mediaId))
      
      toast({
        title: 'Success',
        description: 'Media item deleted successfully',
        variant: 'success'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to delete media item: ${error.message}`,
        variant: 'destructive'
      })
    }
  }

  // Filter media items based on search and filters
  const filteredMedia = mediaItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = typeFilter === 'all' || item.type === typeFilter

    return matchesSearch && matchesType
  })

  const categories = Array.from(new Set(mediaItems.map(m => m.category).filter(Boolean)))
  const types = Array.from(new Set(mediaItems.map(m => m.type)))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
            <p className="text-muted-foreground">
              Manage images, videos, and documents for your content
            </p>
          </div>
          <div className="flex space-x-2">
            <Button asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Upload Media
              </label>
            </Button>
            <input
              id="file-upload"
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                // Handle file upload
                console.log('Files selected:', e.target.files)
                toast({
                  title: 'Upload Started',
                  description: 'File upload functionality will be implemented',
                  variant: 'default'
                })
              }}
            />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search media..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

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
                  <SelectItem value="created_at-desc">Recently Added</SelectItem>
                  <SelectItem value="created_at-asc">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="size-desc">Largest First</SelectItem>
                  <SelectItem value="size-asc">Smallest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Media Grid */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Media Library</CardTitle>
                <CardDescription>
                  {filteredMedia.length} item{filteredMedia.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 rounded-lg h-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm || typeFilter !== 'all' 
                    ? 'No media items match your filters' 
                    : 'No media items yet'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || typeFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by uploading your first media item.'}
                </p>
                {!searchTerm && typeFilter === 'all' && (
                  <div className="mt-6">
                    <Button asChild>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Media
                      </label>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMedia.map((item) => (
                  <div key={item.id} className="group relative border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {/* Media Preview */}
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      {item.type === 'image' ? (
                        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                          <Image className="w-8 h-8 text-gray-400" />
                        </div>
                      ) : item.type === 'video' ? (
                        <div className="w-full h-full bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
                          <Video className="w-8 h-8 text-gray-400" />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
                          <File className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Media Info */}
                    <div className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate flex-1">
                          {item.name}
                        </h3>
                        {getTypeBadge(item.type)}
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>{formatFileSize(item.size)}</span>
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                        {item.category && (
                          <div className="text-xs text-gray-400">
                            Category: {item.category}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Image className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
