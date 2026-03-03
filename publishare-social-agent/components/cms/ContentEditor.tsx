import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Target, FileText, Users, Calendar, Tag, TrendingUp, Search, Zap, Wand2, Link, MessageSquare, BookOpen, Send, Lightbulb, Eye, Edit3, AlertTriangle, CheckCircle, Image, Copy, ArrowDownToLine, Facebook, Twitter, Linkedin, Globe, ImageIcon, Loader2, Upload, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';
// import rehypeRaw from 'rehype-raw';
// import rehypeSanitize from 'rehype-sanitize';
import { countWordsProfessionally } from '@/utils/seoUtils';

// Simple markdown renderer as temporary fix for style-to-js issue
const renderMarkdown = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\n/g, '<br>');
};
import ShortcodeManager from './ShortcodeManager';
import MarkdownEditor from './MarkdownEditor';
import IDEEditor from './IDEEditor';
import EnhancedMediaManager from './EnhancedMediaManager';
import AIImageGenerator from './AIImageGenerator';
import MarkdownConverter from './MarkdownConverter';
import ImageUploader from './ImageUploader';
import PromotionManager from './PromotionManager';
import FeaturedImagePreview from './FeaturedImagePreview';
import MediaLibrarySelector from './MediaLibrarySelector';
import { validateImageUrl } from '@/utils/imageValidation';

interface ContentEditorProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  onTitleChange: (title: string) => Promise<void>;
  personas: any[];
  personasLoading: boolean;
  optimizeDrawerOpen?: boolean;
  // Add fact-check props
  factCheck?: any;
  factCheckLoading?: boolean;
  factCheckError?: string;
}

// Category to persona mapping
const categoryToPersonaMap: { [key: string]: string } = {
  'retirement': 'retirees',
  'insurance': 'families',
  'tax': 'professionals',
  'estate': 'seniors',
  'health': 'health-conscious',
  'housing': 'homeowners',
  'financial': 'investors'
};

// Category detection keywords
const categoryKeywords: { [key: string]: string[] } = {
  'retirement': ['retirement', 'pension', '401k', 'ira', 'social security', 'golden years', 'senior', 'elderly'],
  'insurance': ['insurance', 'life insurance', 'health insurance', 'disability', 'coverage', 'policy', 'premium'],
  'tax': ['tax', 'taxes', 'deduction', 'credit', 'irs', 'filing', 'refund', 'taxable'],
  'estate': ['estate', 'will', 'trust', 'inheritance', 'probate', 'beneficiary', 'legacy'],
  'health': ['health', 'medical', 'wellness', 'fitness', 'nutrition', 'healthcare', 'doctor'],
  'housing': ['housing', 'mortgage', 'home', 'real estate', 'property', 'buying', 'selling'],
  'financial': ['financial', 'investment', 'portfolio', 'wealth', 'money', 'finance', 'planning']
};

// Pre-defined AI optimization prompts
const aiOptimizationPrompts = {
  'improve-structure': 'Improve the structure and flow of this article. Make it more organized, add clear sections, and ensure logical progression of ideas.',
  'optimize-keywords': 'Optimize this content for SEO by improving keyword usage, density, and placement while maintaining natural readability.',
  'enhance-content': 'Enhance this content by adding more depth, examples, and valuable insights while maintaining the original message.',
  'rewrite-title-meta': 'Rewrite the title and meta description to be more compelling and SEO-optimized while accurately representing the content.',
  'generate-links': 'Analyze this content and suggest relevant internal links to other articles on our site that would provide additional value to readers.',
  'improve-readability': 'Improve the readability of this content by simplifying complex sentences, using clearer language, and making it more accessible.',
  'add-examples': 'Add relevant examples, case studies, or practical scenarios to make this content more engaging and actionable.',
  'strengthen-conclusion': 'Strengthen the conclusion by summarizing key points, providing actionable takeaways, and creating a compelling call-to-action.'
};

