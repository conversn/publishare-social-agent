'use client'

import React, { useState } from 'react'
import { Image, AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FeaturedImagePreviewProps {
  imageUrl: string
  altText?: string
  className?: string
}

export default function FeaturedImagePreview({ 
  imageUrl, 
  altText = 'Featured image preview',
  className = '' 
}: FeaturedImagePreviewProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  if (!imageUrl || imageUrl.trim() === '') {
    return (
      <div className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 ${className}`}>
        <Image className="h-12 w-12 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">No featured image set</p>
        <p className="text-xs text-gray-400 mt-1">Add an image URL to see preview</p>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}
      
      {imageError ? (
        <Alert variant="destructive" className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load image. Please check the URL and try again.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-gray-100">
          <img
            src={imageUrl}
            alt={altText}
            className="w-full h-64 object-cover"
            onLoad={() => {
              setImageLoading(false)
              setImageError(false)
            }}
            onError={() => {
              setImageLoading(false)
              setImageError(true)
            }}
          />
        </div>
      )}
    </div>
  )
}

