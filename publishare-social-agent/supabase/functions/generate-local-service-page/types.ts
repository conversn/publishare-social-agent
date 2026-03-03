export type GenerateMode = "draft" | "refresh" | "publish";

export interface GenerateRequest {
  site_id: string;
  service_slug: string;
  city_slug: string;
  state_code: string;
  mode: GenerateMode;
  force_regenerate?: boolean;
  initiated_by?: string;
  prompt_iteration?: number;
  batch_mode?: boolean;
  force_rescue?: boolean;
}

export interface FAQItem {
  q: string;
  a: string;
}

export interface GeneratedSeo {
  title?: string;
  meta_description?: string;
  h1?: string;
  og_title?: string;
  og_description?: string;
  og_image_path?: string;
}

export interface GeneratedLocalServicePage {
  hero?: unknown;
  localized_overview?: unknown;
  climate_callout?: unknown;
  permit_callout?: unknown;
  seasonality_callout?: unknown;
  service_grid?: unknown;
  pricing_intro?: unknown;
  pricing_rows?: unknown[];
  how_it_works?: unknown;
  local_benefits?: unknown;
  faq_items?: FAQItem[];
  nearby_links?: unknown;
  closing_cta?: unknown;
  legal?: unknown;
  seo?: GeneratedSeo;
  schema_graph?: Record<string, unknown>;
  html_content?: string;
  text_content?: string;
  [key: string]: unknown;
}

export interface QualityReport {
  word_count: number;
  min_words_pass: boolean;
  unique_paragraphs_count: number;
  unique_paragraphs_pass: boolean;
  city_specific_facts_count: number;
  city_specific_facts_pass: boolean;
  required_modules_pass: boolean;
  faq_rules_pass: boolean;
  warnings: string[];
}
