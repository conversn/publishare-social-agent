-- Multi-User Schema Fixes for Publishare
-- Run this in your Supabase SQL Editor to fix user connectivity issues

-- ========================================
-- 1. FIX ARTICLES TABLE NAMING CONVENTION
-- ========================================

-- Rename author_id to user_id for consistency
ALTER TABLE articles RENAME COLUMN author_id TO user_id;

-- Update the foreign key constraint
ALTER TABLE articles DROP CONSTRAINT articles_author_id_fkey;
ALTER TABLE articles ADD CONSTRAINT articles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- ========================================
-- 2. ADD USER OWNERSHIP TO SHARED TABLES
-- ========================================

-- Add user_id to article_categories for user-specific categories
ALTER TABLE article_categories ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_article_categories_user_id ON article_categories(user_id);

-- Add user_id to tags for user-specific tags
ALTER TABLE tags ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_tags_user_id ON tags(user_id);

-- Add user_id to personas for user-specific personas
ALTER TABLE personas ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_personas_user_id ON personas(user_id);

-- Add user_id to content_strategy for user-specific strategies
ALTER TABLE content_strategy ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_content_strategy_user_id ON content_strategy(user_id);

-- Add user_id to consultation_requests
ALTER TABLE consultation_requests ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_consultation_requests_user_id ON consultation_requests(user_id);

-- Add user_id to newsletter_signups
ALTER TABLE newsletter_signups ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_newsletter_signups_user_id ON newsletter_signups(user_id);

-- Add user_id to system_health for user-specific metrics
ALTER TABLE system_health ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_system_health_user_id ON system_health(user_id);

-- ========================================
-- 3. ADD DIRECT USER CONNECTIONS TO MEDIA
-- ========================================

-- Add direct user_id to media_library (in addition to article_id)
ALTER TABLE media_library ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_media_library_user_id ON media_library(user_id);

-- ========================================
-- 4. UPDATE RLS POLICIES FOR NEW FIELDS
-- ========================================

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

-- Add RLS policies for new user-owned tables
ALTER TABLE article_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own categories" ON article_categories
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert their own categories" ON article_categories
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own categories" ON article_categories
  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own categories" ON article_categories
  FOR DELETE USING (auth.uid()::text = user_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own tags" ON tags
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert their own tags" ON tags
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own tags" ON tags
  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own tags" ON tags
  FOR DELETE USING (auth.uid()::text = user_id);

ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own personas" ON personas
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert their own personas" ON personas
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own personas" ON personas
  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own personas" ON personas
  FOR DELETE USING (auth.uid()::text = user_id);

ALTER TABLE content_strategy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own content strategy" ON content_strategy
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own content strategy" ON content_strategy
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own content strategy" ON content_strategy
  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own content strategy" ON content_strategy
  FOR DELETE USING (auth.uid()::text = user_id);

ALTER TABLE consultation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own consultation requests" ON consultation_requests
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own consultation requests" ON consultation_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own consultation requests" ON consultation_requests
  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own consultation requests" ON consultation_requests
  FOR DELETE USING (auth.uid()::text = user_id);

ALTER TABLE newsletter_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own newsletter signups" ON newsletter_signups
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own newsletter signups" ON newsletter_signups
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own newsletter signups" ON newsletter_signups
  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own newsletter signups" ON newsletter_signups
  FOR DELETE USING (auth.uid()::text = user_id);

-- Update media_library RLS policies to include direct user_id
DROP POLICY IF EXISTS "Users can view their own media" ON media_library;
DROP POLICY IF EXISTS "Users can insert their own media" ON media_library;

CREATE POLICY "Users can view their own media" ON media_library
  FOR SELECT USING (
    auth.uid()::text = user_id OR 
    auth.uid()::text = (SELECT user_id FROM articles WHERE id = media_library.article_id)
  );

CREATE POLICY "Users can insert their own media" ON media_library
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id OR 
    auth.uid()::text = (SELECT user_id FROM articles WHERE id = media_library.article_id)
  );

-- ========================================
-- 5. UPDATE HELPER FUNCTIONS
-- ========================================

-- Update dashboard stats function to use user_id
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_uuid text)
RETURNS TABLE (
  total_articles bigint,
  total_calculators bigint,
  total_views bigint,
  engagement_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT a.id)::bigint as total_articles,
    COUNT(DISTINCT qs.id)::bigint as total_calculators,
    COALESCE(SUM(CAST(a.meta_description AS INTEGER)), 0)::bigint as total_views,
    COALESCE(AVG(CAST(a.seo_score AS NUMERIC)), 0) as engagement_rate
  FROM articles a
  LEFT JOIN quiz_sessions qs ON qs.user_id = user_uuid
  WHERE a.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update recent articles function to use user_id
