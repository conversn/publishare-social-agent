# Answer-First Content Templates for Lender Directory

## Overview

This document defines answer-first content templates optimized for AEO (Answer Engine Optimization) and SEO. These templates ensure all lender directory content provides direct answers in the first 100 words, structured for featured snippets and voice search.

---

## Template Structure

All templates follow this structure:
1. **Answer-First Summary** (100 words max) - Direct answer to the query
2. **H1 Heading** - Main question/topic
3. **H2 Sections** (3-5 sections) - Key information
4. **H3 Subsections** - Detailed information
5. **Data Points** - Specific statistics, requirements
6. **Schema Markup** - JSON-LD structured data

---

## Template 1: Individual Lender Page

### URL Pattern
`/lenders/{lender-slug}/`

### Example
`/lenders/amwest-funding/`

### Template

```markdown
# {LenderName} Mortgage Loans & Programs | RateRoots

## Answer-First Summary (First 100 Words)

{LenderName} is a mortgage lender offering {program_list} loans with {key_highlights}. The lender accepts borrowers with FICO scores as low as {min_fico} and offers loan-to-value ratios up to {max_ltv}%. {LenderName} operates in {state_count} states including {top_states}. Key features include {feature_1}, {feature_2}, and {feature_3}. The lender specializes in {specialty_programs} and is known for {unique_selling_point}. {LenderName} offers competitive rates and flexible qualification requirements, making it a good option for {target_borrower_types}.

## About {LenderName}

{LenderName} is a {lender_type} that provides {program_types} mortgage solutions. The lender has been serving borrowers since {year_founded} and has funded over {loan_volume} in loans.

### Key Highlights

- {Highlight 1}
- {Highlight 2}
- {Highlight 3}
- {Highlight 4}
- {Highlight 5}

## Loan Programs Offered

{LenderName} offers the following loan programs:

### Government Programs

- **FHA Loans**: {FHA details}
- **VA Loans**: {VA details}
- **USDA Loans**: {USDA details}

### Conventional Programs

- **Conventional Loans**: {Conventional details}
- **High Balance Loans**: {High Balance details}
- **Jumbo Loans**: {Jumbo details}

### Non-QM Programs

- **DSCR Loans**: {DSCR details}
- **Bank Statement Loans**: {Bank Statement details}
- **{Other Non-QM Programs}**: {Details}

## Qualification Requirements

### Minimum FICO Score
{LenderName} accepts borrowers with FICO scores as low as {min_fico}.

### Maximum Loan-to-Value (LTV)
The lender offers LTV ratios up to {max_ltv}%.

### Maximum Loan Amount
Loan amounts up to ${max_loan_amount:,.0f} are available.

### States Available
{LenderName} operates in the following states:
{state_list}

## Special Features

- {Feature 1}
- {Feature 2}
- {Feature 3}

## Who Should Consider {LenderName}?

{LenderName} is ideal for:
- {Borrower type 1}
- {Borrower type 2}
- {Borrower type 3}

## How to Get Started

To get matched with {LenderName} and compare rates from multiple lenders, [take our free quiz](https://rateroots.com/quiz). Our quiz will help you find the best lender for your specific situation.

---

**Schema Markup:**
```json
{
  "@context": "https://schema.org",
  "@type": "FinancialService",
  "name": "{LenderName}",
  "description": "{Description}",
  "serviceType": "Mortgage Lending",
  "areaServed": [
    {"@type": "State", "name": "{State1}"},
    {"@type": "State", "name": "{State2}"}
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Mortgage Programs",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "LoanOrCredit",
          "name": "{ProgramName}"
        }
      }
    ]
  }
}
```
```

---

## Template 2: Loan Program Category Page

### URL Pattern
`/loan-programs/{program-slug}/`

### Example
`/loan-programs/dscr-loans/`

### Template

