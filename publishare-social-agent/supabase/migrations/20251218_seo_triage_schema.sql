-- =====================================================
-- Indexability Triage Agent - Database Schema
-- Created: 2025-12-18
-- Purpose: Store SEO alerts, diagnostics, and fixes
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE seo_alert_source AS ENUM (
  'gsc_api',
  'manual',
  'cron'
);

CREATE TYPE seo_url_status AS ENUM (
  'pending',
  'processing',
  'complete',
  'error',
  'needs_review'
);

CREATE TYPE seo_root_cause AS ENUM (
  'INTENTIONAL_ALTERNATE_CANONICAL_OK',
  'CANONICAL_TARGET_NOT_INDEXABLE',
  'CANONICAL_MISMATCH_GOOGLE_CHOSE_OTHER',
  'NOINDEX_CONFLICT',
  'ROBOTS_BLOCKED',
  'SITEMAP_CANONICAL_MISMATCH',
  'DUPLICATE_NEAR_DUPLICATE_NEEDS_CONSOLIDATION',
  'WEAK_INTERNAL_SIGNALS_OR_ORPHAN',
  'SOFT_404_OR_THIN_VALUE',
  'SERVER_OR_RENDERING_ISSUE',
  'UNKNOWN_NEEDS_HUMAN_REVIEW'
);

CREATE TYPE seo_fix_status AS ENUM (
  'pending',
  'approved',
  'applied',
  'failed',
  'rolled_back'
);

-- =====================================================
-- TABLE 1: seo_alerts
-- Stores GSC alert metadata
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id TEXT NOT NULL,
  source seo_alert_source NOT NULL DEFAULT 'manual',
  issue_type TEXT NOT NULL, -- e.g., 'alternate_with_proper_canonical'
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload JSONB, -- Original GSC API response
  url_count INTEGER DEFAULT 0,
  resolved_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seo_alerts_site_id ON seo_alerts(site_id);
CREATE INDEX idx_seo_alerts_issue_type ON seo_alerts(issue_type);
CREATE INDEX idx_seo_alerts_detected_at ON seo_alerts(detected_at DESC);

-- =====================================================
-- TABLE 2: seo_affected_urls
-- Tracks individual URLs under analysis
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_affected_urls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID NOT NULL REFERENCES seo_alerts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status seo_url_status NOT NULL DEFAULT 'pending',
  last_error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seo_affected_urls_alert_id ON seo_affected_urls(alert_id);
CREATE INDEX idx_seo_affected_urls_status ON seo_affected_urls(status);
CREATE INDEX idx_seo_affected_urls_url ON seo_affected_urls(url);
CREATE UNIQUE INDEX idx_seo_affected_urls_alert_url ON seo_affected_urls(alert_id, url);

-- =====================================================
-- TABLE 3: seo_url_diagnostics
-- Comprehensive diagnostic data per URL
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_url_diagnostics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url_id UUID NOT NULL REFERENCES seo_affected_urls(id) ON DELETE CASCADE,
  
  -- Fetch results
  fetch JSONB NOT NULL, -- {status_code, final_url, headers_subset, fetch_ms, redirects}
  
  -- Extracted signals
  signals JSONB NOT NULL, -- {canonical, meta_robots, x_robots, hreflang_count, title, word_count, content_hash}
  
  -- Canonical target analysis
  canonical_target JSONB, -- {url, status_code, self_canonical_ok, indexable_bool, meta_robots}
  
  -- Robots.txt check
  robots JSONB, -- {blocked_bool, matched_rule, robots_txt_url}
  
  -- Sitemap presence
  sitemap JSONB, -- {in_sitemap_bool, sitemap_url, canonical_in_sitemap}
  
  -- Internal signals
  internal JSONB, -- {inlinks_count, depth_estimate, orphan_bool, top_linking_pages}
  
  -- Classification
  classification JSONB NOT NULL, -- {root_cause, confidence, recommended_actions[], autofix_plan, notes}
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seo_url_diagnostics_url_id ON seo_url_diagnostics(url_id);
CREATE INDEX idx_seo_url_diagnostics_root_cause ON seo_url_diagnostics((classification->>'root_cause'));
CREATE INDEX idx_seo_url_diagnostics_created_at ON seo_url_diagnostics(created_at DESC);

