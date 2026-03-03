-- Insert GHL Social Media Configurations
-- Based on values from .env file

-- SeniorSimple
INSERT INTO ghl_social_config (
  site_id,
  profile_name,
  ghl_api_key,
  ghl_location_id,
  platforms,
  default_schedule_hours,
  auto_post,
  brand_voice,
  enabled
) VALUES (
  'seniorsimple',
  'SeniorSimple Editorial',
  'pit-d7795b54-91a3-405f-adbb-8c8aec301b29',
  'vTM82D7FNpIlnPgw6XNC',
  '["facebook", "linkedin", "twitter"]'::jsonb,
  1,
  true,
  'Senior financial planning and retirement education',
  true
)
ON CONFLICT (site_id, profile_name) 
DO UPDATE SET
  ghl_api_key = EXCLUDED.ghl_api_key,
  ghl_location_id = EXCLUDED.ghl_location_id,
  platforms = EXCLUDED.platforms,
  default_schedule_hours = EXCLUDED.default_schedule_hours,
  auto_post = EXCLUDED.auto_post,
  brand_voice = EXCLUDED.brand_voice,
  updated_at = NOW();

-- SmallBizSimple
INSERT INTO ghl_social_config (
  site_id,
  profile_name,
  ghl_api_key,
  ghl_location_id,
  platforms,
  default_schedule_hours,
  auto_post,
  brand_voice,
  enabled
) VALUES (
  'smallbizsimple',
  'Small Biz Simple Editorial',
  'pit-83c15f07-ecfd-486e-bed2-7ea69128f3a0',
  'IrVJP8Imu8PlECuGWEsQ',
  '["facebook", "linkedin", "twitter", "instagram"]'::jsonb,
  1,
  true,
  'Small business resources and entrepreneurial education',
  true
)
ON CONFLICT (site_id, profile_name) 
DO UPDATE SET
  ghl_api_key = EXCLUDED.ghl_api_key,
  ghl_location_id = EXCLUDED.ghl_location_id,
  platforms = EXCLUDED.platforms,
  default_schedule_hours = EXCLUDED.default_schedule_hours,
  auto_post = EXCLUDED.auto_post,
  brand_voice = EXCLUDED.brand_voice,
  updated_at = NOW();

-- ParentSimple
INSERT INTO ghl_social_config (
  site_id,
  profile_name,
  ghl_api_key,
  ghl_location_id,
  platforms,
  default_schedule_hours,
  auto_post,
  brand_voice,
  enabled
) VALUES (
  'parentsimple',
  'ParentSimple Editorial',
  'pit-9002f0e5-531e-4ab0-a386-cfca5b9d5a5a',
  'rvEnokPAkGiH3LxMJPpq',
  '["facebook", "linkedin", "twitter", "instagram"]'::jsonb,
  1,
  true,
  'Parenting resources and family education',
  true
)
ON CONFLICT (site_id, profile_name) 
DO UPDATE SET
  ghl_api_key = EXCLUDED.ghl_api_key,
  ghl_location_id = EXCLUDED.ghl_location_id,
  platforms = EXCLUDED.platforms,
  default_schedule_hours = EXCLUDED.default_schedule_hours,
  auto_post = EXCLUDED.auto_post,
  brand_voice = EXCLUDED.brand_voice,
  updated_at = NOW();

-- Verify inserts
SELECT 
  site_id,
  profile_name,
  enabled,
  platforms,
  auto_post,
  created_at
FROM ghl_social_config
ORDER BY site_id, profile_name;