```markdown
# {ProgramName} Mortgage Lenders | Best {ProgramName} Loan Rates | RateRoots

## Answer-First Summary (First 100 Words)

{ProgramName} loans are {program_definition}. {ProgramName} loans are ideal for {target_borrowers} because {key_benefit}. {Lender_count} lenders in our directory offer {ProgramName} loans, with minimum FICO scores ranging from {min_fico_range} and maximum LTV ratios up to {max_ltv_range}%. {ProgramName} loans typically require {key_requirement_1}, {key_requirement_2}, and {key_requirement_3}. The average interest rate for {ProgramName} loans is {rate_range}%, and loan amounts can range from ${min_amount:,.0f} to ${max_amount:,.0f}. {ProgramName} loans are available in {state_count} states.

## What is a {ProgramName} Loan?

{Detailed explanation of the program}

### Key Features

- {Feature 1}
- {Feature 2}
- {Feature 3}

### Who Qualifies?

{ProgramName} loans are ideal for:
- {Borrower type 1}
- {Borrower type 2}
- {Borrower type 3}

## {ProgramName} Loan Requirements

### Minimum FICO Score
Most lenders require a minimum FICO score of {min_fico} for {ProgramName} loans.

### Maximum Loan-to-Value (LTV)
LTV ratios typically range from {min_ltv}% to {max_ltv}%.

### Documentation Required
- {Doc 1}
- {Doc 2}
- {Doc 3}

## Top {ProgramName} Lenders

The following lenders offer competitive {ProgramName} loans:

1. **[Lender 1 Name](/lenders/{lender-1-slug}/)**: {Lender 1 highlights}
2. **[Lender 2 Name](/lenders/{lender-2-slug}/)**: {Lender 2 highlights}
3. **[Lender 3 Name](/lenders/{lender-3-slug}/)**: {Lender 3 highlights}

[View all {ProgramName} lenders →](/loan-programs/{program-slug}/lenders/)

## {ProgramName} vs. Other Loan Types

### {ProgramName} vs. {Alternative Program 1}
{Comparison}

### {ProgramName} vs. {Alternative Program 2}
{Comparison}

## How to Get a {ProgramName} Loan

1. **Check Your Eligibility**: Ensure you meet the minimum requirements
2. **Compare Lenders**: Review multiple {ProgramName} lenders
3. **Get Pre-Approved**: Complete the pre-approval process
4. **Submit Application**: Provide required documentation

[Start Your {ProgramName} Loan Application →](https://rateroots.com/quiz)

---

**Schema Markup:**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{ProgramName} Mortgage Lenders",
  "description": "{Description}",
  "mainEntity": {
    "@type": "LoanOrCredit",
    "name": "{ProgramName}",
    "description": "{Program description}"
  }
}
```
```

---

## Template 3: Answer Page (Dynamic Query-Based)

### URL Pattern
`/lenders-for-{query-parameter}/`

### Examples
- `/lenders-for-620-fico/`
- `/dscr-lenders-in-california/`
- `/fha-lenders-for-first-time-buyers/`
- `/jumbo-lenders-up-to-3-million/`

### Template

```markdown
# {Query-Based Title} | RateRoots

## Answer-First Summary (First 100 Words)

{Direct answer to the query}. {Lender_count} lenders in our directory {answer_the_query}. The best lenders for {query_parameter} include {top_3_lenders}. These lenders offer {key_features} with {qualification_details}. Minimum FICO scores range from {min_fico} to {max_fico}, and maximum LTV ratios range from {min_ltv}% to {max_ltv}%. {Program_types} loans are available from these lenders, with loan amounts ranging from ${min_amount:,.0f} to ${max_amount:,.0f}. {State_availability} states are covered by these lenders. To find the best lender for your specific situation, [take our free quiz](https://rateroots.com/quiz).

## Best Lenders for {Query Parameter}

### 1. {Lender 1 Name}

{Lender 1 summary}
- Minimum FICO: {fico}
- Maximum LTV: {ltv}%
- Key Features: {features}

[Learn More About {Lender 1} →](/lenders/{lender-1-slug}/)

### 2. {Lender 2 Name}

{Lender 2 summary}
- Minimum FICO: {fico}
- Maximum LTV: {ltv}%
- Key Features: {features}

[Learn More About {Lender 2} →](/lenders/{lender-2-slug}/)

### 3. {Lender 3 Name}

{Lender 3 summary}
- Minimum FICO: {fico}
- Maximum LTV: {ltv}%
- Key Features: {features}

[Learn More About {Lender 3} →](/lenders/{lender-3-slug}/)

## Qualification Requirements

### FICO Score Requirements
{Details about FICO requirements}

### Loan-to-Value (LTV) Requirements
{Details about LTV requirements}

### Loan Amount Limits
{Details about loan amount limits}

## Available Loan Programs

The following loan programs are available from lenders for {query_parameter}:

- {Program 1}
- {Program 2}
- {Program 3}

## State Availability

These lenders operate in the following states:
{State list}

## How to Compare Lenders

1. **Review Lender Profiles**: Check each lender's programs and requirements
2. **Compare Rates**: Compare interest rates and fees
3. **Check Reviews**: Read lender reviews and ratings
4. **Get Pre-Approved**: Complete pre-approval with multiple lenders

[Start Comparing Lenders →](https://rateroots.com/quiz)

---

**Schema Markup:**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": {
    "@type": "Question",
    "name": "{Query Question}",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "{Answer-first summary}"
    }
  }
}
```
```

