import type { GeneratedLocalServicePage, QualityReport } from "./types.ts";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateGeneratedSchema(
  output: unknown,
): output is GeneratedLocalServicePage {
  if (!isObject(output)) return false;

  const requiredKeys = [
    "hero",
    "localized_overview",
    "climate_callout",
    "permit_callout",
    "seasonality_callout",
    "service_grid",
    "pricing_intro",
    "pricing_rows",
    "how_it_works",
    "local_benefits",
    "faq_items",
    "nearby_links",
    "closing_cta",
    "legal",
    "seo",
    "schema_graph",
    "html_content",
    "text_content",
  ];

  for (const key of requiredKeys) {
    if (!(key in output)) return false;
  }

  if (!Array.isArray((output as Record<string, unknown>).faq_items)) {
    return false;
  }
  if (!Array.isArray((output as Record<string, unknown>).pricing_rows)) {
    return false;
  }
  if (!isObject((output as Record<string, unknown>).seo)) return false;
  if (!isObject((output as Record<string, unknown>).schema_graph)) return false;
  if (typeof (output as Record<string, unknown>).html_content !== "string") {
    return false;
  }
  if (typeof (output as Record<string, unknown>).text_content !== "string") {
    return false;
  }

  return true;
}

export function validateQuality(input: {
  textContent: string;
  modules: Record<string, unknown>;
  faqItems: Array<{ q: string; a: string }>;
  cityName: string;
  stateCode: string;
}): QualityReport {
  const text = input.textContent || "";
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 80);

  // Remove markdown heading labels so heading wording does not mask repeated bodies.
  const bodyOnlyParagraphs = paragraphs.map((p) =>
    p
      .replace(/^#{1,6}\s+.*$/gm, "")
      .replace(/\s+/g, " ")
      .trim()
  ).filter((p) => p.length >= 60);

  const normalized = bodyOnlyParagraphs.map((p) =>
    p.toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s]/g, "")
  );
  const uniqueParagraphsCount = new Set(normalized).size;

  const duplicateParagraphCount = normalized.length - uniqueParagraphsCount;
  const duplicateParagraphRatio = normalized.length
    ? duplicateParagraphCount / normalized.length
    : 0;

  const requiredModules = [
    "climate_callout",
    "permit_callout",
    "seasonality_callout",
  ];
  const requiredModulesPass = requiredModules.every((k) =>
    Boolean((input.modules as Record<string, unknown>)?.[k])
  );

  const cityPattern = `${escapeRegex(input.cityName)}|${
    escapeRegex(input.stateCode)
  }`;
  const cityMentions = (text.match(new RegExp(cityPattern, "gi")) || []).length;
  const citySpecificFactsCount = cityMentions >= 3 ? 3 : cityMentions;

  const faqItemsSafe = input.faqItems
    .map((x) => ({
      q: typeof x?.q === "string" ? x.q : "",
      a: typeof x?.a === "string" ? x.a : "",
    }))
    .filter((x) => x.q.length > 0 && x.a.length > 0);

  const faqCityQs =
    faqItemsSafe.filter((x) =>
      x.q.toLowerCase().includes(input.cityName.toLowerCase())
    ).length;
  const faqRulesPass = faqItemsSafe.length >= 6 && faqCityQs >= 3;

  const warnings: string[] = [];
  if (words < 900) warnings.push("word_count_below_minimum");
  if (uniqueParagraphsCount < 6) warnings.push("not_enough_unique_paragraphs");
  if (duplicateParagraphRatio > 0.18) warnings.push("repetitive_section_bodies");
  if (!requiredModulesPass) warnings.push("missing_required_city_modules");
  if (!faqRulesPass) warnings.push("faq_rules_failed");

  return {
    word_count: words,
    min_words_pass: words >= 900,
    unique_paragraphs_count: uniqueParagraphsCount,
    unique_paragraphs_pass: uniqueParagraphsCount >= 6 && duplicateParagraphRatio <= 0.18,
    city_specific_facts_count: citySpecificFactsCount,
    city_specific_facts_pass: citySpecificFactsCount >= 3,
    required_modules_pass: requiredModulesPass,
    faq_rules_pass: faqRulesPass,
    warnings,
  };
}
