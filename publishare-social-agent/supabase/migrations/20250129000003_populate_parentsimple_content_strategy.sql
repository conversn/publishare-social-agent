-- ========================================
-- POPULATE PARENTSIMPLE CONTENT STRATEGY
-- ========================================
-- Migration: populate_parentsimple_content_strategy
-- Purpose: Insert 50 content strategy entries for ParentSimple SEO content plan
-- Includes: Pillar pages, cluster content, comparison content, age-based content
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
-- 1. College Admissions Consulting Complete Guide (PRIMARY LEAD GEN)
('parentsimple', 'College Admissions Consulting: Complete Guide for Parents', 'college admissions consultant', 'pillar-page',
 'Affluent parents (40-55, $150K+ income) with college-bound children seeking expert guidance', 3000, 'High', 'Planned',
 'College Planning', 'College Consulting', 1300, 'Awareness',
 'Get matched with a college admissions consultant at ParentSimple.org', NOW() + INTERVAL '1 day'),

-- 2. 529 College Savings Plans Complete Guide
('parentsimple', '529 College Savings Plans: Complete Guide to Tax-Advantaged Education Funding', '529 college savings plan', 'pillar-page',
 'Parents planning for children''s college education, seeking tax-advantaged savings options', 3000, 'High', 'Planned',
 'Financial Planning', '529 Plans', 12100, 'Awareness',
 'Start your 529 plan at ParentSimple.org', NOW() + INTERVAL '2 days'),

-- 3. Financial Aid for College Complete Guide
('parentsimple', 'Financial Aid for College: Complete Guide to Maximizing Aid', 'financial aid for college', 'pillar-page',
 'Parents of college-bound students seeking to maximize financial aid eligibility', 3000, 'High', 'Planned',
 'College Planning', 'Financial Aid', 8100, 'Awareness',
 'Get expert financial aid guidance at ParentSimple.org', NOW() + INTERVAL '3 days'),

-- 4. Elite College Admissions Complete Guide
('parentsimple', 'Elite College Admissions: Complete Guide to Ivy League and Top-Tier Schools', 'elite college admissions', 'pillar-page',
 'High-achieving families targeting Ivy League and top-tier universities', 3000, 'High', 'Planned',
 'College Planning', 'Elite Colleges', 1300, 'Awareness',
 'Get expert guidance for elite college admissions at ParentSimple.org', NOW() + INTERVAL '4 days'),

-- 5. College Application Timeline Complete Guide
('parentsimple', 'College Application Timeline: Complete Guide for High School Students', 'college application timeline', 'pillar-page',
 'High school students and parents planning college application process', 2500, 'High', 'Planned',
 'College Planning', 'Application Process', 3600, 'Awareness',
 'Download our free college planning timeline at ParentSimple.org', NOW() + INTERVAL '5 days'),

-- 6. Scholarship Strategies Complete Guide
('parentsimple', 'Scholarship Strategies: Complete Guide to Finding and Winning Scholarships', 'scholarship strategies', 'pillar-page',
 'Parents and students seeking scholarship opportunities to reduce college costs', 2500, 'High', 'Planned',
 'College Planning', 'Scholarships', 5400, 'Awareness',
 'Discover scholarship opportunities at ParentSimple.org', NOW() + INTERVAL '6 days'),

-- 7. Life Insurance for Parents Complete Guide
('parentsimple', 'Life Insurance for Parents: Complete Guide to Family Protection', 'life insurance for parents', 'pillar-page',
 'Parents (30-50) seeking life insurance to protect their children''s future', 3000, 'High', 'Planned',
 'Financial Planning', 'Life Insurance', 2400, 'Awareness',
 'Get life insurance quotes at ParentSimple.org', NOW() + INTERVAL '7 days'),

-- 8. Estate Planning for Families Complete Guide
('parentsimple', 'Estate Planning for Families: Complete Guide to Legacy Planning', 'estate planning for families', 'pillar-page',
 'Affluent parents planning for children''s inheritance and legacy protection', 3000, 'High', 'Planned',
 'Financial Planning', 'Estate Planning', 1600, 'Awareness',
 'Get estate planning guidance at ParentSimple.org', NOW() + INTERVAL '8 days'),

