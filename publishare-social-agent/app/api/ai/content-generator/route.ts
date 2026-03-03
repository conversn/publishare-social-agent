import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, content, context, model = 'gpt-4' } = body;

    console.log('AI Content Generator Request:', {
      action,
      contentLength: content?.length || 0,
      contextLength: context?.length || 0,
      model
    });

    // Validate request
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    if (!content && !context) {
      return NextResponse.json(
        { error: 'Content or context is required' },
        { status: 400 }
      );
    }

    // Generate AI content using the AI service
    const aiContent = await aiService.generateContent(
      action,
      content || context,
      context
    );

    console.log('AI Content Generated:', {
      action,
      contentLength: aiContent.length,
      model
    });

    return NextResponse.json({
      success: true,
      content: aiContent,
      action,
      model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Content Generator Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate AI content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
