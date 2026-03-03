-- ========================================
-- MIGRATE ALL CONTENT TO ADMIN USER
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
-- 2. SHOW CURRENT CONTENT DISTRIBUTION
-- ========================================

SELECT 'CURRENT CONTENT DISTRIBUTION' as step;

-- Articles by user
SELECT 'ARTICLES BY USER' as content_type;
SELECT 
  u.email,
  COUNT(a.id) as count
FROM auth.users u
LEFT JOIN articles a ON a.user_id = u.id
WHERE a.id IS NOT NULL
GROUP BY u.id, u.email
ORDER BY count DESC;

-- Calculators by user
SELECT 'CALCULATORS BY USER' as content_type;
SELECT 
  u.email,
  COUNT(qs.id) as count
FROM auth.users u
LEFT JOIN quiz_sessions qs ON qs.user_id = u.id
WHERE qs.id IS NOT NULL
GROUP BY u.id, u.email
ORDER BY count DESC;

-- Contacts by user
SELECT 'CONTACTS BY USER' as content_type;
SELECT 
  u.email,
  COUNT(c.id) as count
FROM auth.users u
LEFT JOIN contacts c ON c.user_id = u.id
WHERE c.id IS NOT NULL
GROUP BY u.id, u.email
ORDER BY count DESC;

-- ========================================
-- 3. MIGRATE ALL CONTENT TO ADMIN
-- ========================================

DO $$
DECLARE
  admin_user_id UUID;
  articles_migrated INTEGER := 0;
  calculators_migrated INTEGER := 0;
  contacts_migrated INTEGER := 0;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'keenan@callready.io';
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user keenan@callready.io not found';
  END IF;
  
  -- Migrate articles
  UPDATE articles 
  SET user_id = admin_user_id
  WHERE user_id != admin_user_id;
  GET DIAGNOSTICS articles_migrated = ROW_COUNT;
  
  -- Migrate calculators
  UPDATE quiz_sessions 
  SET user_id = admin_user_id
  WHERE user_id != admin_user_id;
  GET DIAGNOSTICS calculators_migrated = ROW_COUNT;
  
  -- Migrate contacts
  UPDATE contacts 
  SET user_id = admin_user_id
  WHERE user_id != admin_user_id;
  GET DIAGNOSTICS contacts_migrated = ROW_COUNT;
  
  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '- Articles migrated: %', articles_migrated;
  RAISE NOTICE '- Calculators migrated: %', calculators_migrated;
  RAISE NOTICE '- Contacts migrated: %', contacts_migrated;
  RAISE NOTICE '- All content now belongs to admin user: %', admin_user_id;
END $$;

-- ========================================
-- 4. VERIFY MIGRATION
-- ========================================

SELECT 'VERIFICATION - CONTENT DISTRIBUTION AFTER MIGRATION' as step;

-- Articles by user (should all be admin)
SELECT 'ARTICLES BY USER (AFTER MIGRATION)' as content_type;
SELECT 
  u.email,
  COUNT(a.id) as count
FROM auth.users u
LEFT JOIN articles a ON a.user_id = u.id
WHERE a.id IS NOT NULL
GROUP BY u.id, u.email
ORDER BY count DESC;

-- Calculators by user (should all be admin)
SELECT 'CALCULATORS BY USER (AFTER MIGRATION)' as content_type;
SELECT 
  u.email,
  COUNT(qs.id) as count
FROM auth.users u
LEFT JOIN quiz_sessions qs ON qs.user_id = u.id
WHERE qs.id IS NOT NULL
GROUP BY u.id, u.email
ORDER BY count DESC;

-- Contacts by user (should all be admin)
SELECT 'CONTACTS BY USER (AFTER MIGRATION)' as content_type;
SELECT 
  u.email,
  COUNT(c.id) as count
FROM auth.users u
LEFT JOIN contacts c ON c.user_id = u.id
WHERE c.id IS NOT NULL
GROUP BY u.id, u.email
ORDER BY count DESC;

-- ========================================
-- 5. SHOW ADMIN'S COMPLETE CONTENT
-- ========================================

SELECT 'ADMIN CONTENT SUMMARY' as step;
SELECT 
  'Articles' as content_type,
  COUNT(*) as count
FROM articles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'keenan@callready.io')

UNION ALL

SELECT 
  'Calculators' as content_type,
  COUNT(*) as count
FROM quiz_sessions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'keenan@callready.io')

UNION ALL

SELECT 
  'Contacts' as content_type,
  COUNT(*) as count
FROM contacts 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'keenan@callready.io');

-- ========================================
-- 6. SUCCESS MESSAGE
-- ========================================

SELECT 'All content migration completed successfully!' as status;
SELECT 'All articles, calculators, and contacts now belong to keenan@callready.io' as details;
