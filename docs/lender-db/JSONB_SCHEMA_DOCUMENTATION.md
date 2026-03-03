# JSONB Schema Documentation - Lender Directory

## 📋 Overview

This document defines the structured JSONB schemas used in the lender directory system. All JSONB fields follow consistent structures to enable efficient querying, validation, and future migration to columns if needed.

---

## 🗂️ JSONB Field Structure

### 1. `special_features` JSONB

**Purpose**: Advanced features, exceptions, overlays, platform access, and discovered data

**Structure**:
```typescript
interface SpecialFeatures {
  // Platform Access
  platforms?: string[]; // ["smart_pricer", "loansifter", "correspondent", "broker", "ndc"]
  
  // Processing Information
  processing?: {
    review_hours?: number;
    ctc_days?: number;
    timeline_notes?: string;
  };
  
  // Underwriting Details
  underwriting?: {
    condition_review?: string;
    approval_process?: string;
    manual_underwriting?: boolean;
    special_conditions?: string[];
  };
  
  // Website Information (from crawler)
  website_info?: {
    url: string;
    title?: string;
    last_crawled: string; // ISO 8601 timestamp
    services_mentioned?: string[]; // ["FHA", "VA", "conventional", "DSCR"]
    states_mentioned?: string[]; // State codes
  };
  
  // Business Lending (from crawler)
  business_lending?: BusinessLendingData;
}

interface BusinessLendingData {
  available: boolean;
  loan_types: string[]; // ["SBA", "commercial", "equipment", "working_capital"]
  confidence: number; // 0.0 to 1.0
  detected_at: string; // ISO 8601 timestamp
  details?: {
    sba_loans?: {
      available: boolean;
      types?: string[]; // ["7(a)", "504", "microloan", "express"]
      min_amount?: number;
      max_amount?: number;
      terms?: string[];
    };
    commercial_real_estate?: {
      available: boolean;
      property_types?: string[]; // ["office", "retail", "industrial", "multifamily"]
      min_amount?: number;
      max_amount?: number;
      max_ltv?: number;
    };
    equipment_financing?: {
      available: boolean;
      min_amount?: number;
      max_amount?: number;
      terms?: string[]; // ["12 months", "24 months", "36 months"]
    };
    working_capital?: {
      available: boolean;
      min_amount?: number;
      max_amount?: number;
      repayment_terms?: string[];
    };
    business_line_of_credit?: {
      available: boolean;
      min_amount?: number;
      max_amount?: number;
      revolving?: boolean;
    };
    invoice_factoring?: {
      available: boolean;
      advance_rate?: number; // Percentage
      industries?: string[];
    };
    merchant_cash_advance?: {
      available: boolean;
      min_amount?: number;
      max_amount?: number;
      factor_rate?: string;
    };
    business_term_loan?: {
      available: boolean;
      min_amount?: number;
      max_amount?: number;
      terms?: string[];
    };
  };
  requirements?: {
    min_time_in_business?: number; // Months
    min_annual_revenue?: number;
    min_credit_score?: number;
    min_debt_service_coverage_ratio?: number;
    collateral_required?: boolean;
    personal_guarantee_required?: boolean;
  };
  source: 'website_crawl' | 'manual' | 'import' | 'api';
  last_verified: string; // ISO 8601 timestamp
}
```

**Example**:
```json
{
  "platforms": ["smart_pricer", "loansifter", "broker"],
  "processing": {
    "review_hours": 48,
    "ctc_days": 24
  },
  "underwriting": {
    "manual_underwriting": true,
    "condition_review": "48 hours"
  },
  "website_info": {
    "url": "https://www.lender.com",
    "title": "Lender Name - Mortgage Solutions",
    "last_crawled": "2025-12-02T00:00:00.000Z",
    "services_mentioned": ["FHA", "VA", "conventional", "DSCR"],
    "states_mentioned": ["CA", "NV", "AZ", "TX"]
  },
  "business_lending": {
    "available": true,
    "loan_types": ["SBA", "commercial", "equipment"],
    "confidence": 0.85,
    "detected_at": "2025-12-02T00:00:00.000Z",
    "details": {
      "sba_loans": {
        "available": true,
        "types": ["7(a)", "504"],
        "min_amount": 50000,
        "max_amount": 5000000
      },
      "commercial_real_estate": {
        "available": true,
        "property_types": ["office", "retail", "industrial"],
        "min_amount": 250000,
        "max_ltv": 80
      }
    },
    "requirements": {
      "min_time_in_business": 24,
      "min_annual_revenue": 100000,
      "min_credit_score": 650
    },
    "source": "website_crawl",
    "last_verified": "2025-12-02T00:00:00.000Z"
  }
}
```

---

### 2. `detailed_program_data` JSONB

**Purpose**: Detailed program requirements, compensation, fees, and program-specific data

