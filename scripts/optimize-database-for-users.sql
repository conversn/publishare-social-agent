-- ========================================
-- DATABASE OPTIMIZATION FOR MULTI-USER SUPPORT
-- ========================================
-- This script ensures proper user relationships and optimizes the database
-- Run this in your Supabase SQL Editor
-- ========================================

-- ========================================
-- 1. ENSURE ARTICLES TABLE HAS PROPER USER_ID RELATIONSHIP
-- ========================================

-- Check and add user_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'user_id'
  ) THEN
    -- Add user_id column
    ALTER TABLE articles ADD COLUMN user_id UUID;
    
    -- If author_id exists, migrate data
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'articles' AND column_name = 'author_id'
    ) THEN
      -- Copy author_id to user_id temporarily (will be fixed below)
      UPDATE articles SET user_id = author_id WHERE user_id IS NULL;
    END IF;
    
    RAISE NOTICE 'Added user_id column to articles table';
  END IF;
END $$;

-- Ensure user_id is NOT NULL (after data migration)
DO $$
BEGIN
  -- First, set any NULL user_ids to a default (if needed)
  -- This should only happen if there are orphaned articles
  UPDATE articles 
  SET user_id = (SELECT id FROM auth.users LIMIT 1)
  WHERE user_id IS NULL 
  AND EXISTS (SELECT 1 FROM auth.users);
  
  -- Now make it NOT NULL if we have data
  IF EXISTS (SELECT 1 FROM articles WHERE user_id IS NOT NULL) THEN
    ALTER TABLE articles ALTER COLUMN user_id SET NOT NULL;
    RAISE NOTICE 'Set user_id to NOT NULL';
  END IF;
END $$;

-- Drop old foreign key if it exists with wrong name
DO $$
BEGIN
  -- Drop any existing foreign key constraints on user_id
  FOR r IN (
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'articles' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%user_id%'
  ) LOOP
    EXECUTE 'ALTER TABLE articles DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
  END LOOP;
END $$;

-- Create proper foreign key relationship to auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'articles' 
    AND constraint_name = 'articles_user_id_fkey'
  ) THEN
    ALTER TABLE articles 
    ADD CONSTRAINT articles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Created foreign key constraint: articles_user_id_fkey';
  END IF;
END $$;

-- ========================================
-- 2. CREATE AUTHORS TABLE IF MISSING
-- ========================================

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
  UNIQUE(user_id, name)
);

-- Add author_id to articles if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE articles ADD COLUMN author_id UUID REFERENCES public.authors(id);
    CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
    RAISE NOTICE 'Added author_id column to articles table';
  END IF;
END $$;

-- ========================================
-- 3. CREATE PERFORMANCE INDEXES
-- ========================================

-- Indexes for articles table
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON articles(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_user_id_status ON articles(user_id, status);
CREATE INDEX IF NOT EXISTS idx_articles_user_id_created_at ON articles(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_user_id_updated_at ON articles(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id) WHERE author_id IS NOT NULL;

-- Indexes for authors table
CREATE INDEX IF NOT EXISTS idx_authors_user_id ON authors(user_id);
CREATE INDEX IF NOT EXISTS idx_authors_user_id_active ON authors(user_id, is_active);

-- ========================================
-- 4. ADD USER_ID TO RELATED TABLES
-- ========================================

-- article_categories
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

-- tags
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

-- personas
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

-- content_strategy
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

-- media_library
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
-- 5. SET UP ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on articles
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own articles" ON articles;
DROP POLICY IF EXISTS "Users can insert their own articles" ON articles;
DROP POLICY IF EXISTS "Users can update their own articles" ON articles;
DROP POLICY IF EXISTS "Users can delete their own articles" ON articles;

-- Create optimized RLS policies
CREATE POLICY "Users can view their own articles" ON articles
  FOR SELECT 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own articles" ON articles
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own articles" ON articles
  FOR UPDATE 
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own articles" ON articles
  FOR DELETE 
  USING (auth.uid()::text = user_id::text);

-- Enable RLS on authors
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own authors" ON authors;
DROP POLICY IF EXISTS "Users can insert their own authors" ON authors;
DROP POLICY IF EXISTS "Users can update their own authors" ON authors;
DROP POLICY IF EXISTS "Users can delete their own authors" ON authors;

CREATE POLICY "Users can view their own authors" ON authors
  FOR SELECT 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own authors" ON authors
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own authors" ON authors
  FOR UPDATE 
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own authors" ON authors
  FOR DELETE 
  USING (auth.uid()::text = user_id::text);

-- ========================================
-- 6. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to get user's authors
CREATE OR REPLACE FUNCTION get_user_authors(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  is_active BOOLEAN,
  article_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  LEFT JOIN articles art ON art.author_id = a.id AND art.user_id = user_uuid
  WHERE a.user_id = user_uuid
  GROUP BY a.id, a.name, a.email, a.role, a.is_active
  ORDER BY a.created_at DESC;
END;
$$;

-- Function to get user dashboard stats
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_uuid UUID)
RETURNS TABLE (
  total_articles BIGINT,
  published_articles BIGINT,
  draft_articles BIGINT,
  total_authors BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE a.id IS NOT NULL)::BIGINT as total_articles,
    COUNT(*) FILTER (WHERE a.id IS NOT NULL AND a.status = 'published')::BIGINT as published_articles,
    COUNT(*) FILTER (WHERE a.id IS NOT NULL AND a.status = 'draft')::BIGINT as draft_articles,
    COUNT(DISTINCT auth.id)::BIGINT as total_authors
  FROM auth.users u
  LEFT JOIN articles a ON a.user_id = u.id
  LEFT JOIN authors auth ON auth.user_id = u.id
  WHERE u.id = user_uuid;
END;
$$;

-- ========================================
-- 7. REFRESH SUPABASE SCHEMA CACHE
-- ========================================

-- Notify Supabase to refresh schema cache
-- This is done automatically, but we can force it by querying the schema
DO $$
BEGIN
  -- Query the schema to trigger cache refresh
  PERFORM * FROM information_schema.table_constraints 
  WHERE table_name = 'articles' 
  LIMIT 1;
  
  RAISE NOTICE 'Schema cache should refresh automatically';
END $$;

-- ========================================
-- 8. VERIFICATION QUERIES
-- ========================================

-- Verify articles table structure
SELECT 
  'ARTICLES TABLE STRUCTURE' as check_type,
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN constraint_name IS NOT NULL THEN 'Has FK: ' || constraint_name
    ELSE 'No FK'
  END as constraint_info
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu 
  ON c.table_name = kcu.table_name 
  AND c.column_name = kcu.column_name
  AND kcu.constraint_name IN (
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
  )
WHERE c.table_name = 'articles' 
  AND c.column_name IN ('user_id', 'author_id')
ORDER BY c.column_name;

-- Verify foreign key exists
SELECT 
  'FOREIGN KEY VERIFICATION' as check_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'articles'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'user_id';

-- Verify indexes
SELECT 
  'INDEX VERIFICATION' as check_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'articles'
  AND indexname LIKE '%user_id%'
ORDER BY indexname;

-- ========================================
-- 9. ANALYZE TABLES FOR OPTIMAL PERFORMANCE
-- ========================================

ANALYZE articles;
ANALYZE authors;
ANALYZE article_categories;
ANALYZE tags;
ANALYZE personas;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Database optimization completed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify the foreign key relationship exists';
  RAISE NOTICE '2. Test queries in your application';
  RAISE NOTICE '3. If errors persist, refresh Supabase schema cache in dashboard';
  RAISE NOTICE '========================================';
END $$;

