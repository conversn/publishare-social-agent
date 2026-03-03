-- ========================================
-- SCHEMA VERIFICATION AND FIX FOR PUBLISHARE
-- ========================================
-- This script verifies the current database state and applies necessary fixes
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. VERIFY CURRENT ARTICLES TABLE STRUCTURE
-- ========================================

-- Check what columns currently exist in articles table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  CASE 
    WHEN constraint_name IS NOT NULL THEN 'Has FK: ' || constraint_name
    ELSE 'No FK'
  END as foreign_key_info
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu 
  ON c.column_name = kcu.column_name 
  AND c.table_name = kcu.table_name
WHERE c.table_name = 'articles' 
ORDER BY ordinal_position;

-- ========================================
-- 2. VERIFY AUTHORS TABLE EXISTS
-- ========================================

-- Check if authors table exists
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.tables 
WHERE table_name = 'authors';

-- ========================================
-- 3. APPLY FIXES BASED ON CURRENT STATE
-- ========================================

-- Fix 1: If articles table has author_id but no user_id, rename it
DO $$
BEGIN
  -- Check if articles has author_id but no user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'author_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'user_id'
  ) THEN
    -- Rename author_id to user_id
    ALTER TABLE articles RENAME COLUMN author_id TO user_id;
    
    -- Update foreign key constraint
    ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_author_id_fkey;
    ALTER TABLE articles ADD CONSTRAINT articles_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
      
    RAISE NOTICE 'Renamed author_id to user_id in articles table';
  ELSE
    RAISE NOTICE 'Articles table already has user_id or missing author_id';
  END IF;
END $$;

-- Fix 2: Create authors table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  bio TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'author' CHECK (role IN ('author', 'editor', 'contributor', 'admin')),
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique author names per user
  UNIQUE(user_id, name)
);

-- Fix 3: Add author_id to articles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'author_id'
  ) THEN
    -- Add author_id column
    ALTER TABLE articles ADD COLUMN author_id UUID REFERENCES public.authors(id);
    CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
    
    -- Add comments for clarity
    COMMENT ON COLUMN articles.user_id IS 'Account owner who owns this content';
    COMMENT ON COLUMN articles.author_id IS 'Specific author who wrote this content';
    
    RAISE NOTICE 'Added author_id column to articles table';
  ELSE
    RAISE NOTICE 'Articles table already has author_id column';
  END IF;
END $$;

-- ========================================
-- 4. ADD USER OWNERSHIP TO OTHER TABLES
-- ========================================

-- Add user_id to article_categories if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'article_categories' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE article_categories ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_article_categories_user_id ON article_categories(user_id);
    RAISE NOTICE 'Added user_id to article_categories';
  END IF;
END $$;

-- Add user_id to tags if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tags' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tags ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
    RAISE NOTICE 'Added user_id to tags';
  END IF;
END $$;

-- Add user_id to personas if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personas' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE personas ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);
    RAISE NOTICE 'Added user_id to personas';
  END IF;
END $$;

-- Add user_id to content_strategy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'content_strategy' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE content_strategy ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_content_strategy_user_id ON content_strategy(user_id);
    RAISE NOTICE 'Added user_id to content_strategy';
  END IF;
END $$;

-- Add user_id to consultation_requests if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consultation_requests' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE consultation_requests ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_consultation_requests_user_id ON consultation_requests(user_id);
    RAISE NOTICE 'Added user_id to consultation_requests';
  END IF;
END $$;

-- Add user_id to media_library if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'media_library' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE media_library ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_media_library_user_id ON media_library(user_id);
    RAISE NOTICE 'Added user_id to media_library';
  END IF;
END $$;

-- ========================================
-- 5. CREATE DEFAULT AUTHORS FOR EXISTING USERS
-- ========================================

-- Function to create default author for a user
CREATE OR REPLACE FUNCTION create_default_author_for_user(user_uuid UUID, user_email TEXT, user_name TEXT)
RETURNS UUID AS $$
DECLARE
  default_author_id UUID;
BEGIN
  -- Create default author for this user
  INSERT INTO authors (user_id, name, email, role, is_active)
  VALUES (
    user_uuid,
    COALESCE(user_name, 'Default Author'),
    user_email,
    'author',
    true
  )
  ON CONFLICT (user_id, name) DO NOTHING
  RETURNING id INTO default_author_id;
  
  -- If no insert happened due to conflict, get the existing author
  IF default_author_id IS NULL THEN
    SELECT id INTO default_author_id 
    FROM authors 
    WHERE user_id = user_uuid AND name = COALESCE(user_name, 'Default Author')
    LIMIT 1;
  END IF;
  
  RETURN default_author_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default authors for existing users with articles
