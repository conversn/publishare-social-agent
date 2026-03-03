// =====================================================
// Shared TypeScript Types for SEO Triage Agent
// =====================================================

export type AlertSource = 'gsc_api' | 'manual' | 'cron';
export type UrlStatus = 'pending' | 'processing' | 'complete' | 'error' | 'needs_review';
export type FixStatus = 'pending' | 'approved' | 'applied' | 'failed' | 'rolled_back';

export type RootCause =
  | 'INTENTIONAL_ALTERNATE_CANONICAL_OK'
  | 'CANONICAL_TARGET_NOT_INDEXABLE'
  | 'CANONICAL_MISMATCH_GOOGLE_CHOSE_OTHER'
  | 'NOINDEX_CONFLICT'
  | 'ROBOTS_BLOCKED'
  | 'SITEMAP_CANONICAL_MISMATCH'
  | 'DUPLICATE_NEAR_DUPLICATE_NEEDS_CONSOLIDATION'
  | 'WEAK_INTERNAL_SIGNALS_OR_ORPHAN'
  | 'SOFT_404_OR_THIN_VALUE'
  | 'SERVER_OR_RENDERING_ISSUE'
  | 'UNKNOWN_NEEDS_HUMAN_REVIEW';

// =====================================================
// API Request/Response Types
// =====================================================

export interface IngestRequest {
  site_id: string;
  source: AlertSource;
  issue_type: string;
  urls: string[];
  raw_payload?: Record<string, unknown>;
}

export interface DiagnoseRequest {
  url_ids?: string[]; // Specific URL IDs to diagnose
  alert_id?: string; // Or all URLs from an alert
  batch_size?: number; // Default 10
}

export interface ApplyFixRequest {
  fix_ids: string[]; // Fix proposal IDs to apply
  approved_by: string; // User email or 'system'
  dry_run?: boolean; // Preview changes without applying
}

// =====================================================
// Diagnostic Data Structures
// =====================================================

export interface FetchResult {
  status_code: number;
  final_url: string;
  headers_subset: Record<string, string>;
  fetch_ms: number;
  redirects?: string[];
  error?: string;
}

export interface PageSignals {
  canonical?: string;
  meta_robots?: string;
  x_robots_tag?: string;
  hreflang_count?: number;
  title?: string;
  h1?: string;
  word_count?: number;
  content_hash?: string;
  has_noindex: boolean;
  has_nofollow: boolean;
}

export interface CanonicalTarget {
  url: string;
  status_code: number;
  self_canonical_ok: boolean;
  indexable_bool: boolean;
  meta_robots?: string;
  error?: string;
}

export interface RobotsCheck {
  blocked_bool: boolean;
  matched_rule?: string;
  robots_txt_url: string;
  fetch_error?: string;
}

export interface SitemapCheck {
  in_sitemap_bool: boolean;
  sitemap_url?: string;
  canonical_in_sitemap?: boolean;
}

export interface InternalSignals {
  inlinks_count: number;
  depth_estimate?: number;
  orphan_bool: boolean;
  top_linking_pages?: string[];
}

// =====================================================
// Classification Result
// =====================================================

export interface RecommendedAction {
  action: string; // e.g., 'ADD_INTERNAL_LINKS', 'VERIFY_CANONICAL'
  detail: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AutofixPlan {
  safe_to_autofix: boolean;
  patches: AutofixPatch[];
  requires_human_review: string[];
}

export interface AutofixPatch {
  fix_type: string; // e.g., 'REGENERATE_SITEMAP'
  target: string; // What to fix (URL, sitemap, etc.)
  parameters: Record<string, unknown>;
  estimated_impact: string;
}

export interface Classification {
  root_cause: RootCause;
  confidence: number; // 0-1
  recommended_actions: RecommendedAction[];
  autofix_plan: AutofixPlan;
  notes: string;
}

export interface DiagnosticData {
  url_id: string;
  fetch: FetchResult;
  signals: PageSignals;
  canonical_target?: CanonicalTarget;
  robots: RobotsCheck;
  sitemap: SitemapCheck;
  internal: InternalSignals;
  classification: Classification;
}

// =====================================================
// GSC API Types
// =====================================================

export interface GSCIssue {
  issueType: string;
  affectedUrls: string[];
  detectedAt: string;
}

export interface GSCCredentials {
  site_id: string;
  site_url: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

// =====================================================
// LLM Prompt Payload
// =====================================================

export interface LLMPromptPayload {
  issue_type: string;
  url: string;
  signals: PageSignals;
  canonical_target?: CanonicalTarget;
  robots: RobotsCheck;
  sitemap: SitemapCheck;
  internal: InternalSignals;
  gsc_hint?: {
    indexed: boolean;
    google_selected_canonical?: string;
    reason: string;
  };
}

// =====================================================
// Fix Proposal Types
// =====================================================

export interface FixProposal {
  id: string;
  url_id: string;
  fix_type: string;
  fix_details: Record<string, unknown>;
  requires_approval: boolean;
  status: FixStatus;
}

// =====================================================
// Response Types
// =====================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface DiagnoseResponse {
  processed: number;
  successful: number;
  failed: number;
  diagnostics: DiagnosticData[];
  errors: Array<{ url_id: string; error: string }>;
}

export interface ApplyFixResponse {
  applied: number;
  failed: number;
  fixes: Array<{
    fix_id: string;
    status: FixStatus;
    error?: string;
  }>;
}



