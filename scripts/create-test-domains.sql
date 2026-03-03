-- Create test domains for HomeSimple local SEO
-- Run this in Supabase SQL Editor if domains table is empty

-- ============================================================================
-- CREATE TEST DOMAINS FOR TAMPA
-- ============================================================================

INSERT INTO domains (
  domain,
  city,
  state,
  vertical,
  status,
  phone_number,
  created_at,
  updated_at
) VALUES 
  (
    'tampahvachelp.com',
    'Tampa',
    'FL',
    'hvac',
    'active',
    NULL, -- Phone number can be added later via CallReady
    NOW(),
    NOW()
  ),
  (
    'tampaplumbinghelp.com',
    'Tampa',
    'FL',
    'plumbing',
    'active',
    NULL,
    NOW(),
    NOW()
  ),
  (
    'tampapesthelp.com',
    'Tampa',
    'FL',
    'pest',
    'active',
    NULL,
    NOW(),
    NOW()
  ),
  (
    'tamparoofhelp.com',
    'Tampa',
    'FL',
    'roof',
    'active',
    NULL,
    NOW(),
    NOW()
  ),
  (
    'tampawindowshelp.com',
    'Tampa',
    'FL',
    'windows',
    'active',
    NULL,
    NOW(),
    NOW()
  )
ON CONFLICT (domain) DO UPDATE
SET 
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  vertical = EXCLUDED.vertical,
  status = 'active',
  updated_at = NOW()
RETURNING id, domain, city, state, vertical, status;

-- ============================================================================
-- VERIFY DOMAINS CREATED
-- ============================================================================

SELECT 
  id,
  domain,
  city,
  state,
  vertical,
  status,
  phone_number
FROM domains
WHERE city = 'Tampa'
  AND state = 'FL'
ORDER BY vertical;

-- ============================================================================
-- UPDATE STATUS IF NEEDED
-- ============================================================================
-- If you have existing domains but they're not 'active', run this:

-- UPDATE domains
-- SET status = 'active'
-- WHERE status IS NULL 
--    OR status = 'pending'
--    OR status = 'inactive';