-- 9. Financial Planning for Parents Complete Guide
('parentsimple', 'Financial Planning for Parents: Complete Guide to Balancing College and Retirement', 'financial planning for parents', 'pillar-page',
 'Parents balancing college savings with retirement planning and other financial goals', 3000, 'High', 'Planned',
 'Financial Planning', 'Financial Planning', 2900, 'Awareness',
 'Find a financial advisor at ParentSimple.org', NOW() + INTERVAL '9 days'),

-- 10. Education Funding Strategies Complete Guide
('parentsimple', 'Education Funding Strategies: Complete Guide to Paying for Private School and College', 'education funding strategies', 'pillar-page',
 'Parents planning for private school and college education costs', 3000, 'High', 'Planned',
 'Financial Planning', 'Education Funding', 1900, 'Awareness',
 'Get personalized education funding guidance at ParentSimple.org', NOW() + INTERVAL '10 days');

-- ========================================
-- CLUSTER CONTENT (24 articles - 2-3 per pillar)
-- ========================================

INSERT INTO content_strategy (
  site_id, content_title, primary_keyword, content_type,
  target_audience, word_count, priority_level, status,
  content_pillar, category, search_volume, funnel_stage,
  call_to_action, target_date
) VALUES
-- College Admissions Consulting Cluster (4 articles)
('parentsimple', 'Is College Admissions Consulting Worth the Cost?', 'college admissions consulting cost', 'article',
 'Parents evaluating whether to invest in college admissions consulting', 2000, 'High', 'Planned',
 'College Planning', 'College Consulting', 800, 'Consideration',
 'Get matched with a college consultant at ParentSimple.org', NOW() + INTERVAL '11 days'),

('parentsimple', 'How to Choose the Right College Admissions Consultant', 'how to choose college admissions consultant', 'how-to',
 'Parents selecting a college admissions consultant', 2000, 'High', 'Planned',
 'College Planning', 'College Consulting', 590, 'Consideration',
 'Find the right college consultant at ParentSimple.org', NOW() + INTERVAL '12 days'),

('parentsimple', 'College Admissions Consulting vs. DIY: Which is Better?', 'college admissions consulting vs diy', 'comparison',
 'Parents deciding between hiring a consultant or handling applications themselves', 2000, 'High', 'Planned',
 'College Planning', 'College Consulting', 480, 'Consideration',
 'Get expert guidance at ParentSimple.org', NOW() + INTERVAL '13 days'),

('parentsimple', 'What to Expect from College Admissions Consulting Services', 'college admissions consulting services', 'article',
 'Parents understanding what college admissions consultants provide', 2000, 'High', 'Planned',
 'College Planning', 'College Consulting', 720, 'Awareness',
 'Learn about our consultant matching at ParentSimple.org', NOW() + INTERVAL '14 days'),

-- 529 Plans Cluster (4 articles)
('parentsimple', '529 Plan vs. Other College Savings: Complete Comparison', '529 plan vs other college savings', 'comparison',
 'Parents comparing 529 plans with other college savings options', 2000, 'High', 'Planned',
 'Financial Planning', '529 Plans', 880, 'Consideration',
 'Start your 529 plan at ParentSimple.org', NOW() + INTERVAL '15 days'),

('parentsimple', 'How to Open a 529 Plan: Step-by-Step Guide', 'how to open 529 plan', 'how-to',
 'Parents ready to start a 529 college savings plan', 2000, 'High', 'Planned',
 'Financial Planning', '529 Plans', 1600, 'Consideration',
 'Get 529 plan guidance at ParentSimple.org', NOW() + INTERVAL '16 days'),

('parentsimple', '529 Plan Tax Benefits: Complete Guide to Tax Advantages', '529 plan tax benefits', 'article',
 'Parents understanding tax advantages of 529 plans', 2000, 'High', 'Planned',
 'Financial Planning', '529 Plans', 1900, 'Awareness',
 'Learn about 529 tax benefits at ParentSimple.org', NOW() + INTERVAL '17 days'),

('parentsimple', '529 Plan Contribution Limits and Rules: Complete Guide', '529 plan contribution limits', 'article',
 'Parents understanding 529 plan contribution rules and limits', 2000, 'High', 'Planned',
 'Financial Planning', '529 Plans', 1600, 'Awareness',
 'Get 529 plan guidance at ParentSimple.org', NOW() + INTERVAL '18 days'),

