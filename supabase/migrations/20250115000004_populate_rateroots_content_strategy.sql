-- ========================================
-- POPULATE RATEROOTS CONTENT STRATEGY
-- ========================================
-- Migration: populate_rateroots_content_strategy
-- Purpose: Insert 50 content strategy entries for RateRoots SEO content plan
-- Includes: Pillar pages, cluster content, industry pages, comparison content
-- ========================================

-- First, ensure site_id column exists in content_strategy table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'content_strategy' AND column_name = 'site_id'
  ) THEN
    ALTER TABLE content_strategy ADD COLUMN site_id VARCHAR(50);
    CREATE INDEX IF NOT EXISTS idx_content_strategy_site_id ON content_strategy(site_id);
    RAISE NOTICE 'Added site_id column to content_strategy table';
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_content_strategy_site_id'
  ) THEN
    ALTER TABLE content_strategy
    ADD CONSTRAINT fk_content_strategy_site_id
    FOREIGN KEY (site_id) REFERENCES sites(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
    RAISE NOTICE 'Added foreign key constraint for site_id';
  END IF;
END $$;

-- ========================================
-- PILLAR PAGES (10 articles)
-- ========================================

INSERT INTO content_strategy (
  site_id, content_title, primary_keyword, content_type, 
  target_audience, word_count, priority_level, status,
  content_pillar, category, search_volume, funnel_stage,
  call_to_action, target_date
) VALUES
-- 1. SBA Loans Complete Guide
('rateroots', 'SBA Loans: Complete Guide to Government-Backed Business Financing', 'sba loans', 'pillar-page',
 'Small business owners seeking government-backed financing with favorable terms', 3000, 'High', 'Planned',
 'Business Loans', 'SBA Loans', 74000, 'Awareness',
 'Compare SBA loan rates at RateRoots.com', NOW() + INTERVAL '1 day'),

-- 2. Business Line of Credit Guide
('rateroots', 'Business Line of Credit: Flexible Financing for Working Capital', 'business line of credit', 'pillar-page',
 'Business owners needing flexible access to working capital', 2500, 'High', 'Planned',
 'Business Loans', 'Lines of Credit', 33100, 'Awareness',
 'Find your best line of credit rate at RateRoots.com', NOW() + INTERVAL '2 days'),

-- 3. Equipment Financing Guide
('rateroots', 'Equipment Financing: Complete Guide to Funding Business Equipment', 'equipment financing', 'pillar-page',
 'Business owners purchasing equipment, machinery, or vehicles', 2500, 'High', 'Planned',
 'Business Loans', 'Equipment Financing', 18100, 'Awareness',
 'Compare equipment financing options at RateRoots.com', NOW() + INTERVAL '3 days'),

-- 4. Term Loans Guide
('rateroots', 'Business Term Loans: Complete Guide to Fixed-Rate Business Financing', 'business term loans', 'pillar-page',
 'Business owners seeking fixed-rate, predictable loan payments', 2500, 'High', 'Planned',
 'Business Loans', 'Term Loans', 8100, 'Awareness',
 'Find your best term loan rate at RateRoots.com', NOW() + INTERVAL '4 days'),

-- 5. Merchant Cash Advance Guide
('rateroots', 'Merchant Cash Advance: Complete Guide to Revenue-Based Financing', 'merchant cash advance', 'pillar-page',
 'Business owners with high credit card sales needing quick funding', 2500, 'Medium', 'Planned',
 'Business Loans', 'Alternative Financing', 14800, 'Awareness',
 'Compare MCA options at RateRoots.com', NOW() + INTERVAL '5 days'),

-- 6. Invoice Factoring Guide
('rateroots', 'Invoice Factoring: Complete Guide to Accounts Receivable Financing', 'invoice factoring', 'pillar-page',
 'Business owners with outstanding invoices needing immediate cash flow', 2500, 'Medium', 'Planned',
 'Business Loans', 'Invoice Financing', 9900, 'Awareness',
 'Learn about invoice factoring at RateRoots.com', NOW() + INTERVAL '6 days'),

-- 7. Startup Business Loans Guide
('rateroots', 'Startup Business Loans: Complete Guide to Funding New Businesses', 'startup business loans', 'pillar-page',
 'Entrepreneurs and new business owners seeking startup capital', 2500, 'High', 'Planned',
 'Business Loans', 'Startup Financing', 22200, 'Awareness',
 'Explore startup loan options at RateRoots.com', NOW() + INTERVAL '7 days'),

-- 8. Bad Credit Business Loans Guide
('rateroots', 'Bad Credit Business Loans: Complete Guide to Financing with Poor Credit', 'business loans bad credit', 'pillar-page',
 'Business owners with poor credit scores seeking financing options', 2500, 'High', 'Planned',
 'Business Loans', 'Bad Credit Loans', 27100, 'Awareness',
 'Find bad credit loan options at RateRoots.com', NOW() + INTERVAL '8 days'),

-- 9. Small Business Grants Guide
('rateroots', 'Small Business Grants: Complete Guide to Free Funding Opportunities', 'small business grants', 'pillar-page',
 'Business owners seeking free, non-repayable funding', 2500, 'High', 'Planned',
 'Business Grants', 'Grants', 110000, 'Awareness',
 'Discover grant opportunities at RateRoots.com', NOW() + INTERVAL '9 days'),

-- 10. Working Capital Loans Guide
('rateroots', 'Working Capital Loans: Complete Guide to Short-Term Business Financing', 'working capital loans', 'pillar-page',
 'Business owners needing short-term funding for daily operations', 2500, 'High', 'Planned',
 'Business Loans', 'Working Capital', 12100, 'Awareness',
 'Compare working capital loans at RateRoots.com', NOW() + INTERVAL '10 days');

-- ========================================
-- CLUSTER CONTENT (24 articles - 2-3 per pillar)
-- ========================================

INSERT INTO content_strategy (
  site_id, content_title, primary_keyword, content_type,
  target_audience, word_count, priority_level, status,
  content_pillar, category, search_volume, funnel_stage,
  call_to_action, target_date
) VALUES
-- SBA Loans Cluster (3 articles)
('rateroots', 'What is an SBA Loan and How Do You Get One?', 'what is sba loan', 'article',
 'Business owners new to SBA loans', 2000, 'High', 'Planned',
 'Business Loans', 'SBA Loans', 12000, 'Awareness',
 'Learn more about SBA loans at RateRoots.com', NOW() + INTERVAL '11 days'),

('rateroots', 'SBA 7(a) vs 504 Loans: Which is Right for Your Business?', 'sba 7a vs 504', 'comparison',
 'Business owners comparing SBA loan types', 2000, 'High', 'Planned',
 'Business Loans', 'SBA Loans', 5400, 'Consideration',
 'Compare SBA loan types at RateRoots.com', NOW() + INTERVAL '12 days'),

('rateroots', 'SBA Loan Requirements: Complete Checklist for 2025', 'sba loan requirements', 'how-to',
 'Business owners preparing SBA loan application', 2000, 'High', 'Planned',
 'Business Loans', 'SBA Loans', 9900, 'Consideration',
 'Check your SBA eligibility at RateRoots.com', NOW() + INTERVAL '13 days'),

-- Business Line of Credit Cluster (3 articles)
('rateroots', 'Business Line of Credit vs Term Loan: Which is Better?', 'line of credit vs term loan', 'comparison',
 'Business owners comparing financing options', 2000, 'High', 'Planned',
 'Business Loans', 'Lines of Credit', 8100, 'Consideration',
 'Compare financing options at RateRoots.com', NOW() + INTERVAL '14 days'),

('rateroots', 'Getting a Business Line of Credit with Bad Credit: Options and Guidance', 'business line of credit bad credit', 'how-to',
 'Business owners with poor credit seeking lines of credit', 2000, 'Medium', 'Planned',
 'Business Loans', 'Lines of Credit', 4400, 'Consideration',
 'Explore bad credit options at RateRoots.com', NOW() + INTERVAL '15 days'),

('rateroots', 'Secured vs Unsecured Business Lines of Credit: Complete Comparison', 'secured vs unsecured line of credit', 'comparison',
 'Business owners understanding collateral requirements', 2000, 'Medium', 'Planned',
 'Business Loans', 'Lines of Credit', 3600, 'Consideration',
 'Learn about line of credit types at RateRoots.com', NOW() + INTERVAL '16 days'),

-- Equipment Financing Cluster (2 articles)
('rateroots', 'How to Use SBA Loans for Equipment: Complete Guide', 'sba loans for equipment', 'how-to',
 'Business owners using SBA loans to purchase equipment', 2000, 'High', 'Planned',
 'Business Loans', 'Equipment Financing', 2900, 'Consideration',
 'Explore SBA equipment financing at RateRoots.com', NOW() + INTERVAL '17 days'),

('rateroots', 'Equipment Loan vs Equipment Lease: Which is Right for You?', 'equipment loan vs lease', 'comparison',
 'Business owners deciding between buying and leasing equipment', 2000, 'Medium', 'Planned',
 'Business Loans', 'Equipment Financing', 2400, 'Consideration',
 'Compare equipment financing options at RateRoots.com', NOW() + INTERVAL '18 days'),

-- Term Loans Cluster (2 articles)
('rateroots', 'Short Term vs Long Term Business Loans: Complete Comparison', 'short term vs long term business loan', 'comparison',
 'Business owners choosing loan term length', 2000, 'Medium', 'Planned',
 'Business Loans', 'Term Loans', 1900, 'Consideration',
 'Compare loan terms at RateRoots.com', NOW() + INTERVAL '19 days'),

('rateroots', 'How to Calculate Business Loan Payments: Complete Guide', 'calculate business loan payments', 'how-to',
 'Business owners calculating loan affordability', 2000, 'Medium', 'Planned',
 'Business Loans', 'Term Loans', 1600, 'Consideration',
 'Use our loan calculator at RateRoots.com', NOW() + INTERVAL '20 days'),

-- Merchant Cash Advance Cluster (2 articles)
('rateroots', 'Merchant Cash Advance vs Business Loan: Which is Better?', 'merchant cash advance vs business loan', 'comparison',
 'Business owners comparing MCA to traditional loans', 2000, 'Medium', 'Planned',
 'Business Loans', 'Alternative Financing', 1900, 'Consideration',
 'Compare financing options at RateRoots.com', NOW() + INTERVAL '21 days'),

('rateroots', 'Merchant Cash Advance Rates: What to Expect in 2025', 'merchant cash advance rates', 'article',
 'Business owners researching MCA costs', 2000, 'Medium', 'Planned',
 'Business Loans', 'Alternative Financing', 1200, 'Consideration',
 'Learn about MCA rates at RateRoots.com', NOW() + INTERVAL '22 days'),

-- Invoice Factoring Cluster (2 articles)
('rateroots', 'Invoice Factoring vs Invoice Financing: What is the Difference?', 'invoice factoring vs financing', 'comparison',
 'Business owners comparing invoice financing options', 2000, 'Medium', 'Planned',
 'Business Loans', 'Invoice Financing', 880, 'Consideration',
 'Compare invoice financing at RateRoots.com', NOW() + INTERVAL '23 days'),

('rateroots', 'How Invoice Factoring Works: Complete Guide for Small Businesses', 'how does invoice factoring work', 'how-to',
 'Business owners new to invoice factoring', 2000, 'Medium', 'Planned',
 'Business Loans', 'Invoice Financing', 1600, 'Awareness',
 'Learn about invoice factoring at RateRoots.com', NOW() + INTERVAL '24 days'),

-- Startup Loans Cluster (3 articles)
('rateroots', 'How to Get a Startup Business Loan: Complete Guide', 'how to get startup business loan', 'how-to',
 'New business owners seeking startup funding', 2000, 'High', 'Planned',
 'Business Loans', 'Startup Financing', 5400, 'Awareness',
 'Explore startup loan options at RateRoots.com', NOW() + INTERVAL '25 days'),

('rateroots', 'Startup Business Loan Requirements: What You Need to Qualify', 'startup loan requirements', 'article',
 'New business owners preparing loan applications', 2000, 'High', 'Planned',
 'Business Loans', 'Startup Financing', 2400, 'Consideration',
 'Check your startup loan eligibility at RateRoots.com', NOW() + INTERVAL '26 days'),

('rateroots', 'Best Startup Business Loans: Top Options for New Businesses', 'best startup business loans', 'article',
 'New business owners comparing loan options', 2000, 'High', 'Planned',
 'Business Loans', 'Startup Financing', 3600, 'Consideration',
 'Compare startup loans at RateRoots.com', NOW() + INTERVAL '27 days'),

-- Bad Credit Loans Cluster (3 articles)
('rateroots', 'How to Get a Business Loan with Bad Credit: Complete Guide', 'business loan bad credit', 'how-to',
 'Business owners with poor credit seeking financing', 2000, 'High', 'Planned',
 'Business Loans', 'Bad Credit Loans', 27100, 'Awareness',
 'Find bad credit loan options at RateRoots.com', NOW() + INTERVAL '28 days'),

('rateroots', 'Best Business Loans for Bad Credit: Top Options in 2025', 'best business loans bad credit', 'article',
 'Business owners with poor credit comparing options', 2000, 'High', 'Planned',
 'Business Loans', 'Bad Credit Loans', 12100, 'Consideration',
 'Compare bad credit loans at RateRoots.com', NOW() + INTERVAL '29 days'),

('rateroots', 'How to Improve Business Credit Score: Complete Guide', 'improve business credit score', 'how-to',
 'Business owners working to improve credit', 2000, 'Medium', 'Planned',
 'Business Loans', 'Credit Improvement', 5400, 'Awareness',
 'Learn about credit improvement at RateRoots.com', NOW() + INTERVAL '30 days'),

-- Working Capital Cluster (2 articles)
('rateroots', 'Working Capital Loan vs Line of Credit: Which is Better?', 'working capital loan vs line of credit', 'comparison',
 'Business owners comparing working capital options', 2000, 'Medium', 'Planned',
 'Business Loans', 'Working Capital', 1900, 'Consideration',
 'Compare working capital options at RateRoots.com', NOW() + INTERVAL '31 days'),

('rateroots', 'How to Calculate Working Capital: Complete Guide', 'how to calculate working capital', 'how-to',
 'Business owners understanding working capital needs', 2000, 'Medium', 'Planned',
 'Business Loans', 'Working Capital', 1600, 'Awareness',
 'Use our working capital calculator at RateRoots.com', NOW() + INTERVAL '32 days'),

-- Small Business Grants Cluster (2 articles)
('rateroots', 'How to Apply for Small Business Grants: Complete Guide', 'how to apply for small business grants', 'how-to',
 'Business owners seeking grant funding', 2000, 'High', 'Planned',
 'Business Grants', 'Grants', 12100, 'Awareness',
 'Discover grant opportunities at RateRoots.com', NOW() + INTERVAL '33 days'),

('rateroots', 'Small Business Grants for Women: Complete Guide', 'small business grants for women', 'article',
 'Women business owners seeking grant funding', 2000, 'Medium', 'Planned',
 'Business Grants', 'Grants', 8100, 'Awareness',
 'Explore women business grants at RateRoots.com', NOW() + INTERVAL '34 days');

-- ========================================
-- INDUSTRY PAGES (8 articles)
-- ========================================

INSERT INTO content_strategy (
  site_id, content_title, primary_keyword, content_type,
  target_audience, word_count, priority_level, status,
  content_pillar, category, search_volume, funnel_stage,
  call_to_action, target_date
) VALUES
('rateroots', 'Construction Business Loans: Complete Guide for Contractors', 'construction business loans', 'pillar-page',
 'Construction contractors and builders seeking financing', 2500, 'High', 'Planned',
 'Industry Loans', 'Construction', 8100, 'Awareness',
 'Find construction loan options at RateRoots.com', NOW() + INTERVAL '35 days'),

('rateroots', 'Healthcare Business Loans: Complete Guide for Medical Practices', 'healthcare business loans', 'pillar-page',
 'Medical practices, clinics, and healthcare businesses seeking financing', 2500, 'High', 'Planned',
 'Industry Loans', 'Healthcare', 5400, 'Awareness',
 'Explore healthcare financing at RateRoots.com', NOW() + INTERVAL '36 days'),

('rateroots', 'Restaurant Business Loans: Complete Guide for Food Service', 'restaurant business loans', 'pillar-page',
 'Restaurant owners and food service businesses seeking financing', 2500, 'High', 'Planned',
 'Industry Loans', 'Restaurants', 12100, 'Awareness',
 'Compare restaurant loans at RateRoots.com', NOW() + INTERVAL '37 days'),

('rateroots', 'Retail Business Loans: Complete Guide for Retail Stores', 'retail business loans', 'pillar-page',
 'Retail store owners seeking financing', 2500, 'Medium', 'Planned',
 'Industry Loans', 'Retail', 6600, 'Awareness',
 'Find retail loan options at RateRoots.com', NOW() + INTERVAL '38 days'),

('rateroots', 'Trucking Business Loans: Complete Guide for Trucking Companies', 'trucking business loans', 'pillar-page',
 'Trucking company owners seeking financing for vehicles and operations', 2500, 'Medium', 'Planned',
 'Industry Loans', 'Trucking', 4400, 'Awareness',
 'Explore trucking financing at RateRoots.com', NOW() + INTERVAL '39 days'),

('rateroots', 'Real Estate Business Loans: Complete Guide for Property Investors', 'commercial real estate loans', 'pillar-page',
 'Real estate investors and property developers seeking financing', 2500, 'Medium', 'Planned',
 'Industry Loans', 'Real Estate', 12100, 'Awareness',
 'Compare real estate loans at RateRoots.com', NOW() + INTERVAL '40 days'),

('rateroots', 'E-commerce Business Loans: Complete Guide for Online Stores', 'ecommerce business loans', 'pillar-page',
 'E-commerce business owners seeking financing for growth', 2500, 'Medium', 'Planned',
 'Industry Loans', 'E-commerce', 3600, 'Awareness',
 'Find e-commerce financing at RateRoots.com', NOW() + INTERVAL '41 days'),

('rateroots', 'Manufacturing Business Loans: Complete Guide for Manufacturers', 'manufacturing business loans', 'pillar-page',
 'Manufacturing business owners seeking financing for equipment and operations', 2500, 'Medium', 'Planned',
 'Industry Loans', 'Manufacturing', 2900, 'Awareness',
 'Explore manufacturing loans at RateRoots.com', NOW() + INTERVAL '42 days');

-- ========================================
-- COMPARISON CONTENT (8 articles)
-- ========================================

INSERT INTO content_strategy (
  site_id, content_title, primary_keyword, content_type,
  target_audience, word_count, priority_level, status,
  content_pillar, category, search_volume, funnel_stage,
  call_to_action, target_date
) VALUES
('rateroots', 'SBA Loans vs Conventional Business Loans: Complete Comparison', 'sba loans vs conventional', 'comparison',
 'Business owners comparing SBA and traditional loans', 2000, 'High', 'Planned',
 'Business Loans', 'Loan Comparisons', 4400, 'Consideration',
 'Compare loan options at RateRoots.com', NOW() + INTERVAL '43 days'),

('rateroots', 'Online Lenders vs Traditional Banks: Which is Better for Business Loans?', 'online lenders vs banks', 'comparison',
 'Business owners choosing between online and traditional lenders', 2000, 'High', 'Planned',
 'Business Loans', 'Lender Comparisons', 3600, 'Consideration',
 'Compare lenders at RateRoots.com', NOW() + INTERVAL '44 days'),

('rateroots', 'Best Small Business Loans of 2025: Top Options Compared', 'best small business loans 2025', 'article',
 'Business owners comparing top loan options', 2000, 'High', 'Planned',
 'Business Loans', 'Loan Comparisons', 22200, 'Consideration',
 'Find your best loan option at RateRoots.com', NOW() + INTERVAL '45 days'),

('rateroots', 'Best SBA Lenders: Top Options for Small Business Owners', 'best sba lenders', 'article',
 'Business owners comparing SBA lenders', 2000, 'High', 'Planned',
 'Business Loans', 'Lender Comparisons', 8100, 'Consideration',
 'Compare SBA lenders at RateRoots.com', NOW() + INTERVAL '46 days'),

('rateroots', 'Lendio vs OnDeck vs Kabbage: Complete Lender Comparison', 'lendio vs ondeck vs kabbage', 'comparison',
 'Business owners comparing top online lenders', 2000, 'Medium', 'Planned',
 'Business Loans', 'Lender Comparisons', 1900, 'Consideration',
 'Compare lenders at RateRoots.com', NOW() + INTERVAL '47 days'),

('rateroots', 'Business Credit Cards vs Business Line of Credit: Which is Better?', 'business credit card vs line of credit', 'comparison',
 'Business owners comparing credit cards and lines of credit', 2000, 'Medium', 'Planned',
 'Business Loans', 'Loan Comparisons', 2400, 'Consideration',
 'Compare financing options at RateRoots.com', NOW() + INTERVAL '48 days'),

('rateroots', 'Invoice Factoring vs Invoice Financing: What is the Difference?', 'invoice factoring vs financing', 'comparison',
 'Business owners comparing invoice financing options', 2000, 'Medium', 'Planned',
 'Business Loans', 'Invoice Financing', 880, 'Consideration',
 'Learn about invoice financing at RateRoots.com', NOW() + INTERVAL '49 days'),

('rateroots', 'Equipment Loan vs Equipment Lease: Complete Comparison', 'equipment loan vs lease', 'comparison',
 'Business owners deciding between buying and leasing equipment', 2000, 'Medium', 'Planned',
 'Business Loans', 'Equipment Financing', 2400, 'Consideration',
 'Compare equipment options at RateRoots.com', NOW() + INTERVAL '50 days');

-- Add comment
COMMENT ON TABLE content_strategy IS 'Content strategy entries for systematic SEO content generation. RateRoots entries target business lending keywords and topics.';




