# 📧 Newsletter Builder Implementation Plan

## 🎯 **Implementation Overview**

This document provides the detailed technical implementation plan for integrating the Newsletter Builder into Publishare's agentic content platform.

## 🏗️ **Phase 1: Foundation (Weeks 1-3)**

### **Week 1: Database & Core Infrastructure**

#### **Database Schema Implementation**
```sql
-- Execute in Supabase SQL Editor
-- Newsletter Management Tables
CREATE TABLE newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subject_line VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  template_id UUID REFERENCES newsletter_templates(id),
  status VARCHAR(50) DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own newsletters" ON newsletters
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own newsletters" ON newsletters
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own newsletters" ON newsletters
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own newsletters" ON newsletters
  FOR DELETE USING (auth.uid() = user_id);
```

#### **TypeScript Types**
```typescript
// types/newsletter.ts
export interface Newsletter {
  id: string;
  user_id: string;
  title: string;
  subject_line: string;
  content: string;
  template_id?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'archived';
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NewsletterTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  html_template: string;
  css_styles?: string;
  is_default: boolean;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  source?: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  subscribed_at: string;
  unsubscribed_at?: string;
}
```

### **Week 2: API Endpoints**

#### **Newsletter Management API**
```typescript
// app/api/newsletters/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { title, subject_line, content, template_id, scheduled_at } = await request.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('newsletters')
      .insert({
        user_id: user.id,
        title,
        subject_line,
        content,
        template_id,
        scheduled_at,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, newsletter: data });
  } catch (error) {
    console.error('Newsletter creation error:', error);
    return NextResponse.json({ error: 'Failed to create newsletter' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('newsletters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, newsletters: data });
  } catch (error) {
    console.error('Newsletter fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch newsletters' }, { status: 500 });
  }
}
```

### **Week 3: Basic UI Components**

#### **Newsletter Dashboard**
```typescript
// app/newsletters/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Mail, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function NewslettersPage() {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewsletters();
  }, []);

  const fetchNewsletters = async () => {
    try {
      const response = await fetch('/api/newsletters');
      const data = await response.json();
      if (data.success) {
        setNewsletters(data.newsletters);
      }
    } catch (error) {
      console.error('Failed to fetch newsletters:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Newsletters</h1>
        <Link href="/newsletters/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Newsletter
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Newsletters</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newsletters.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Open Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
          </CardContent>
        </Card>
      </div>

      {/* Newsletter List */}
      <div className="space-y-4">
        {newsletters.map((newsletter: any) => (
          <Card key={newsletter.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{newsletter.title}</h3>
                  <p className="text-sm text-muted-foreground">{newsletter.subject_line}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      newsletter.status === 'sent' ? 'bg-green-100 text-green-800' :
                      newsletter.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {newsletter.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(newsletter.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Link href={`/newsletters/edit/${newsletter.id}`}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

## 🤖 **Phase 2: AI Integration (Weeks 4-6)**

### **Week 4: AI Content Generation**

#### **AI Newsletter Service**
```typescript
// services/ai/newsletterService.ts
export class NewsletterAIService {
  async generateFromContent(contentIds: string[], industry: string): Promise<string> {
    const prompt = this.buildPrompt(contentIds, industry);
    
    const response = await fetch('/api/ai/newsletter/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentIds,
        industry,
        prompt
      })
    });

    const data = await response.json();
    return data.content;
  }

  private buildPrompt(contentIds: string[], industry: string): string {
    return `You are a ${industry} professional creating a newsletter. 
    Generate engaging newsletter content from the provided content sources.
    Focus on providing value to ${industry} clients and prospects.
    Use a professional but approachable tone.
    Include clear calls-to-action where appropriate.`;
  }

  async optimizeSubjectLine(content: string, industry: string): Promise<string> {
    const response = await fetch('/api/ai/newsletter/optimize-subject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, industry })
    });

    const data = await response.json();
    return data.subjectLine;
  }
}
```

### **Week 5: Content Aggregation Engine**

#### **Content Collection Service**
```typescript
// services/content/aggregationService.ts
export class ContentAggregationService {
  async getRecentContent(userId: string, days: number = 30): Promise<any[]> {
    const { data: articles } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const { data: quizzes } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    return [
      ...articles.map(article => ({ ...article, type: 'article' })),
      ...quizzes.map(quiz => ({ ...quiz, type: 'quiz' }))
    ];
  }

  async getContentInsights(contentIds: string[]): Promise<any[]> {
    // Generate insights from content performance
    return contentIds.map(id => ({
      id,
      insights: ['High engagement', 'Popular topic', 'Good conversion rate']
    }));
  }
}
```

### **Week 6: Newsletter Builder Interface**

#### **AI-Powered Newsletter Creator**
```typescript
// components/newsletter/NewsletterBuilder.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { NewsletterAIService } from '@/services/ai/newsletterService';
import { ContentAggregationService } from '@/services/content/aggregationService';

