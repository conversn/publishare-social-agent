# Lender Directory Database System

## Quick Start

This directory contains all resources for the RateRoots Lender Directory system, designed to maximize SEO/AEO goals and generate consumer leads.

### Files

- **`LENDER_DIRECTORY_SYSTEM.md`** - Complete system documentation
- **`ANSWER_FIRST_CONTENT_TEMPLATES.md`** - Content templates for SEO/AEO
- **`Mortgage Lender Directory CMS Technical Implementation Guide.html`** - Technical specifications
- **`RR- Lender List - Lender List.csv`** - Source data (contains sensitive information)

### Database Migration

```bash
# Run migration in Supabase SQL Editor
supabase/migrations/20250130000000_create_lender_directory.sql
```

### Import Data

```bash
# Install dependencies
npm install csv-parser @supabase/supabase-js

# Dry run (no database changes)
node scripts/import-lender-directory.js --dry-run

# Actual import
node scripts/import-lender-directory.js
```

### Key Features

✅ **Public/Gated Data Separation** - Consumers see safe data, brokers see detailed data  
✅ **SEO/AEO Optimized** - Answer-first content for featured snippets  
✅ **Lead Generation** - Integrates with RateRoots quiz funnel  
✅ **Multi-Site Support** - RateRoots master, extensible to other Simple sites  
✅ **Manual Review** - Prevents overstating lender capabilities  

### Documentation

See `LENDER_DIRECTORY_SYSTEM.md` for complete documentation.


