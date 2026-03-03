/**
 * Image URL Validation Utility
 * Validates image URLs for featured images and other media
 */

export interface ImageValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates an image URL
 * Supports:
 * - HTTP/HTTPS URLs
 * - Local paths starting with /
 * - Valid image file extensions
 */
export function validateImageUrl(url: string): ImageValidationResult {
  if (!url || url.trim() === '') {
    return { valid: true } // Empty is valid (optional field)
  }

  const trimmedUrl = url.trim()

  // Check for valid image file extensions
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
  const hasValidExtension = validExtensions.some(ext => 
    trimmedUrl.toLowerCase().endsWith(ext)
  )

  // Check if it's an HTTP/HTTPS URL
  const isHttpUrl = /^https?:\/\/.+/.test(trimmedUrl)

  // Check if it's a local path (starts with /)
  const isLocalPath = trimmedUrl.startsWith('/')

  if (isHttpUrl) {
    // For HTTP URLs, check for valid extension
    if (!hasValidExtension) {
      return {
        valid: false,
        error: 'Image URL must end with a valid image extension (.jpg, .jpeg, .png, .webp, .gif, .svg)'
      }
    }

    // Validate URL format
    try {
      new URL(trimmedUrl)
      return { valid: true }
    } catch {
      return {
        valid: false,
        error: 'Invalid URL format'
      }
    }
  } else if (isLocalPath) {
    // For local paths, check for valid extension
    if (!hasValidExtension) {
      return {
        valid: false,
        error: 'Local path must end with a valid image extension (.jpg, .jpeg, .png, .webp, .gif, .svg)'
      }
    }
    return { valid: true }
  } else {
    return {
      valid: false,
      error: 'URL must be either an HTTP/HTTPS URL or a local path starting with /'
    }
  }
}

/**
 * Gets optimal image dimensions for featured images
 */
export function getOptimalFeaturedImageDimensions() {
  return {
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    description: 'Recommended size: 1200x630 pixels for optimal display'
  }
}

