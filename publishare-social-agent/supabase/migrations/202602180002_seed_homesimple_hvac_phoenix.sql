-- Minimal seed data for local service page smoke testing
-- Target: homesimple / hvac / phoenix, AZ

insert into public.local_service_context (
  service_slug,
  service_name,
  service_category,
  service_synonyms,
  primary_intents,
  primary_keywords,
  secondary_keywords,
  pricing_items,
  compliance_disclaimer_short,
  lead_form_variant,
  is_active
)
values (
  'hvac',
  'HVAC Services',
  'home_services',
  array['air conditioning', 'heating', 'ac repair', 'furnace repair'],
  array['repair', 'replace', 'maintain'],
  array['hvac phoenix', 'ac repair phoenix', 'heating repair phoenix'],
  array['emergency hvac phoenix', 'furnace service phoenix'],
  jsonb_build_array(
    jsonb_build_object('item', 'Diagnostic visit', 'price_range', '$79-$149'),
    jsonb_build_object('item', 'AC repair', 'price_range', '$180-$850'),
    jsonb_build_object('item', 'HVAC replacement', 'price_range', '$5500-$12500')
  ),
  'HomeSimple is a marketplace connecting homeowners with independent service providers. Pricing and availability vary by provider and job scope.',
  'service_specific',
  true
)
on conflict (service_slug)
do update set
  service_name = excluded.service_name,
  service_category = excluded.service_category,
  service_synonyms = excluded.service_synonyms,
  primary_intents = excluded.primary_intents,
  primary_keywords = excluded.primary_keywords,
  secondary_keywords = excluded.secondary_keywords,
  pricing_items = excluded.pricing_items,
  compliance_disclaimer_short = excluded.compliance_disclaimer_short,
  lead_form_variant = excluded.lead_form_variant,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.geo_cities (
  city_name,
  city_slug,
  state_name,
  state_code,
  county_name,
  primary_zip_codes,
  nearby_cities,
  is_active
)
values (
  'Phoenix',
  'phoenix',
  'Arizona',
  'AZ',
  'Maricopa',
  array['85003', '85004', '85008', '85016', '85018'],
  jsonb_build_array('Scottsdale', 'Tempe', 'Mesa', 'Glendale'),
  true
)
on conflict (city_slug, state_code)
do update set
  city_name = excluded.city_name,
  state_name = excluded.state_name,
  county_name = excluded.county_name,
  primary_zip_codes = excluded.primary_zip_codes,
  nearby_cities = excluded.nearby_cities,
  is_active = excluded.is_active,
  updated_at = now();

with city as (
  select id
  from public.geo_cities
  where city_slug = 'phoenix' and state_code = 'AZ'
  limit 1
)
insert into public.city_service_facts (
  city_id,
  service_slug,
  climate_notes,
  permitting_notes,
  seasonal_timing,
  average_response_time_low_hours,
  average_response_time_high_hours,
  homeowner_context,
  price_multiplier,
  trust_data,
  is_active
)
select
  city.id,
  'hvac',
  array[
    'Phoenix summers regularly exceed 100F, increasing AC load and emergency calls.',
    'Monsoon season can stress older condensers and electrical components.'
  ],
  array[
    'Major HVAC replacements may require local permitting depending on scope and municipality.'
  ],
  jsonb_build_array(
    jsonb_build_object('season', 'summer', 'note', 'Peak emergency AC demand and longer lead times.'),
    jsonb_build_object('season', 'winter', 'note', 'Furnace tune-ups and heat-pump diagnostics rise in demand.')
  ),
  2,
  12,
  jsonb_build_object(
    'housing_mix', 'Single-family homes and multifamily units with high cooling demand',
    'common_systems', jsonb_build_array('central AC', 'heat pump', 'gas furnace')
  ),
  1.08,
  jsonb_build_object(
    'marketplace_disclosure', 'HomeSimple connects homeowners with independent providers. Availability and pricing vary by provider.',
    'last_reviewed', now()::text
  ),
  true
from city
on conflict (city_id, service_slug)
do update set
  climate_notes = excluded.climate_notes,
  permitting_notes = excluded.permitting_notes,
  seasonal_timing = excluded.seasonal_timing,
  average_response_time_low_hours = excluded.average_response_time_low_hours,
  average_response_time_high_hours = excluded.average_response_time_high_hours,
  homeowner_context = excluded.homeowner_context,
  price_multiplier = excluded.price_multiplier,
  trust_data = excluded.trust_data,
  is_active = excluded.is_active,
  updated_at = now();