-- Financial Aid Cluster (3 articles)
('parentsimple', 'FAFSA Guide: How to Complete the Free Application for Federal Student Aid', 'fafsa guide', 'how-to',
 'Parents and students completing FAFSA for financial aid', 2000, 'High', 'Planned',
 'College Planning', 'Financial Aid', 8100, 'Consideration',
 'Get FAFSA help at ParentSimple.org', NOW() + INTERVAL '19 days'),

('parentsimple', 'CSS Profile Guide: Complete Guide to College Board Financial Aid Form', 'css profile guide', 'how-to',
 'Parents completing CSS Profile for private college financial aid', 2000, 'High', 'Planned',
 'College Planning', 'Financial Aid', 1900, 'Consideration',
 'Get CSS Profile guidance at ParentSimple.org', NOW() + INTERVAL '20 days'),

('parentsimple', 'How to Appeal Financial Aid Awards: Complete Guide', 'how to appeal financial aid', 'how-to',
 'Parents and students seeking to increase financial aid awards', 2000, 'High', 'Planned',
 'College Planning', 'Financial Aid', 1600, 'Decision',
 'Get financial aid appeal help at ParentSimple.org', NOW() + INTERVAL '21 days'),

-- Elite College Admissions Cluster (3 articles)
('parentsimple', 'Ivy League Admissions: Complete Guide to Getting Accepted', 'ivy league admissions', 'article',
 'High-achieving students and parents targeting Ivy League schools', 2500, 'High', 'Planned',
 'College Planning', 'Elite Colleges', 2900, 'Awareness',
 'Get Ivy League admissions guidance at ParentSimple.org', NOW() + INTERVAL '22 days'),

('parentsimple', 'Early Decision vs. Early Action: Which is Right for Your Child?', 'early decision vs early action', 'comparison',
 'Parents and students deciding between early application options', 2000, 'High', 'Planned',
 'College Planning', 'Application Process', 1900, 'Consideration',
 'Get application strategy guidance at ParentSimple.org', NOW() + INTERVAL '23 days'),

('parentsimple', 'College Essays for Elite Schools: Complete Guide to Standout Applications', 'college essays for elite schools', 'article',
 'Students applying to competitive colleges seeking essay guidance', 2000, 'High', 'Planned',
 'College Planning', 'Application Process', 1600, 'Consideration',
 'Get essay writing help at ParentSimple.org', NOW() + INTERVAL '24 days'),

-- Life Insurance Cluster (3 articles)
('parentsimple', 'Term Life Insurance vs. Whole Life: Which is Better for Parents?', 'term life vs whole life for parents', 'comparison',
 'Parents comparing term and whole life insurance options', 2000, 'High', 'Planned',
 'Financial Planning', 'Life Insurance', 1900, 'Consideration',
 'Get life insurance quotes at ParentSimple.org', NOW() + INTERVAL '25 days'),

('parentsimple', 'How Much Life Insurance Do Parents Need? Complete Calculator Guide', 'how much life insurance do parents need', 'how-to',
 'Parents determining appropriate life insurance coverage amounts', 2000, 'High', 'Planned',
 'Financial Planning', 'Life Insurance', 1900, 'Consideration',
 'Calculate your life insurance needs at ParentSimple.org', NOW() + INTERVAL '26 days'),

('parentsimple', 'Life Insurance for New Parents: Complete Guide to Family Protection', 'life insurance for new parents', 'article',
 'New parents seeking life insurance to protect their growing family', 2000, 'High', 'Planned',
 'Financial Planning', 'Life Insurance', 2400, 'Awareness',
 'Get life insurance quotes at ParentSimple.org', NOW() + INTERVAL '27 days'),

-- Estate Planning Cluster (3 articles)
('parentsimple', 'Wills for Parents: Complete Guide to Estate Planning with Children', 'wills for parents', 'article',
 'Parents creating wills to protect their children''s inheritance', 2000, 'High', 'Planned',
 'Financial Planning', 'Estate Planning', 1600, 'Awareness',
 'Get estate planning guidance at ParentSimple.org', NOW() + INTERVAL '28 days'),

('parentsimple', 'Trusts for Children: Complete Guide to Legacy Planning', 'trusts for children', 'article',
 'Affluent parents setting up trusts for children''s inheritance', 2000, 'High', 'Planned',
 'Financial Planning', 'Estate Planning', 1300, 'Awareness',
 'Get trust planning help at ParentSimple.org', NOW() + INTERVAL '29 days'),