---

## Template 4: State-Specific Lender Page

### URL Pattern
`/lenders/{state-slug}/`

### Example
`/lenders/california/`

### Template

```markdown
# {State} Mortgage Lenders | Best Home Loan Lenders in {State} | RateRoots

## Answer-First Summary (First 100 Words)

{State} has {lender_count} mortgage lenders offering {program_types} loans. The best lenders in {State} include {top_3_lenders}. These lenders offer competitive rates with minimum FICO scores ranging from {min_fico} to {max_fico} and maximum LTV ratios up to {max_ltv}%. {State}-specific programs like {state_program_1} and {state_program_2} are available. Average interest rates in {State} range from {rate_range}%, and loan amounts can reach up to ${max_amount:,.0f}. To find the best lender for your {State} property, [take our free quiz](https://rateroots.com/quiz) and compare rates from multiple lenders.

## Top Mortgage Lenders in {State}

### 1. {Lender 1 Name}

{Lender 1 summary for {State}}
- Programs: {programs}
- Minimum FICO: {fico}
- Maximum LTV: {ltv}%

[Learn More →](/lenders/{lender-1-slug}/)

### 2. {Lender 2 Name}

{Lender 2 summary for {State}}
- Programs: {programs}
- Minimum FICO: {fico}
- Maximum LTV: {ltv}%

[Learn More →](/lenders/{lender-2-slug}/)

## {State}-Specific Loan Programs

{State} offers the following state-specific programs:

- **{Program 1}**: {Description}
- **{Program 2}**: {Description}

## {State} Mortgage Market Overview

{State-specific market information}

### Average Interest Rates
{State} average interest rates: {rate_info}

### Loan Limits
{State} conforming loan limits: ${limit:,.0f}

## How to Get a Mortgage in {State}

1. **Check Your Credit**: Review your FICO score
2. **Compare Lenders**: Review {State} lenders
3. **Get Pre-Approved**: Complete pre-approval
4. **Find a Property**: Work with a real estate agent
5. **Close Your Loan**: Complete the closing process

[Start Your {State} Mortgage Application →](https://rateroots.com/quiz)

---

**Schema Markup:**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{State} Mortgage Lenders",
  "description": "{Description}",
  "spatialCoverage": {
    "@type": "State",
    "name": "{State}"
  }
}
```
```

---

## Template 5: FICO Score-Specific Page

### URL Pattern
`/lenders/fico-{score}/`

### Example
`/lenders/fico-620/`

### Template

```markdown
# Lenders for {FICO Score} Credit Score | {FICO Score} FICO Mortgage Lenders | RateRoots

## Answer-First Summary (First 100 Words)

