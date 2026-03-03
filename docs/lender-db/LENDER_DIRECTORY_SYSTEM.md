# Lender Directory System - Complete Documentation

## Overview

The Lender Directory System is a comprehensive database and content management solution for mortgage lenders, designed to maximize SEO and AEO (Answer Engine Optimization) goals while generating consumer leads through RateRoots' quiz funnel.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Data Model](#data-model)
4. [Content Strategy](#content-strategy)
5. [Lead Generation Flow](#lead-generation-flow)
6. [Import Process](#import-process)
7. [Content Generation](#content-generation)
8. [API Endpoints](#api-endpoints)
9. [Member Portal](#member-portal)
10. [Best Practices](#best-practices)

---

## System Architecture

### High-Level Flow

```
Consumer Search Query
    ↓
Answer-First Content Page (AEO Optimized)
    ↓
Lender Directory Discovery
    ↓
RateRoots Quiz Funnel
    ↓
Lead Capture
    ↓
CallReady CRM
    ↓
Webhook to Organization (Lender)
```

### Key Components

1. **Database Layer**: PostgreSQL (Supabase)
   - `lenders` table (public + gated data)
   - `loan_programs` table (reference data)
   - `lender_programs` junction table
   - Integration with `articles`, `organizations`, `sites`

2. **Content Layer**: Publishare CMS
   - Answer-first article pages
   - Dynamic query-based pages
   - Schema markup generation
   - AEO optimization

3. **Discovery Layer**: Search & Filter
   - Multi-criteria filtering
   - Full-text search
   - Dynamic answer pages

4. **Lead Generation Layer**: RateRoots Quiz
   - Consumer qualification
   - Lender matching
   - Lead capture

5. **Distribution Layer**: CallReady CRM
   - Lead routing
   - Webhook delivery
   - Organization management

---

## Database Schema

### Core Tables

#### `lenders` Table

**Public Fields** (Consumer-Facing):
- `name`, `slug`, `description`
- `highlights` (array)
- `min_fico_score`, `max_ltv`, `max_loan_amount`
- `states_available` (array)

**Gated Fields** (Broker Member Portal):
- `detailed_program_data` (JSONB)
- `special_features` (JSONB)
- `internal_notes` (TEXT)
- `program_specifics` (JSONB)

**Integration Fields**:
- `user_id` → `auth.users.id`
- `site_id` → `sites.id` (RateRoots master)
- `article_id` → `articles.id` (SEO content)
- `organization_id` → `organizations.id` (lead routing)

#### `loan_programs` Table

Reference data for standardized loan program types:
- `name`, `slug`, `category`
- `description`, `display_order`
- Categories: GOVERNMENT, CONVENTIONAL, NON_QM, JUMBO, COMMERCIAL, SPECIALTY

#### `lender_programs` Junction Table

Many-to-many relationship with public/gated data separation:
- `lender_id` + `loan_program_id`
- Public: `min_fico`, `max_ltv`, `public_features`
- Gated: `detailed_requirements`, `special_conditions`, `internal_notes`

### Relationships

```
sites (RateRoots)
  ↓
lenders (many)
  ├─→ articles (1:1, SEO content)
  ├─→ organizations (1:1, lead routing)
  └─→ lender_programs (many)
        └─→ loan_programs (many)
```

---

## Data Model

### Public Data (Consumer-Facing)

**What Consumers See**:
- Lender name and basic description
- Key highlights (sanitized)
- Qualification criteria (FICO, LTV, loan amounts)
- Available loan programs
- States available

**What Consumers DON'T See**:
- Detailed program requirements
- Special features and exceptions
- Internal notes
- Compensation information
- Contact details

### Gated Data (Broker Member Portal)

**What Brokers See** (Authenticated):
- All public data PLUS
- Detailed program requirements
- Special features and exceptions
- Internal notes
- Program-specific data
- Advanced filtering options

---

## Content Strategy

### Content Types

1. **Individual Lender Pages**
   - URL: `/lenders/{lender-slug}/`
   - Answer-first summary
   - Program details
   - Qualification requirements
   - Schema: FinancialService

2. **Loan Program Category Pages**
   - URL: `/loan-programs/{program-slug}/`
   - Program explanation
   - Lender listings
   - Comparison information
   - Schema: LoanOrCredit

3. **Answer Pages** (Dynamic)
   - URL: `/lenders-for-{query}/`
   - Examples:
     - `/lenders-for-620-fico/`
     - `/dscr-lenders-in-california/`
     - `/fha-lenders-for-first-time-buyers/`
   - Schema: FAQPage

4. **State-Specific Pages**
   - URL: `/lenders/{state-slug}/`
   - State market overview
   - Lender listings
   - State-specific programs

### Answer-First Content Rules

1. **First 100 Words**: Must contain direct answer
2. **Include Numbers**: FICO scores, LTV ratios, lender counts
3. **Include Top 3**: Mention top 3 lenders when applicable
4. **Include CTA**: Link to quiz in first 100 words
5. **Be Specific**: Use exact numbers, not ranges

### SEO/AEO Optimization

- **Schema Markup**: JSON-LD for all pages
- **Answer-First**: Direct answer in first 100 words
- **Structured Data**: H1/H2/H3 hierarchy
- **Data Points**: Key statistics highlighted
- **Internal Linking**: Strategic links to quiz and related content
- **No External Links**: No direct links to lender websites (nofollow if needed)

---

## Lead Generation Flow

### Consumer Journey

1. **Search Query**: Consumer searches "lenders for 620 FICO"
2. **Answer Page**: RateRoots provides answer-first content
3. **Discovery**: Consumer discovers relevant lenders
4. **Quiz Entry**: Consumer clicks CTA → RateRoots quiz
5. **Qualification**: Consumer completes quiz
6. **Lead Capture**: Lead captured in RateRoots/CallReady CRM
7. **Distribution**: Lead routed to matching lenders via webhook

### Business Relationship

1. **Lender Opt-In**: Lender opts into lead distribution
2. **Organization Setup**: Lender added to `organizations` table
3. **Webhook Configuration**: Lender provides webhook URL
4. **Lead Routing**: Leads routed based on matching criteria
5. **Lead Delivery**: Leads delivered via webhook to lender

---

## Import Process

### Step 1: CSV Preparation

1. **Sanitize Data**: Remove sensitive information
   - MLO compensation percentages
   - Processing fees
   - Account executive contact info
   - Internal notes and warnings

2. **Validate Data**: Ensure data quality
   - Lender names are unique
   - Highlights are sanitized
   - No sensitive patterns remain

### Step 2: Run Import Script

```bash
# Dry run (no database changes)
node scripts/import-lender-directory.js --dry-run

# Actual import
node scripts/import-lender-directory.js
```

### Step 3: Manual Review

1. **Review Imported Lenders**: Check data accuracy
2. **Populate Gated Fields**: Add detailed program data
3. **Verify Programs**: Ensure loan programs are correct
4. **Check Highlights**: Verify highlights are consumer-safe

### Step 4: Content Creation

1. **Generate Article Pages**: Create SEO-optimized articles
2. **Link Lenders**: Link `article_id` to lenders
3. **Generate Schema**: Create JSON-LD schema markup
4. **Validate AEO**: Ensure answer-first content

### Step 5: Publication

1. **Final Review**: Legal and compliance review
2. **SEO Optimization**: Meta tags, descriptions
3. **Publish**: Set `is_published = TRUE`
4. **Monitor**: Track performance and engagement

---

## Content Generation

### Automated Content Generation

Use Publishare's `agentic-content-gen` edge function to generate:

1. **Lender Pages**: Individual lender articles
2. **Program Pages**: Loan program category pages
3. **Answer Pages**: Dynamic query-based pages
4. **State Pages**: State-specific lender pages

### Content Generation Workflow

```typescript
// Example: Generate lender page
const article = await generateArticle({
  topic: 'AmWest Funding mortgage lenders',
  siteId: 'rateroots',
  aeo_optimized: true,
  aeo_content_type: 'definition',
  template: 'lender-page',
  lenderData: lenderData,
  generate_schema: true,
  convert_to_html: true
});
```

### Template Selection

- **Lender Page**: Use `Template 1` from `ANSWER_FIRST_CONTENT_TEMPLATES.md`
- **Program Page**: Use `Template 2`
- **Answer Page**: Use `Template 3`
- **State Page**: Use `Template 4`
- **FICO Page**: Use `Template 5`

---

## API Endpoints

### Public Endpoints (Consumer-Facing)

#### GET `/api/lenders`
Retrieve filtered and paginated list of lenders (public data only)

**Query Parameters**:
- `page`, `limit`
- `search` (full-text search)
- `programs` (comma-separated program IDs)
- `min_fico`, `max_fico`
- `min_ltv`, `max_ltv`
- `states` (comma-separated state codes)
- `sort`

**Response**: Public lender data only (excludes gated fields)

#### GET `/api/lenders/{id}`
Retrieve detailed lender information (public data only)

#### GET `/api/loan-programs`
Retrieve all available loan program types

#### GET `/api/loan-programs/{id}/lenders`
Retrieve lenders offering a specific program

### Member Portal Endpoints (Authenticated)

#### GET `/api/member/lenders`
Retrieve lenders with gated data (requires authentication)

#### GET `/api/member/lenders/{id}`
Retrieve detailed lender information with gated data

#### GET `/api/member/search`
Advanced search with gated data access

---

## Member Portal

### Purpose

Provide authenticated brokers with access to detailed lender program data for lead generation and loan matching.

### Features

1. **Advanced Search**: Search with gated data
2. **Detailed Requirements**: View detailed program requirements
3. **Special Features**: Access special features and exceptions
4. **AI-Powered Search**: Use AI to find lenders matching specific criteria
5. **Export Data**: Export lender data for analysis

### Access Control

- **Authentication Required**: JWT token authentication
- **Role-Based**: Broker member role required
- **RLS Policies**: Row-level security for gated data
- **Application-Level**: Additional checks for gated field access

---

## Best Practices

### Data Management

1. **Never Publish Sensitive Data**: Always sanitize before import
2. **Manual Review Required**: All lenders require manual approval
3. **Regular Updates**: Keep lender data current
4. **Version Control**: Track changes to lender data

### Content Creation

1. **Answer-First**: Always provide direct answer in first 100 words
2. **Be Accurate**: Don't overstate lender capabilities
3. **Update Regularly**: Keep content current with lender changes
4. **Monitor Performance**: Track SEO and engagement metrics

### Lead Generation

1. **Quality Over Quantity**: Focus on qualified leads
2. **Proper Routing**: Route leads to appropriate lenders
3. **Track Performance**: Monitor lead conversion rates
4. **Maintain Relationships**: Keep lenders engaged

### SEO/AEO

1. **Schema Markup**: Include on all pages
2. **Internal Linking**: Link strategically to quiz and related content
3. **Answer Pages**: Create dynamic answer pages for common queries
4. **Monitor Rankings**: Track search rankings and featured snippets

---

## File Structure

```
publishare/
├── supabase/
│   └── migrations/
│       └── 20250130000000_create_lender_directory.sql
├── scripts/
│   └── import-lender-directory.js
└── docs/
    └── lender-db/
        ├── LENDER_DIRECTORY_SYSTEM.md (this file)
        ├── ANSWER_FIRST_CONTENT_TEMPLATES.md
        ├── Mortgage Lender Directory CMS Technical Implementation Guide.html
        └── RR- Lender List - Lender List.csv
```

---

## Next Steps

1. **Run Migration**: Execute database migration
2. **Import Data**: Run import script with CSV data
3. **Review Data**: Manually review and approve lenders
4. **Generate Content**: Create SEO-optimized article pages
5. **Publish**: Publish approved lenders
6. **Monitor**: Track performance and optimize

---

## Support

For questions or issues:
- Review this documentation
- Check `ANSWER_FIRST_CONTENT_TEMPLATES.md` for content examples
- Review `Mortgage Lender Directory CMS Technical Implementation Guide.html` for technical details

---

**Last Updated**: 2025-01-30  
**Version**: 1.0  
**Status**: ✅ Ready for Implementation