('parentsimple', 'Guardianship Planning: Complete Guide to Choosing Guardians for Your Children', 'guardianship planning', 'article',
 'Parents selecting guardians for their children in estate planning', 2000, 'High', 'Planned',
 'Financial Planning', 'Estate Planning', 880, 'Awareness',
 'Get guardianship planning guidance at ParentSimple.org', NOW() + INTERVAL '30 days'),

-- High School Content Cluster (4 articles)
('parentsimple', 'High School Course Selection: Complete Guide to Building a Strong Transcript', 'high school course selection', 'how-to',
 'High school students and parents selecting courses for college preparation', 2000, 'High', 'Planned',
 'High School', 'Course Selection', 1900, 'Awareness',
 'Get course selection guidance at ParentSimple.org', NOW() + INTERVAL '31 days'),

('parentsimple', 'AP vs. IB Programs: Which is Better for College Admissions?', 'ap vs ib programs', 'comparison',
 'Students and parents comparing AP and IB programs for college prep', 2000, 'High', 'Planned',
 'High School', 'Academic Programs', 1600, 'Consideration',
 'Get academic planning help at ParentSimple.org', NOW() + INTERVAL '32 days'),

('parentsimple', 'Extracurricular Activities for College: Complete Guide to Building a Strong Profile', 'extracurricular activities for college', 'article',
 'High school students building extracurricular profiles for college applications', 2000, 'High', 'Planned',
 'High School', 'Extracurriculars', 1900, 'Awareness',
 'Get college prep guidance at ParentSimple.org', NOW() + INTERVAL '33 days'),

('parentsimple', 'Standardized Testing Strategy: SAT vs. ACT Complete Guide', 'sat vs act', 'comparison',
 'High school students deciding between SAT and ACT', 2000, 'High', 'Planned',
 'High School', 'Standardized Testing', 8100, 'Consideration',
 'Get test prep guidance at ParentSimple.org', NOW() + INTERVAL '34 days');

-- ========================================
-- COMPARISON CONTENT (8 articles)
-- ========================================

INSERT INTO content_strategy (
  site_id, content_title, primary_keyword, content_type,
  target_audience, word_count, priority_level, status,
  content_pillar, category, search_volume, funnel_stage,
  call_to_action, target_date
) VALUES
('parentsimple', '529 Plan vs. Life Insurance: Which Should Parents Fund First?', '529 plan vs life insurance', 'comparison',
 'Parents prioritizing between college savings and life insurance', 2000, 'High', 'Planned',
 'Financial Planning', 'Financial Planning', 880, 'Consideration',
 'Get personalized financial planning at ParentSimple.org', NOW() + INTERVAL '35 days'),

('parentsimple', 'Private School vs. Public School: Complete Cost and Value Comparison', 'private school vs public school', 'comparison',
 'Parents deciding between private and public school education', 2000, 'Medium', 'Planned',
 'Education Planning', 'School Choice', 3600, 'Consideration',
 'Get education planning guidance at ParentSimple.org', NOW() + INTERVAL '36 days'),

('parentsimple', 'Early Decision vs. Early Action vs. Regular Decision: Complete Guide', 'early decision vs early action vs regular decision', 'comparison',
 'Students and parents understanding all college application options', 2000, 'High', 'Planned',
 'College Planning', 'Application Process', 1600, 'Consideration',
 'Get application strategy at ParentSimple.org', NOW() + INTERVAL '37 days'),

('parentsimple', '529 Plan vs. Coverdell ESA vs. UTMA: Complete Comparison', '529 plan vs coverdell vs utma', 'comparison',
 'Parents comparing different college savings account options', 2000, 'High', 'Planned',
 'Financial Planning', '529 Plans', 880, 'Consideration',
 'Get college savings guidance at ParentSimple.org', NOW() + INTERVAL '38 days'),

('parentsimple', 'Need-Based Aid vs. Merit Scholarships: Complete Guide', 'need based aid vs merit scholarships', 'comparison',
 'Parents and students understanding different types of financial aid', 2000, 'High', 'Planned',
 'College Planning', 'Financial Aid', 1600, 'Awareness',
 'Get financial aid guidance at ParentSimple.org', NOW() + INTERVAL '39 days'),

('parentsimple', 'Ivy League vs. Top Public Universities: Complete Comparison', 'ivy league vs public universities', 'comparison',
 'High-achieving students comparing elite private and top public universities', 2000, 'High', 'Planned',
 'College Planning', 'Elite Colleges', 1900, 'Consideration',
 'Get college selection guidance at ParentSimple.org', NOW() + INTERVAL '40 days'),