Borrowers with a {fico_score} FICO score can qualify for mortgages from {lender_count} lenders in our directory. The best lenders for {fico_score} FICO scores include {top_3_lenders}. These lenders offer {program_types} loans with maximum LTV ratios ranging from {min_ltv}% to {max_ltv}%. {Program_specifics} loans are available for {fico_score} FICO scores. Interest rates typically range from {rate_range}%, and loan amounts can reach up to ${max_amount:,.0f}. {State_availability} states are covered. To find the best lender for your {fico_score} FICO score, [take our free quiz](https://rateroots.com/quiz) and compare rates.

## Can You Get a Mortgage with a {FICO Score} FICO Score?

{Answer: Yes/No and explanation}

### Qualification Requirements

- Minimum FICO: {fico_score}
- Maximum LTV: {ltv_range}%
- Available Programs: {programs}

## Best Lenders for {FICO Score} FICO Scores

### 1. {Lender 1 Name}

{Lender 1 details for {fico_score} FICO}
- Programs: {programs}
- Maximum LTV: {ltv}%

[Learn More →](/lenders/{lender-1-slug}/)

### 2. {Lender 2 Name}

{Lender 2 details for {fico_score} FICO}
- Programs: {programs}
- Maximum LTV: {ltv}%

[Learn More →](/lenders/{lender-2-slug}/)

## Loan Programs Available for {FICO Score} FICO Scores

### Government Programs
- **FHA**: {Details}
- **VA**: {Details}
- **USDA**: {Details}

### Conventional Programs
- **Conventional**: {Details}
- **High Balance**: {Details}

### Non-QM Programs
- **DSCR**: {Details}
- **Bank Statement**: {Details}

## Tips for {FICO Score} FICO Score Borrowers

1. **Improve Your Credit**: {Tip}
2. **Save for Down Payment**: {Tip}
3. **Reduce Debt**: {Tip}
4. **Compare Lenders**: {Tip}

[Start Your Application →](https://rateroots.com/quiz)

---

**Schema Markup:**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": {
    "@type": "Question",
    "name": "Can I get a mortgage with a {FICO Score} FICO score?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "{Answer-first summary}"
    }
  }
}
```
```

---

## Content Generation Guidelines

### Answer-First Summary Rules

1. **First 100 Words**: Must contain the direct answer
2. **Include Numbers**: FICO scores, LTV ratios, loan amounts, lender counts
3. **Include Top 3**: Mention top 3 lenders when applicable
4. **Include CTA**: Link to quiz in first 100 words when possible
5. **Be Specific**: Use exact numbers, not ranges when possible

### Heading Structure

1. **H1**: Main question/topic (includes target keyword)
2. **H2**: Major sections (3-5 sections)
3. **H3**: Subsections within H2 sections
4. **Use Questions**: Frame H2/H3 as questions when appropriate

### Data Points to Include

- Lender counts
- FICO score ranges
- LTV ratio ranges
- Loan amount ranges
- Interest rate ranges
- State availability
- Program availability

### Internal Linking Strategy

1. **Link to Lender Pages**: Use descriptive anchor text
2. **Link to Program Pages**: Use program names as anchor text
3. **Link to Quiz**: Use action-oriented CTAs
4. **Link to Related Guides**: Link to comparison articles
5. **No External Links**: No external links to lender websites (nofollow if needed)

### Schema Markup Requirements

1. **FinancialService**: For lender pages
2. **LoanOrCredit**: For program pages
3. **FAQPage**: For answer pages
4. **Article**: For all content pages
5. **BreadcrumbList**: For all pages

---

## Integration with Publishare CMS

### AEO Fields Mapping

- `aeo_summary`: Answer-first summary (first 100 words)
- `aeo_content_type`: "definition", "how-to", "comparison", "data"
- `aeo_answer_first`: true (validated)
- `content_structure`: JSON with H1/H2/H3 hierarchy
- `data_points`: Array of key statistics
- `schema_markup`: JSON-LD schema
- `speakable_summary`: 280-350 char voice-optimized summary

### Content Generation Workflow

1. **Detect Content Type**: Based on URL pattern
2. **Load Template**: Select appropriate template
3. **Populate Data**: Fill template with lender/program data
4. **Generate AEO Summary**: Extract first 100 words
5. **Generate Schema**: Create JSON-LD schema
6. **Validate Answer-First**: Ensure answer in first 100 words
7. **Save to Articles**: Create article with lender link

---

## Example: Generated Content

See `LENDER_DIRECTORY_CONTENT_EXAMPLES.md` for complete examples of generated content using these templates.