-- =====================================================
-- TABLE 4: seo_fix_proposals
-- Stores proposed and applied fixes
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_fix_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url_id UUID NOT NULL REFERENCES seo_affected_urls(id) ON DELETE CASCADE,
  diagnostic_id UUID REFERENCES seo_url_diagnostics(id) ON DELETE SET NULL,
  
  fix_type TEXT NOT NULL, -- e.g., 'REGENERATE_SITEMAP', 'UPDATE_CANONICAL'
  fix_details JSONB NOT NULL, -- Specific parameters for the fix
  
  status seo_fix_status NOT NULL DEFAULT 'pending',
  
  -- Approval tracking
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  
  -- Execution tracking
  applied_at TIMESTAMPTZ,
  applied_by TEXT, -- 'system' or user email
  
  -- Rollback capability
  before_state JSONB, -- State before fix
  after_state JSONB, -- State after fix
  rollback_sql TEXT, -- SQL to undo the fix
  
  -- Error tracking
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seo_fix_proposals_url_id ON seo_fix_proposals(url_id);
CREATE INDEX idx_seo_fix_proposals_status ON seo_fix_proposals(status);
CREATE INDEX idx_seo_fix_proposals_fix_type ON seo_fix_proposals(fix_type);

-- =====================================================
-- TABLE 5: seo_gsc_credentials (OAuth tokens)
-- Stores GSC API credentials per site
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_gsc_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id TEXT NOT NULL UNIQUE,
  site_url TEXT NOT NULL, -- GSC property URL
  
  -- OAuth tokens (encrypted at application layer)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  
  -- Metadata
  authorized_by TEXT, -- User email who authorized
  authorized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seo_gsc_credentials_site_id ON seo_gsc_credentials(site_id);

-- =====================================================
-- TABLE 6: seo_sitemap_cache
-- Cached sitemap URLs for fast lookups
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_sitemap_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id TEXT NOT NULL,
  sitemap_url TEXT NOT NULL,
  
  -- Cached URLs from sitemap
  urls TEXT[] NOT NULL, -- Array of URLs
  url_count INTEGER NOT NULL,
  
  -- Cache metadata
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fetch_duration_ms INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seo_sitemap_cache_site_id ON seo_sitemap_cache(site_id);
CREATE INDEX idx_seo_sitemap_cache_last_fetched ON seo_sitemap_cache(last_fetched_at DESC);

-- =====================================================
-- VIEWS
-- =====================================================

-- Dashboard summary view
CREATE OR REPLACE VIEW seo_dashboard_summary AS
SELECT 
  a.site_id,
  a.issue_type,
  COUNT(DISTINCT u.id) AS total_urls,
  COUNT(DISTINCT CASE WHEN u.status = 'complete' THEN u.id END) AS diagnosed_urls,
  COUNT(DISTINCT CASE WHEN u.status = 'needs_review' THEN u.id END) AS needs_review,
  COUNT(DISTINCT CASE WHEN u.status = 'error' THEN u.id END) AS error_urls,
  COUNT(DISTINCT CASE WHEN d.classification->>'root_cause' IS NOT NULL THEN d.id END) AS classified_urls,
  COUNT(DISTINCT f.id) AS total_fixes,
  COUNT(DISTINCT CASE WHEN f.status = 'applied' THEN f.id END) AS applied_fixes,
  MAX(a.detected_at) AS latest_detection,
  MAX(u.updated_at) AS latest_update
FROM seo_alerts a
LEFT JOIN seo_affected_urls u ON a.id = u.alert_id
LEFT JOIN seo_url_diagnostics d ON u.id = d.url_id
LEFT JOIN seo_fix_proposals f ON u.id = f.url_id
GROUP BY a.site_id, a.issue_type;

-- URLs needing human review
CREATE OR REPLACE VIEW seo_urls_needing_review AS
SELECT 
  u.id AS url_id,
  u.url,
  a.site_id,
  a.issue_type,
  d.classification->>'root_cause' AS root_cause,
  (d.classification->>'confidence')::NUMERIC AS confidence,
  d.classification->'recommended_actions' AS recommended_actions,
  u.updated_at
