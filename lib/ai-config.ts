// AI Service Configuration
export interface AIConfig {
  provider: 'mock' | 'openai' | 'claude' | 'anthropic';
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

// Read configuration from environment variables
const getAIConfig = (): AIConfig => {
  const provider = (process.env.AI_PROVIDER as 'mock' | 'openai' | 'claude' | 'anthropic') || 'mock';
  const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`] || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  
  return {
    provider,
    apiKey,
    model: process.env.AI_MODEL || (provider === 'openai' ? 'gpt-4' : provider === 'claude' ? 'claude-3-sonnet-20240229' : 'gpt-4'),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
    timeout: parseInt(process.env.AI_TIMEOUT_MS || '30000')
  };
};

// Default configuration
export const defaultAIConfig: AIConfig = getAIConfig();

// AI Service URLs
export const AI_SERVICE_URLS = {
  mock: {
    contentGenerator: '/api/ai/content-generator',
    linkSuggestions: '/api/ai/link-suggestions'
  },
  openai: {
    contentGenerator: 'https://api.openai.com/v1/chat/completions',
    linkSuggestions: 'https://api.openai.com/v1/chat/completions'
  },
  claude: {
    contentGenerator: 'https://api.anthropic.com/v1/messages',
    linkSuggestions: 'https://api.anthropic.com/v1/messages'
  }
};

// AI Optimization Prompts
export const AI_OPTIMIZATION_PROMPTS = {
  'generate-article': {
    system: 'You are an expert content writer and SEO specialist. Given a content brief with topic, title, audience, tone, length, key points, and CTA, generate a complete markdown article that is well-structured with clear headings (H1/H2/H3), engaging introduction, logically ordered sections, and a concise conclusion. Write in the requested tone and for the specified audience. Include bullet lists where helpful. Do not include any extraneous commentary. The output should be only the article markdown.',
    user: 'Generate a complete article based on this brief:'
  },
  'improve-structure': {
    system: 'You are an expert content editor. Improve the structure and flow of the provided content by organizing it with clear headings, better paragraph breaks, and logical progression.',
    user: 'Please restructure this content to improve readability and flow while maintaining the original message:'
  },
  'optimize-keywords': {
    system: 'You are an SEO expert. Optimize the content for better keyword usage, density, and placement while maintaining natural readability.',
    user: 'Please optimize this content for SEO by improving keyword usage and distribution:'
  },
  'enhance-content': {
    system: 'You are a content enhancement specialist. Add depth, examples, and valuable insights to the content while maintaining the original tone.',
    user: 'Please enhance this content by adding more depth, examples, and valuable insights:'
  },
  'rewrite-title-meta': {
    system: 'You are an SEO and content marketing expert. Rewrite the title and meta description to be more compelling and SEO-optimized.',
    user: 'Please rewrite the title and meta description for better SEO and engagement:'
  },
  'generate-links': {
    system: 'You are an internal linking specialist. Analyze the content and suggest relevant internal links that would provide additional value to readers.',
    user: 'Please suggest relevant internal links for this content:'
  },
  'improve-readability': {
    system: 'You are a readability expert. Improve the content by simplifying complex sentences, using clearer language, and making it more accessible.',
    user: 'Please improve the readability of this content:'
  },
  'add-examples': {
    system: 'You are a content enhancement specialist. Add relevant examples, case studies, or practical scenarios to make the content more engaging.',
    user: 'Please add relevant examples and case studies to this content:'
  },
  'strengthen-conclusion': {
    system: 'You are a content strategist. Strengthen the conclusion by summarizing key points, providing actionable takeaways, and creating a compelling call-to-action.',
    user: 'Please strengthen the conclusion of this content:'
  }
};

// AI Service Factory
export class AIServiceFactory {
  private config: AIConfig;

  constructor(config: AIConfig = defaultAIConfig) {
    this.config = config;
  }

  async generateContent(action: string, content: string, context?: string): Promise<string> {
    switch (this.config.provider) {
      case 'mock':
        return this.mockGenerateContent(action, content, context);
      case 'openai':
        return this.openaiGenerateContent(action, content, context);
      case 'claude':
        return this.claudeGenerateContent(action, content, context);
      default:
        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
    }
  }

  private async mockGenerateContent(action: string, content: string, context?: string): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const prompts = AI_OPTIMIZATION_PROMPTS[action as keyof typeof AI_OPTIMIZATION_PROMPTS];
    if (!prompts) {
      return `AI enhancement for: ${content}`;
    }

    // Generate mock response based on action
    const responses: { [key: string]: string } = {
      'generate-article': `# ${context?.match(/Title:\s*(.*)/i)?.[1] || 'Generated Article'}

## Introduction
${context?.match(/Topic:\s*([\s\S]*?)\n(?!\s)/i)?.[1] || 'This article introduces the core ideas and prepares the reader for what follows.'}

## Key Points
${(context?.match(/Key Points:\s*([\s\S]*?)\n(?!\s)/i)?.[1] || '- Point 1\n- Point 2\n- Point 3')}

## Main Content
This section expands on the key points and provides practical, actionable insights for the target audience.

### Practical Tips
1. Tip one
2. Tip two
3. Tip three

## Conclusion
Summarize the main ideas and reinforce the call to action.

${context?.match(/CTA:\s*(.*)/i)?.[1] ? `**Call to Action:** ${context?.match(/CTA:\s*(.*)/i)?.[1]}` : ''}`,
      'improve-structure': `Here's an improved structure for your content:

## Introduction
${context || content.split('\n')[0] || 'Your content introduction'}

## Key Points
- Point 1: Enhanced clarity and flow
- Point 2: Better organization of ideas
- Point 3: Logical progression maintained

## Conclusion
A strong conclusion that ties everything together.

This structure improves readability and engagement while maintaining your original message.`,

      'optimize-keywords': `Here's your content optimized for SEO:

${content.replace(/\b(keyword|important|essential)\b/gi, (match) => {
  const variations = ['crucial', 'vital', 'fundamental', 'key', 'essential', 'important'];
  return variations[Math.floor(Math.random() * variations.length)];
})}

**SEO Improvements:**
- Enhanced keyword density and placement
- Improved readability score
- Better semantic structure
- Optimized for search intent`,

      'enhance-content': `Here's your enhanced content with additional depth:

${content}

**Enhanced with:**
- Real-world examples and case studies
- Actionable insights and takeaways
- Expert perspectives and data
- Practical applications for readers

This enhancement adds value while maintaining your original tone and message.`,

      'rewrite-title-meta': `**Optimized Title:**
"${context || content.split('\n')[0] || 'Your Article Title'}" - A Comprehensive Guide

**Meta Description:**
Discover everything you need to know about ${(context || content).split(' ').slice(0, 3).join(' ').toLowerCase()}. This comprehensive guide provides expert insights, practical tips, and actionable strategies for success.

**Focus Keywords:**
- Primary: ${(context || content).split(' ').slice(0, 2).join(' ').toLowerCase()}
- Secondary: related terms and variations
- Long-tail: specific search phrases`,

      'generate-links': `**Suggested Internal Links:**

1. **Related Article**: "Understanding ${(context || content).split(' ')[0] || 'Key Concepts'}"
   - Relevance: High
   - Anchor text: "learn more about ${(context || content).split(' ')[0] || 'this topic'}"

2. **Supporting Content**: "Best Practices for ${(context || content).split(' ').slice(0, 2).join(' ')}"
   - Relevance: Medium
   - Anchor text: "best practices"

3. **Advanced Guide**: "Advanced Strategies for ${(context || content).split(' ').slice(0, 2).join(' ')}"
   - Relevance: Medium
   - Anchor text: "advanced strategies"

These links will improve user engagement and SEO performance.`,

      'improve-readability': `Here's your content with improved readability:

${content.split('\n').map(line => {
  if (line.length > 80) {
    return line.split('.').map(sentence => sentence.trim()).filter(Boolean).join('. ');
  }
  return line;
}).join('\n')}

**Readability Improvements:**
- Simplified complex sentences
- Clearer language and structure
- Better paragraph breaks
- Improved flow and comprehension`,

      'add-examples': `Here's your content enhanced with examples:

${content}

**Real-World Example:**
Consider the case of [Company Name], which successfully implemented these strategies and saw a 40% improvement in results.

**Practical Scenario:**
When [specific situation], you can apply these principles by [specific action].

**Case Study:**
A recent study showed that organizations using these approaches achieved [specific outcome].

These examples make your content more engaging and actionable.`,

      'strengthen-conclusion': `Here's your strengthened conclusion:

${content}

**Key Takeaways:**
1. [Main point 1] - actionable insight
2. [Main point 2] - practical application
3. [Main point 3] - measurable outcome

**Next Steps:**
- Immediate action: [specific step]
- Short-term goal: [measurable objective]
- Long-term strategy: [sustainable approach]

**Call to Action:**
Ready to implement these strategies? Start with [specific action] and track your progress toward [desired outcome].

This conclusion provides clear direction and motivation for your readers.`
    };

    return responses[action] || `Here's an AI-generated enhancement for your content:

${content}

**AI Enhancement:**
This content has been optimized using advanced AI techniques to improve clarity, engagement, and effectiveness while maintaining your original message and tone.`;
  }

  private async openaiGenerateContent(action: string, content: string, context?: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompts = AI_OPTIMIZATION_PROMPTS[action as keyof typeof AI_OPTIMIZATION_PROMPTS];
    if (!prompts) {
      throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: prompts.system },
          { role: 'user', content: `${prompts.user}\n\n${content}${context ? `\n\nContext: ${context}` : ''}` }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No content generated';
  }

  private async claudeGenerateContent(action: string, content: string, context?: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const prompts = AI_OPTIMIZATION_PROMPTS[action as keyof typeof AI_OPTIMIZATION_PROMPTS];
    if (!prompts) {
      throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        messages: [
          { role: 'user', content: `${prompts.system}\n\n${prompts.user}\n\n${content}${context ? `\n\nContext: ${context}` : ''}` }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content[0]?.text || 'No content generated';
  }
}

// Export singleton instance with environment-based configuration
export const aiService = new AIServiceFactory();
