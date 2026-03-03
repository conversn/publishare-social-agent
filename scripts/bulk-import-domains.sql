-- Bulk import domains for HomeSimple local SEO
-- Based on the domain list provided earlier
-- Run this in Supabase SQL Editor

-- ============================================================================
-- BULK INSERT DOMAINS
-- ============================================================================

INSERT INTO domains (
  domain,
  city,
  state,
  vertical,
  status,
  created_at,
  updated_at
) VALUES 
  -- Atlanta
  ('atlantahvachelp.com', 'Atlanta', 'GA', 'hvac', 'active', NOW(), NOW()),
  ('atlantaroofhelp.com', 'Atlanta', 'GA', 'roof', 'active', NOW(), NOW()),
  
  -- Austin
  ('austinpesthelp.com', 'Austin', 'TX', 'pest', 'active', NOW(), NOW()),
  
  -- Dallas
  ('dallashvachelp.com', 'Dallas', 'TX', 'hvac', 'active', NOW(), NOW()),
  ('dallaspesthelp.com', 'Dallas', 'TX', 'pest', 'active', NOW(), NOW()),
  ('dallasplumbinghelp.com', 'Dallas', 'TX', 'plumbing', 'active', NOW(), NOW()),
  ('dallasroofhelp.com', 'Dallas', 'TX', 'roof', 'active', NOW(), NOW()),
  ('dallaswindowshelp.com', 'Dallas', 'TX', 'windows', 'active', NOW(), NOW()),
  
  -- Houston
  ('houstonhvachelp.com', 'Houston', 'TX', 'hvac', 'active', NOW(), NOW()),
  ('houstonpesthelp.com', 'Houston', 'TX', 'pest', 'active', NOW(), NOW()),
  ('houstonroofhelp.com', 'Houston', 'TX', 'roof', 'active', NOW(), NOW()),
  
  -- Las Vegas
  ('lasvegashvachelp.com', 'Las Vegas', 'NV', 'hvac', 'active', NOW(), NOW()),
  ('lasvegaspesthelp.com', 'Las Vegas', 'NV', 'pest', 'active', NOW(), NOW()),
  
  -- Phoenix
  ('phoenixhvachelp.com', 'Phoenix', 'AZ', 'hvac', 'active', NOW(), NOW()),
  ('phoenixpesthelp.com', 'Phoenix', 'AZ', 'pest', 'active', NOW(), NOW()),
  ('phoenixplumbinghelp.com', 'Phoenix', 'AZ', 'plumbing', 'active', NOW(), NOW()),
  ('phoenixroofhelp.com', 'Phoenix', 'AZ', 'roof', 'active', NOW(), NOW()),
  ('phoenixwindowshelp.com', 'Phoenix', 'AZ', 'windows', 'active', NOW(), NOW()),
  
  -- San Diego
  ('sandiegohvachelp.com', 'San Diego', 'CA', 'hvac', 'active', NOW(), NOW()),
  
  -- Tampa
  ('tampahvachelp.com', 'Tampa', 'FL', 'hvac', 'active', NOW(), NOW()),
  ('tampapesthelp.com', 'Tampa', 'FL', 'pest', 'active', NOW(), NOW()),
  ('tampaplumbinghelp.com', 'Tampa', 'FL', 'plumbing', 'active', NOW(), NOW()),
  ('tamparoofhelp.com', 'Tampa', 'FL', 'roof', 'active', NOW(), NOW()),
  ('tampawindowshelp.com', 'Tampa', 'FL', 'windows', 'active', NOW(), NOW())
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
  city,
  state,
  vertical,
  COUNT(*) as domain_count,
  STRING_AGG(domain, ', ') as domains
FROM domains
WHERE status = 'active'
GROUP BY city, state, vertical
ORDER BY city, state, vertical;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  'Total active domains' as metric,
  COUNT(*) as value
FROM domains
WHERE status = 'active';

SELECT 
  'Cities covered' as metric,
  COUNT(DISTINCT city || ', ' || state) as value
FROM domains
WHERE status = 'active';

SELECT 
  'Verticals covered' as metric,
  COUNT(DISTINCT vertical) as value
FROM domains
WHERE status = 'active';

