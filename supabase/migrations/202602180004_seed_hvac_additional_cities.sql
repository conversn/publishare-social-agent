-- Seed additional HVAC city context for batch generation smoke run

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
values
  ('San Diego', 'san-diego', 'California', 'CA', 'San Diego', array['92101','92103','92109','92117'], jsonb_build_array('Chula Vista','La Mesa','El Cajon'), true),
  ('Tampa', 'tampa', 'Florida', 'FL', 'Hillsborough', array['33602','33606','33609','33611'], jsonb_build_array('St. Petersburg','Brandon','Clearwater'), true),
  ('Atlanta', 'atlanta', 'Georgia', 'GA', 'Fulton', array['30303','30305','30309','30318'], jsonb_build_array('Sandy Springs','Decatur','Marietta'), true),
  ('Las Vegas', 'las-vegas', 'Nevada', 'NV', 'Clark', array['89101','89117','89123','89148'], jsonb_build_array('Henderson','North Las Vegas','Summerlin'), true),
  ('Houston', 'houston', 'Texas', 'TX', 'Harris', array['77002','77006','77019','77024'], jsonb_build_array('Sugar Land','Pasadena','The Woodlands'), true)
on conflict (city_slug, state_code)
do update set
  city_name = excluded.city_name,
  state_name = excluded.state_name,
  county_name = excluded.county_name,
  primary_zip_codes = excluded.primary_zip_codes,
  nearby_cities = excluded.nearby_cities,
  is_active = excluded.is_active,
  updated_at = now();

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
  c.id,
  'hvac',
  array[
    c.city_name || ' homeowners face seasonal HVAC load spikes tied to local weather patterns.',
    'Regular maintenance helps reduce emergency outages during peak demand periods.'
  ],
  array['Major HVAC replacements may require permitting depending on local municipality rules.'],
  jsonb_build_array(
    jsonb_build_object('season', 'peak', 'note', 'Higher demand windows can increase response times.'),
    jsonb_build_object('season', 'off-peak', 'note', 'Tune-ups are commonly scheduled before peak weather.')
  ),
  2,
  14,
  jsonb_build_object(
    'housing_mix', 'Mixed single-family and multifamily stock with varied system ages',
    'common_systems', jsonb_build_array('central AC', 'heat pump', 'gas furnace')
  ),
  1.05,
  jsonb_build_object(
    'marketplace_disclosure', 'HomeSimple connects homeowners with independent providers. Availability and pricing vary by provider.',
    'last_reviewed', now()::text
  ),
  true
from public.geo_cities c
where (c.city_slug, c.state_code) in (
  ('san-diego','CA'),
  ('tampa','FL'),
  ('atlanta','GA'),
  ('las-vegas','NV'),
  ('houston','TX')
)
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
