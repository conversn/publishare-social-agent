'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAppToast } from '@/app/providers'
import { supabase } from '@/integrations/supabase/client'
import { Image, Sparkles, Download, Copy, RefreshCw, CheckCircle, AlertCircle, Loader2, Eye, Settings, Palette, Camera } from 'lucide-react'

interface AIImageGeneratorProps {
  content?: string
  title?: string
  articleId?: string
  defaultImageType?: string
  onImageGenerated: (imageUrl: string, imageType: string) => void
  onClose: () => void
}

const imageTypes = [
  {
    id: 'featured-image',
    title: 'Featured Image',
    description: 'Main image for your article',
    size: '1200x630',
    aspectRatio: '1.91:1',
    icon: Image
  },
  {
    id: 'og-image',
    title: 'Social Media Image',
    description: 'Optimized for social sharing',
    size: '1200x630',
    aspectRatio: '1.91:1',
    icon: Eye
  },
  {
    id: 'thumbnail',
    title: 'Thumbnail',
    description: 'Small preview image',
    size: '400x300',
    aspectRatio: '4:3',
    icon: Camera
  },
  {
    id: 'banner',
    title: 'Banner Image',
    description: 'Wide header image',
    size: '1920x400',
    aspectRatio: '4.8:1',
    icon: Image
  }
]

const imageStyles = [
  { value: 'realistic', label: 'Realistic', description: 'Photorealistic images' },
  { value: 'illustrated', label: 'Illustrated', description: 'Artistic illustrations' },
  { value: 'minimalist', label: 'Minimalist', description: 'Clean and simple' },
  { value: 'professional', label: 'Professional', description: 'Business-focused' },
  { value: 'creative', label: 'Creative', description: 'Artistic and imaginative' }
]

const colorSchemes = [
  { value: 'auto', label: 'Auto', description: 'AI determines best colors' },
  { value: 'blue', label: 'Blue', description: 'Professional and trustworthy' },
  { value: 'green', label: 'Green', description: 'Growth and financial' },
  { value: 'purple', label: 'Purple', description: 'Luxury and premium' },
  { value: 'warm', label: 'Warm', description: 'Friendly and approachable' }
]

export default function AIImageGenerator({
  content,
  title,
  articleId,
  defaultImageType = 'featured-image',
  onImageGenerated,
  onClose
}: AIImageGeneratorProps) {
  const { toast } = useAppToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<Array<{url: string, type: string, prompt: string}>>([])
  const [formData, setFormData] = useState({
    imageType: defaultImageType,
    prompt: '',
    style: 'professional',
    colorScheme: 'auto',
    additionalInstructions: ''
  })

  const generateImage = async () => {
    if (!formData.prompt.trim()) {
      toast({
        title: 'Prompt Required',
        description: 'Please enter a description for the image you want to generate.',
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)

    try {
      // Get the user's session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No active session found. Please sign in again.')
      }

      console.log('🎯 Calling ai-image-generator Edge Function')
      
      const response = await fetch('https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/ai-image-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: formData.prompt,
          imageType: formData.imageType,
          style: formData.style,
          colorScheme: formData.colorScheme,
          additionalInstructions: formData.additionalInstructions,
          content: content,
          title: title,
          article_id: articleId,
          auto_approve: formData.imageType === 'featured-image' ? true : false
        })
      })

      console.log('📡 AI Image Generator API Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📡 AI Image Generator API Response data:', data)

      if (data.imageUrl) {
        const newImage = {
          url: data.imageUrl,
          type: formData.imageType,
          prompt: formData.prompt
        }
        
        setGeneratedImages(prev => [...prev, newImage])
        
        toast({
          title: 'Image Generated!',
          description: `Successfully generated ${formData.imageType} image.`,
          variant: 'success'
        })
      } else {
        throw new Error('No image URL returned')
      }

    } catch (error) {
      console.error('Error generating image:', error)
      toast({
        title: 'Image Generation Failed',
        description: `Failed to generate image: ${error instanceof Error ? error.message : String(error)}. Please try again.`,
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const useImage = (imageUrl: string, imageType: string) => {
    onImageGenerated(imageUrl, imageType)
    toast({
      title: 'Image Applied',
      description: `Image has been applied to your content.`,
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

  const downloadImage = async (imageUrl: string, imageType: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${imageType}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: 'Image Downloaded',
        description: 'Image has been downloaded successfully.',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download image.',
        variant: 'destructive'
      })
    }
  }

  const getImageTypeInfo = (typeId: string) => {
    return imageTypes.find(type => type.id === typeId) || imageTypes[0]
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Image Generator</h1>
            <p className="text-muted-foreground">
              Generate custom images for your content using AI
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Generate New Image
            </CardTitle>
            <CardDescription>
              Describe the image you want to generate
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
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        <div>
                          <div className="font-medium">{type.title}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Description *
              </label>
              <Textarea
                value={formData.prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Describe the image you want to generate... (e.g., 'Professional financial advisor helping clients with retirement planning')"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Style
                </label>
                <Select
                  value={formData.style}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, style: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {imageStyles.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Scheme
                </label>
                <Select
                  value={formData.colorScheme}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, colorScheme: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorSchemes.map((scheme) => (
                      <SelectItem key={scheme.value} value={scheme.value}>
                        {scheme.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Instructions
              </label>
              <Input
                value={formData.additionalInstructions}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalInstructions: e.target.value }))}
                placeholder="Any specific requirements or preferences..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={generateImage}
                disabled={isGenerating || !formData.prompt.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generated Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Generated Images
            </CardTitle>
            <CardDescription>
              Your AI-generated images
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedImages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Image className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No images generated yet</p>
                <p className="text-sm">Generate your first image to see it here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {generatedImages.map((image, index) => {
                  const imageTypeInfo = getImageTypeInfo(image.type)
                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={image.url}
                          alt={image.prompt}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">{imageTypeInfo.title}</Badge>
                            <span className="text-xs text-gray-500">{imageTypeInfo.size}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{image.prompt}</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => useImage(image.url, image.type)}
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
                              onClick={() => downloadImage(image.url, image.type)}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