**Structure**:
```typescript
interface DetailedProgramData {
  // Compensation (GATED - Never in public CMS)
  compensation?: {
    mlo_broker_percentage?: number; // e.g., 1.25 for 1.25%
    structure?: string; // "lender_paid", "borrower_paid", "hybrid"
    notes?: string;
  };
  
  // Fees (GATED - Never in public CMS)
  fees?: {
    broker?: {
      uw_fee?: number;
      flood?: number;
      tax?: number;
      mers?: number;
      credit_report?: number;
      doc_fee?: number;
      [key: string]: number | undefined;
    };
    ndc?: {
      uw_fee_wire?: number;
      flood?: number;
      [key: string]: number | undefined;
    };
    processing?: number;
    notes?: string;
  };
  
  // Program Requirements
  requirements?: {
    min_fico?: number;
    max_ltv?: number;
    min_loan_amount?: number;
    max_loan_amount?: number;
    debt_to_income_ratio?: number;
    reserves_required?: number; // Months
  };
  
  // Program-Specific Features
  features?: {
    streamline_available?: boolean;
    manual_underwriting?: boolean;
    non_qm_programs?: string[];
    special_programs?: string[];
  };
}
```

**Example**:
```json
{
  "compensation": {
    "mlo_broker_percentage": 1.25,
    "structure": "lender_paid"
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
    "max_ltv": 80,
    "min_loan_amount": 50000,
    "max_loan_amount": 3000000
  },
  "features": {
    "streamline_available": true,
    "manual_underwriting": true,
    "non_qm_programs": ["DSCR", "bank_statement"]
  }
}
```

---

### 3. `program_specifics` JSONB

**Purpose**: Program-by-program detailed data, margins, pricing, state-specific rules

**Structure**:
```typescript
interface ProgramSpecifics {
  // Margins (GATED - Never in public CMS)
  margins?: {
    fha?: number;
    va?: number;
    conventional?: number;
    jumbo?: number;
    dscr?: number;
    [program_slug: string]: number | undefined;
  };
  
  // Pricing (GATED - Never in public CMS)
  pricing?: {
    ndc_specific?: string;
    broker_specific?: string;
    notes?: string;
  };
  
  // State-Specific Rules
  state_rules?: {
    [state_code: string]: {
      special_requirements?: string[];
      restrictions?: string[];
      additional_docs?: string[];
      notes?: string;
    };
  };
  
  // Program-Specific Overlays
  overlays?: {
    [program_slug: string]: {
      fico_adjustments?: Record<string, number>;
      ltv_adjustments?: Record<string, number>;
      restrictions?: string[];
      exceptions?: string[];
    };
  };
}
```

**Example**:
```json
{
  "margins": {
    "fha": 2.5,
    "va": 2.25,
    "conventional": 2.0,
    "dscr": 2.75
  },
  "pricing": {
    "ndc_specific": "Contact for pricing",
    "broker_specific": "See compensation structure"
  },
  "state_rules": {
    "CA": {
      "special_requirements": ["Additional documentation for high-value properties"],
      "restrictions": ["No loans over $5M in certain counties"]
    },
    "NY": {
      "additional_docs": ["NY-specific disclosure forms"]
    }
  },
  "overlays": {
    "fha": {
      "fico_adjustments": {
        "620": 0.5,
        "640": 0.25
      },
      "ltv_adjustments": {
        "96.5": 0.25
      }
    }
  }
}
```

---

### 4. `internal_notes` TEXT (Stored as JSON)

**Purpose**: Internal notes, contact info, warnings, portal access

**Structure**:
```typescript
interface InternalNotes {
  // Contact Information (GATED - Never in public CMS)
  contact_info?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  
  // Public Contact Info (from website crawl - GATED)
  public_contact_info?: {
    phones?: string[];
    emails?: string[];
    source: 'website_crawl' | 'manual' | 'import';
    crawled_at: string; // ISO 8601 timestamp
  };
  
  // Account Executive (GATED - Never in public CMS)
  account_executive?: {
    name?: string;
    email?: string;
    phone?: string;
    territory?: string[];
  };
  
  // Warnings and Cautions
  warnings?: string[];
  
  // Portal Access
  portal_login?: {
    url?: string;
    instructions?: string;
    training_required?: boolean;
  };
  
  // Notes
  notes?: string[];
  
  // Crawler Metadata
  crawler_metadata?: {
    last_crawled?: string;
    crawl_errors?: string[];
    data_sources?: string[];
  };
}
```

**Example**:
```json
{
  "contact_info": {
    "name": "John Doe",
    "email": "john@lender.com",
    "phone": "555-1234"
  },
  "public_contact_info": {
    "phones": ["555-1234", "1-800-LENDER"],
    "emails": ["info@lender.com", "support@lender.com"],
    "source": "website_crawl",
    "crawled_at": "2025-12-02T00:00:00.000Z"
  },
  "account_executive": {
    "name": "Jane Smith",
    "email": "jane@lender.com",
    "phone": "555-5678",
    "territory": ["CA", "NV", "AZ"]
  },
  "warnings": [
    "Use with caution",
    "Very slow processing times"
  ],
  "portal_login": {
    "url": "https://portal.lender.com",
    "instructions": "Contact GC Admin with NMLS #, email, phone #",
    "training_required": true
  },
  "notes": [
    "Portal Login: https://portal.lender.com",
    "Training required for new brokers"
  ],
  "crawler_metadata": {
    "last_crawled": "2025-12-02T00:00:00.000Z",
    "data_sources": ["website_crawl", "manual_import"]
  }
}
```

