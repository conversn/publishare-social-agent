# Google Sheet Structure Analysis - Lender Directory

## 📊 Overview

The Google Sheet contains **multiple tabs** with different types of data:
1. **Main "Lender List" tab** - Consolidated list (✅ Already imported)
2. **Individual lender detail tabs** - Detailed information per lender (❌ Not yet imported)
3. **Reference/Guide tabs** - Supporting information

---

## 📋 Tab Inventory

### Main Tabs (Reference/Administrative)
1. **Lender List** - ✅ Imported (267 lenders)
2. **SVL Smart Pricer** - Reference tab
3. **State Ambassador** - Reference tab
4. **Trusted Rate** - Reference tab
5. **Ambassador Plus** - Reference tab
6. **AFN** - Reference tab
7. **Warehouse** - Reference tab
8. **Guide** - Reference tab
9. **UWM** - Reference tab

### Individual Lender Detail Tabs (100+ tabs)

Based on the tab list, each lender has its own detailed tab:

**Government/Conventional Lenders:**
- AFR (American Financial Resources)
- ARC
- Bay Valley Mortgage
- Caliber
- Carrington
- CMG
- Citizens
- NewRez
- FAM (Finance of America Mortgage)
- FLC Bank
- Freedom
- JMAC
- Mega
- NMSI
- FBC Mortgage
- Flagstar
- NexBank
- PennyMac
- AD Mortgage
- Premier
- PRMG
- Sierra Pacific
- Plaza
- Windsor
- Mr. Cooper
- Amplify
- Ribbon
- Money House
- TMAC
- Walker & Dunlop
- HighTech
- AT Lending
- ClearEdge
- Constructive Loans
- Deephaven
- Emporium
- FlexPoint
- TheLender
- First National Bank
- PCF
- ULC
- WestGen
- Weslend
- MidAmerica
- Excelerate
- Equity Wave
- NorthBayCU
- 11 Mortgage
- NextRes
- AmWest
- BluePoint
- Button Finance
- TLA
- Equity Prime
- FasterFi
- Capital Alliance
- Cardinal
- Commerce
- HomePoint
- Kind Lending
- Lending Pros
- FundLoans
- Forward
- Grand Pacific
- Greenbox
- Groundfloor
- Home Xpress
- Logan Finance
- Village Capital
- Interfirst
- Kwik
- Lakeview
- Land Home
- Copy of Land Home
- Kiavi
- Lendsure
- LoanWyse
- MeMortgage
- Majestic
- Nations Direct
- Pac Bay
- Unified Reliance
- Resicentral
- Orion Lending
- Provident (Residential)
- Provident Funding
- Quontic Bank
- Redstone
- Remn
- SRE
- TPO GO
- Verus
- Union
- ACC
- AG Lending
- Advancial
- AHL
- American Heritage
- Amerisave
- AFF
- Angel Oak
- Athas
- Citadel
- Civic
- Coldesina
- FAR
- 5th St.
- LoanStream
- Longbridge
- Marquee
- Probably Yes
- MK
- N2 Funding
- Luxury
- Mission Valley
- NewFi
- NextUs
- NP, Inc.
- Oaktree
- OnQ Financial
- Onyx/Cosmic
- Pivotal Capital
- Princeton
- Greystone
- Plum
- Provident
- True Path Loans
- QuickFast Capital
- Quorum
- Redwood
- Mutual
- AAG
- RMF
- Spring EQ
- Sprout
- Symmetry Lending
- TCF
- The Lending Answer
- UFF West
- Unite Mortgage
- United Capital Group
- Wholesale Mortgage Bankers
- Velocity
- Quicken

**Total: ~100+ individual lender detail tabs**

---

## 🔍 Individual Lender Tab Structure (Example: AFR)

Based on the web search results, each lender detail tab contains:

### Section 1: Contact Information
- **Contact Person**: Name (e.g., "Christian Calixto")
- **Email**: Contact email (e.g., "christian.calixto@afrwholesale.com")
- **Phone**: Contact phone (e.g., "973-387-7020")
- **Portal Login**: Link/instructions
- **Platform Access**: 
  - Smart Pricer (NDC)
  - Loansifter (Broker)
  - Correspondent
  - Broker

### Section 2: Compensation & Fees
- **MLO Broker Compensation**: Percentage (e.g., "1.250%")
- **Broker Fees**:
  - UW fee: $895
  - Flood: $10
  - Tax: $80
  - Optional Doc Fee: $100
  - Mers: $39
  - Credit Report: $130
- **NDC Fees**:
  - UW Fee (+Wire): $1890
  - Additional fees
- **Processing Fee**: Conditions and amounts

