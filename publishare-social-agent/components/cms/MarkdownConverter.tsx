'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAppToast } from '@/app/providers'
import { supabase } from '@/integrations/supabase/client'
import { FileText, Code, Eye, Copy, Download, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface MarkdownConverterProps {
  markdownContent: string
  onHtmlGenerated: (html: string) => void
  onClose: () => void
}

const conversionOptions = [
  { value: 'basic', label: 'Basic HTML', description: 'Simple HTML conversion' },
  { value: 'enhanced', label: 'Enhanced HTML', description: 'With styling and formatting' },
  { value: 'seo-optimized', label: 'SEO Optimized', description: 'With semantic HTML and meta tags' },
  { value: 'newsletter', label: 'Newsletter Format', description: 'Email-friendly HTML' },
  { value: 'webpage', label: 'Webpage Format', description: 'Complete webpage with head and body' }
]

const stylingOptions = [
  { value: 'minimal', label: 'Minimal', description: 'Clean and simple styling' },
  { value: 'modern', label: 'Modern', description: 'Contemporary design elements' },
  { value: 'professional', label: 'Professional', description: 'Business-appropriate styling' },
  { value: 'creative', label: 'Creative', description: 'Artistic and colorful' },
  { value: 'custom', label: 'Custom', description: 'Use your own CSS classes' }
]

export default function MarkdownConverter({
  markdownContent,
  onHtmlGenerated,
  onClose
}: MarkdownConverterProps) {
  const { toast } = useAppToast()
  const [isConverting, setIsConverting] = useState(false)
  const [convertedHtml, setConvertedHtml] = useState('')
  const [formData, setFormData] = useState({
    conversionType: 'enhanced',
    styling: 'modern',
    includeCss: true,
    customCss: '',
    preserveFormatting: true
  })

  const convertMarkdown = async () => {
    if (!markdownContent.trim()) {
      toast({
        title: 'No Content',
        description: 'Please provide markdown content to convert.',
        variant: 'destructive'
      })
      return
    }

    setIsConverting(true)

    try {
      // Get the user's session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No active session found. Please sign in again.')
      }

      console.log('🎯 Calling markdown-to-html Edge Function')
      
      const response = await fetch('https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/markdown-to-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          markdown: markdownContent,
          conversionType: formData.conversionType,
          styling: formData.styling,
          includeCss: formData.includeCss,
          customCss: formData.customCss,
          preserveFormatting: formData.preserveFormatting
        })
      })

      console.log('📡 Markdown to HTML API Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📡 Markdown to HTML API Response data:', data)

      if (data.html) {
        setConvertedHtml(data.html)
        
        toast({
          title: 'Conversion Complete!',
          description: `Successfully converted markdown to ${formData.conversionType} HTML.`,
          variant: 'success'
        })
      } else {
        throw new Error('No HTML returned')
      }

    } catch (error) {
      console.error('Error converting markdown:', error)
      toast({
        title: 'Conversion Failed',
        description: `Failed to convert markdown: ${error instanceof Error ? error.message : String(error)}. Please try again.`,
        variant: 'destructive'
      })
    } finally {
      setIsConverting(false)
    }
  }

  const useHtml = () => {
    onHtmlGenerated(convertedHtml)
    toast({
      title: 'HTML Applied',
      description: 'Converted HTML has been applied to your content.',
      variant: 'success'
    })
  }

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(convertedHtml)
      toast({
        title: 'HTML Copied',
        description: 'Converted HTML copied to clipboard.',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy HTML to clipboard.',
        variant: 'destructive'
      })
    }
  }

  const downloadHtml = () => {
    try {
      const blob = new Blob([convertedHtml], { type: 'text/html' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `converted-content-${Date.now()}.html`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: 'HTML Downloaded',
        description: 'Converted HTML has been downloaded successfully.',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download HTML file.',
        variant: 'destructive'
      })
    }
  }

  const previewHtml = () => {
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(convertedHtml)
      newWindow.document.close()
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Markdown to HTML Converter</h1>
            <p className="text-muted-foreground">
              Convert your markdown content to various HTML formats
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Conversion Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Conversion Settings
            </CardTitle>
            <CardDescription>
              Configure how your markdown should be converted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversion Type
              </label>
              <Select
                value={formData.conversionType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, conversionType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conversionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Styling
              </label>
              <Select
                value={formData.styling}
                onValueChange={(value) => setFormData(prev => ({ ...prev, styling: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stylingOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={convertMarkdown}
                disabled={isConverting || !markdownContent.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Convert to HTML
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Converted HTML */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Converted HTML
            </CardTitle>
            <CardDescription>
              Preview and manage your converted HTML
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!convertedHtml ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No HTML generated yet</p>
                <p className="text-sm">Convert your markdown to see the HTML here</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={useHtml}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Use HTML
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={previewHtml}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyHtml}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy HTML
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadHtml}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
                
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{formData.conversionType}</Badge>
                    <Badge variant="outline">{formData.styling}</Badge>
                  </div>
                  <Textarea
                    value={convertedHtml}
                    readOnly
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
