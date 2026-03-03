export interface Article {
  id: string;
  title: string;
  slug?: string;
  content: string;
  markdown_body?: string;
  html_body?: string;
  excerpt: string;
  status: 'draft' | 'published' | 'archived' | 'scheduled' | 'pending' | 'private';
  created_at: string | null;
  updated_at: string | null;
  // OWNERSHIP (Account Level)
  user_id: string;        // Account owner (keenan@callready.io)
  // AUTHORSHIP (Team Level)  
  author_id: string;      // Specific author (00000000-0000-0000-0000-000000000001)
  categories?: ArticleCategory[];
  featured_image_url?: string;
  featured_image_alt?: string;
  meta_title?: string;
  meta_description?: string;
  focus_keyword?: string;
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  schema_type?: string;
  breadcrumb_title?: string;
  readability_score?: number;
  seo_score?: number;
  content_type?: 'html' | 'markdown';
  persona?: string;
  tags?: string[];
  scheduledDate?: string | null;
  author?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface Author {
  id: string;
  user_id: string;        // Account owner
  name: string;           // Author name
  email?: string;         // Author email
  bio?: string;           // Author bio
  avatar_url?: string;    // Author avatar
  role: 'author' | 'editor' | 'contributor' | 'admin';
  is_active: boolean;
  permissions?: Record<string, any>;
  created_at: string;
  updated_at: string;
  article_count?: number; // Computed field from get_user_authors function
}

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  user_id?: string;       // Added for multi-user support
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
  user_id?: string;       // Added for multi-user support
}

export interface ArticleFormData {
  title: string;
  excerpt: string;
  content: string;
  markdown_body?: string;
  html_body?: string;
  category: string;
  status: 'draft' | 'published' | 'scheduled' | 'pending' | 'private';
  persona?: string;
  tags?: string[];
  scheduledDate?: string | null;
  featured_image_url?: string;
  featured_image_alt?: string;
  meta_title?: string;
  meta_description?: string;
  slug?: string;
  focus_keyword?: string;
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  schema_type?: string;
  breadcrumb_title?: string;
  content_type?: 'html' | 'markdown';
  author_id?: string;     // Added for author selection
}

export interface WorkflowData {
  title: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
}

export type WorkflowStep = 'topic' | 'seo' | 'image' | 'complete';

export interface CMSUser {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'author';
  permissions: string[];
}
