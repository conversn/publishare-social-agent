# SeniorSimple Content Management Analysis

## Executive Summary

**Current State:** SeniorSimple has a **hybrid content architecture** with:
- ✅ **Publishare CMS** managing marketing articles via `articles` table
- ✅ **Application build** serving core application pages and funnels
- ⚠️ **Legacy static HTML** files exist but are not actively served

**Desired State:** Publishare for content marketing, application build for funnels/core pages

**Gap Analysis:** Current architecture aligns with desired state, but there's overlap and some legacy content.

---

## 1. Publishare CMS Managed Content

### Routes Served from `articles` Table (Database)

#### `/articles/[slug]` - Primary Article Route
- **Source:** `src/app/articles/[slug]/page.tsx`
- **Data Source:** `articles` table via `getArticle(slug)`
- **Content Type:** Marketing articles, guides, educational content
- **Features:**
  - Renders `html_body` if available, falls back to markdown processing
  - Related articles sidebar
  - SEO structured data
  - Featured images
  - Category associations

#### `/content/[slug]` - Alternative Article Route
- **Source:** `src/app/content/[slug]/page.tsx`
- **Data Source:** `articles` table (same as `/articles/[slug]`)
- **Content Type:** Same as articles route
- **Features:**
  - Enhanced article display with calculators/tools/checklists
  - Strategy guide components for specific slugs
  - Calculator wrapper integration
  - Interactive tools integration

#### `/articles` - Article Listing Page
- **Source:** `src/app/articles/page.tsx`
- **Data Source:** `articles` table via `getPublishedArticles()`
- **Content Type:** Article index/archive
- **Features:**
  - Category filtering
  - Article cards with excerpts
  - Pagination-ready structure

#### Homepage Featured Articles
- **Source:** `src/app/page.tsx`
- **Data Source:** `articles` table via `getFeaturedArticles()`
- **Content Type:** Featured marketing content
- **Usage:** Displays on homepage hero/featured sections

### Content Management Functions
All article data is fetched via `src/lib/articles.ts`:
- `getPublishedArticles()` - List all published articles
- `getArticle(slug)` - Get single article by slug
- `getArticlesByCategory()` - Filter by category
- `getRelatedArticles()` - Related content suggestions
- `searchArticles()` - Full-text search
- `getFeaturedArticles()` - Homepage featured content

**Database Table:** `articles`
- Contains: title, slug, content, html_body, excerpt, meta fields, featured images
- Status: `published`, `draft`, `pending`, `private`, `scheduled`
- Categories: Linked via `article_categories` table

---

## 2. Application Build Pages (Hardcoded)

### Core Application Pages

#### Funnel Pages
- **`/quiz`** - Main annuity quiz (with OTP)
- **`/quiz-a`** - Quiz without OTP (skip flow)
- **`/quiz-submitted`** - Quiz completion page
- **`/thank-you`** - Thank you page
- **`/expect-call`** - Post-quiz expectation page
- **`/consultation`** - Consultation booking
- **`/consultation-booked`** - Booking confirmation
- **`/consultation-confirmed`** - Final confirmation
- **`/book-confirmation`** - Alternative booking confirmation
- **`/quote`** - Quote request page
- **`/quote-submitted`** - Quote submission confirmation

#### Calculator Pages (Application Components)
- **`/calculators`** - Calculator hub page
- **`/calculators/social-security`** - Social Security Calculator
- **`/calculators/medicare-costs`** - Medicare Cost Calculator
- **`/calculators/retirement-savings`** - Retirement Savings Calculator
- **`/calculators/reverse-mortgage`** - Reverse Mortgage Calculator
- **`/calculators/life-insurance`** - Life Insurance Calculator
- **`/calculators/downsizing`** - Downsizing Calculator
- **`/calculators/investment-growth`** - Investment Growth Calculator

**Note:** These are React components, not CMS content. They're interactive tools.