export default function NewsletterBuilder() {
  const [title, setTitle] = useState('');
  const [subjectLine, setSubjectLine] = useState('');
  const [content, setContent] = useState('');
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [availableContent, setAvailableContent] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [industry, setIndustry] = useState('financial_advisor');

  const aiService = new NewsletterAIService();
  const aggregationService = new ContentAggregationService();

  useEffect(() => {
    loadAvailableContent();
  }, []);

  const loadAvailableContent = async () => {
    const content = await aggregationService.getRecentContent('user-id', 30);
    setAvailableContent(content);
  };

  const generateNewsletter = async () => {
    if (selectedContent.length === 0) return;

    setGenerating(true);
    try {
      const generatedContent = await aiService.generateFromContent(selectedContent, industry);
      setContent(generatedContent);
      
      const optimizedSubject = await aiService.optimizeSubjectLine(generatedContent, industry);
      setSubjectLine(optimizedSubject);
    } catch (error) {
      console.error('Failed to generate newsletter:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Content Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableContent.map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={item.id}
                    checked={selectedContent.includes(item.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedContent([...selectedContent, item.id]);
                      } else {
                        setSelectedContent(selectedContent.filter(id => id !== item.id));
                      }
                    }}
                  />
                  <Label htmlFor={item.id} className="flex-1">
                    <div className="font-medium">{item.title || item.quiz_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()} • {item.type}
                    </div>
                  </Label>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={generateNewsletter} 
              disabled={selectedContent.length === 0 || generating}
              className="mt-4"
            >
              {generating ? 'Generating...' : 'Generate Newsletter'}
            </Button>
          </CardContent>
        </Card>

        {/* Newsletter Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Newsletter Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Newsletter Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter newsletter title"
                />
              </div>
              
              <div>
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={subjectLine}
                  onChange={(e) => setSubjectLine(e.target.value)}
                  placeholder="Enter subject line"
                />
              </div>
              
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Newsletter content will be generated here..."
                  rows={15}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## 🔗 **Phase 3: GoHighLevel Integration (Weeks 7-9)**

### **Week 7: GoHighLevel API Integration**

#### **GHL Service Implementation**
```typescript
// services/integrations/ghlService.ts
export class GHLService {
  private apiKey: string;
  private locationId: string;
  private baseUrl = 'https://rest.gohighlevel.com/v1';

  constructor(apiKey: string, locationId: string) {
    this.apiKey = apiKey;
    this.locationId = locationId;
  }

  async sendNewsletter(newsletterData: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/campaigns/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: newsletterData.title,
        subject: newsletterData.subject_line,
        htmlContent: newsletterData.content,
        locationId: this.locationId,
        // Add other GHL-specific parameters
      })
    });

    return response.json();
  }

  async getCampaignAnalytics(campaignId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/analytics`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    return response.json();
  }
}
```

### **Week 8: Integration UI**

#### **GHL Connection Component**
```typescript
// components/integrations/GHLConnection.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function GHLConnection() {
  const [apiKey, setApiKey] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/integrations/ghl/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, locationId })
      });
      
      if (response.ok) {
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>GoHighLevel Integration</CardTitle>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your GoHighLevel API key"
              />
            </div>
            
            <div>
              <Label htmlFor="locationId">Location ID</Label>
              <Input
                id="locationId"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="Enter your GoHighLevel Location ID"
              />
            </div>
            
            <Button onClick={testConnection} disabled={testing}>
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span>Connected to GoHighLevel</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## 📊 **Phase 4: Analytics & Optimization (Weeks 10-12)**

### **Week 10: Analytics Dashboard**

### **Week 11: Performance Optimization**

### **Week 12: Testing & Deployment**

## 🎯 **Success Criteria**

### **Technical Milestones**
- [ ] Database schema implemented and tested
- [ ] Basic newsletter CRUD operations working
- [ ] AI content generation functional
- [ ] GoHighLevel integration successful
- [ ] Analytics dashboard operational

### **Business Metrics**
- [ ] Newsletter creation time reduced by 70%
- [ ] Email deliverability > 95%
- [ ] Client adoption rate > 80%
- [ ] Newsletter engagement improvement > 25%

## 🚀 **Next Steps**

1. **Review and approve implementation plan**
2. **Set up development environment**
3. **Begin Phase 1 implementation**
4. **Regular progress reviews**
5. **Client feedback integration**

This implementation plan provides a structured approach to building the newsletter builder integration while maintaining Publishare's agentic workflow and business objectives.
