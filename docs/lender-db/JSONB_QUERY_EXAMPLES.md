# JSONB Query Examples - Lender Directory

## 📋 Common Queries

### Business Lending Queries

#### Find All Lenders Offering Business Lending

```sql
SELECT 
  id,
  name,
  slug,
  special_features->'business_lending'->'loan_types' as loan_types
FROM lenders
WHERE (special_features->'business_lending'->>'available')::boolean = true
AND site_id = 'rateroots'
ORDER BY name;
```

#### Find Lenders with SBA Loans

```sql
SELECT 
  name,
  special_features->'business_lending'->'details'->'sba_loans' as sba_details
FROM lenders
WHERE special_features->'business_lending'->'details'->'sba_loans'->>'available' = 'true'
ORDER BY name;
```

#### Find Lenders by Business Loan Type

```sql
-- Find lenders offering commercial real estate loans
SELECT 
  name,
  special_features->'business_lending'->'details'->'commercial_real_estate' as cre_details
FROM lenders
WHERE special_features->'business_lending'->'details'->'commercial_real_estate'->>'available' = 'true';

-- Find lenders offering equipment financing
SELECT 
  name,
  special_features->'business_lending'->'details'->'equipment_financing' as equipment_details
FROM lenders
WHERE special_features->'business_lending'->'details'->'equipment_financing'->>'available' = 'true';
```

#### Find Lenders by Business Lending Requirements

```sql
-- Find lenders with credit score requirement <= 650
SELECT 
  name,
  special_features->'business_lending'->'requirements'->>'min_credit_score' as min_credit_score
FROM lenders
WHERE (special_features->'business_lending'->'requirements'->>'min_credit_score')::integer <= 650
AND (special_features->'business_lending'->>'available')::boolean = true;

-- Find lenders with minimum time in business <= 12 months
SELECT 
  name,
  special_features->'business_lending'->'requirements'->>'min_time_in_business' as min_months
FROM lenders
WHERE (special_features->'business_lending'->'requirements'->>'min_time_in_business')::integer <= 12
AND (special_features->'business_lending'->>'available')::boolean = true;
```

#### Find Lenders with Multiple Business Loan Types

```sql
-- Find lenders offering both SBA and commercial real estate
SELECT 
  name,
  special_features->'business_lending'->'loan_types' as loan_types
FROM lenders
WHERE special_features->'business_lending'->'loan_types' @> '["SBA"]'::jsonb
AND special_features->'business_lending'->'loan_types' @> '["commercial"]'::jsonb;
```

---

### Website Information Queries

#### Find Lenders with Website Info

```sql
SELECT 
  name,
  special_features->'website_info'->>'url' as website_url,
  special_features->'website_info'->>'title' as website_title,
  special_features->'website_info'->>'last_crawled' as last_crawled
FROM lenders
WHERE special_features->'website_info' IS NOT NULL
ORDER BY (special_features->'website_info'->>'last_crawled') DESC NULLS LAST;
```

#### Find Lenders Needing Website Crawl

```sql
-- Lenders without website info or not crawled in last 30 days
SELECT 
  name,
  slug
FROM lenders
WHERE site_id = 'rateroots'
AND (
  special_features->'website_info' IS NULL
  OR (special_features->'website_info'->>'last_crawled')::timestamp < NOW() - INTERVAL '30 days'
)
ORDER BY name;
```

#### Find Lenders by Services Mentioned on Website

```sql
-- Find lenders mentioning DSCR on their website
SELECT 
  name,
  special_features->'website_info'->'services_mentioned' as services
FROM lenders
WHERE special_features->'website_info'->'services_mentioned' @> '["DSCR"]'::jsonb;
```

---

### Platform Access Queries

#### Find Lenders by Platform

```sql
-- Find lenders with Smart Pricer access
SELECT 
  name,
  special_features->'platforms' as platforms
FROM lenders
WHERE special_features->'platforms' @> '["smart_pricer"]'::jsonb;

-- Find lenders with Loansifter access
SELECT 
  name,
  special_features->'platforms' as platforms
FROM lenders
WHERE special_features->'platforms' @> '["loansifter"]'::jsonb;
```

#### Find Lenders with Multiple Platforms

