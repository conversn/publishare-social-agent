'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Image, 
  Search, 
  Upload, 
  Loader2, 
  X, 
  CheckCircle,
  AlertCircle,
  Grid3x3,
  List
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth, useAppToast } from '@/app/providers'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface MediaLibrarySelectorProps {
  onImageSelected: (imageUrl: string, altText: string) => void
  onClose: () => void
  filterByType?: 'featured' | 'all'
}

interface MediaItem {
  id: string
  url: string
  filename: string
  alt_text?: string
  image_type?: string
  width?: number
  height?: number
  created_at: string
  status?: string
}

export default function MediaLibrarySelector({
  onImageSelected,
  onClose,
  filterByType = 'all'
}: MediaLibrarySelectorProps) {
  const { user } = useAuth()
  const { toast } = useAppToast()
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  useEffect(() => {
    if (user) {
      loadMediaLibrary()
    }
  }, [user, filterByType])

  const loadMediaLibrary = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      let query = supabase
        .from('media_library')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (filterByType === 'featured') {
        query = query.eq('image_type', 'featured')
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading media library:', error)
        toast({
          title: 'Error',
          description: 'Failed to load media library.',
          variant: 'destructive'
        })
      } else {
        setMediaItems(data || [])
      }
    } catch (error) {
      console.error('Error loading media library:', error)
      toast({
        title: 'Error',
        description: 'Failed to load media library.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a valid image file (JPG, PNG, WebP, GIF, or SVG).',
          variant: 'destructive'
        })
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please select an image smaller than 10MB.',
          variant: 'destructive'
        })
        return
      }

      setUploadFile(file)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !user) return

    try {
      setIsUploading(true)

      // Upload to Supabase Storage
      const fileExt = uploadFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const filePath = `media/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, uploadFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      // Create entry in media_library
      const { error: dbError } = await supabase
        .from('media_library')
        .insert({
          user_id: user.id,
          url: publicUrl,
          filename: uploadFile.name,
          image_type: filterByType === 'featured' ? 'featured' : null,
          status: 'approved',
          width: null,
          height: null
        })

      if (dbError) {
        throw dbError
      }

      toast({
        title: 'Upload Successful',
        description: 'Image uploaded and added to media library.',
        variant: 'success'
      })

      // Refresh media library
      await loadMediaLibrary()
      setUploadFile(null)

      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: 'Upload Failed',
        description: `Failed to upload image: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleImageSelect = (item: MediaItem) => {
    onImageSelected(item.url, item.alt_text || item.filename)
    onClose()
  }

  const filteredItems = mediaItems.filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.filename.toLowerCase().includes(query) ||
      (item.alt_text && item.alt_text.toLowerCase().includes(query))
    )
  })

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
          <DialogDescription>
            Select an image from your media library or upload a new one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and View Controls */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Upload Section */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="flex-1"
                  disabled={isUploading}
                />
                {uploadFile && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{uploadFile.name}</span>
                    <Button
                      size="sm"
                      onClick={handleUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setUploadFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Media Grid/List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Image className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                {searchQuery ? 'No images found matching your search.' : 'No images in your media library yet.'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Upload an image to get started.
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
              : 'space-y-2'
            }>
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => handleImageSelect(item)}
                >
                  <CardContent className="p-2">
                    {viewMode === 'grid' ? (
                      <>
                        <div className="relative aspect-video bg-gray-100 rounded overflow-hidden mb-2">
                          <img
                            src={item.url}
                            alt={item.alt_text || item.filename}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          {item.status === 'approved' && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="h-4 w-4 text-green-500 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate" title={item.filename}>
                          {item.filename}
                        </p>
                        {item.image_type && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {item.image_type}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                          <img
                            src={item.url}
                            alt={item.alt_text || item.filename}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.filename}
                          </p>
                          {item.alt_text && (
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {item.alt_text}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {item.image_type && (
                              <Badge variant="outline" className="text-xs">
                                {item.image_type}
                              </Badge>
                            )}
                            {item.width && item.height && (
                              <span className="text-xs text-gray-500">
                                {item.width} × {item.height}
                              </span>
                            )}
                          </div>
                        </div>
                        {item.status === 'approved' && (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

