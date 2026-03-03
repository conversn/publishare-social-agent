# 🚀 Lender Directory - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Run Database Migration

**Copy this SQL file to Supabase SQL Editor:**
```
supabase/migrations/20250130000000_create_lender_directory.sql
```

**Supabase Dashboard**: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql

**Verify**:
```sql
SELECT COUNT(*) FROM loan_programs; -- Should be 30
```

---

### 2. Install & Configure

```bash
# Install dependencies
npm install

# Set environment variables in .env.local
SUPABASE_URL=https://vpysqshhafthuxvokwqj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key_here
IMPORT_USER_ID=your_user_id_here
```

---

### 3. Verify & Import

```bash
# Verify setup
node scripts/verify-lender-directory-setup.js

# Test import (dry run)
npm run import-lenders:dry-run

# Actual import
npm run import-lenders
```

---

## 📁 Files Created

- ✅ `supabase/migrations/20250130000000_create_lender_directory.sql` - Database schema
- ✅ `scripts/import-lender-directory.js` - Data import script
- ✅ `scripts/verify-lender-directory-setup.js` - Setup verification
- ✅ `docs/lender-db/ANSWER_FIRST_CONTENT_TEMPLATES.md` - Content templates
- ✅ `docs/lender-db/LENDER_DIRECTORY_SYSTEM.md` - Complete documentation
- ✅ `docs/lender-db/EXECUTION_GUIDE.md` - Step-by-step guide
- ✅ `docs/lender-db/NEXT_STEPS.md` - Immediate action items

---

## 🎯 What This System Does

1. **Consumer Discovery**: Answer-first content for SEO/AEO
2. **Lead Generation**: Integrates with RateRoots quiz funnel
3. **Business Relationships**: Links to organizations for lead routing
4. **Data Protection**: Sensitive data excluded and gated
5. **Manual Review**: Prevents overstating lender capabilities

---

## 📚 Full Documentation

- **Complete Guide**: `LENDER_DIRECTORY_SYSTEM.md`
- **Execution Steps**: `EXECUTION_GUIDE.md`
- **Content Templates**: `ANSWER_FIRST_CONTENT_TEMPLATES.md`

---

**Ready to deploy! Start with the database migration.** 🚀


