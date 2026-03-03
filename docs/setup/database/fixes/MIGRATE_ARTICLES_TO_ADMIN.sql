-- ========================================
-- MIGRATE ALL ARTICLES TO ADMIN USER
-- ========================================
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. FIND ADMIN USER ID
-- ========================================

SELECT 'FINDING ADMIN USER' as step;
SELECT 
  id as admin_user_id,
  email as admin_email,
  created_at
FROM auth.users 
WHERE email = 'keenan@callready.io';

-- ========================================
-- 2. SHOW CURRENT ARTICLE DISTRIBUTION
-- ========================================

SELECT 'CURRENT ARTICLE DISTRIBUTION' as step;
SELECT 
  u.email,
  COUNT(a.id) as article_count,
  MIN(a.created_at) as first_article,
  MAX(a.created_at) as last_article
FROM auth.users u
LEFT JOIN articles a ON a.user_id = u.id
WHERE a.id IS NOT NULL
GROUP BY u.id, u.email
ORDER BY article_count DESC;

-- ========================================
-- 3. MIGRATE ALL ARTICLES TO ADMIN
-- ========================================

DO $$
DECLARE
  admin_user_id UUID;
  articles_migrated INTEGER := 0;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'keenan@callready.io';
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user keenan@callready.io not found';
  END IF;
  
  -- Update all articles to belong to admin
  UPDATE articles 
  SET user_id = admin_user_id
  WHERE user_id != admin_user_id;
  
  GET DIAGNOSTICS articles_migrated = ROW_COUNT;
  
  RAISE NOTICE 'Migrated % articles to admin user %', articles_migrated, admin_user_id;
END $$;

-- ========================================
-- 4. VERIFY MIGRATION
-- ========================================

SELECT 'VERIFICATION - ARTICLE DISTRIBUTION AFTER MIGRATION' as step;
SELECT 
  u.email,
  COUNT(a.id) as article_count,
  MIN(a.created_at) as first_article,
  MAX(a.created_at) as last_article
FROM auth.users u
LEFT JOIN articles a ON a.user_id = u.id
WHERE a.id IS NOT NULL
GROUP BY u.id, u.email
ORDER BY article_count DESC;

-- ========================================
-- 5. SHOW ADMIN'S ARTICLES
-- ========================================

SELECT 'ADMIN ARTICLES DETAIL' as step;
SELECT 
  id,
  title,
  status,
  created_at,
  updated_at
FROM articles 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'keenan@callready.io'
)
ORDER BY created_at DESC;

-- ========================================
-- 6. SUCCESS MESSAGE
-- ========================================

SELECT 'Article migration completed successfully!' as status;