('parentsimple', 'Term Life vs. Whole Life Insurance for Parents: Complete Comparison', 'term life vs whole life for parents', 'comparison',
 'Parents comparing term and whole life insurance for family protection', 2000, 'High', 'Planned',
 'Financial Planning', 'Life Insurance', 1900, 'Consideration',
 'Get life insurance quotes at ParentSimple.org', NOW() + INTERVAL '41 days'),

('parentsimple', 'College Admissions Consulting vs. DIY: Complete Comparison', 'college admissions consulting vs diy', 'comparison',
 'Parents deciding between hiring consultants or handling applications themselves', 2000, 'High', 'Planned',
 'College Planning', 'College Consulting', 480, 'Consideration',
 'Get matched with a college consultant at ParentSimple.org', NOW() + INTERVAL '42 days');

-- ========================================
-- AGE-BASED CONTENT (8 articles)
-- ========================================

INSERT INTO content_strategy (
  site_id, content_title, primary_keyword, content_type,
  target_audience, word_count, priority_level, status,
  content_pillar, category, search_volume, funnel_stage,
  call_to_action, target_date
) VALUES
-- High School (3 articles)
('parentsimple', 'Freshman Year of High School: Complete Guide to College Preparation', 'freshman year high school', 'article',
 'High school freshmen and parents starting college preparation journey', 2000, 'High', 'Planned',
 'High School', 'High School Planning', 1600, 'Awareness',
 'Get high school planning guidance at ParentSimple.org', NOW() + INTERVAL '43 days'),

('parentsimple', 'Junior Year of High School: Complete Guide to College Application Prep', 'junior year high school', 'article',
 'High school juniors and parents preparing for college applications', 2000, 'High', 'Planned',
 'High School', 'High School Planning', 1900, 'Awareness',
 'Get college prep guidance at ParentSimple.org', NOW() + INTERVAL '44 days'),

('parentsimple', 'Senior Year of High School: Complete Guide to College Applications', 'senior year high school', 'article',
 'High school seniors and parents completing college applications', 2000, 'High', 'Planned',
 'High School', 'High School Planning', 1600, 'Decision',
 'Get application help at ParentSimple.org', NOW() + INTERVAL '45 days'),

-- Middle School (3 articles)
('parentsimple', 'Middle School Academic Planning: Setting the Stage for High School Success', 'middle school academic planning', 'article',
 'Middle school parents preparing children for high school success', 2000, 'Medium', 'Planned',
 'Middle School', 'Academic Planning', 1600, 'Awareness',
 'Get academic planning guidance at ParentSimple.org', NOW() + INTERVAL '46 days'),

('parentsimple', 'Extracurricular Activities for Middle Schoolers: Complete Guide', 'extracurricular activities middle school', 'article',
 'Middle school parents exploring extracurricular opportunities', 2000, 'Medium', 'Planned',
 'Middle School', 'Extracurriculars', 1900, 'Awareness',
 'Get activity planning help at ParentSimple.org', NOW() + INTERVAL '47 days'),

('parentsimple', 'Preparing for High School: Complete Guide for 8th Grade Parents', 'preparing for high school', 'article',
 '8th grade parents preparing children for high school transition', 2000, 'Medium', 'Planned',
 'Middle School', 'High School Prep', 1600, 'Awareness',
 'Get high school prep guidance at ParentSimple.org', NOW() + INTERVAL '48 days'),

-- Early Years (2 articles)
('parentsimple', 'Early Childhood Development: Building Foundations for Future Success', 'early childhood development', 'article',
 'Parents of young children (0-5) building educational foundations', 2000, 'Low', 'Planned',
 'Early Years', 'Early Development', 12100, 'Awareness',
 'Get early childhood guidance at ParentSimple.org', NOW() + INTERVAL '49 days'),

('parentsimple', '529 Plans for Babies: Complete Guide to Starting Early', '529 plan for babies', 'article',
 'New parents starting 529 college savings plans for infants', 2000, 'Medium', 'Planned',
 'Early Years', '529 Plans', 1600, 'Awareness',
 'Start your 529 plan at ParentSimple.org', NOW() + INTERVAL '50 days');

-- Add comment
COMMENT ON TABLE content_strategy IS 'Content strategy entries for systematic SEO content generation. ParentSimple entries target education and legacy planning keywords and topics.';


