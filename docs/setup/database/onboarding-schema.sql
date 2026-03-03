-- Onboarding Schema Updates for Publishare
-- Run this in your Supabase SQL Editor to add onboarding fields

-- ========================================
-- 1. ADD ONBOARDING FIELDS TO PROFILES TABLE
-- ========================================

-- Add business_type field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_type TEXT;

-- Add persona field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS persona TEXT;

-- Add onboarding_completed field to track completion
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add onboarding_completed_at timestamp
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ========================================
-- 2. CREATE CONTENT PATHWAYS TRACKING TABLE
-- ========================================

-- Create table to track user's content pathway selections
CREATE TABLE IF NOT EXISTS content_pathways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pathway_type TEXT NOT NULL, -- 'create-share-content', 'create-quizzes-calculators', 'create-newsletters'
  content_id UUID, -- Reference to created content (optional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one pathway selection per user (for tracking purposes)
  UNIQUE(user_id, pathway_type)
);

-- ========================================
-- 3. CREATE TEMPLATES TABLE FOR INDUSTRY-SPECIFIC TEMPLATES
-- ========================================

-- Create table for industry-specific templates
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL, -- 'article', 'quiz', 'calculator', 'newsletter'
  business_type TEXT NOT NULL, -- 'financial-advisor', 'life-insurance', etc.
  persona TEXT, -- Optional persona-specific templates
  content JSONB NOT NULL, -- Template content structure
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 4. ADD ROW LEVEL SECURITY POLICIES
-- ========================================

-- Enable RLS on content_pathways
ALTER TABLE content_pathways ENABLE ROW LEVEL SECURITY;

-- Users can view their own pathway selections
CREATE POLICY "Users can view own content pathways" ON content_pathways
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own pathway selections
CREATE POLICY "Users can insert own content pathways" ON content_pathways
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pathway selections
CREATE POLICY "Users can update own content pathways" ON content_pathways
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable RLS on content_templates
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates and default templates
CREATE POLICY "Users can view own and default templates" ON content_templates
  FOR SELECT USING (auth.uid() = user_id OR is_default = TRUE);

-- Users can insert their own templates
CREATE POLICY "Users can insert own templates" ON content_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates" ON content_templates
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates" ON content_templates
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 5. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to mark onboarding as completed
CREATE OR REPLACE FUNCTION mark_onboarding_completed(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET 
    onboarding_completed = TRUE,
    onboarding_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's onboarding status
CREATE OR REPLACE FUNCTION get_user_onboarding_status(user_uuid UUID)
RETURNS TABLE (
  business_type TEXT,
  persona TEXT,
  onboarding_completed BOOLEAN,
  onboarding_completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.business_type,
    p.persona,
    p.onboarding_completed,
    p.onboarding_completed_at
  FROM profiles p
  WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get templates for user's business type
CREATE OR REPLACE FUNCTION get_templates_for_user(user_uuid UUID, template_type TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  template_type TEXT,
  business_type TEXT,
  persona TEXT,
  content JSONB,
  is_default BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id,
    ct.name,
    ct.description,
    ct.template_type,
    ct.business_type,
    ct.persona,
    ct.content,
    ct.is_default
  FROM content_templates ct
  WHERE ct.is_active = TRUE
    AND (ct.user_id = user_uuid OR ct.is_default = TRUE)
    AND (template_type IS NULL OR ct.template_type = template_type)
  ORDER BY ct.is_default DESC, ct.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. INSERT DEFAULT TEMPLATES
-- ========================================

-- Insert default templates for each business type
INSERT INTO content_templates (name, description, template_type, business_type, content, is_default) VALUES
-- Financial Advisor Templates
('Retirement Planning Guide', 'Comprehensive retirement planning article template', 'article', 'financial-advisor', 
 '{"title": "Your Complete Retirement Planning Guide", "content": "Introduction to retirement planning...", "keywords": ["retirement", "planning", "financial advisor"]}', TRUE),

('Investment Portfolio Calculator', 'Interactive calculator for portfolio analysis', 'calculator', 'financial-advisor',
 '{"title": "Investment Portfolio Calculator", "description": "Calculate your portfolio performance", "fields": ["initial_investment", "monthly_contribution", "years", "expected_return"]}', TRUE),

-- Life Insurance Templates
('Life Insurance Needs Calculator', 'Calculate how much life insurance you need', 'calculator', 'life-insurance',
 '{"title": "Life Insurance Needs Calculator", "description": "Determine your coverage needs", "fields": ["income", "debts", "funeral_costs", "education_costs"]}', TRUE),

('Family Protection Quiz', 'Interactive quiz about life insurance knowledge', 'quiz', 'life-insurance',
 '{"title": "How Much Do You Know About Life Insurance?", "description": "Test your knowledge", "questions": [{"question": "What is term life insurance?", "options": ["Temporary coverage", "Permanent coverage", "Investment vehicle"], "correct": 0}]}', TRUE),

-- Mortgage Templates
('Mortgage Payment Calculator', 'Calculate monthly mortgage payments', 'calculator', 'mortgage',
 '{"title": "Mortgage Payment Calculator", "description": "Calculate your monthly payment", "fields": ["loan_amount", "interest_rate", "loan_term", "down_payment"]}', TRUE),

('Home Buying Guide', 'Complete guide to buying a home', 'article', 'mortgage',
 '{"title": "The Complete Home Buying Guide", "content": "Everything you need to know about buying a home...", "keywords": ["home buying", "mortgage", "real estate"]}', TRUE);

-- ========================================
-- 7. VERIFICATION QUERIES
-- ========================================

-- Check that all fields were added successfully
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('business_type', 'persona', 'onboarding_completed', 'onboarding_completed_at')
ORDER BY column_name;

-- Check that tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('content_pathways', 'content_templates')
ORDER BY table_name;

-- Check default templates
SELECT name, template_type, business_type, is_default 
FROM content_templates 
WHERE is_default = TRUE 
ORDER BY business_type, template_type;