---

## 🔍 Query Examples

### Find Lenders with Business Lending

```sql
-- Simple query
SELECT name, slug
FROM lenders
WHERE (special_features->'business_lending'->>'available')::boolean = true;

-- With loan types
SELECT 
  name,
  special_features->'business_lending'->'loan_types' as loan_types
FROM lenders
WHERE special_features->'business_lending'->'loan_types' @> '["SBA"]'::jsonb;
```

### Find Lenders with SBA Loans

```sql
SELECT 
  name,
  special_features->'business_lending'->'details'->'sba_loans' as sba_details
FROM lenders
WHERE special_features->'business_lending'->'details'->'sba_loans'->>'available' = 'true';
```

### Find Lenders by Business Lending Requirements

```sql
SELECT 
  name,
  special_features->'business_lending'->'requirements' as requirements
FROM lenders
WHERE (special_features->'business_lending'->'requirements'->>'min_credit_score')::integer <= 650;
```

### Find Lenders with Website Info

```sql
SELECT 
  name,
  special_features->'website_info'->>'url' as website_url,
  special_features->'website_info'->>'last_crawled' as last_crawled
FROM lenders
WHERE special_features->'website_info' IS NOT NULL
ORDER BY (special_features->'website_info'->>'last_crawled') DESC;
```

### Find Lenders by Platform Access

```sql
SELECT name, special_features->'platforms' as platforms
FROM lenders
WHERE special_features->'platforms' @> '["smart_pricer"]'::jsonb;
```

---

## 📊 Indexes for Performance

All JSONB fields have GIN indexes for efficient querying:

```sql
-- Business lending queries
idx_lenders_business_lending_gin
idx_lenders_offers_business_lending
idx_lenders_business_loan_types_gin

-- Website info queries
idx_lenders_website_info_gin

-- Program data queries
idx_lenders_detailed_program_data_gin
idx_lenders_program_specifics_gin
```

---

## 🔄 Migration Path

### When to Migrate to Columns

**Migrate when**:
- Field is queried frequently (e.g., `offers_business_lending`)
- Field needs constraints (e.g., `min_credit_score` CHECK)
- Field needs joins or foreign keys
- Field is used in WHERE clauses often
- Field needs full-text search

**Keep in JSONB when**:
- Field is rarely queried
- Field structure varies by lender
- Field is detailed/nested data
- Field is still being discovered

### Example Migration

```sql
-- Step 1: Add columns
ALTER TABLE lenders 
ADD COLUMN IF NOT EXISTS offers_business_lending BOOLEAN,
ADD COLUMN IF NOT EXISTS offers_sba_loans BOOLEAN,
ADD COLUMN IF NOT EXISTS business_lending_types TEXT[];

-- Step 2: Migrate data
UPDATE lenders
SET 
  offers_business_lending = (special_features->'business_lending'->>'available')::boolean,
  offers_sba_loans = (special_features->'business_lending'->'details'->'sba_loans'->>'available')::boolean,
  business_lending_types = ARRAY(
    SELECT jsonb_array_elements_text(special_features->'business_lending'->'loan_types')
  )
WHERE special_features->'business_lending' IS NOT NULL;

-- Step 3: Add indexes
CREATE INDEX idx_lenders_offers_business_lending ON lenders(offers_business_lending) WHERE offers_business_lending = true;
CREATE INDEX idx_lenders_business_lending_types ON lenders USING GIN(business_lending_types);

-- Step 4: Keep JSONB for detailed data
-- special_features->'business_lending'->'details' remains in JSONB
```

---

## ✅ Validation Rules

### Business Lending Data

- `available`: Must be boolean
- `confidence`: Must be between 0.0 and 1.0
- `loan_types`: Must be array of strings
- `detected_at`: Must be valid ISO 8601 timestamp
- `source`: Must be one of: 'website_crawl', 'manual', 'import', 'api'

### Contact Information

- `phones`: Array of strings, validated format
- `emails`: Array of strings, validated email format
- `source`: Must be one of: 'website_crawl', 'manual', 'import'
- `crawled_at`: Must be valid ISO 8601 timestamp

---

## 📚 Related Documentation

- [Lender Directory System](./LENDER_DIRECTORY_SYSTEM.md)
- [RLS Policies and Security](./RLS_POLICIES_AND_SECURITY.md)
- [Lender Website Crawler](./LENDER_WEBSITE_CRAWLER.md)
- [Database Migration](./supabase/migrations/20250130000000_create_lender_directory.sql)

---

**Last Updated**: 2025-12-02  
**Status**: ✅ Schema Defined  
**Next**: Update crawler to use structured format