### Section 3: NDC Disclosure Assignment
- LE (Loan Estimate)
- LE Redisclosures
- AUS on Lender Portal
- Groves system information

### Section 4: Loan Programs & Requirements
- **Program-specific details**:
  - FHA requirements
  - VA requirements
  - Conventional requirements
  - Non-QM programs
  - Special programs (ITIN, Construction, DPA)
- **Qualification criteria**:
  - FICO score requirements
  - LTV ratios
  - Loan amount limits
  - State availability
- **Special features**:
  - Streamline options
  - Manual underwriting
  - Special conditions
  - Overlays

### Section 5: Processing & Underwriting
- **Timeline information**:
  - Review of conditions: 48 hrs
  - CTC timeframe: 24 hrs
  - QC audit information
- **Workflow details**:
  - How to submit
  - Notification process
  - Account manager information

### Section 6: Additional Information
- **Internal notes**: Broker-specific information
- **Warnings**: "Use with caution", "Very slow", etc.
- **Special instructions**: Portal access, training requirements

---

## 📊 Data Mapping Strategy

### What We Already Have (From Main List)
✅ **Imported from "Lender List" tab:**
- Lender name
- Basic description
- Highlights (sanitized)
- Loan programs (extracted)
- FICO scores (extracted)
- LTV ratios (extracted)
- States available (extracted)

### What We Need from Individual Tabs

#### Public Fields (Consumer-Facing)
- ✅ Already have: Name, description, highlights, programs, FICO, LTV, states
- ⚠️ Could enhance: More detailed program descriptions (public-safe)

#### Gated Fields (Broker Member Portal Only - NOT for Public CMS Display)
- **detailed_program_data** (JSONB):
  - Program-specific FICO requirements
  - Program-specific LTV ratios
  - Special features per program
  - Manual underwriting availability
  - Streamline options
  - **Sensitive**: MLO compensation percentages (import but never display)
  - **Sensitive**: Processing fees (import but never display)
  - **Sensitive**: Broker fees (import but never display)
  - **Sensitive**: NDC fees (import but never display)
  
- **special_features** (JSONB):
  - Processing timelines
  - Underwriting details
  - Special conditions
  - Overlays
  - Platform access types (Smart Pricer, Loansifter)
  
- **program_specifics** (JSONB):
  - Detailed requirements per program
  - Exceptions and special cases
  - State-specific rules
  - **Sensitive**: Internal margin information (import but never display)
  - **Sensitive**: NDC-specific pricing (import but never display)
  
- **internal_notes** (TEXT):
  - Broker-specific information
  - Warnings and cautions
  - Portal access instructions
  - Training requirements
  - **Sensitive**: Account executive contact info (import but never display)
  - **Sensitive**: Email addresses (import but never display)
  - **Sensitive**: Phone numbers (import but never display)

#### Sensitive Data Handling
⚠️ **IMPORT STRATEGY**: Import sensitive data into gated fields, but **NEVER display in public CMS**
- ✅ **Import**: MLO compensation percentages → `detailed_program_data.compensation`
- ✅ **Import**: Processing fees → `detailed_program_data.fees`
- ✅ **Import**: Account executive contact info → `internal_notes` (structured)
- ✅ **Import**: Email addresses → `internal_notes` (structured)
- ✅ **Import**: Phone numbers → `internal_notes` (structured)
- ✅ **Import**: Internal margin information → `program_specifics.margins`
- ✅ **Import**: NDC-specific pricing → `program_specifics.pricing`

**Display Rules**:
- ❌ **NEVER** display in public-facing CMS content
- ✅ **ONLY** accessible through authenticated broker portal
- ✅ **ONLY** via RLS policies (gated views)
- ✅ Use `lenders_with_programs_gated` view for broker access

---

## 🗂️ Tab Categories

### Category 1: Main List
- **Lender List** - ✅ Imported

### Category 2: Reference/Guide Tabs
- SVL Smart Pricer
- State Ambassador
- Trusted Rate
- Ambassador Plus
- AFN
- Warehouse
- Guide
- UWM

**Action**: Review for reference information, but likely not for import

### Category 3: Individual Lender Detail Tabs
- ~100+ tabs, one per lender
- Contains detailed program information
- Contains broker-specific data

**Action**: Import gated data from these tabs

---

## 📝 Recommended Import Strategy

### Phase 1: Analyze Sample Tabs (Current)
1. ✅ Review structure of individual tabs
2. ✅ Map data fields to database schema
3. ✅ Identify public vs gated data
4. ✅ Create import script