#### Content Hub Pages (Application Components)
- **`/guides`** - Guides listing page
- **`/tools`** - Tools listing page
- **`/resources`** - Resources listing page
- **`/videos`** - Videos page
- **`/faq`** - FAQ page
- **`/contact`** - Contact page
- **`/gallery`** - Photo gallery

#### Category/Topic Pages
- **`/retirement`** - Retirement topic hub
- **`/tax`** - Tax planning hub
- **`/estate`** - Estate planning hub
- **`/health`** - Health/Medicare hub
- **`/housing`** - Housing options hub
- **`/insurance`** - Insurance hub

#### Legal/Policy Pages
- **`/privacy-policy`** - Privacy policy
- **`/terms-of-service`** - Terms of service
- **`/disclaimers`** - Disclaimers

#### Special Pages
- **`/retirement-rescue`** - Retirement Rescue program page
- **`/retirement-protection-checklist`** - Checklist page
- **`/ebook`** - Ebook landing page
- **`/life-insurance-quiz`** - Life insurance quiz

**All of these are:** Hardcoded React/Next.js pages in `src/app/` directory
**Not managed by:** Publishare CMS
**Purpose:** Core application functionality, funnels, interactive tools

---

## 3. Legacy Static HTML Files

### Location: `pages/` directory (41 files)

**Status:** ⚠️ **NOT ACTIVELY SERVED**

These HTML files exist but Next.js doesn't serve from the `pages/` directory in the App Router architecture. They appear to be legacy content that may have been migrated or are awaiting migration.

#### Calculator Guides (HTML)
- `aging_in_place_calculator.html`
- `downsizing_calculator.html`
- `healthcare_cost_calculator.html`
- `home_equity_calculator.html`
- `life_insurance_calculator.html`
- `long_term_care_insurance_calculator.html`
- `medicare_cost_calculator.html`
- `reverse_mortgage_calculator.html`
- `rmd_calculator.html`
- `roth_conversion_calculator.html`
- `social_security_optimization.html`
- `tax_impact_calculator.html`
- `withdrawal_planner_tool.html`
- `disability_insurance_calculator.html`
- `beneficiary_planning_tool.html`

#### Planning Guides (HTML)
- `complete_retirement_planning_guide.html`
- `downsizing_home_retirement.html`
- `estate_planning_checklist.html`
- `estate_planning_essentials.html`
- `estate_tax_planning_guide.html`
- `hsa_strategy_guide.html`
- `indexed_annuities_secret.html`
- `ira_withdrawal_strategy_guide.html`
- `life_insurance_retirement_guide.html`
- `long_term_care_planning_guide.html`
- `long_term_care_planning_guide-1.html`
- `long_term_care_planning.html`
- `medicare_enrollment_guide.html`
- `medicare_made_simple.html`
- `medicare_plan_comparison.html`
- `medigap_guide.html`
- `power_of_attorney_forms.html`
- `probate_avoidance_strategies.html`
- `probate_avoidance.html`
- `retirement_tax_strategy_guide.html`
- `retirement-protection-checklist.html`
- `reverse_mortgages_guide.html`
- `senior_housing_options.html`
- `tax_efficient_withdrawals.html`
- `will_trust_planning_guide.html`

**Note:** There's a script `src/scripts/import-content.ts` that appears designed to import these HTML files into the `articles` table, suggesting these are legacy content awaiting migration.

---

## 4. Content Routing Architecture

### Current Routing Structure

```
seniorsimple.org/
├── / (homepage) - Application page with featured articles from CMS
├── /articles - CMS managed (article listing)
├── /articles/[slug] - CMS managed (individual articles)
├── /content/[slug] - CMS managed (alternative article route)
│
├── /quiz - Application page (funnel)
├── /quiz-a - Application page (funnel)
├── /quiz-submitted - Application page (funnel)
├── /thank-you - Application page (funnel)
├── /consultation - Application page (funnel)
│
├── /calculators - Application page (tools hub)
├── /calculators/[type] - Application pages (interactive calculators)
│
├── /guides - Application page (content hub)
├── /tools - Application page (content hub)
├── /resources - Application page (content hub)
│
└── /[category] - Application pages (topic hubs)
```

