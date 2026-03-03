-- Multi-User Database Setup for Publishare
-- Run this in your Supabase SQL Editor

-- 1. Enable Row Level Security (RLS) on all tables
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS Policies for Articles
CREATE POLICY "Users can view their own articles" ON articles
  FOR SELECT USING (auth.uid()::text = author_id);

CREATE POLICY "Users can insert their own articles" ON articles
  FOR INSERT WITH CHECK (auth.uid()::text = author_id);

CREATE POLICY "Users can update their own articles" ON articles
  FOR UPDATE USING (auth.uid()::text = author_id);

CREATE POLICY "Users can delete their own articles" ON articles
  FOR DELETE USING (auth.uid()::text = author_id);

-- 3. Create RLS Policies for Profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid()::text = id);

-- 4. Create RLS Policies for Media Library
CREATE POLICY "Users can view their own media" ON media_library
  FOR SELECT USING (auth.uid()::text = (
    SELECT author_id FROM articles WHERE id = media_library.article_id
  ));

CREATE POLICY "Users can insert their own media" ON media_library
  FOR INSERT WITH CHECK (auth.uid()::text = (
    SELECT author_id FROM articles WHERE id = media_library.article_id
  ));

-- 5. Create RLS Policies for Quiz Sessions
CREATE POLICY "Users can view their own quiz sessions" ON quiz_sessions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own quiz sessions" ON quiz_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 6. Create RLS Policies for Contacts
CREATE POLICY "Users can view their own contacts" ON contacts
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 7. Create RLS Policies for Form Submissions
CREATE POLICY "Users can view their own form submissions" ON form_submissions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own form submissions" ON form_submissions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 8. Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. Create function to get user dashboard stats
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
  WHERE a.author_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to get user's recent articles
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
  WHERE a.author_id = user_uuid
  ORDER BY a.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to get user's popular calculators
CREATE OR REPLACE FUNCTION get_user_popular_calculators(user_uuid text, limit_count int DEFAULT 5)
RETURNS TABLE (
  id text,
  quiz_type text,
  uses bigint,
  conversion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qs.id,
    qs.quiz_type,
    COUNT(*)::bigint as uses,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE qs.status = 'completed')::numeric / COUNT(*)::numeric) * 100
      ELSE 0 
    END as conversion_rate
  FROM quiz_sessions qs
  WHERE qs.user_id = user_uuid
  GROUP BY qs.id, qs.quiz_type
  ORDER BY uses DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