CREATE OR REPLACE FUNCTION get_user_recent_articles(user_uuid text, limit_count int DEFAULT 5)
RETURNS TABLE (
  id text,
  title text,
  status text,
  created_at timestamptz,
  views bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.status,
    a.created_at,
    COALESCE(CAST(a.meta_description AS BIGINT), 0) as views
  FROM articles a
  WHERE a.user_id = user_uuid
  ORDER BY a.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. CREATE MIGRATION DATA FUNCTIONS
-- ========================================

-- Function to migrate existing data to set user_id for shared tables
CREATE OR REPLACE FUNCTION migrate_existing_data_to_users()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- For each user, set their user_id on shared tables based on their articles
  FOR user_record IN SELECT id FROM auth.users LOOP
    -- Set user_id on article_categories based on articles
    UPDATE article_categories 
    SET user_id = user_record.id 
    WHERE id IN (
      SELECT DISTINCT ac.id 
      FROM article_categories ac
      JOIN articles a ON a.category = ac.name
      WHERE a.user_id = user_record.id
    );
    
    -- Set user_id on tags based on articles
    UPDATE tags 
    SET user_id = user_record.id 
    WHERE id IN (
      SELECT DISTINCT t.id 
      FROM tags t
      JOIN article_tag_relations atr ON atr.tag_id = t.id
      JOIN articles a ON a.id = atr.article_id
      WHERE a.user_id = user_record.id
    );
    
    -- Set user_id on personas based on articles
    UPDATE personas 
    SET user_id = user_record.id 
    WHERE name IN (
      SELECT DISTINCT persona 
      FROM articles 
      WHERE user_id = user_record.id AND persona IS NOT NULL
    );
    
    -- Set user_id on media_library based on articles
    UPDATE media_library 
    SET user_id = user_record.id 
    WHERE article_id IN (
      SELECT id FROM articles WHERE user_id = user_record.id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. CREATE USER CONTENT SUMMARY VIEW
-- ========================================

-- Create a comprehensive view for user dashboard
CREATE OR REPLACE VIEW user_content_summary AS
SELECT 
  u.id as user_id,
  p.full_name,
  p.email,
  COUNT(DISTINCT a.id) as total_articles,
  COUNT(DISTINCT qs.id) as total_calculators,
  COUNT(DISTINCT c.id) as total_contacts,
  COUNT(DISTINCT fs.id) as total_form_submissions,
  COUNT(DISTINCT ml.id) as total_media_files,
  COUNT(DISTINCT ac.id) as total_categories,
  COUNT(DISTINCT t.id) as total_tags,
  COUNT(DISTINCT ps.id) as total_personas,
  COALESCE(SUM(CAST(a.meta_description AS INTEGER)), 0) as total_views,
  COALESCE(AVG(CAST(a.seo_score AS NUMERIC)), 0) as avg_engagement_rate,
  MAX(a.created_at) as last_article_created,
  MAX(qs.created_at) as last_calculator_created
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN articles a ON a.user_id = u.id
LEFT JOIN quiz_sessions qs ON qs.user_id = u.id
LEFT JOIN contacts c ON c.user_id = u.id
LEFT JOIN form_submissions fs ON fs.user_id = u.id
LEFT JOIN media_library ml ON ml.user_id = u.id
LEFT JOIN article_categories ac ON ac.user_id = u.id
LEFT JOIN tags t ON t.user_id = u.id
LEFT JOIN personas ps ON ps.user_id = u.id
GROUP BY u.id, p.full_name, p.email;

-- ========================================
-- 8. CREATE USER CONTENT CLEANUP FUNCTION
-- ========================================

-- Function to clean up user content when user is deleted
CREATE OR REPLACE FUNCTION cleanup_user_content(deleted_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete user's articles (cascades to related data)
  DELETE FROM articles WHERE user_id = deleted_user_id;
  
  -- Delete user's quiz sessions
  DELETE FROM quiz_sessions WHERE user_id = deleted_user_id;
  
  -- Delete user's contacts
  DELETE FROM contacts WHERE user_id = deleted_user_id;
  
  -- Delete user's form submissions
  DELETE FROM form_submissions WHERE user_id = deleted_user_id;
  
  -- Delete user's media files
  DELETE FROM media_library WHERE user_id = deleted_user_id;
  
  -- Delete user's categories
  DELETE FROM article_categories WHERE user_id = deleted_user_id;
  
  -- Delete user's tags
  DELETE FROM tags WHERE user_id = deleted_user_id;
  
  -- Delete user's personas
  DELETE FROM personas WHERE user_id = deleted_user_id;
  
  -- Delete user's content strategy
  DELETE FROM content_strategy WHERE user_id = deleted_user_id;
  
  -- Delete user's consultation requests
  DELETE FROM consultation_requests WHERE user_id = deleted_user_id;
  
  -- Delete user's newsletter signups
  DELETE FROM newsletter_signups WHERE user_id = deleted_user_id;
  
  -- Delete user's system health metrics
  DELETE FROM system_health WHERE user_id = deleted_user_id;
  
  -- Delete user's profile
  DELETE FROM profiles WHERE id = deleted_user_id;
  
  -- Delete user's roles
  DELETE FROM user_roles WHERE user_id = deleted_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 9. EXECUTE MIGRATION
-- ========================================

-- Run the migration to set user_id for existing data
SELECT migrate_existing_data_to_users();

-- ========================================
-- 10. VERIFICATION QUERIES
-- ========================================

-- Check that all tables have proper user associations
SELECT 
  'articles' as table_name,
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id
FROM articles
UNION ALL
SELECT 
  'article_categories' as table_name,
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id
FROM article_categories
UNION ALL
SELECT 
  'tags' as table_name,
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id
FROM tags
UNION ALL
SELECT 
  'personas' as table_name,
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id
FROM personas
UNION ALL
SELECT 
  'media_library' as table_name,
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id
FROM media_library;
