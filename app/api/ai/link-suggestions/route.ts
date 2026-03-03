import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-config';

// Mock AI service for link suggestions (fallback)
const mockLinkSuggestionsService = {
  async generateLinkSuggestions(content: string, articleTitle: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Extract potential topics from content
    const words = content.toLowerCase().split(/\s+/);
    const topics = words.filter(word => 
      word.length > 4 && 
      !['about', 'their', 'there', 'these', 'those', 'which', 'where', 'when', 'what', 'with', 'from', 'they', 'have', 'this', 'that'].includes(word)
    ).slice(0, 5);

    // Generate mock link suggestions
    const suggestions = [
      {
        id: 1,
        title: `Complete Guide to ${topics[0] || 'Financial Planning'}`,
        url: `/articles/complete-guide-${topics[0] || 'financial-planning'}`,
        relevance: 'High',
        anchorText: `learn more about ${topics[0] || 'financial planning'}`,
        description: `Comprehensive guide covering all aspects of ${topics[0] || 'financial planning'}`,
        category: 'guide'
      },
      {
        id: 2,
        title: `Best Practices for ${topics[1] || 'Investment'}`,
        url: `/articles/best-practices-${topics[1] || 'investment'}`,
        relevance: 'Medium',
        anchorText: `best practices for ${topics[1] || 'investment'}`,
        description: `Proven strategies and best practices for successful ${topics[1] || 'investment'}`,
        category: 'best-practices'
      },
      {
        id: 3,
        title: `Advanced Strategies for ${topics[2] || 'Wealth Management'}`,
        url: `/articles/advanced-strategies-${topics[2] || 'wealth-management'}`,
        relevance: 'Medium',
        anchorText: `advanced strategies for ${topics[2] || 'wealth management'}`,
        description: `Advanced techniques and strategies for sophisticated ${topics[2] || 'wealth management'}`,
        category: 'advanced'
      },
      {
        id: 4,
        title: `${topics[3] || 'Retirement'} Planning Calculator`,
        url: `/calculator/${topics[3] || 'retirement'}-planning`,
        relevance: 'High',
        anchorText: `calculate your ${topics[3] || 'retirement'} needs`,
        description: `Interactive calculator to help you plan your ${topics[3] || 'retirement'} strategy`,
        category: 'calculator'
      },
      {
        id: 5,
        title: `Case Study: Successful ${topics[4] || 'Financial'} Strategy`,
        url: `/case-studies/successful-${topics[4] || 'financial'}-strategy`,
        relevance: 'Medium',
        anchorText: `see how others succeeded with ${topics[4] || 'financial'} planning`,
        description: `Real-world example of successful ${topics[4] || 'financial'} strategy implementation`,
        category: 'case-study'
      }
    ];

    return suggestions;
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, articleTitle, maxSuggestions = 5 } = body;

    console.log('AI Link Suggestions Request:', {
      contentLength: content?.length || 0,
      articleTitle,
      maxSuggestions
    });

    // Validate request
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    let suggestions;

    // Use AI service for non-mock providers
    if (process.env.AI_PROVIDER && process.env.AI_PROVIDER !== 'mock') {
      try {
        const aiResponse = await aiService.generateContent('generate-links', content, articleTitle);
        
        // Parse AI response and convert to suggestions format
        const lines = aiResponse.split('\n').filter(line => line.trim());
        suggestions = lines
          .filter(line => line.includes('**') && line.includes(':'))
          .map((line, index) => {
            const titleMatch = line.match(/\*\*(.*?)\*\*/);
            const title = titleMatch ? titleMatch[1] : `Suggested Link ${index + 1}`;
            
            return {
              id: index + 1,
              title: title,
              url: `/articles/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
              relevance: index < 2 ? 'High' : 'Medium',
              anchorText: `learn more about ${title.toLowerCase()}`,
              description: `Related content about ${title.toLowerCase()}`,
              category: 'article'
            };
          })
          .slice(0, maxSuggestions);
      } catch (error) {
        console.error('AI service failed, falling back to mock:', error);
        suggestions = await mockLinkSuggestionsService.generateLinkSuggestions(content, articleTitle);
      }
    } else {
      // Use mock service
      suggestions = await mockLinkSuggestionsService.generateLinkSuggestions(content, articleTitle);
    }

    // Limit suggestions if requested
    const limitedSuggestions = suggestions.slice(0, maxSuggestions);

    console.log('AI Link Suggestions Generated:', {
      count: limitedSuggestions.length,
      suggestions: limitedSuggestions.map(s => ({ title: s.title, relevance: s.relevance }))
    });

    return NextResponse.json({
      success: true,
      suggestions: limitedSuggestions,
      totalFound: suggestions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Link Suggestions Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate link suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
