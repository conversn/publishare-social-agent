
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export const calculateSeoScore = (data: {
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  content: string;
  focusKeyword?: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
}): { score: number; issues: string[]; suggestions: string[] } => {
  let score = 0;
  const issues: string[] = [];
  const suggestions: string[] = [];

  const titleToCheck = data.metaTitle || data.title;
  const keyword = data.focusKeyword?.toLowerCase() || '';

  // Title checks (25 points)
  if (titleToCheck.length >= 30 && titleToCheck.length <= 60) {
    score += 15;
  } else if (titleToCheck.length < 30) {
    issues.push('Title is too short (less than 30 characters)');
    suggestions.push('Make your title longer to improve SEO');
  } else {
    issues.push('Title is too long (more than 60 characters)');
    suggestions.push('Shorten your title to prevent truncation in search results');
  }

  if (keyword && titleToCheck.toLowerCase().includes(keyword)) {
    score += 10;
  } else if (keyword) {
    issues.push('Focus keyword not found in title');
    suggestions.push('Include your focus keyword in the title');
  }

  // Meta description checks (25 points)
  if (data.metaDescription) {
    if (data.metaDescription.length >= 120 && data.metaDescription.length <= 160) {
      score += 15;
    } else if (data.metaDescription.length < 120) {
      issues.push('Meta description is too short');
      suggestions.push('Expand your meta description to 120-160 characters');
    } else {
      issues.push('Meta description is too long');
      suggestions.push('Shorten your meta description to prevent truncation');
    }

    if (keyword && data.metaDescription.toLowerCase().includes(keyword)) {
      score += 10;
    } else if (keyword) {
      issues.push('Focus keyword not found in meta description');
      suggestions.push('Include your focus keyword in the meta description');
    }
  } else {
    issues.push('Meta description is missing');
    suggestions.push('Add a compelling meta description');
  }

  // Content checks (25 points)
  const wordCount = data.content.split(/\s+/).length;
  if (wordCount >= 300) {
    score += 15;
  } else {
    issues.push('Content is too short (less than 300 words)');
    suggestions.push('Add more content to provide value to readers');
  }

  if (keyword) {
    const keywordDensity = (data.content.toLowerCase().match(new RegExp(keyword, 'g')) || []).length / wordCount;
    if (keywordDensity >= 0.005 && keywordDensity <= 0.025) {
      score += 10;
    } else if (keywordDensity < 0.005) {
      suggestions.push('Use your focus keyword more frequently in the content');
    } else {
      issues.push('Focus keyword is overused in content');
      suggestions.push('Reduce keyword density to avoid keyword stuffing');
    }
  }

  // Image checks (25 points)
  if (data.featuredImageUrl) {
    score += 15;
    if (data.featuredImageAlt) {
      score += 10;
    } else {
      issues.push('Featured image missing alt text');
      suggestions.push('Add descriptive alt text to your featured image');
    }
  } else {
    issues.push('No featured image');
    suggestions.push('Add a featured image to improve social sharing');
  }

  return { score, issues, suggestions };
};

export const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-clay-600';
  return 'text-red-600';
};

export const getScoreLabel = (score: number): string => {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Needs improvement';
  return 'Poor';
};

/**
 * Professional word counting function that matches industry standards
 * Excludes markdown syntax, URLs, punctuation, and other non-content elements
 */
export const countWordsProfessionally = (text: string): number => {
  if (!text || typeof text !== 'string') return 0;
  let cleanText = text
    .replace(/^#{1,6}\s+/gm, '') // headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // images
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '') // lists
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '') // blockquotes
    .replace(/^[-*_]{3,}$/gm, '') // hr
    .replace(/<[^>]*>/g, '') // html
    .replace(/https?:\/\/[^\s]+/g, '') // urls
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '') // emails
    .replace(/[^\w\s]/g, ' ') // punctuation
    .replace(/\s+/g, ' ')
    .trim();
  return cleanText.split(/\s+/).filter(word => /[a-zA-Z]/.test(word)).length;
};

/**
 * Get detailed word count analysis including professional count and breakdown
 */
export const getWordCountAnalysis = (text: string) => {
  const professionalCount = countWordsProfessionally(text);
  const simpleCount = text.split(/\s+/).filter(word => word.length > 0).length;
  const characterCount = text.length;
  const characterCountNoSpaces = text.replace(/\s/g, '').length;
  return {
    professionalCount,
    simpleCount,
    characterCount,
    characterCountNoSpaces,
    difference: simpleCount - professionalCount,
    percentageDifference: simpleCount > 0 ? ((simpleCount - professionalCount) / simpleCount * 100).toFixed(1) : '0'
  };
};
