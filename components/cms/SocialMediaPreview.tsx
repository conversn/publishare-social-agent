'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Facebook, 
  Twitter, 
  Linkedin, 
  Globe, 
  Image as ImageIcon,
  Copy,
  ExternalLink
} from 'lucide-react'

interface SocialMediaPreviewProps {
  title: string
  description: string
  url: string
  imageUrl?: string
  onUpdate: (field: string, value: string) => void
}

export default function SocialMediaPreview({
  title,
  description,
  url,
  imageUrl,
  onUpdate
}: SocialMediaPreviewProps) {
  const [activeTab, setActiveTab] = useState('facebook')

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Social Media Preview
        </CardTitle>
        <CardDescription>
          Customize how your content appears when shared on social media platforms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Social Media Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="facebook" className="flex items-center gap-2">
                <Facebook className="h-4 w-4" />
                Facebook
              </TabsTrigger>
              <TabsTrigger value="twitter" className="flex items-center gap-2">
                <Twitter className="h-4 w-4" />
                Twitter
              </TabsTrigger>
              <TabsTrigger value="linkedin" className="flex items-center gap-2">
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </TabsTrigger>
            </TabsList>

            {/* Facebook Preview */}
            <TabsContent value="facebook" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="og-title">Open Graph Title</Label>
                  <Input
                    id="og-title"
                    value={title}
                    onChange={(e) => onUpdate('og_title', e.target.value)}
                    placeholder="Title for Facebook sharing"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {title.length}/60 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="og-description">Open Graph Description</Label>
                  <Textarea
                    id="og-description"
                    value={description}
                    onChange={(e) => onUpdate('og_description', e.target.value)}
                    placeholder="Description for Facebook sharing"
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {description.length}/160 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="og-image">Open Graph Image URL</Label>
                  <Input
                    id="og-image"
                    value={imageUrl || ''}
                    onChange={(e) => onUpdate('og_image', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              {/* Facebook Preview Card */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-sm mb-3">Facebook Preview:</h4>
                <div className="bg-white border rounded-lg overflow-hidden max-w-md">
                  {imageUrl && (
                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">
                      {url.replace(/^https?:\/\//, '').split('/')[0]}
                    </p>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                      {truncateText(title, 60)}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-3">
                      {truncateText(description, 160)}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Twitter Preview */}
            <TabsContent value="twitter" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="twitter-title">Twitter Card Title</Label>
                  <Input
                    id="twitter-title"
                    value={title}
                    onChange={(e) => onUpdate('twitter_title', e.target.value)}
                    placeholder="Title for Twitter sharing"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {title.length}/60 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="twitter-description">Twitter Card Description</Label>
                  <Textarea
                    id="twitter-description"
                    value={description}
                    onChange={(e) => onUpdate('twitter_description', e.target.value)}
                    placeholder="Description for Twitter sharing"
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {description.length}/160 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="twitter-image">Twitter Card Image URL</Label>
                  <Input
                    id="twitter-image"
                    value={imageUrl || ''}
                    onChange={(e) => onUpdate('twitter_image', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              {/* Twitter Preview Card */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-sm mb-3">Twitter Preview:</h4>
                <div className="bg-white border rounded-lg overflow-hidden max-w-md">
                  {imageUrl && (
                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                      {truncateText(title, 60)}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-3 mb-2">
                      {truncateText(description, 160)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {url.replace(/^https?:\/\//, '')}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* LinkedIn Preview */}
            <TabsContent value="linkedin" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="linkedin-title">LinkedIn Title</Label>
                  <Input
                    id="linkedin-title"
                    value={title}
                    onChange={(e) => onUpdate('linkedin_title', e.target.value)}
                    placeholder="Title for LinkedIn sharing"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {title.length}/60 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="linkedin-description">LinkedIn Description</Label>
                  <Textarea
                    id="linkedin-description"
                    value={description}
                    onChange={(e) => onUpdate('linkedin_description', e.target.value)}
                    placeholder="Description for LinkedIn sharing"
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {description.length}/160 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="linkedin-image">LinkedIn Image URL</Label>
                  <Input
                    id="linkedin-image"
                    value={imageUrl || ''}
                    onChange={(e) => onUpdate('linkedin_image', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              {/* LinkedIn Preview Card */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-sm mb-3">LinkedIn Preview:</h4>
                <div className="bg-white border rounded-lg overflow-hidden max-w-md">
                  {imageUrl && (
                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                      {truncateText(title, 60)}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-3 mb-2">
                      {truncateText(description, 160)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {url.replace(/^https?:\/\//, '')}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(title)}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Title
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(description)}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Description
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(url)}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy URL
            </Button>
          </div>

          {/* Meta Tags Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-sm text-blue-900 mb-2">Meta Tags Generated:</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-blue-700">Open Graph</Badge>
                <code className="bg-blue-100 px-2 py-1 rounded">
                  og:title, og:description, og:image
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-blue-700">Twitter Card</Badge>
                <code className="bg-blue-100 px-2 py-1 rounded">
                  twitter:title, twitter:description, twitter:image
                </code>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
