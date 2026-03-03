'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewsletterNewPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        
        <h1 className="text-3xl font-bold tracking-tight">Create Newsletter</h1>
        <p className="text-muted-foreground">
          Build and send newsletters to engage your audience
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Newsletter Builder
          </CardTitle>
          <CardDescription>
            This feature is coming soon! You'll be able to create beautiful newsletters with AI assistance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Newsletter Builder Coming Soon</h3>
            <p className="text-muted-foreground mb-6">
              We're working on an amazing newsletter builder that will help you create engaging content for your subscribers.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Plus className="w-4 h-4" />
                AI-powered content suggestions
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Plus className="w-4 h-4" />
                Beautiful email templates
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Plus className="w-4 h-4" />
                Subscriber management
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Plus className="w-4 h-4" />
                Analytics and insights
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