FROM seo_affected_urls u
JOIN seo_alerts a ON u.alert_id = a.id
LEFT JOIN seo_url_diagnostics d ON u.id = d.url_id
WHERE u.status = 'needs_review'
  OR (d.classification->>'root_cause' = 'UNKNOWN_NEEDS_HUMAN_REVIEW')
ORDER BY u.updated_at DESC;

-- Auto-fixable URLs
CREATE OR REPLACE VIEW seo_auto_fixable_urls AS
SELECT 
  u.id AS url_id,
  u.url,
  a.site_id,
  d.classification->>'root_cause' AS root_cause,
  d.classification->'autofix_plan' AS autofix_plan,
  (d.classification->'autofix_plan'->>'safe_to_autofix')::BOOLEAN AS safe_to_autofix,
  u.status
FROM seo_affected_urls u
JOIN seo_alerts a ON u.alert_id = a.id
JOIN seo_url_diagnostics d ON u.id = d.url_id
WHERE (d.classification->'autofix_plan'->>'safe_to_autofix')::BOOLEAN = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM seo_fix_proposals f 
    WHERE f.url_id = u.id AND f.status IN ('applied', 'pending')
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_seo_alerts_updated_at
  BEFORE UPDATE ON seo_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_affected_urls_updated_at
  BEFORE UPDATE ON seo_affected_urls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_fix_proposals_updated_at
  BEFORE UPDATE ON seo_fix_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_gsc_credentials_updated_at
  BEFORE UPDATE ON seo_gsc_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment alert URL count
CREATE OR REPLACE FUNCTION update_alert_url_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE seo_alerts 
    SET url_count = url_count + 1 
    WHERE id = NEW.alert_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE seo_alerts 
    SET url_count = url_count - 1 
    WHERE id = OLD.alert_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_alert_url_count
  AFTER INSERT OR DELETE ON seo_affected_urls
  FOR EACH ROW EXECUTE FUNCTION update_alert_url_count();

-- Function to update resolved count when status changes
CREATE OR REPLACE FUNCTION update_alert_resolved_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'complete' AND OLD.status != 'complete' THEN
    UPDATE seo_alerts 
    SET resolved_count = resolved_count + 1 
    WHERE id = NEW.alert_id;
  ELSIF OLD.status = 'complete' AND NEW.status != 'complete' THEN
    UPDATE seo_alerts 
    SET resolved_count = resolved_count - 1 
    WHERE id = NEW.alert_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_alert_resolved_count
  AFTER UPDATE ON seo_affected_urls
  FOR EACH ROW 
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_alert_resolved_count();

-- =====================================================
-- GRANTS (adjust based on your RLS policies)
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE seo_alerts IS 'Stores Google Search Console alerts and issues';
COMMENT ON TABLE seo_affected_urls IS 'Tracks individual URLs that need diagnosis';
COMMENT ON TABLE seo_url_diagnostics IS 'Complete diagnostic data and classification per URL';
COMMENT ON TABLE seo_fix_proposals IS 'Proposed and applied fixes with rollback capability';
COMMENT ON TABLE seo_gsc_credentials IS 'OAuth credentials for GSC API access';
COMMENT ON TABLE seo_sitemap_cache IS 'Cached sitemap URLs for fast lookups';

COMMENT ON COLUMN seo_url_diagnostics.fetch IS 'HTTP fetch results: {status_code, final_url, headers, fetch_ms, redirects}';
COMMENT ON COLUMN seo_url_diagnostics.signals IS 'Extracted page signals: {canonical, meta_robots, title, word_count, etc}';
COMMENT ON COLUMN seo_url_diagnostics.classification IS 'LLM classification: {root_cause, confidence, actions, autofix_plan}';

-- =====================================================
-- SAMPLE QUERIES
-- =====================================================

-- Get all pending URLs for diagnosis
-- SELECT * FROM seo_affected_urls WHERE status = 'pending' LIMIT 10;

-- Get diagnostic summary for a site
-- SELECT * FROM seo_dashboard_summary WHERE site_id = 'parentsimple.org';

-- Get all auto-fixable URLs
-- SELECT * FROM seo_auto_fixable_urls WHERE site_id = 'parentsimple.org';

-- Get URLs needing human review
-- SELECT * FROM seo_urls_needing_review WHERE site_id = 'parentsimple.org';