### Phase 2: Import Gated Data (Including Sensitive)
1. Create script to read individual lender tabs
2. Extract ALL data (including sensitive fields)
3. Populate `detailed_program_data` JSONB (including compensation, fees)
4. Populate `special_features` JSONB
5. Populate `program_specifics` JSONB (including margins, pricing)
6. Add `internal_notes` (including contact info, account executives)
7. **Critical**: Ensure all sensitive data is marked as gated-only
8. **Critical**: Verify RLS policies prevent public access

### Phase 3: Link & Enhance
1. Match lender tabs to imported lenders (by name)
2. Update existing lender records
3. Verify data accuracy
4. Review for sensitive information

---

## 🔍 Data Field Mapping

### From Individual Lender Tabs → Database

| Sheet Field | Database Field | Data Type | Access Level | Display Rule |
|------------|----------------|-----------|-------------|--------------|
| Contact Person | `internal_notes.contact_person` | JSONB | Gated | ❌ Never in CMS |
| Email | `internal_notes.email` | JSONB | Gated | ❌ Never in CMS |
| Phone | `internal_notes.phone` | JSONB | Gated | ❌ Never in CMS |
| MLO Compensation | `detailed_program_data.compensation` | JSONB | Gated | ❌ Never in CMS |
| Broker Fees | `detailed_program_data.broker_fees` | JSONB | Gated | ❌ Never in CMS |
| NDC Fees | `detailed_program_data.ndc_fees` | JSONB | Gated | ❌ Never in CMS |
| Processing Fee | `detailed_program_data.processing_fee` | JSONB | Gated | ❌ Never in CMS |
| Portal Login | `internal_notes.portal_login` | JSONB | Gated | ✅ Broker portal only |
| Program Requirements | `detailed_program_data.requirements` | JSONB | Gated | ✅ Broker portal only |
| Special Features | `special_features` | JSONB | Gated | ✅ Broker portal only |
| Processing Timeline | `special_features.processing` | JSONB | Gated | ✅ Broker portal only |
| Underwriting Details | `special_features.underwriting` | JSONB | Gated | ✅ Broker portal only |
| Warnings/Cautions | `internal_notes.warnings` | JSONB | Gated | ✅ Broker portal only |
| Platform Access | `special_features.platforms` | JSONB | Gated | ✅ Broker portal only |
| Account Executive | `internal_notes.account_executive` | JSONB | Gated | ❌ Never in CMS |

---

## ⚠️ Sensitive Data Import & Display Rules

### Import Strategy
**✅ IMPORT ALL DATA** - Store sensitive information in gated fields for broker portal access

**Sensitive Data Fields (Import to Gated, Never Display in CMS):**
- ✅ Contact information (names, emails, phones) → `internal_notes.contact_info`
- ✅ Compensation percentages → `detailed_program_data.compensation`
- ✅ Fee amounts → `detailed_program_data.fees`
- ✅ Margin information → `program_specifics.margins`
- ✅ Account executive details → `internal_notes.account_executive`
- ✅ Internal pricing data → `program_specifics.pricing`

**Public-Safe Data (Import to Gated, Can Display in Broker Portal):**
- ✅ Program requirements (FICO, LTV per program) → `detailed_program_data.requirements`
- ✅ Special features (streamline, manual UW) → `special_features`
- ✅ Processing timelines (general) → `special_features.processing`
- ✅ Platform access types (Smart Pricer, Loansifter) → `special_features.platforms`
- ✅ Warnings and cautions → `internal_notes.warnings`

### Display Rules
- ❌ **NEVER** display sensitive data in public-facing CMS content
- ✅ **ONLY** accessible through authenticated broker portal
- ✅ **ONLY** via RLS policies using `lenders_with_programs_gated` view
- ✅ All sensitive fields must be excluded from public API responses
- ✅ CMS content generation must exclude gated fields

---

## 📋 Next Steps

1. **Create Tab Import Script**
   - Read individual lender tabs from Google Sheet
   - Extract gated data fields
   - Match to existing lenders by name
   - Update database records

2. **Data Validation**
   - Verify sensitive data is stored in gated fields only
   - Confirm RLS policies prevent public access to gated fields
   - Verify program data accuracy
   - Check for duplicates
   - Test that public API responses exclude sensitive data

3. **Testing**
   - Test on 5-10 sample lenders
   - Review imported data
   - Adjust script as needed

4. **Full Import**
   - Import all ~100+ lender detail tabs
   - Verify completeness
   - Final review

---

## 🔗 Google Sheet URL

[Copy of SVL Lender List](https://docs.google.com/spreadsheets/d/18h352fIKCM2Dc2X3oILlYaocAMu0UTwvtBoJ0iT2c8w/edit?gid=22644759#gid=22644759)

---

**Analysis Date**: 2025-01-30  
**Status**: ✅ Structure Analyzed  
**Next**: Create detailed tab import script