---

## 5. Current State vs Desired State

### ✅ What's Working (Aligned with Desired State)

1. **Content Marketing = Publishare CMS**
   - ✅ Marketing articles served from `articles` table
   - ✅ `/articles/[slug]` and `/content/[slug]` routes use CMS
   - ✅ Article listing, categories, search all CMS-driven
   - ✅ Homepage featured content from CMS

2. **Funnels = Application Build**
   - ✅ Quiz flow (`/quiz`, `/quiz-a`, `/quiz-submitted`) is application code
   - ✅ Consultation booking flow is application code
   - ✅ Thank you pages are application code
   - ✅ Lead capture forms are application code

3. **Core Application = Application Build**
   - ✅ Interactive calculators are React components
   - ✅ Content hub pages are application pages
   - ✅ Legal/policy pages are application pages

### ⚠️ Areas of Concern

1. **Dual Article Routes**
   - Both `/articles/[slug]` and `/content/[slug]` serve from same `articles` table
   - Potential SEO duplicate content issue
   - Unclear which route is primary

2. **Legacy HTML Files**
   - 41 HTML files in `pages/` directory not being served
   - May contain content that should be in CMS
   - Import script exists but unclear if executed

3. **Calculator Content Overlap**
   - Some calculator guides exist as HTML files
   - Calculator pages are application components
   - Unclear if calculator guides should be CMS articles or app pages

4. **Strategy Guides**
   - Some strategy guides are hardcoded React components
   - Referenced in `/content/[slug]` route
   - May need to be CMS articles instead

---

## 6. Content Type Breakdown

### Publishare CMS (articles table)
- ✅ Marketing blog articles
- ✅ Educational guides
- ✅ SEO content
- ✅ Category-based content
- ✅ Featured homepage content

### Application Build (hardcoded)
- ✅ Quiz funnels
- ✅ Consultation booking
- ✅ Interactive calculators (React components)
- ✅ Content hub pages
- ✅ Legal/policy pages
- ✅ Topic category pages
- ✅ Thank you/confirmation pages

### Legacy/Unused
- ⚠️ 41 HTML files in `pages/` directory (not served)

---

## 7. Recommendations

### Immediate Actions

1. **Clarify Article Routes**
   - Decide if `/articles/[slug]` or `/content/[slug]` is primary
   - Consider redirecting one to the other
   - Document which route to use for new content

2. **Audit Legacy HTML Files**
   - Review if content should be migrated to CMS
   - Execute import script if needed
   - Remove unused files or document their purpose

3. **Document Content Strategy**
   - Create clear guidelines: CMS vs Application
   - Define what content goes where
   - Establish workflow for new content

### Long-term Improvements

1. **Consolidate Article Routes**
   - Use single route (`/articles/[slug]`)
   - Deprecate `/content/[slug]` or make it redirect

2. **Migrate Strategy Guides**
   - Move hardcoded strategy guide components to CMS
   - Use CMS articles with enhanced display components
   - Maintain interactivity via article metadata

3. **Calculator Content Strategy**
   - Keep interactive calculators as app components
   - Create CMS articles for calculator guides/explainers
   - Link calculators to related CMS articles

---

## 8. Summary

**Current Architecture:**
- ✅ **Publishare CMS** manages marketing articles (aligned with desired state)
- ✅ **Application build** serves funnels and core pages (aligned with desired state)
- ⚠️ **Legacy HTML** files exist but not served (cleanup needed)

**Overall Assessment:**
The current architecture **largely aligns** with the desired state:
- Content marketing is CMS-managed ✅
- Funnels are application-managed ✅
- Core pages are application-managed ✅

**Main Issues:**
1. Dual article routes (potential SEO issue)
2. Legacy HTML files (cleanup needed)
3. Some strategy guides hardcoded (could be CMS)

**Recommendation:**
The architecture is sound. Focus on:
1. Cleaning up legacy files
2. Consolidating article routes
3. Documenting content strategy clearly

