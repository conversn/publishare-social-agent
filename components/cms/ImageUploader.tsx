'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAppToast } from '@/app/providers'
import { supabase } from '@/integrations/supabase/client'
import { Upload, Image, FileText, Copy, Download, Loader2, CheckCircle, AlertCircle, X, Eye, Settings, FolderOpen } from 'lucide-react'

interface ImageUploaderProps {
  onImageUploaded: (imageUrl: string, imageData: any) => void
  onClose: () => void
}

const imageTypes = [
  { value: 'featured', label: 'Featured Image', description: 'Main article image' },
  { value: 'thumbnail', label: 'Thumbnail', description: 'Small preview image' },
  { value: 'gallery', label: 'Gallery Image', description: 'Image for galleries' },
  { value: 'banner', label: 'Banner Image', description: 'Header banner image' },
  { value: 'social', label: 'Social Media', description: 'Social sharing image' }
]

const compressionLevels = [
  { value: 'high', label: 'High Quality', description: 'Best quality, larger file' },
  { value: 'medium', label: 'Medium Quality', description: 'Good balance' },
  { value: 'low', label: 'Low Quality', description: 'Smaller file size' }
]

export default function ImageUploader({
  onImageUploaded,
  onClose
}: ImageUploaderProps) {
  const { toast } = useAppToast()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedImages, setUploadedImages] = useState<Array<{url: string, data: any}>>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    imageType: 'featured',
    altText: '',
    title: '',
    description: '',
    compression: 'medium',
    resize: true,
    maxWidth: 1200,
    maxHeight: 800
  })

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = async (files: FileList) => {
    const file = files[0]
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select an image file (JPEG, PNG, GIF, etc.).',
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

    await uploadImage(file)
  }

  const uploadImage = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Get the user's session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No active session found. Please sign in again.')
      }

      console.log('🎯 Calling image-upload Edge Function')
      
      // Create FormData for file upload
      const formDataToSend = new FormData()
      formDataToSend.append('image', file)
      formDataToSend.append('imageType', formData.imageType)
      formDataToSend.append('altText', formData.altText)
      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('compression', formData.compression)
      formDataToSend.append('resize', formData.resize.toString())
      formDataToSend.append('maxWidth', formData.maxWidth.toString())
      formDataToSend.append('maxHeight', formData.maxHeight.toString())

      const response = await fetch('https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/image-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formDataToSend
      })

      console.log('📡 Image Upload API Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📡 Image Upload API Response data:', data)

      if (data.imageUrl) {
        const newImage = {
          url: data.imageUrl,
          data: {
            ...data,
            originalName: file.name,
            fileSize: file.size,
            uploadDate: new Date().toISOString()
          }
        }
        
        setUploadedImages(prev => [...prev, newImage])
        setUploadProgress(100)
        
        toast({
          title: 'Image Uploaded!',
          description: `Successfully uploaded ${file.name}.`,
          variant: 'success'
        })
      } else {
        throw new Error('No image URL returned')
      }

    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: 'Upload Failed',
        description: `Failed to upload image: ${error instanceof Error ? error.message : String(error)}. Please try again.`,
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const useImage = (imageUrl: string, imageData: any) => {
    onImageUploaded(imageUrl, imageData)
    toast({
      title: 'Image Applied',
      description: 'Image has been applied to your content.',
      variant: 'success'
    })
  }

  const copyImageUrl = async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl)
      toast({
        title: 'URL Copied',
        description: 'Image URL copied to clipboard.',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy image URL.',
        variant: 'destructive'
      })
    }
  }

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Upload className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Image Uploader</h1>
            <p className="text-muted-foreground">
              Upload and manage images for your content
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Upload Settings
            </CardTitle>
            <CardDescription>
              Configure image upload options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Type
              </label>
              <Select
                value={formData.imageType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, imageType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {imageTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alt Text
              </label>
              <Input
                value={formData.altText}
                onChange={(e) => setFormData(prev => ({ ...prev, altText: e.target.value }))}
                placeholder="Describe the image for accessibility..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Image title..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Image description..."
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Compression Level
              </label>
              <Select
                value={formData.compression}
                onValueChange={(value) => setFormData(prev => ({ ...prev, compression: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {compressionLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <div className="font-medium">{level.label}</div>
                        <div className="text-xs text-gray-500">{level.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Select Image
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Upload Area and Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Upload Area
            </CardTitle>
            <CardDescription>
              Drag and drop or select images to upload
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Upload Progress */}
            {isUploading && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Uploading...</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your image here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse files
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={isUploading}
              >
                Choose File
              </Button>
            </div>

            {/* Uploaded Images */}
            {uploadedImages.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">Uploaded Images</h3>
                <div className="space-y-3">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <img
                          src={image.url}
                          alt={image.data.altText || 'Uploaded image'}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary">{image.data.imageType}</Badge>
                            <span className="text-xs text-gray-500">
                              {formatFileSize(image.data.fileSize)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {image.data.originalName}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => useImage(image.url, image.data)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Use Image
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyImageUrl(image.url)}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy URL
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeImage(index)}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
