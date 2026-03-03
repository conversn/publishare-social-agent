# RLS Policies and Security - Lender Directory

## 🔒 Security Overview

The lender directory system uses **Row Level Security (RLS)** policies to ensure sensitive data is only accessible through authenticated broker portal access. All public-facing content (rateroots.com) excludes gated fields.

---

## 🛡️ RLS Policies

### Lenders Table

#### Public Select Policy
```sql
CREATE POLICY lenders_public_select ON lenders
  FOR SELECT
  USING (is_published = TRUE);
```

**Access**: Anyone can view published lenders  
**Restriction**: Only `is_published = TRUE` records  
**Fields**: All public fields (name, description, highlights, FICO, LTV, states)  
**Excludes**: Gated fields are accessible but should not be displayed in public CMS

#### User Manage Policy
```sql
CREATE POLICY lenders_user_manage ON lenders
  FOR ALL
  USING (user_id = auth.uid());
```

**Access**: Users can manage their own lenders  
**Restriction**: Only lenders where `user_id = auth.uid()`

### Lender Programs Table

#### Public Select Policy
```sql
CREATE POLICY lender_programs_public_select ON lender_programs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lenders 
      WHERE lenders.id = lender_programs.lender_id 
      AND lenders.is_published = TRUE
    )
  );
```

**Access**: Anyone can view programs for published lenders  
**Restriction**: Only programs linked to published lenders

#### User Manage Policy
```sql
CREATE POLICY lender_programs_user_manage ON lender_programs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lenders 
      WHERE lenders.id = lender_programs.lender_id 
      AND lenders.user_id = auth.uid()
    )
  );
```

**Access**: Users can manage programs for their own lenders

---

## 👁️ Views

### Public View: `lenders_with_programs_public`

**Purpose**: Consumer-facing data (rateroots.com content)

**Fields Included**:
- `id`, `name`, `slug`, `description`, `highlights`
- `min_fico_score`, `max_ltv`, `max_loan_amount`, `states_available`
- `site_id`, `article_id`, `organization_id`
- `is_published`, `created_at`, `updated_at`
- `loan_programs` (public features only)

**Fields Excluded**:
- ❌ `detailed_program_data` (compensation, fees)
- ❌ `special_features` (platforms, processing)
- ❌ `program_specifics` (margins, pricing)
- ❌ `internal_notes` (contact info, warnings)

**Usage**:
```sql
-- Public API endpoint (rateroots.com)
SELECT * FROM lenders_with_programs_public 
WHERE site_id = 'rateroots' 
AND is_published = TRUE;
```

### Gated View: `lenders_with_programs_gated`

**Purpose**: Broker member portal (authenticated access only)

**Fields Included**:
- ✅ **ALL fields** including gated data
- ✅ `detailed_program_data` (compensation, fees, requirements)
- ✅ `special_features` (platforms, processing, underwriting)
- ✅ `program_specifics` (margins, pricing, state rules)
- ✅ `internal_notes` (contact info, warnings, portal access)
- ✅ `loan_programs` (with detailed requirements)

**Access Requirements**:
1. ✅ Authenticated user (via `auth.uid()`)
2. ✅ Broker portal membership verification
3. ✅ Application-level access control

**Usage**:
```sql
-- Broker portal API endpoint
SELECT * FROM lenders_with_programs_gated 
WHERE site_id = 'rateroots';
```

---

## 🔐 Gated Fields Structure

### `detailed_program_data` (JSONB)

**Contains**:
```json
{
  "compensation": {
    "mlo_broker_percentage": 1.25
  },
  "fees": {
    "broker": {
      "uw_fee": 895,
      "flood": 10,
      "tax": 80,
      "mers": 39,
      "credit_report": 130
    },
    "ndc": {
      "uw_fee_wire": 1890
    },
    "processing": 795
  },
  "requirements": {
    "min_fico": 620,
    "max_ltv": 80
  }
}
```

**Access**: ❌ Never in public CMS, ✅ Broker portal only

### `special_features` (JSONB)

**Contains**:
```json
{
  "platforms": ["smart_pricer", "loansifter", "correspondent", "broker"],
  "processing": {
    "review_hours": 48,
    "ctc_days": 24
  },
  "underwriting": {
    "condition_review": "48 hours",
    "approval_process": "Email notification",
    "manual_underwriting": true
  }
}
```

**Access**: ❌ Never in public CMS, ✅ Broker portal only

### `program_specifics` (JSONB)