export default function ContentEditor({
  formData,
  setFormData,
  onTitleChange,
  personas,
  personasLoading,
  optimizeDrawerOpen = false,
  // Add fact-check props
  factCheck,
  factCheckLoading,
  factCheckError
}: ContentEditorProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'metadata' | 'social' | 'media' | 'settings'>('content');
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [optimizationLoading, setOptimizationLoading] = useState<string | null>(null);
  const [linkSuggestions, setLinkSuggestions] = useState<any[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [contentPreviewMode, setContentPreviewMode] = useState(false);
  const [shortcodeManagerOpen, setShortcodeManagerOpen] = useState(false);
  const [showAIImageGenerator, setShowAIImageGenerator] = useState(false);
  const [showMarkdownConverter, setShowMarkdownConverter] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [showPromotionManager, setShowPromotionManager] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [featuredImageValidation, setFeaturedImageValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });
  const [isGeneratingFeaturedImage, setIsGeneratingFeaturedImage] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  // Remove generation mode toggle - moved to GenerateArticleForm
  const { toast } = useToast();

  // Supabase configuration


  // Auto-detect category from content
  const detectCategoryFromContent = (content: string, title: string) => {
    const combinedText = `${title} ${content}`.toLowerCase();
    const categoryScores: { [key: string]: number } = {};
    
    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      categoryScores[category] = keywords.reduce((score, keyword) => {
        const regex = new RegExp(keyword, 'gi');
        const matches = combinedText.match(regex);
        return score + (matches ? matches.length : 0);
      }, 0);
    });
    
    const detectedCategory = Object.entries(categoryScores)
      .sort(([,a], [,b]) => b - a)[0];
    
    return detectedCategory && detectedCategory[1] > 0 ? detectedCategory[0] : 'financial';
  };

  // Auto-set persona based on category
  const setPersonaFromCategory = (category: string) => {
    const personaId = categoryToPersonaMap[category];
    if (personaId && personas.length > 0) {
      const persona = personas.find(p => p.id === personaId || p.name.toLowerCase().includes(personaId));
      if (persona) {
        handlePersonaChange(persona.id);
      }
    }
  };

  // AI Tag Generation
  const generateAITags = async () => {
    const timestamp = new Date().toISOString();
    const articleTitle = formData.title || 'Untitled';
    const content = formData.content || '';
    const category = formData.category || 'financial';
    
    console.log(`[${timestamp}] 🏷️ Starting AI tag generation for article: "${articleTitle}"`);
    console.log(`[${timestamp}] 📊 Tag generation context:`, {
      title: articleTitle,
      contentLength: content.length,
      category,
      currentTags: formData.tags
    });

    setIsGeneratingTags(true);
    
    try {
      // Get the user's session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No active session found. Please sign in again.')
      }

      console.log(`[${timestamp}] 🎯 Calling keyword-suggestions Edge Function`)
      
      const response = await fetch('https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/keyword-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: content,
          topic: articleTitle,
          category: category,
          targetAudience: formData.persona,
          contentType: 'article',
          maxKeywords: 8
        })
      })

      console.log(`[${timestamp}] 📡 Keyword suggestions API Response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`[${timestamp}] 📡 Keyword suggestions API Response data:`, data)

      if (data.keywords && data.keywords.length > 0) {
        // Add new tags that don't already exist
        const newTags = data.keywords.filter((tag: string) => !formData.tags.includes(tag));
        if (newTags.length > 0) {
          handleTagsChange([...formData.tags, ...newTags]);
          console.log(`[${timestamp}] ✅ Added ${newTags.length} new tags:`, newTags);
          
          toast({
            title: "Keywords Generated",
            description: `Generated ${newTags.length} relevant keywords for your content.`,
          })
        } else {
          console.log(`[${timestamp}] ℹ️ No new tags to add - all generated tags already exist`);
          toast({
            title: "Keywords Generated",
            description: "All suggested keywords are already in use.",
          })
        }
      } else {
        throw new Error('No keywords generated')
      }
      
    } catch (error) {
      console.error(`[${timestamp}] ❌ Error generating AI tags:`, error);
      toast({
        title: "Keyword Generation Failed",
        description: `Failed to generate keywords: ${error instanceof Error ? error.message : String(error)}. Please try again.`,
        variant: "destructive"
      })
    } finally {
      setIsGeneratingTags(false);
    }
  };

  // Mock AI tag generation (replace with actual API call)
  const generateMockTags = (title: string, content: string, category: string): string[] => {
    const baseTags = [category, 'financial-planning'];
    const contentWords = content.toLowerCase().split(/\s+/);
    const titleWords = title.toLowerCase().split(/\s+/);
    
    // Extract potential tags from content
    const potentialTags: string[] = [];
    
    // Add common financial terms
    const financialTerms = ['investment', 'savings', 'budget', 'debt', 'credit', 'mortgage', 'insurance', 'retirement', 'tax', 'estate'];
    financialTerms.forEach(term => {
      if (contentWords.includes(term) || titleWords.includes(term)) {
        potentialTags.push(term);
      }
    });
    
    // Add category-specific tags
    const categorySpecificTags: { [key: string]: string[] } = {
      'retirement': ['401k', 'ira', 'pension', 'social-security', 'senior-living'],
      'insurance': ['life-insurance', 'health-coverage', 'disability', 'premium'],
      'tax': ['deductions', 'credits', 'filing', 'refund'],
      'estate': ['wills', 'trusts', 'inheritance', 'probate'],
      'health': ['wellness', 'fitness', 'nutrition', 'healthcare'],
      'housing': ['mortgage', 'real-estate', 'home-buying', 'property'],
      'financial': ['investing', 'wealth-building', 'money-management', 'financial-goals']
    };
    
    const categoryTags = categorySpecificTags[category] || [];
    potentialTags.push(...categoryTags);
    
    // Remove duplicates and limit to 8 tags
    const uniqueTags = [...new Set([...baseTags, ...potentialTags])].slice(0, 8);
    
    return uniqueTags;
  };

  // Auto-detect category when content changes
  useEffect(() => {
    if (formData.content && formData.content.length > 50 && !formData.category) {
      const detectedCategory = detectCategoryFromContent(formData.content, formData.title);
      console.log(`[${new Date().toISOString()}] 🔍 Auto-detected category: ${detectedCategory} from content`);
      handleCategoryChange(detectedCategory);
    }
  }, [formData.content, formData.title]);

  // Auto-set persona when category changes
  useEffect(() => {
    if (formData.category && !formData.persona && personas.length > 0) {
      console.log(`[${new Date().toISOString()}] 👥 Auto-setting persona for category: ${formData.category}`);
      setPersonaFromCategory(formData.category);
    }
  }, [formData.category, personas]);

  const handleContentChange = (content: string) => {
    setFormData(prev => ({ ...prev, content }));
  };

  const handleSlugChange = (slug: string) => {
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleExcerptChange = (excerpt: string) => {
    setFormData(prev => ({ ...prev, excerpt }));
  };

  const handleCategoryChange = (category: string) => {
    setFormData(prev => ({ ...prev, category }));
  };

  const handlePersonaChange = (persona: string) => {
    setFormData(prev => ({ ...prev, persona }));
  };

  const handleImageGenerated = (imageUrl: string, imageType: string) => {
    // Update form data with the generated image
    if (imageType === 'featured-image' || isGeneratingFeaturedImage) {
      setFormData(prev => ({
        ...prev,
        featured_image_url: imageUrl,
        featured_image_alt: prev.featured_image_alt || (prev.title ? `${prev.title} - Featured Image` : 'Featured Image')
      }));
      setIsGeneratingFeaturedImage(false);
      toast({
        title: 'Featured Image Generated',
        description: 'Your featured image has been generated and added to the form.',
        variant: 'default'
      });
    } else {
      setFormData(prev => ({
        ...prev,
        og_image: imageType === 'og-image' ? imageUrl : prev.og_image,
        thumbnail: imageType === 'thumbnail' ? imageUrl : prev.thumbnail,
        banner_image: imageType === 'banner' ? imageUrl : prev.banner_image
      }));
    }
    
    setShowAIImageGenerator(false);
  };

  const handleHtmlGenerated = (html: string) => {
    // Update form data with the converted HTML
    setFormData(prev => ({
      ...prev,
      html_content: html
    }));
    
    setShowMarkdownConverter(false);
  };

  const handleImageUploaded = (imageUrl: string, imageData: any) => {
    // Update form data with the uploaded image
    setFormData(prev => ({
      ...prev,
      featured_image: imageData.imageType === 'featured' ? imageUrl : prev.featured_image,
      og_image: imageData.imageType === 'social' ? imageUrl : prev.og_image,
      thumbnail: imageData.imageType === 'thumbnail' ? imageUrl : prev.thumbnail,
      banner_image: imageData.imageType === 'banner' ? imageUrl : prev.banner_image
    }));
    
    setShowImageUploader(false);
  };

  const handleMetaTitleChange = (meta_title: string) => {
    setFormData(prev => ({ ...prev, meta_title }));
  };

  const handleMetaDescriptionChange = (meta_description: string) => {
    setFormData(prev => ({ ...prev, meta_description }));
  };

  const handleFocusKeywordChange = (focus_keyword: string) => {
    setFormData(prev => ({ ...prev, focus_keyword }));
  };

  const handleTagsChange = (tags: string[]) => {
    setFormData(prev => ({ ...prev, tags }));
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      handleTagsChange([...formData.tags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleTagsChange(formData.tags.filter(tag => tag !== tagToRemove));
  };

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    handleSlugChange(slug);
  };

  // Auto-detect category button
  const detectCategory = () => {
    const detectedCategory = detectCategoryFromContent(formData.content, formData.title);
    console.log(`[${new Date().toISOString()}] 🔍 Manually detected category: ${detectedCategory}`);
    handleCategoryChange(detectedCategory);
  };

  // SEO Analysis Functions
  const getTitleLengthStatus = () => {
    const length = formData.meta_title.length;
    if (length >= 30 && length <= 60) return { status: 'good', color: 'text-green-600' };
    if (length < 30) return { status: 'short', color: 'text-yellow-600' };
    return { status: 'long', color: 'text-red-600' };
  };

  const getMetaDescriptionStatus = () => {
    const length = formData.meta_description.length;
    if (length >= 120 && length <= 160) return { status: 'good', color: 'text-green-600' };
    if (length < 120) return { status: 'short', color: 'text-yellow-600' };
    return { status: 'long', color: 'text-red-600' };
  };

  const getKeywordInTitleStatus = () => {
    if (!formData.focus_keyword) return { status: 'none', color: 'text-gray-400' };
    const hasKeyword = formData.meta_title.toLowerCase().includes(formData.focus_keyword.toLowerCase());
    return hasKeyword ? { status: 'found', color: 'text-green-600' } : { status: 'missing', color: 'text-red-600' };
  };

  const getContentLengthStatus = () => {
    const wordCount = countWordsProfessionally(formData.content);
    if (wordCount >= 300) return { status: 'good', color: 'text-green-600', count: wordCount };
    if (wordCount >= 150) return { status: 'medium', color: 'text-yellow-600', count: wordCount };
    return { status: 'short', color: 'text-red-600', count: wordCount };
  };

  const getKeywordDensity = () => {
    if (!formData.focus_keyword || !formData.content) return '0.0';
    
    const content = formData.content.toLowerCase();
    const keyword = formData.focus_keyword.toLowerCase();
    const words = content.split(/\s+/).filter(word => word.length > 0);
    
    // Count exact keyword matches (including multi-word keywords)
    const keywordRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const keywordMatches = (content.match(keywordRegex) || []).length;
    
    // Also count individual word matches for single-word keywords
    let totalMatches = keywordMatches;
    if (keyword.split(' ').length === 1) {
      const wordMatches = words.filter(word => word === keyword).length;
      totalMatches = Math.max(keywordMatches, wordMatches);
    }
    
    const density = words.length > 0 ? ((totalMatches / words.length) * 100) : 0;
    return density.toFixed(1);
  };

  const calculateSeoScore = () => {
    let score = 0;
    
    // Title optimization (20 points)
    const titleStatus = getTitleLengthStatus();
    if (titleStatus.status === 'good') score += 15;
    else if (titleStatus.status === 'medium') score += 10;
    else if (titleStatus.status === 'short') score += 5;
    
    // Meta description optimization (20 points)
    const metaStatus = getMetaDescriptionStatus();
    if (metaStatus.status === 'good') score += 15;
    else if (metaStatus.status === 'medium') score += 10;
    else if (metaStatus.status === 'short') score += 5;
    
    // Keyword in title (15 points)
    const keywordInTitle = getKeywordInTitleStatus();
    if (keywordInTitle.status === 'found') score += 15;
    else if (keywordInTitle.status === 'partial') score += 8;
    
    // Keyword in meta description (10 points)
    if (formData.meta_description?.toLowerCase().includes(formData.focus_keyword?.toLowerCase() || '')) {
      score += 10;
    }
    
    // Content length (15 points)
    const contentStatus = getContentLengthStatus();
    if (contentStatus.status === 'good') score += 15;
    else if (contentStatus.status === 'medium') score += 10;
    else if (contentStatus.status === 'short') score += 5;
    
    // Keyword density (10 points)
    const density = parseFloat(getKeywordDensity());
    if (density >= 1.0 && density <= 2.5) score += 10;
    else if (density >= 0.5 && density < 1.0) score += 7;
    else if (density > 2.5 && density <= 4.0) score += 5;
    else if (density > 0 && density < 0.5) score += 3;
    
    // Keyword in content (10 points)
    if (formData.content?.toLowerCase().includes(formData.focus_keyword?.toLowerCase() || '')) {
      score += 10;
    }
    
    return Math.min(score, 100); // Cap at 100
  };

  // Reading Level Analysis (Hemingway-style)
  const getReadingLevel = () => {
    if (!formData.content) {
      return {
        grade: 'N/A',
        level: 'No content',
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        iconColor: 'text-gray-400',
        details: {
          sentences: 0,
          words: 0,
          syllables: 0,
          complexWords: 0,
          averageWordsPerSentence: 0,
          averageSyllablesPerWord: 0
        }
      };
    }

    const text = formData.content;
    
    // Count sentences (ending with . ! ?)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    // Count words
    const words = text.split(/\s+/).filter(word => word.length > 0).length;
    
    // Count syllables (simplified algorithm)
    const countSyllables = (word: string) => {
      word = word.toLowerCase();
      if (word.length <= 3) return 1;
      
      word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
      word = word.replace(/^y/, '');
      
      const matches = word.match(/[aeiouy]{1,2}/g);
      return matches ? matches.length : 1;
    };
    
    const syllables = text.split(/\s+/).reduce((total, word) => {
      return total + countSyllables(word);
    }, 0);
    
    // Count complex words (3+ syllables)
    const complexWords = text.split(/\s+/).filter(word => countSyllables(word) >= 3).length;
    
    // Calculate averages
    const averageWordsPerSentence = sentences > 0 ? words / sentences : 0;
    const averageSyllablesPerWord = words > 0 ? syllables / words : 0;
    
    // Calculate Flesch Reading Ease Score
    const fleschScore = 206.835 - (1.015 * averageWordsPerSentence) - (84.6 * averageSyllablesPerWord);
    
    // Determine grade level and readability
    let grade, level, color, bgColor, borderColor, iconColor;
    
    if (fleschScore >= 90) {
      grade = '5th';
      level = 'Very Easy';
      color = 'text-green-600';
      bgColor = 'bg-green-50';
      borderColor = 'border-green-200';
      iconColor = 'text-green-600';
    } else if (fleschScore >= 80) {
      grade = '6th';
      level = 'Easy';
      color = 'text-green-600';
      bgColor = 'bg-green-50';
      borderColor = 'border-green-200';
      iconColor = 'text-green-600';
    } else if (fleschScore >= 70) {
      grade = '7th';
      level = 'Fairly Easy';
      color = 'text-blue-600';
      bgColor = 'bg-blue-50';
      borderColor = 'border-blue-200';
      iconColor = 'text-blue-600';
    } else if (fleschScore >= 60) {
      grade = '8th-9th';
      level = 'Standard';
      color = 'text-blue-600';
      bgColor = 'bg-blue-50';
      borderColor = 'border-blue-200';
      iconColor = 'text-blue-600';
    } else if (fleschScore >= 50) {
      grade = '10th-12th';
      level = 'Fairly Difficult';
      color = 'text-orange-600';
      bgColor = 'bg-orange-50';
      borderColor = 'border-orange-200';
      iconColor = 'text-orange-600';
    } else if (fleschScore >= 30) {
      grade = 'College';
      level = 'Difficult';
      color = 'text-red-600';
      bgColor = 'bg-red-50';
      borderColor = 'border-red-200';
      iconColor = 'text-red-600';
    } else {
      grade = 'College+';
      level = 'Very Difficult';
      color = 'text-red-600';
      bgColor = 'bg-red-50';
      borderColor = 'border-red-200';
      iconColor = 'text-red-600';
    }

    return {
      grade,
      level,
      color,
      bgColor,
      borderColor,
      iconColor,
      fleschScore: Math.round(fleschScore),
      details: {
        sentences,
        words,
        syllables,
        complexWords,
        averageWordsPerSentence: Math.round(averageWordsPerSentence * 10) / 10,
        averageSyllablesPerWord: Math.round(averageSyllablesPerWord * 100) / 100
      }
    };
  };

  // AI Optimization Functions
  const callAIOptimization = async (action: string, payload: any) => {
    try {
      // Get the user's session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No active session found. Please sign in again.')
      }

      console.log(`🎯 Calling content-optimizer Edge Function for action: ${action}`)
      
      const response = await fetch('https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/content-optimizer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: action,
          content: payload.content,
          topic: payload.topic,
          category: payload.category,
          contentType: payload.contentType,
          feedback: payload.feedback,
          focusKeyword: formData.focus_keyword,
          targetAudience: formData.persona
        })
      });

      console.log(`📡 Content optimizer API Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI optimization failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`📡 Content optimizer API Response data:`, data);
      return data;
    } catch (error) {
      console.error(`AI optimization error for ${action}:`, error);
      throw error;
    }
  };

  const optimizeContentStructure = async () => {
    setOptimizationLoading('improve-structure');
    try {
      const result = await callAIOptimization('improve-structure', {
        topic: formData.title,
        content: formData.content,
        category: formData.category,
        type: 'content-optimization',
        contentType: 'structure-improvement',
        feedback: 'Improve content structure, headings, and flow'
      });

      if (result.content) {
        setFormData(prev => ({ ...prev, content: result.content }));
        toast({
          title: "Structure Improved",
          description: "Content structure has been optimized with better headings and flow.",
        });
      }
    } catch (error) {
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "Failed to optimize content structure",
        variant: "destructive"
      });
    } finally {
      setOptimizationLoading(null);
    }
  };

  const optimizeKeywords = async () => {
    setOptimizationLoading('optimize-keywords');
    try {
      const result = await callAIOptimization('optimize-keywords', {
        topic: formData.title,
        content: formData.content,
        category: formData.category,
        type: 'content-optimization',
        contentType: 'keyword-optimization',
        feedback: `Optimize keyword usage for "${formData.focus_keyword}". Improve density and distribution.`
      });

      if (result.content) {
        setFormData(prev => ({ ...prev, content: result.content }));
        toast({
          title: "Keywords Optimized",
          description: "Content has been optimized for better keyword usage and density.",
        });
      }
    } catch (error) {
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "Failed to optimize keywords",
        variant: "destructive"
      });
    } finally {
      setOptimizationLoading(null);
    }
  };

  const enhanceContent = async () => {
    setOptimizationLoading('enhance-content');
    try {
      const result = await callAIOptimization('enhance-content', {
        topic: formData.title,
        content: formData.content,
        category: formData.category,
        type: 'content-optimization',
        contentType: 'content-enhancement',
        feedback: 'Expand and enhance content quality, add examples, improve clarity'
      });

      if (result.content) {
        setFormData(prev => ({ ...prev, content: result.content }));
        toast({
          title: "Content Enhanced",
          description: "Content has been enhanced with better quality and depth.",
        });
      }
    } catch (error) {
      toast({
        title: "Enhancement Failed",
        description: error instanceof Error ? error.message : "Failed to enhance content",
        variant: "destructive"
      });
    } finally {
      setOptimizationLoading(null);
    }
  };

  const rewriteTitleMeta = async () => {
    setOptimizationLoading('rewrite-title-meta');
    try {
      const result = await callAIOptimization('rewrite-title-meta', {
        topic: formData.title,
        content: formData.content,
        category: formData.category,
        type: 'content-optimization',
        contentType: 'generate-meta',
        feedback: `Generate optimized title and meta description for keyword "${formData.focus_keyword}"`
      });

      if (result.content) {
        let metaData;
        try {
          metaData = JSON.parse(result.content);
        } catch {
          metaData = {
            metaTitle: formData.title,
            metaDescription: formData.content.substring(0, 150) + '...',
            focusKeyword: formData.focus_keyword
          };
        }

        setFormData(prev => ({
          ...prev,
          meta_title: metaData.metaTitle || prev.meta_title,
          meta_description: metaData.metaDescription || prev.meta_description,
          focus_keyword: metaData.focusKeyword || prev.focus_keyword
        }));

        toast({
          title: "SEO Metadata Updated",
          description: "Title and meta description have been optimized for SEO.",
        });
      }
    } catch (error) {
      toast({
        title: "Rewrite Failed",
        description: error instanceof Error ? error.message : "Failed to rewrite title and meta",
        variant: "destructive"
      });
    } finally {
      setOptimizationLoading(null);
    }
  };

  // AI Link Suggester Function
  const generateLinkSuggestions = async () => {
    const timestamp = new Date().toISOString();
    const articleId = formData.id || 'new-article';
    const articleTitle = formData.title || 'Untitled';
    const contentLength = formData.content?.length || 0;
    const wordCount = countWordsProfessionally(formData.content);
    const category = formData.category || 'none';
    const focusKeyword = formData.focus_keyword || 'none';

    // Log the link suggestion initiation
    console.log(`[${timestamp}] 🔗 AI Link Suggester Activated`, {
      articleId,
      articleTitle,
      contentMetrics: {
        contentLength,
        wordCount,
        category,
        focusKeyword
      }
    });

    if (!formData.content || formData.content.length < 100) {
      console.log(`[${timestamp}] ❌ Link suggestions aborted: Insufficient content`, {
        contentLength,
        minimumRequired: 100,
        reason: 'Content must be at least 100 characters to generate meaningful link suggestions'
      });
      
      toast({
        title: "Content Required",
        description: "Please add some content before generating link suggestions.",
        variant: "destructive"
      });
      return;
    }

    console.log(`[${timestamp}] 📊 Content analysis for link suggestions:`, {
      contentLength,
      wordCount,
      contentPreview: formData.content.substring(0, 200) + '...',
      hasFocusKeyword: !!focusKeyword,
      category
    });

    setIsLoadingLinks(true);
    console.log(`[${timestamp}] ⏳ Starting AI link suggestion generation...`);

    try {
      console.log(`[${timestamp}] 🌐 Calling ai-link-suggestions API...`);
      
      const requestPayload = {
        content: formData.content,
        currentArticleId: formData.id
      };

      console.log(`[${timestamp}] 📤 API Request payload:`, {
        contentLength: requestPayload.content.length,
        currentArticleId: requestPayload.currentArticleId,
        contentPreview: requestPayload.content.substring(0, 150) + '...'
      });

      // Get the user's session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No active session found. Please sign in again.')
      }

      const response = await fetch('https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/ai-link-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: requestPayload.content,
          currentArticleId: requestPayload.currentArticleId,
          maxSuggestions: 5
        })
      });

      console.log(`[${timestamp}] 📥 API Response received:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${timestamp}] ❌ Link suggestions API failed:`, {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        
        throw new Error(`Link suggestions failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[${timestamp}] 📋 Link suggestions API response:`, {
        suggestionsCount: data.suggestions?.length || 0,
        hasSuggestions: !!data.suggestions,
        responseKeys: Object.keys(data)
      });

      if (data.suggestions && data.suggestions.length > 0) {
        console.log(`[${timestamp}] ✅ Link suggestions generated successfully:`, {
          totalSuggestions: data.suggestions.length,
          suggestions: data.suggestions.map((suggestion: any, index: number) => ({
            index: index + 1,
            title: suggestion.title,
            relevanceScore: suggestion.relevanceScore,
            articleId: suggestion.articleId,
            suggestedAnchorText: suggestion.suggestedAnchorText
          }))
        });

        setLinkSuggestions(data.suggestions || []);
        
        toast({
          title: "Link Suggestions Generated",
          description: `Found ${data.suggestions.length} relevant internal links.`,
        });

        console.log(`[${timestamp}] 🎯 Link suggestions summary:`, {
          highRelevance: data.suggestions.filter((s: any) => s.relevanceScore >= 0.9).length,
          mediumRelevance: data.suggestions.filter((s: any) => s.relevanceScore >= 0.7 && s.relevanceScore < 0.9).length,
          averageRelevance: data.suggestions.reduce((acc: number, s: any) => acc + s.relevanceScore, 0) / data.suggestions.length
        });

      } else {
        console.log(`[${timestamp}] ⚠️ No link suggestions found:`, {
          reason: 'No highly relevant internal links found for this content',
          contentLength,
          category,
          focusKeyword
        });

        setLinkSuggestions([]);
        
        toast({
          title: "No Suggestions Found",
          description: "No highly relevant internal links found for this content.",
        });
      }

      console.log(`[${timestamp}] ✅ Link suggestion generation completed successfully`);

    } catch (error) {
      console.error(`[${timestamp}] ❌ Link suggestions generation failed:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        articleId,
        contentLength
      });

      toast({
        title: "Link Suggestions Failed",
        description: error instanceof Error ? error.message : "Failed to generate link suggestions",
        variant: "destructive"
      });
    } finally {
      setIsLoadingLinks(false);
      console.log(`[${timestamp}] 🏁 Link suggestion generation process finished`);
    }
  };

  // Enhanced AI Optimization Function with Custom Prompts
  const sendChatMessage = async (message: string) => {
    if (!message.trim()) return;

    const timestamp = new Date().toISOString();
    const articleId = formData.id || 'new-article';
    const articleTitle = formData.title || 'Untitled';
    const content = formData.content || '';
    const category = formData.category || 'financial';
    const focusKeyword = formData.focus_keyword || '';

    console.log(`[${timestamp}] 🤖 Enhanced AI Optimization Request`, {
      articleId,
      articleTitle,
      customContext: message,
      contentMetrics: {
        contentLength: content.length,
        wordCount: countWordsProfessionally(content),
        category,
        focusKeyword
      }
    });

    setIsAiProcessing(true);

    try {
      // Enhanced request with custom prompt support
      const requestBody = {
        topic: articleTitle,
        content: content,
        category: category,
        type: 'custom-prompt',
        systemPrompt: `You are an expert financial content writer and editor. Your task is to help improve and enhance financial content based on specific user requests.

CONTEXT:
- Article Title: ${articleTitle}
- Category: ${category}
- Focus Keyword: ${focusKeyword || 'Not specified'}
- Current Content Length: ${content.length} characters
- Current Word Count: ${countWordsProfessionally(content)} words

REQUIREMENTS:
- Provide specific, actionable improvements
- Maintain the original tone and style
- Focus on the user's specific request
- Return content in markdown format
- Keep suggestions concise and relevant
- Consider SEO best practices
- Ensure factual accuracy

USER REQUEST: ${message}`,
        userPrompt: `Please analyze and improve this content based on the following request:

"${message}"

CURRENT CONTENT:
${content}

Provide specific improvements, enhancements, or rewrites based on the user's request. Return the improved content in markdown format.`,
        model: 'claude', // Use Claude for better content understanding
        temperature: 0.3,
        maxTokens: 4000
      };

      console.log(`[${timestamp}] 📤 Enhanced API Request:`, {
        requestType: 'custom-prompt',
        model: requestBody.model,
        contentLength: requestBody.content.length,
        systemPromptLength: requestBody.systemPrompt.length,
        userPromptLength: requestBody.userPrompt.length
      });

      const response = await fetch('/api/ai/content-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'custom-prompt',
          content: content,
          context: message,
          model: 'gpt-4'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI optimization failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      console.log(`[${timestamp}] 📥 Enhanced API Response:`, {
        hasContent: !!data.content,
        contentLength: data.content?.length || 0,
        modelUsed: data.modelUsed,
        generationSuccess: data.generationSuccess
      });
      
      // Add the AI suggestion to the suggestions list
      if (data.content) {
        setAiSuggestions(prev => [...prev, data.content]);
        console.log(`[${timestamp}] ✅ Enhanced AI suggestion added:`, {
          contentPreview: data.content.substring(0, 100) + '...',
          totalSuggestions: aiSuggestions.length + 1
        });
      }

      toast({
        title: "AI Optimization Complete",
        description: `Enhanced content suggestion ready with ${data.content ? countWordsProfessionally(data.content) : 0} words.`,
      });

    } catch (error) {
      console.error(`[${timestamp}] ❌ Enhanced AI optimization error:`, error);
      toast({
        title: "AI Optimization Failed",
        description: error instanceof Error ? error.message : "Failed to process your request.",
        variant: "destructive"
      });
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Apply AI suggestion to content
  const applyAISuggestion = (suggestion: string) => {
    setFormData(prev => ({
      ...prev,
      content: suggestion
    }));
    toast({
      title: "Content Updated",
      description: "AI suggestion has been applied to your content.",
    });
  };

  // Copy AI suggestion segment to clipboard
  const copyAISegment = async (segment: string) => {
    try {
      await navigator.clipboard.writeText(segment);
      toast({
        title: "Segment Copied",
        description: "AI suggestion segment copied to clipboard. You can now paste it anywhere in your content.",
      });
    } catch (error) {
      console.error('Failed to copy segment:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy segment to clipboard.",
        variant: "destructive"
      });
    }
  };

  // Insert AI segment at cursor position
  const insertAISegment = (segment: string) => {
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentContent = formData.content || '';
      
      const newContent = currentContent.substring(0, start) + segment + currentContent.substring(end);
      
      setFormData(prev => ({
        ...prev,
        content: newContent
      }));

      // Set cursor position after inserted content
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + segment.length, start + segment.length);
      }, 0);

      toast({
        title: "Segment Inserted",
        description: "AI suggestion segment inserted at cursor position.",
      });
    } else {
      // Fallback: append to end of content
      setFormData(prev => ({
        ...prev,
        content: (prev.content || '') + '\n\n' + segment
      }));
      toast({
        title: "Segment Added",
        description: "AI suggestion segment added to end of content.",
      });
    }
  };

  // Enhanced AI suggestion segmentation with content analysis
  const segmentAISuggestion = (suggestion: string) => {
    // Enhanced segmentation by paragraphs, sections, and content type
    const segments = suggestion
      .split(/\n\s*\n/) // Split by double newlines (paragraphs)
      .filter(segment => segment.trim().length > 0)
      .map((segment, index) => {
        const content = segment.trim();
        const wordCount = content.split(/\s+/).length;
        
        // Determine segment type based on content analysis
        let type = 'paragraph';
        if (content.startsWith('#')) {
          type = 'heading';
        } else if (content.startsWith('-') || content.startsWith('*') || content.startsWith('•')) {
          type = 'list';
        } else if (content.includes('**') && content.includes('**')) {
          type = 'highlighted';
        } else if (content.length > 200 && wordCount > 30) {
          type = 'detailed';
        } else if (wordCount < 15) {
          type = 'brief';
        }
        
        // Suggest optimal insertion line number
        const suggestedLineNumber = suggestOptimalLineNumber(content, type);
        
        return {
          id: `segment-${index}`,
          content: content,
          type: type,
          wordCount: wordCount,
          characterCount: content.length,
          estimatedTokens: Math.ceil(content.length / 4), // Rough token estimation
          suggestedLineNumber
        };
      })
      .filter(segment => segment.wordCount > 3); // Filter out very short segments

    console.log(`[${new Date().toISOString()}] 🔪 Content segmentation completed:`, {
      originalLength: suggestion.length,
      segmentsCount: segments.length,
      segmentTypes: segments.map(s => s.type),
      totalWords: segments.reduce((sum, s) => sum + s.wordCount, 0)
    });

    return segments;
  };

  // Suggest optimal line number for insertion based on content type and current content
  const suggestOptimalLineNumber = (content: string, type: string): number => {
    const currentContent = formData.content || '';
    const lines = currentContent.split('\n');
    
    // If content is empty, suggest line 1
    if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
      return 1;
    }
    
    // For headings, try to find a good spot after existing headings
    if (type === 'heading') {
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().startsWith('#')) {
          return i + 2; // Insert after the last heading
        }
      }
      return 1; // If no headings found, insert at top
    }
    
    // For lists, try to find a good spot near other lists
    if (type === 'list') {
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().match(/^[-*•]\s+/)) {
          return i + 2; // Insert after the last list item
        }
      }
    }
    
    // For paragraphs, insert at the end
    return lines.length + 1;
  };

  // Insert AI segment at specific line number
  const insertAISegmentAtLine = (segment: any, lineNumber: number) => {
    const currentContent = formData.content || '';
    const lines = currentContent.split('\n');
    
    // Validate line number
    if (lineNumber < 1 || lineNumber > lines.length + 1) {
      toast({
        title: "Invalid Line Number",
        description: "Please select a valid line number for insertion.",
        variant: "destructive"
      });
      return;
    }
    
    // Insert the segment at the specified line
    const newLines = [...lines];
    newLines.splice(lineNumber - 1, 0, segment.content);
    const newContent = newLines.join('\n');
    
    setFormData(prev => ({
      ...prev,
      content: newContent
    }));
    
    toast({
      title: "Segment Inserted",
      description: `${segment.type} inserted at line ${lineNumber}.`,
    });
    
    // Log the insertion
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📝 AI Segment Inserted`, {
      segmentType: segment.type,
      lineNumber,
      wordCount: segment.wordCount,
      contentPreview: segment.content.substring(0, 100) + '...'
    });
  };

  // Process content with AI using segmentation for large content
  const processContentWithSegmentation = async (content: string, prompt: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔄 Processing large content with segmentation`);
    
    // If content is small enough, process normally
    if (content.length < 3000) {
      return await sendChatMessage(prompt);
    }
    
    // For large content, segment and process in chunks
    const segments = segmentAISuggestion(content);
    const largeSegments = segments.filter(s => s.characterCount > 500);
    
    console.log(`[${timestamp}] 📊 Large content analysis:`, {
      totalSegments: segments.length,
      largeSegments: largeSegments.length,
      averageSegmentSize: Math.round(segments.reduce((sum, s) => sum + s.characterCount, 0) / segments.length)
    });
    
    // Process each large segment individually
    const processedSegments: string[] = [];
    
    for (const segment of largeSegments) {
      const segmentPrompt = `${prompt}\n\nFocus on this specific section:\n\n${segment.content}`;
      
      try {
        // This would need to be implemented as a separate function
        // For now, we'll just add the segment as-is
        processedSegments.push(segment.content);
      } catch (error) {
        console.error(`[${timestamp}] ❌ Error processing segment ${segment.id}:`, error);
        processedSegments.push(segment.content); // Keep original if processing fails
      }
    }
    
    return processedSegments.join('\n\n');
  };

  const handleQuickAction = async (action: string) => {
    const timestamp = new Date().toISOString();
    const articleId = formData.id || 'new-article';
    const articleTitle = formData.title || 'Untitled';
    const contentLength = formData.content?.length || 0;
    const wordCount = countWordsProfessionally(formData.content);
    const focusKeyword = formData.focus_keyword || 'none';
    const category = formData.category || 'none';
    const persona = formData.persona || 'none';

    // Log the action initiation with detailed context
    console.log(`[${timestamp}] 🚀 AI Optimization Tool Activated`, {
      action,
      articleId,
      articleTitle,
      contentMetrics: {
        contentLength,
        wordCount,
        focusKeyword,
        category,
        persona
      },
      currentSeoScore: calculateSeoScore()
    });

    try {
      switch (action) {
        case 'improve-structure':
          console.log(`[${timestamp}] 📝 Improving content structure for article: "${articleTitle}"`);
          await optimizeContentStructure();
          break;

        case 'optimize-keywords':
          console.log(`[${timestamp}] 🔍 Optimizing keywords for article: "${articleTitle}"`);
          
          // Detailed keyword analysis
          const content = formData.content?.toLowerCase() || '';
          const keyword = focusKeyword.toLowerCase();
          const words = content.split(/\s+/).filter(word => word.length > 0);
          const keywordRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          const exactMatches = (content.match(keywordRegex) || []).length;
          const keywordDensity = getKeywordDensity();
          
          console.log(`[${timestamp}] 📊 Detailed keyword analysis:`, {
            focusKeyword,
            keywordDensity: keywordDensity + '%',
            totalWords: words.length,
            exactKeywordMatches: exactMatches,
            keywordInTitle: getKeywordInTitleStatus().status,
            keywordInMetaDescription: formData.meta_description?.toLowerCase().includes(keyword) || false,
            keywordInContent: content.includes(keyword) || false,
            keywordPositions: formData.content ? 
              Array.from(content.matchAll(keywordRegex)).map(match => (match as RegExpMatchArray).index) : [],
            densityAnalysis: {
              currentDensity: parseFloat(keywordDensity),
              optimalRange: '1.0% - 2.5%',
              status: parseFloat(keywordDensity) >= 1.0 && parseFloat(keywordDensity) <= 2.5 ? 'optimal' : 
                      parseFloat(keywordDensity) < 1.0 ? 'too low' : 'too high'
            }
          });
          
          await optimizeKeywords();
          break;

        case 'enhance-content':
          console.log(`[${timestamp}] ✨ Enhancing content for article: "${articleTitle}"`);
          await enhanceContent();
          break;

        case 'rewrite-title-meta':
          console.log(`[${timestamp}] 🎯 Rewriting title and meta for article: "${articleTitle}"`);
          await rewriteTitleMeta();
          break;

        case 'generate-links':
          console.log(`[${timestamp}] 🔗 Generating internal links for article: "${articleTitle}"`);
          await generateLinkSuggestions();
          break;

        default:
          console.warn(`[${timestamp}] ⚠️ Unknown optimization action: ${action}`);
      }

      // Log successful action completion
      console.log(`[${timestamp}] ✅ AI optimization tool "${action}" processed successfully for article: "${articleTitle}"`);

    } catch (error) {
      // Log any errors that occur during optimization
      console.error(`[${timestamp}] ❌ Error in AI optimization tool "${action}" for article: "${articleTitle}"`, {
        error: error.message,
        stack: error.stack,
        action,
        articleId,
        articleTitle
      });
    }
  };

  // Shortcode insertion function
  const insertShortcode = (shortcode: string) => {
    const textarea = document.querySelector('textarea[placeholder*="Write your article content"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentContent = formData.content || '';
      
      const newContent = currentContent.substring(0, start) + shortcode + currentContent.substring(end);
      handleContentChange(newContent);
      
      // Set cursor position after the inserted shortcode
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + shortcode.length, start + shortcode.length);
      }, 0);
      
      toast({
        title: "Shortcode Inserted",
        description: `Added ${shortcode} to your content`,
      });
    }
  };

  // Keyboard shortcuts for IDE-like experience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+I for quick shortcode insert
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        // Focus the textarea and show a quick insert menu
        const textarea = document.querySelector('textarea[placeholder*="Write your article content"]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
          // You could show a quick insert popover here
          toast({
            title: "Quick Insert",
            description: "Use the toolbar below to insert shortcodes",
          });
        }
      }
      
      // Ctrl+Shift+E for quick image insert
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        insertShortcode('{{image:1:alt-text:type=inline}}');
      }
      
      // Ctrl+Shift+C for quick CTA insert
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        insertShortcode('{{cta:1:style=default:position=center}}');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Floating toolbar for selected text
  useEffect(() => {
    const handleTextSelection = () => {
      const textarea = document.querySelector('textarea[placeholder*="Write your article content"]') as HTMLTextAreaElement;
      if (textarea && textarea === document.activeElement) {
        const selection = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
        
        if (selection.length > 0) {
          // Calculate position for floating toolbar
          const rect = textarea.getBoundingClientRect();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          
          // Create a temporary element to measure text position
          const temp = document.createElement('div');
          temp.style.position = 'absolute';
          temp.style.visibility = 'hidden';
          temp.style.whiteSpace = 'pre-wrap';
      temp.style.fontFamily = getComputedStyle(textarea).fontFamily;
      temp.style.fontSize = getComputedStyle(textarea).fontSize;
      temp.style.lineHeight = getComputedStyle(textarea).lineHeight;
      temp.style.width = textarea.offsetWidth + 'px';
      temp.style.padding = getComputedStyle(textarea).padding;
      temp.style.border = getComputedStyle(textarea).border;
      temp.style.boxSizing = getComputedStyle(textarea).boxSizing;
      
      const textBeforeSelection = textarea.value.substring(0, start);
      temp.textContent = textBeforeSelection;
      document.body.appendChild(temp);
      
      const lines = temp.textContent.split('\n');
      const lastLine = lines[lines.length - 1];
      const lineHeight = parseInt(getComputedStyle(temp).lineHeight);
      const charWidth = temp.offsetWidth / Math.max(temp.textContent.length, 1);
      
      document.body.removeChild(temp);
      
      const x = rect.left + (lastLine.length * charWidth);
      const y = rect.top + (lines.length - 1) * lineHeight;
      
      setToolbarPosition({ x, y });
      setShowFloatingToolbar(true);
        } else {
          setShowFloatingToolbar(false);
        }
      } else {
        setShowFloatingToolbar(false);
      }
    };

    const textarea = document.querySelector('textarea[placeholder*="Write your article content"]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.addEventListener('mouseup', handleTextSelection);
      textarea.addEventListener('keyup', handleTextSelection);
      textarea.addEventListener('input', handleTextSelection);
      
      return () => {
        textarea.removeEventListener('mouseup', handleTextSelection);
        textarea.removeEventListener('keyup', handleTextSelection);
        textarea.removeEventListener('input', handleTextSelection);
      };
    }
  }, [formData.content]);

  return (
    <div className={`transition-all duration-300 ${optimizeDrawerOpen ? 'mr-96' : 'mr-0'}`}>
      <div className="p-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'content'
                ? 'bg-blue-700 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Content
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'metadata'
                ? 'bg-blue-700 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Target className="w-4 h-4" />
            SEO & Meta
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'social'
                ? 'bg-blue-700 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Globe className="w-4 h-4" />
            Social Media
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'media'
                ? 'bg-blue-700 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Media
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-700 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Tag className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <Input
                type="text"
                value={formData.title}
                onChange={async (e) => {
                  const title = e.target.value;
                  setFormData(prev => ({ ...prev, title }));
                  await onTitleChange(title);
                }}
                className="text-xl font-semibold"
                placeholder="Enter article title..."
              />
            </div>

            {/* SEO KPI Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-sm text-blue-900">Content Quality</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {getContentLengthStatus().count}
                </div>
                <div className={`text-xs ${getContentLengthStatus().color}`}>
                  {getContentLengthStatus().count >= 300 ? 'Good' : 'Needs more content'}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-sm text-green-900">Keyword Density</span>
                </div>
                <div className="text-2xl font-bold text-green-700">
                  {getKeywordDensity()}%
                </div>
                <div className="text-xs text-green-600">
                  {(() => {
                    const density = parseFloat(getKeywordDensity());
                    if (density >= 1.0 && density <= 2.5) return 'Optimal';
                    if (density >= 0.5 && density < 1.0) return 'Good';
                    if (density > 2.5 && density <= 4.0) return 'High';
                    if (density > 4.0) return 'Too High';
                    return 'Too Low';
                  })()}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-sm text-purple-900">SEO Score</span>
                </div>
                <div className="text-2xl font-bold text-purple-700">
                  {calculateSeoScore()}
                </div>
                <div className="text-xs text-purple-600">
                  out of 100
                </div>
              </div>

              <div className={`${getReadingLevel().bgColor} border ${getReadingLevel().borderColor} rounded-lg p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className={`w-5 h-5 ${getReadingLevel().iconColor}`} />
                  <span className={`font-medium text-sm ${getReadingLevel().color}`}>Reading Level</span>
                </div>
                <div className={`text-2xl font-bold ${getReadingLevel().color}`}>
                  {getReadingLevel().grade}
                </div>
                <div className={`text-xs ${getReadingLevel().color}`}>
                  {getReadingLevel().level}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Content</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setContentPreviewMode(!contentPreviewMode)}
                  className="flex items-center gap-2"
                >
                  {contentPreviewMode ? (
                    <>
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Preview
                    </>
                  )}
                </Button>
              </div>
              
              {contentPreviewMode ? (
                <div className="border border-gray-300 rounded-md p-6 bg-white min-h-[500px] prose prose-sm max-w-none">
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700 font-medium mb-1">📖 Markdown Preview</p>
                    <p className="text-xs text-blue-600">This shows how your content will appear when published.</p>
                  </div>
                  {formData.content ? (
                    <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-li:text-gray-700">
                      <div 
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(formData.content) }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <FileText className="w-12 h-12 mx-auto" />
                      </div>
                      <p className="text-gray-500 italic">No content to preview. Start writing to see the formatted version.</p>
                    </div>
                  )}
                </div>
              ) : (
                <IDEEditor
                  value={formData.content}
                  onChange={handleContentChange}
                  placeholder="Write your article content here... (Markdown supported)"
                  showToolbar={true}
                  showLineNumbers={true}
                  onSave={() => {
                    // Auto-save functionality
                    console.log('Auto-saving content...')
                  }}
                  onPreview={() => setContentPreviewMode(true)}
                />
              )}
            </div>

            {/* Floating Toolbar for Selected Text */}
            {showFloatingToolbar && (
              <div 
                className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex items-center gap-1"
                style={{
                  left: `${toolbarPosition.x}px`,
                  top: `${toolbarPosition.y - 50}px`
                }}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    const textarea = document.querySelector('textarea[placeholder*="Write your article content"]') as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const selection = textarea.value.substring(start, end);
                      const newText = `**${selection}**`;
                      const newContent = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
                      handleContentChange(newContent);
                      setShowFloatingToolbar(false);
                    }
                  }}
                >
                  <strong>B</strong>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    const textarea = document.querySelector('textarea[placeholder*="Write your article content"]') as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const selection = textarea.value.substring(start, end);
                      const newText = `*${selection}*`;
                      const newContent = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
                      handleContentChange(newContent);
                      setShowFloatingToolbar(false);
                    }
                  }}
                >
                  <em>I</em>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    const textarea = document.querySelector('textarea[placeholder*="Write your article content"]') as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const selection = textarea.value.substring(start, end);
                      const newText = `[${selection}](url)`;
                      const newContent = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
                      handleContentChange(newContent);
                      setShowFloatingToolbar(false);
                    }
                  }}
                >
                  <Link className="w-3 h-3" />
                </Button>
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-blue-600"
                  onClick={() => {
                    insertShortcode('{{image:1:alt-text:type=inline}}');
                    setShowFloatingToolbar(false);
                  }}
                >
                  <Image className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-green-600"
                  onClick={() => {
                    insertShortcode('{{cta:1:style=default:position=center}}');
                    setShowFloatingToolbar(false);
                  }}
                >
                  <Target className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Shortcode Manager */}
            <div className="mt-6">
              <ShortcodeManager 
                onShortcodeInsert={insertShortcode} 
                articleId={formData.id}
                onFactCheck={() => {
                  // Trigger fact-check manually
                  const event = new CustomEvent('triggerFactCheck');
                  window.dispatchEvent(event);
                }}
              />
            </div>

            {/* AI Optimization Form */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">AI Optimization Form</h3>
            <div className="text-xs text-gray-500">
              Customize your AI optimization request.
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">AI Context</label>
            <Textarea
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              rows={4}
              placeholder="Describe the specific changes or improvements you want to make to this article (e.g., 'improve readability', 'optimize keyword density', 'rewrite title and meta')."
              className="font-mono text-sm"
            />
            <div className="mt-2 flex gap-2">
              <Button
                onClick={() => {
                  if (aiContext.trim()) {
                    sendChatMessage(aiContext);
                  }
                }}
                disabled={isAiProcessing || !aiContext.trim()}
                className="flex items-center gap-2"
              >
                {isAiProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isAiProcessing ? 'Processing...' : 'Submit AI Request'}
              </Button>
              <Button
                onClick={() => setAiContext('')}
                variant="outline"
                disabled={isAiProcessing}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(aiOptimizationPrompts).map(([action, prompt]) => (
              <Button
                key={action}
                onClick={() => {
                  setAiContext(prompt);
                  handleQuickAction(action);
                }}
                disabled={optimizationLoading !== null || isAiProcessing}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 rounded-full border border-blue-200 text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={prompt}
              >
                {optimizationLoading === action ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                ) : (
                  <Lightbulb className="w-3 h-3 text-blue-600" />
                )}
                <span className="whitespace-nowrap text-xs font-medium">
                  {optimizationLoading === action ? 'Processing...' : action.replace(/-/g, ' ')}
                </span>
              </Button>
            ))}
          </div>

          {/* Internal Link Suggestions */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Internal Link Suggestions</h3>
              <Button
                onClick={generateLinkSuggestions}
                disabled={isLoadingLinks || !formData.content || formData.content.length < 100}
                className="flex items-center gap-2"
              >
                {isLoadingLinks ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
                {isLoadingLinks ? 'Analyzing...' : 'Generate Suggestions'}
              </Button>
            </div>

            {!formData.content || formData.content.length < 100 ? (
              <div className="text-center py-8 text-gray-500">
                <Link className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">Add at least 100 characters of content to generate link suggestions.</p>
              </div>
            ) : linkSuggestions.length === 0 && !isLoadingLinks ? (
              <div className="text-center py-8 text-gray-500">
                <Link className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No link suggestions yet. Click "Generate Suggestions" to find relevant internal links.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {linkSuggestions.map((suggestion, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(suggestion.relevanceScore * 100)}% match
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{suggestion.reason}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Suggested anchor text:</span>
                      <code className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {suggestion.suggestedAnchorText}
                      </code>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const timestamp = new Date().toISOString();
                          const articleId = formData.id || 'new-article';
                          const articleTitle = formData.title || 'Untitled';
                          const linkMarkdown = `[${suggestion.suggestedAnchorText}](/article/${suggestion.articleId})`;
                          
                          console.log(`[${timestamp}] 🔗 Internal Link Added`, {
                            articleId,
                            articleTitle,
                            linkDetails: {
                              targetArticleId: suggestion.articleId,
                              targetArticleTitle: suggestion.title,
                              anchorText: suggestion.suggestedAnchorText,
                              relevanceScore: suggestion.relevanceScore,
                              markdownLink: linkMarkdown
                            },
                            contentMetrics: {
                              contentLengthBefore: formData.content.length,
                              contentLengthAfter: formData.content.length + linkMarkdown.length + 2 // +2 for \n\n
                            }
                          });

                          setFormData(prev => ({
                            ...prev,
                            content: prev.content + '\n\n' + linkMarkdown
                          }));
                          
                          toast({
                            title: "Link Added",
                            description: "Internal link has been added to your content.",
                          });

                          console.log(`[${timestamp}] ✅ Link successfully added to content`);
                        }}
                      >
                        Add Link
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const timestamp = new Date().toISOString();
                          const articleId = formData.id || 'new-article';
                          const articleTitle = formData.title || 'Untitled';
                          
                          console.log(`[${timestamp}] 👁️ Article Preview Opened`, {
                            sourceArticleId: articleId,
                            sourceArticleTitle: articleTitle,
                            targetArticleId: suggestion.articleId,
                            targetArticleTitle: suggestion.title,
                            relevanceScore: suggestion.relevanceScore,
                            previewUrl: `/article/${suggestion.articleId}`
                          });

                          window.open(`/article/${suggestion.articleId}`, '_blank');
                        }}
                      >
                        Preview Article
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Suggestions with Segmentation */}
          {aiSuggestions.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">AI Suggestions</h3>
              <div className="space-y-4">
                {aiSuggestions.map((suggestion, index) => {
                  const segments = segmentAISuggestion(suggestion);
                  
                  return (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-blue-900">Suggestion {index + 1}</h4>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => applyAISuggestion(suggestion)}
                            size="sm"
                            variant="outline"
                            className="text-blue-700 border-blue-300 hover:bg-blue-100"
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Apply All
                          </Button>
                        </div>
                      </div>
                      
                      {/* Segmented Content */}
                      <div className="space-y-2">
                        {segments.map((segment) => (
                          <div key={segment.id} className="bg-white border border-blue-100 rounded p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  {segment.type} • {segment.wordCount} words
                                </span>
                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded font-mono">
                                  Line {segment.suggestedLineNumber}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => copyAISegment(segment.content)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-blue-600 hover:bg-blue-100"
                                  title="Copy segment to clipboard"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button
                                  onClick={() => insertAISegmentAtLine(segment, segment.suggestedLineNumber)}
                                  size="sm"
                                  variant="default"
                                  className="h-6 px-2 bg-green-600 hover:bg-green-700 text-white"
                                  title={`Insert at line ${segment.suggestedLineNumber}`}
                                >
                                  <ArrowDownToLine className="w-3 h-3" />
                                </Button>
                                <Button
                                  onClick={() => insertAISegment(segment.content)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-blue-600 hover:bg-blue-100"
                                  title="Insert segment at cursor position"
                                >
                                  <ArrowDownToLine className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="prose prose-sm max-w-none text-blue-800 prose-headings:text-blue-900 prose-p:text-blue-800 prose-strong:text-blue-900 prose-ul:text-blue-800 prose-li:text-blue-800">
                              <div 
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(segment.content) }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

          </div>
        )}

        {/* Metadata Tab */}
        {activeTab === 'metadata' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
              <Input
                type="text"
                value={formData.meta_title}
                onChange={(e) => handleMetaTitleChange(e.target.value)}
                placeholder="SEO title for search engines"
                maxLength={60}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  {formData.meta_title.length}/60 characters
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${getTitleLengthStatus().color}`}>
                    {getTitleLengthStatus().status === 'good' ? '✓' : 
                     getTitleLengthStatus().status === 'short' ? '⚠' : '✗'} Length
                  </span>
                  <span className={`text-xs ${getKeywordInTitleStatus().color}`}>
                    {getKeywordInTitleStatus().status === 'found' ? '✓' : 
                     getKeywordInTitleStatus().status === 'missing' ? '✗' : '○'} Keyword
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
              <Textarea
                value={formData.meta_description}
                onChange={(e) => handleMetaDescriptionChange(e.target.value)}
                rows={3}
                placeholder="SEO description for search engines"
                maxLength={160}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  {formData.meta_description.length}/160 characters
                </p>
                <span className={`text-xs ${getMetaDescriptionStatus().color}`}>
                  {getMetaDescriptionStatus().status === 'good' ? '✓' : 
                   getMetaDescriptionStatus().status === 'short' ? '⚠' : '✗'} Length
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Focus Keyword</label>
              <Input
                type="text"
                value={formData.focus_keyword}
                onChange={(e) => handleFocusKeywordChange(e.target.value)}
                placeholder="Primary keyword for SEO"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="URL slug"
                />
                <Button onClick={generateSlug} variant="outline">
                  Generate
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Social Media Tab */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Social Media Optimization</h3>
              <p className="text-sm text-blue-700">
                Customize how your content appears when shared on social media platforms. 
                These settings will generate the appropriate meta tags for optimal social sharing.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Social Media Title</label>
              <Input
                type="text"
                value={formData.og_title || formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, og_title: e.target.value }))}
                placeholder="Title for social media sharing (defaults to article title)"
                maxLength={60}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.og_title?.length || formData.title.length}/60 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Social Media Description</label>
              <Textarea
                value={formData.og_description || formData.meta_description || formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, og_description: e.target.value }))}
                rows={3}
                placeholder="Description for social media sharing"
                maxLength={160}
              />
              <p className="text-xs text-gray-500 mt-1">
                {(formData.og_description || formData.meta_description || formData.excerpt).length}/160 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Social Media Image URL</label>
              <Input
                type="text"
                value={formData.og_image || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, og_image: e.target.value }))}
                placeholder="https://example.com/social-image.jpg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended size: 1200x630 pixels for optimal display across platforms
              </p>
            </div>

            {/* Social Media Preview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Facebook Preview */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-blue-600" />
                  Facebook
                </h4>
                <div className="bg-white border rounded-lg overflow-hidden">
                  {formData.og_image && (
                    <div className="h-32 bg-gray-200">
                      <img 
                        src={formData.og_image} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">
                      publishare.com
                    </p>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                      {formData.og_title || formData.title}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {formData.og_description || formData.meta_description || formData.excerpt}
                    </p>
                  </div>
                </div>
              </div>

              {/* Twitter Preview */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-blue-400" />
                  Twitter
                </h4>
                <div className="bg-white border rounded-lg overflow-hidden">
                  {formData.og_image && (
                    <div className="h-32 bg-gray-200">
                      <img 
                        src={formData.og_image} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                      {formData.og_title || formData.title}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {formData.og_description || formData.meta_description || formData.excerpt}
                    </p>
                    <p className="text-xs text-gray-500">
                      publishare.com
                    </p>
                  </div>
                </div>
              </div>

              {/* LinkedIn Preview */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-blue-700" />
                  LinkedIn
                </h4>
                <div className="bg-white border rounded-lg overflow-hidden">
                  {formData.og_image && (
                    <div className="h-32 bg-gray-200">
                      <img 
                        src={formData.og_image} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                      {formData.og_title || formData.title}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {formData.og_description || formData.meta_description || formData.excerpt}
                    </p>
                    <p className="text-xs text-gray-500">
                      publishare.com
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Meta Tags Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-sm text-green-900 mb-2">Generated Meta Tags:</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-700">Open Graph</Badge>
                  <code className="bg-green-100 px-2 py-1 rounded">
                    og:title, og:description, og:image
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-700">Twitter Card</Badge>
                  <code className="bg-green-100 px-2 py-1 rounded">
                    twitter:title, twitter:description, twitter:image
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Media Management</h3>
              <p className="text-sm text-blue-700">
                Manage images, videos, and other media assets for your article. Upload new content, 
                organize existing media, and generate AI-powered images.
              </p>
            </div>

            {/* Featured Image Section */}
            <div className="bg-white border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Featured Image</h3>
                  <p className="text-sm text-gray-500">
                    Main image displayed at the top of your article
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsGeneratingFeaturedImage(true);
                      setShowAIImageGenerator(true);
                    }}
                    disabled={isGeneratingFeaturedImage}
                  >
                    {isGeneratingFeaturedImage ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate with AI
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMediaLibrary(true)}
                  >
                    <Image className="w-4 h-4 mr-2" />
                    Select from Library
                  </Button>
                  {showMediaLibrary && (
                    <MediaLibrarySelector
                      onImageSelected={(imageUrl, altText) => {
                        setFormData(prev => ({
                          ...prev,
                          featured_image_url: imageUrl,
                          featured_image_alt: altText || prev.featured_image_alt || (prev.title ? `${prev.title} - Featured Image` : 'Featured Image')
                        }))
                        setShowMediaLibrary(false)
                        toast({
                          title: 'Image Selected',
                          description: 'Featured image has been updated.',
                          variant: 'default'
                        })
                      }}
                      onClose={() => setShowMediaLibrary(false)}
                      filterByType="featured"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Featured Image URL
                  </label>
                  <Input
                    type="text"
                    value={formData.featured_image_url || ''}
                    onChange={(e) => {
                      const url = e.target.value;
                      const validation = validateImageUrl(url);
                      setFeaturedImageValidation(validation);
                      setFormData(prev => ({ ...prev, featured_image_url: url }));
                      
                      if (!validation.valid && validation.error) {
                        toast({
                          title: 'Invalid Image URL',
                          description: validation.error,
                          variant: 'destructive'
                        });
                      }
                    }}
                    placeholder="https://example.com/image.jpg or /images/image.jpg"
                    className={featuredImageValidation.valid ? '' : 'border-red-500'}
                  />
                  {!featuredImageValidation.valid && featuredImageValidation.error && (
                    <p className="text-xs text-red-600 mt-1">{featuredImageValidation.error}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended size: 1200x630 pixels (1.91:1 aspect ratio). Supports .jpg, .jpeg, .png, .webp, .gif, .svg
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alt Text
                  </label>
                  <Input
                    type="text"
                    value={formData.featured_image_alt || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, featured_image_alt: e.target.value }))}
                    placeholder={formData.title ? `${formData.title} - Featured Image` : 'Featured image description'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Describe the image for accessibility and SEO. Defaults to article title if not provided.
                  </p>
                </div>

                {/* Image Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <FeaturedImagePreview
                    imageUrl={formData.featured_image_url || ''}
                    altText={formData.featured_image_alt || formData.title || 'Featured image preview'}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mb-6">
              <Button
                onClick={() => setShowAIImageGenerator(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI Images
              </Button>
              <Button
                onClick={() => setShowImageUploader(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Images
              </Button>
              <Button
                onClick={() => setShowMarkdownConverter(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                Convert Markdown
              </Button>
              <Button
                onClick={() => setShowPromotionManager(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Promotion Manager
              </Button>
            </div>

            <EnhancedMediaManager 
              articleId={formData.id || 'new-article'} 
              onFeaturedImageChange={(imageUrl, altText) => {
                setFormData(prev => ({ 
                  ...prev, 
                  og_image: imageUrl,
                  meta_description: prev.meta_description || altText
                }));
              }}
            />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="space-y-2">
                <Select value={formData.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retirement">Retirement</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="tax">Tax</SelectItem>
                    <SelectItem value="estate">Estate Planning</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="housing">Housing</SelectItem>
                    <SelectItem value="financial">Financial Planning</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={detectCategory} 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Auto-Detect from Content
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Persona</label>
              {personasLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="space-y-2">
                  <Select value={formData.persona} onValueChange={handlePersonaChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target persona" />
                    </SelectTrigger>
                    <SelectContent>
                      {personas.map((persona) => (
                        <SelectItem key={persona.id} value={persona.id}>
                          {persona.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.category && (
                    <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                      💡 Auto-suggested based on category: {categoryToPersonaMap[formData.category] || 'None'}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Add a tag..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      addTag(input.value);
                      input.value = '';
                    }}
                    variant="outline"
                  >
                    Add
                  </Button>
                </div>
                
                <Button 
                  onClick={generateAITags} 
                  disabled={isGeneratingTags}
                  variant="outline" 
                  className="w-full"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {isGeneratingTags ? 'Generating AI Tags...' : 'Generate AI Tags'}
                </Button>
                
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                
                {formData.tags.length === 0 && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded text-center">
                    No tags yet. Use AI generation or add manually.
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
              <Textarea
                value={formData.excerpt}
                onChange={(e) => handleExcerptChange(e.target.value)}
                rows={3}
                placeholder="Brief summary of the article..."
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.excerpt.length}/200 characters
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Image Generator Modal */}
      {showAIImageGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <AIImageGenerator
              content={formData.content}
              title={formData.title}
              articleId={formData.id}
              defaultImageType={isGeneratingFeaturedImage ? 'featured-image' : undefined}
              onImageGenerated={handleImageGenerated}
              onClose={() => {
                setShowAIImageGenerator(false);
                setIsGeneratingFeaturedImage(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Markdown Converter Modal */}
      {showMarkdownConverter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <MarkdownConverter
              markdownContent={formData.content}
              onHtmlGenerated={handleHtmlGenerated}
              onClose={() => setShowMarkdownConverter(false)}
            />
          </div>
        </div>
      )}

      {/* Image Uploader Modal */}
      {showImageUploader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <ImageUploader
              onImageUploaded={handleImageUploaded}
              onClose={() => setShowImageUploader(false)}
            />
          </div>
        </div>
      )}

      {/* Promotion Manager Modal */}
      {showPromotionManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <PromotionManager
              content={{
                title: formData.title,
                content: formData.content,
                excerpt: formData.excerpt,
                featured_image: formData.featured_image,
                category: formData.category,
                tags: formData.tags
              }}
              onClose={() => setShowPromotionManager(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
} 