DO $$
DECLARE
  user_record RECORD;
  default_author_id UUID;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT a.user_id, p.email, p.full_name
    FROM articles a 
    LEFT JOIN profiles p ON p.id = a.user_id
    LEFT JOIN authors auth ON auth.user_id = a.user_id 
    WHERE auth.id IS NULL AND a.user_id IS NOT NULL
  LOOP
    -- Create default author for this user
    SELECT create_default_author_for_user(
      user_record.user_id, 
      user_record.email,
      user_record.full_name
    ) INTO default_author_id;
    
    -- Update articles to use the default author
    UPDATE articles 
    SET author_id = default_author_id 
    WHERE user_id = user_record.user_id AND author_id IS NULL;
    
    RAISE NOTICE 'Created default author for user % and updated articles', user_record.user_id;
  END LOOP;
END $$;

-- ========================================
-- 6. UPDATE RLS POLICIES
-- ========================================

-- Enable RLS on articles if not already enabled
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own articles" ON articles;
DROP POLICY IF EXISTS "Users can insert their own articles" ON articles;
DROP POLICY IF EXISTS "Users can update their own articles" ON articles;
DROP POLICY IF EXISTS "Users can delete their own articles" ON articles;

-- Create new RLS policies with user_id
CREATE POLICY "Users can view their own articles" ON articles
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own articles" ON articles
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own articles" ON articles
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own articles" ON articles
  FOR DELETE USING (auth.uid()::text = user_id);

-- Enable RLS on authors table
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authors
CREATE POLICY "Users can view their own authors" ON authors
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own authors" ON authors
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own authors" ON authors
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own authors" ON authors
  FOR DELETE USING (auth.uid()::text = user_id);

-- ========================================
-- 7. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to get user's authors
CREATE OR REPLACE FUNCTION get_user_authors(user_uuid TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  is_active BOOLEAN,
  article_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.email,
    a.role,
    a.is_active,
    COUNT(art.id)::BIGINT as article_count
  FROM authors a
  LEFT JOIN articles art ON art.author_id = a.id
  WHERE a.user_id = user_uuid::UUID
  GROUP BY a.id, a.name, a.email, a.role, a.is_active
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user dashboard stats
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_uuid TEXT)
RETURNS TABLE (
  total_articles BIGINT,
  total_calculators BIGINT,
  total_contacts BIGINT,
  recent_articles_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT a.id)::BIGINT as total_articles,
    COUNT(DISTINCT qs.id)::BIGINT as total_calculators,
    COUNT(DISTINCT c.id)::BIGINT as total_contacts,
    COUNT(DISTINCT CASE WHEN a.created_at >= NOW() - INTERVAL '30 days' THEN a.id END)::BIGINT as recent_articles_count
  FROM auth.users u
  LEFT JOIN articles a ON a.user_id = u.id
  LEFT JOIN quiz_sessions qs ON qs.user_id = u.id
  LEFT JOIN contacts c ON c.user_id = u.id
  WHERE u.id = user_uuid::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 8. FINAL VERIFICATION
-- ========================================

-- Verify the final state
SELECT 'ARTICLES TABLE FINAL STATE' as verification_step;
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'articles' 
ORDER BY ordinal_position;

SELECT 'AUTHORS TABLE FINAL STATE' as verification_step;
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'authors' 
ORDER BY ordinal_position;

SELECT 'SAMPLE DATA VERIFICATION' as verification_step;
SELECT 
  'Articles with both user_id and author_id' as check_type,
  COUNT(*) as count
FROM articles 
WHERE user_id IS NOT NULL AND author_id IS NOT NULL
UNION ALL
SELECT 
  'Authors created' as check_type,
  COUNT(*) as count
FROM authors;

-- ========================================
-- 9. CLEANUP AND OPTIMIZATION
-- ========================================

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_user_id_created_at ON articles(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_author_id_created_at ON articles(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_authors_user_id_active ON authors(user_id, is_active);

-- Analyze tables for better query planning
ANALYZE articles;
ANALYZE authors;

RAISE NOTICE 'Schema verification and fix completed successfully!';
