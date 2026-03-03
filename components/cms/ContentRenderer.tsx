import { shortcodeRenderers } from "@/utils/shortcodes/renderers";
import { renderShortcodes } from "@/utils/shortcodes/shortcodeParser";

import React, { useState, useEffect, useRef } from 'react';

interface ContentRendererProps {
  content: string;
  contentType: 'html' | 'markdown';
  className?: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
}

// Simple markdown to HTML converter for basic formatting
const convertMarkdownToHtml = (markdown: string): string => {
  if (!markdown || markdown.trim() === '') {
    return '<p class="text-gray-500 italic">No content to display.</p>';
  }

  let html = markdown
    // Headers (must be processed first)
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mb-2 text-gray-800">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-3 text-gray-800">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4 text-gray-800">$1</h1>')
    
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Code blocks (must be processed before inline code)
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-4 rounded-md overflow-x-auto mb-4 border border-gray-200"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>')
    
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600">$1</blockquote>')
    
    // Lists (unordered)
    .replace(/^\* (.*$)/gim, '<li class="mb-1 text-gray-700">$1</li>')
    .replace(/^- (.*$)/gim, '<li class="mb-1 text-gray-700">$1</li>')
    
    // Lists (ordered)
    .replace(/^\d+\. (.*$)/gim, '<li class="mb-1 text-gray-700">$1</li>');

  // Wrap list items in ul/ol tags
  html = html.replace(/(<li.*<\/li>)/gim, '<ul class="list-disc pl-6 mb-4">$1</ul>');
  
  // Convert line breaks to paragraphs
  html = html
    .split('\n\n')
    .map(paragraph => {
      if (paragraph.trim() === '') return '';
      if (paragraph.match(/^<[h|u|o|b|p|pre|code|blockquote]/)) {
        return paragraph;
      }
      return `<p class="mb-4 leading-relaxed text-gray-700">${paragraph}</p>`;
    })
    .join('');

  // Clean up empty paragraphs and normalize spacing
  html = html
    .replace(/<p class="mb-4 leading-relaxed text-gray-700"><\/p>/g, '')
    .replace(/<p class="mb-4 leading-relaxed text-gray-700">\s*<\/p>/g, '')
    .replace(/\n/g, '<br>');

  return html;
};

// Simple HTML sanitizer to prevent XSS
const sanitizeHtml = (html: string): string => {
  const allowedTags = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'div', 'span',
    'strong', 'b', 'em', 'i', 'u',
    'ul', 'ol', 'li',
    'a', 'img',
    'blockquote', 'code', 'pre',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ];
  
  const allowedAttributes = [
    'href', 'target', 'rel',
    'src', 'alt', 'title',
    'class', 'id',
    'width', 'height'
  ];

  // Remove script tags and dangerous attributes
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '');

  // Only allow specific tags
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  sanitized = sanitized.replace(tagRegex, (match, tagName) => {
    if (allowedTags.includes(tagName.toLowerCase())) {
      return match;
    }
    return '';
  });

  return sanitized;
};

const ContentRenderer: React.FC<ContentRendererProps> = ({
  content,
  contentType,
  className = '',
  featuredImageUrl,
  featuredImageAlt
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('ContentRenderer useEffect triggered:', {
      contentLength: content?.length || 0,
      contentType,
      hasContent: !!content
    });

    if (!content) {
      setHtmlContent('<p class="text-gray-500 italic">No content to display.</p>');
      return;
    }

    // Heuristic: if content looks like HTML, treat as HTML
    const looksLikeHtml = /^\s*<([a-zA-Z]+)(\s|>)/.test(content);

    if (contentType === 'html' || (contentType === 'markdown' && looksLikeHtml)) {
      console.log('Rendering as HTML content');
      setHtmlContent(sanitizeHtml(content));
    } else if (contentType === 'markdown') {
      console.log('Processing as Markdown content:', content.substring(0, 100) + '...');
      // Clear any existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Debounce the API call to prevent spam
      debounceTimeoutRef.current = setTimeout(() => {
        // Use the edge function for better markdown conversion
        setLoading(true);
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        console.log('Calling markdown-to-html edge function:', {
          url: supabaseUrl,
          hasKey: !!supabaseKey,
          contentLength: content.length
        });
        
        fetch(`${supabaseUrl}/functions/v1/markdown-to-html`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            markdown_body: content,
            article_id: null // No article ID for preview
          })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then(async data => {
          console.log('Edge function response:', data);
          if (data && data.html_body) {
            console.log('Using edge function HTML:', data.html_body.substring(0, 100) + '...');
            setHtmlContent(data.html_body);
            // Process shortcodes in the HTML content
            const processedHtml = renderShortcodes(data.html_body);
            setHtmlContent(processedHtml);
          } else {
            console.log('No html_body in response, falling back to client-side conversion');
            // TODO: Replace with a robust markdown library like marked/remark/markdown-it
            const fallbackHtml = convertMarkdownToHtml(content);
            setHtmlContent(fallbackHtml);
            // Process shortcodes in the fallback HTML content
            const processedHtml = renderShortcodes(fallbackHtml);
            setHtmlContent(processedHtml);
          }
        })
        .catch(async error => {
          console.error('Error converting markdown:', error);
          // TODO: Replace with a robust markdown library like marked/remark/markdown-it
          const fallbackHtml = convertMarkdownToHtml(content);
          setHtmlContent(fallbackHtml);
          // Process shortcodes in the fallback HTML content
          const processedHtml = renderShortcodes(fallbackHtml);
          setHtmlContent(processedHtml);
        })
        .finally(() => {
          setLoading(false);
        });
      }, 500); // 500ms debounce
    }

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [content, contentType]);

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Converting markdown...</span>
        </div>
      </div>
    );
  }

  // Always render HTML using dangerouslySetInnerHTML
  return (
    <div className={className}>
      {/* Featured Image */}
      {featuredImageUrl && (
        <div className="mb-6">
          <img
            src={featuredImageUrl}
            alt={featuredImageAlt || 'Featured image'}
            className="w-full h-64 md:h-80 object-cover rounded-lg shadow-md"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}
      {/* Article Content */}
      <div 
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};

export default ContentRenderer;
