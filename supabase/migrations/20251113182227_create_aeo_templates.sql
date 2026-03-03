-- ========================================
-- CREATE AEO CONTENT TEMPLATES TABLE
-- ========================================
-- Migration: create_aeo_templates
-- Purpose: Store AEO-optimized content templates for different content types
-- ========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create AEO content templates table
CREATE TABLE IF NOT EXISTS aeo_content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(50) REFERENCES sites(id) ON DELETE CASCADE,
  template_type VARCHAR(50) NOT NULL, -- 'definition', 'how-to', 'comparison', 'data', 'formula'
  title_pattern TEXT NOT NULL, -- Pattern for generating titles
  structure_template JSONB NOT NULL, -- JSON structure for content sections
  schema_template JSONB NOT NULL, -- Schema.org template
  prompt_template TEXT NOT NULL, -- AI prompt template
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT aeo_templates_type_check CHECK (template_type IN ('definition', 'how-to', 'comparison', 'data', 'formula', 'article'))
);

-- Create index for template lookups
CREATE INDEX IF NOT EXISTS idx_aeo_templates_site_type ON aeo_content_templates(site_id, template_type);
CREATE INDEX IF NOT EXISTS idx_aeo_templates_type ON aeo_content_templates(template_type);

-- Insert default templates for each content type (site_id NULL means global/default)
INSERT INTO aeo_content_templates (site_id, template_type, title_pattern, structure_template, schema_template, prompt_template) VALUES
-- Definition template
(NULL, 'definition', 'What is {topic}?', 
 '{"sections": ["definition", "key_points", "examples", "related_concepts"], "required_headings": ["H1: Definition", "H2: Key Points", "H2: Examples", "H2: Related Concepts"]}',
 '{"@type": "Article", "mainEntity": {"@type": "Thing", "name": "{topic}"}, "headline": "{title}", "description": "{aeo_summary}"}',
 'Write a definition article about {topic}. Start with a direct answer in the first 100 words that clearly defines what {topic} is. Use clear headings (H1, H2, H3) and bullet points. Include specific examples and data points where relevant.'),
-- How-to template
(NULL, 'how-to', 'How to {action}',
 '{"sections": ["overview", "steps", "tips", "common_mistakes"], "required_headings": ["H1: How to {action}", "H2: Overview", "H2: Step-by-Step Guide", "H2: Tips", "H2: Common Mistakes"]}',
 '{"@type": "HowTo", "name": "{action}", "description": "{aeo_summary}", "step": []}',
 'Write a how-to guide for {action}. Start with a direct answer in the first 100 words explaining what {action} is and why it matters. Use numbered steps and clear headings. Include practical tips and common mistakes to avoid.'),
-- Comparison template
(NULL, 'comparison', '{option1} vs {option2}',
 '{"sections": ["overview", "comparison_table", "pros_cons", "recommendation"], "required_headings": ["H1: {option1} vs {option2}", "H2: Overview", "H2: Comparison", "H2: Pros and Cons", "H2: Recommendation"]}',
 '{"@type": "Article", "mainEntity": {"@type": "Comparison", "name": "{option1} vs {option2}"}, "headline": "{title}", "description": "{aeo_summary}"}',
 'Write a comparison article about {option1} vs {option2}. Start with a direct answer in the first 100 words stating which is better and why. Include a comparison table and clear headings. Provide honest pros and cons for each option.'),
-- Data template
(NULL, 'data', '{topic} Statistics and Data',
 '{"sections": ["overview", "key_statistics", "trends", "sources"], "required_headings": ["H1: {topic} Statistics", "H2: Key Statistics", "H2: Trends", "H2: Sources"]}',
 '{"@type": "Article", "headline": "{title}", "description": "{aeo_summary}", "mainEntity": {"@type": "Dataset", "name": "{topic} Data"}}',
 'Write a data-driven article about {topic}. Start with a direct answer in the first 100 words highlighting the most important statistic. Use clear headings, bullet points, and tables. Include specific numbers, percentages, and data sources.'),
-- Formula template
(NULL, 'formula', '{topic} Formula and Calculation',
 '{"sections": ["overview", "formula", "examples", "applications"], "required_headings": ["H1: {topic} Formula", "H2: Overview", "H2: The Formula", "H2: Examples", "H2: Applications"]}',
 '{"@type": "Article", "headline": "{title}", "description": "{aeo_summary}", "mainEntity": {"@type": "MathExpression", "name": "{topic} Formula"}}',
 'Write a formula article about {topic}. Start with a direct answer in the first 100 words explaining what the formula calculates. Use clear headings, show the formula prominently, and provide step-by-step examples with calculations.')
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE aeo_content_templates IS 'AEO-optimized content templates for different content types';
COMMENT ON COLUMN aeo_content_templates.template_type IS 'Type of content: definition, how-to, comparison, data, formula, article';
COMMENT ON COLUMN aeo_content_templates.title_pattern IS 'Pattern for generating titles, uses {topic}, {action}, {option1}, {option2} as placeholders';
COMMENT ON COLUMN aeo_content_templates.structure_template IS 'JSONB structure defining required sections and headings';
COMMENT ON COLUMN aeo_content_templates.schema_template IS 'Schema.org JSON-LD template for this content type';
COMMENT ON COLUMN aeo_content_templates.prompt_template IS 'AI prompt template for generating content of this type';