```sql
-- Find lenders with both Smart Pricer and Loansifter
SELECT 
  name,
  special_features->'platforms' as platforms
FROM lenders
WHERE special_features->'platforms' @> '["smart_pricer"]'::jsonb
AND special_features->'platforms' @> '["loansifter"]'::jsonb;
```

---

### Compensation and Fees Queries (Gated Only)

#### Find Lenders by Compensation Structure

```sql
-- Find lenders with lender-paid compensation
SELECT 
  name,
  detailed_program_data->'compensation' as compensation
FROM lenders
WHERE detailed_program_data->'compensation'->>'structure' = 'lender_paid';
```

#### Find Lenders by Fee Structure

```sql
-- Find lenders with processing fees
SELECT 
  name,
  detailed_program_data->'fees'->>'processing' as processing_fee
FROM lenders
WHERE detailed_program_data->'fees'->>'processing' IS NOT NULL;
```

---

### Processing and Underwriting Queries

#### Find Lenders by Processing Time

```sql
-- Find lenders with fast processing (<= 24 hours)
SELECT 
  name,
  special_features->'processing'->>'review_hours' as review_hours
FROM lenders
WHERE (special_features->'processing'->>'review_hours')::integer <= 24;
```

#### Find Lenders with Manual Underwriting

```sql
SELECT 
  name,
  special_features->'underwriting'->>'manual_underwriting' as manual_uw
FROM lenders
WHERE (special_features->'underwriting'->>'manual_underwriting')::boolean = true;
```

---

### Contact Information Queries (Gated Only)

#### Find Lenders with Public Contact Info

```sql
-- Find lenders with crawled contact information
SELECT 
  name,
  internal_notes::jsonb->'public_contact_info' as contact_info
FROM lenders
WHERE internal_notes::jsonb->'public_contact_info' IS NOT NULL;
```

#### Find Lenders by Contact Source

```sql
-- Find lenders with website-crawled contact info
SELECT 
  name,
  internal_notes::jsonb->'public_contact_info'->>'source' as source
FROM lenders
WHERE internal_notes::jsonb->'public_contact_info'->>'source' = 'website_crawl';
```

---

### Complex Queries

#### Find Lenders with Business Lending AND Specific Requirements

```sql
SELECT 
  name,
  special_features->'business_lending'->'requirements' as requirements,
  special_features->'business_lending'->'loan_types' as loan_types
FROM lenders
WHERE (special_features->'business_lending'->>'available')::boolean = true
AND (special_features->'business_lending'->'requirements'->>'min_credit_score')::integer <= 650
AND (special_features->'business_lending'->'requirements'->>'min_annual_revenue')::integer <= 500000
ORDER BY name;
```

#### Find Lenders with Business Lending AND Platform Access

```sql
SELECT 
  name,
  special_features->'business_lending'->'loan_types' as business_loans,
  special_features->'platforms' as platforms
FROM lenders
WHERE (special_features->'business_lending'->>'available')::boolean = true
AND special_features->'platforms' @> '["smart_pricer"]'::jsonb;
```

#### Count Lenders by Business Loan Type

```sql
SELECT 
  jsonb_array_elements_text(special_features->'business_lending'->'loan_types') as loan_type,
  COUNT(*) as lender_count
FROM lenders
WHERE (special_features->'business_lending'->>'available')::boolean = true
GROUP BY loan_type
ORDER BY lender_count DESC;
```

---

### Performance Tips

1. **Use GIN Indexes**: All JSONB fields have GIN indexes for fast queries
2. **Filter Early**: Use WHERE clauses before JSONB extraction
3. **Use @> Operator**: For array containment checks (uses GIN index)
4. **Cast Types**: Cast JSONB values to appropriate types for comparisons
5. **Limit Results**: Always use LIMIT for large result sets

---

## 📊 View Queries

### Using Public View (No Gated Data)

```sql
-- Public view excludes all gated fields
SELECT * FROM lenders_with_programs_public
WHERE site_id = 'rateroots'
AND is_published = true;
```

### Using Gated View (All Data)

```sql
-- Gated view includes all data (requires authentication)
SELECT * FROM lenders_with_programs_gated
WHERE site_id = 'rateroots';
```

---

**Last Updated**: 2025-12-02  
**Status**: ✅ Query Examples Ready