**Contains**:
```json
{
  "margins": {
    "fha": 2.5,
    "va": 2.25,
    "conventional": 2.0
  },
  "pricing": {
    "ndc_specific": "Contact for pricing",
    "broker_specific": "See compensation"
  },
  "state_rules": {
    "CA": {
      "special_requirements": "Additional documentation"
    }
  }
}
```

**Access**: ❌ Never in public CMS, ✅ Broker portal only

### `internal_notes` (TEXT/JSONB)

**Contains**:
```json
{
  "contact_info": {
    "name": "John Doe",
    "email": "john@lender.com",
    "phone": "555-1234"
  },
  "warnings": [
    "Use with caution",
    "Very slow processing"
  ],
  "notes": [
    "Portal Login: https://portal.lender.com",
    "Training required for new brokers"
  ]
}
```

**Access**: ❌ Never in public CMS, ✅ Broker portal only

---

## 🚫 Public CMS Display Rules

### ❌ NEVER Display in Public Content

1. **Compensation Data**
   - MLO broker percentages
   - Fee amounts
   - Processing fees

2. **Contact Information**
   - Account executive names
   - Email addresses
   - Phone numbers

3. **Internal Data**
   - Margin information
   - NDC-specific pricing
   - Internal warnings

4. **Broker-Specific Details**
   - Portal login instructions
   - Training requirements
   - Account manager details

### ✅ Safe to Display (Public)

1. **Basic Lender Info**
   - Lender name
   - Description
   - Highlights (sanitized)

2. **Qualification Criteria**
   - FICO score ranges
   - LTV ratios
   - Loan amount limits
   - States available

3. **Loan Programs**
   - Program names
   - Program categories
   - Public features

---

## 🔍 Verification Queries

### Test Public Access

```sql
-- Should return only public fields
SELECT 
  name,
  description,
  highlights,
  min_fico_score,
  max_ltv,
  states_available
FROM lenders_with_programs_public
WHERE slug = 'american-financial-resources';

-- Verify gated fields are NOT in public view
SELECT 
  detailed_program_data,  -- Should be NULL or empty
  special_features,       -- Should be NULL or empty
  internal_notes          -- Should be NULL or empty
FROM lenders_with_programs_public
WHERE slug = 'american-financial-resources';
```

### Test Gated Access

```sql
-- Should return ALL fields including gated data
SELECT 
  name,
  detailed_program_data,
  special_features,
  program_specifics,
  internal_notes
FROM lenders_with_programs_gated
WHERE slug = 'american-financial-resources';
```

### Verify RLS Policies

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('lenders', 'lender_programs');

-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('lenders', 'lender_programs');
```

---

## 🛠️ Application-Level Security

### API Endpoints

**Public Endpoint** (rateroots.com):
```typescript
// Only use public view
const { data } = await supabase
  .from('lenders_with_programs_public')
  .select('*')
  .eq('site_id', 'rateroots')
  .eq('is_published', true);
```

**Gated Endpoint** (Broker Portal):
```typescript
// Require authentication
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  throw new Error('Unauthorized');
}

// Verify broker membership
const isBroker = await verifyBrokerMembership(user.id);

if (!isBroker) {
  throw new Error('Broker membership required');
}

// Use gated view
const { data } = await supabase
  .from('lenders_with_programs_gated')
  .select('*')
  .eq('site_id', 'rateroots');
```

### CMS Content Generation

**Content Templates** (rateroots.com):
- ✅ Use `lenders_with_programs_public` view
- ✅ Exclude all gated fields
- ✅ Only display public-safe information
- ✅ No compensation, fees, or contact info

**Broker Portal**:
- ✅ Use `lenders_with_programs_gated` view
- ✅ Require authentication
- ✅ Verify broker membership
- ✅ Display all data including sensitive fields

---

## 📋 Security Checklist

- [x] RLS policies enabled on `lenders` table
- [x] RLS policies enabled on `lender_programs` table
- [x] Public view excludes gated fields
- [x] Gated view includes all fields
- [x] Application-level authentication required for gated access
- [x] No sensitive data in public API responses
- [x] CMS content generation excludes gated fields
- [x] Broker portal verifies membership before access

---

## 🔗 Related Documentation

- [Database Migration](../supabase/migrations/20250130000000_create_lender_directory.sql)
- [Lender Directory System](./LENDER_DIRECTORY_SYSTEM.md)
- [Detailed Tab Import Guide](./DETAILED_TAB_IMPORT_GUIDE.md)

---

**Last Updated**: 2025-01-30  
**Status**: ✅ RLS Policies Active


