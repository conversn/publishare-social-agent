/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildBriefPrompt,
  buildCritiquePrompt,
  buildDraftPrompt,
  buildRevisionPrompt,
} from "./prompt.ts";
import { validateGeneratedSchema, validateQuality } from "./validators.ts";
import { runAgenticCompletion } from "../_shared/agentic-completion.ts";
import type {
  GeneratedLocalServicePage,
  GenerateMode,
  GenerateRequest,
} from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function isGenerateMode(value: unknown): value is GenerateMode {
  return value === "draft" || value === "refresh" || value === "publish";
}

function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function toTextArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x) => typeof x === "string").map((x) => x.trim()).filter(
      Boolean,
    )
    : [];
}

function toPricingRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((x) => typeof x === "object" && x !== null) as Array<
      Record<string, unknown>
    >
    : [];
}

function pickContentAngle(seed: string):
  | "emergency-first"
  | "cost-transparency"
  | "climate-risk"
  | "homeowner-mistakes"
  | "repair-vs-replace" {
  const angles = [
    "emergency-first",
    "cost-transparency",
    "climate-risk",
    "homeowner-mistakes",
    "repair-vs-replace",
  ] as const;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return angles[hash % angles.length];
}

function extractHeadings(html: string): string[] {
  if (!html) return [];
  const matches = html.match(/<h[23][^>]*>(.*?)<\/h[23]>/gi) || [];
  return matches.map((m) =>
    m.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
  ).filter(Boolean);
}

function trigrams(input: string): Set<string> {
  const words = input.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i < words.length - 2; i++) {
    out.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const item of a) {
    if (b.has(item)) intersect++;
  }
  const union = a.size + b.size - intersect;
  return union > 0 ? intersect / union : 0;
}

function maxSimilarity(text: string, others: string[]): number {
  const base = trigrams(text);
  let max = 0;
  for (const other of others) {
    const sim = jaccard(base, trigrams(other));
    if (sim > max) max = sim;
  }
  return max;
}


type ContentAngle =
  | "emergency-first"
  | "cost-transparency"
  | "climate-risk"
  | "homeowner-mistakes"
  | "repair-vs-replace";

interface EvidenceItem {
  id: string;
  text: string;
  source: string;
}

interface EvidencePack {
  items: EvidenceItem[];
  coverage_target: number;
  summary: string[];
}

interface CritiqueResult {
  pass: boolean;
  score: number;
  failures: string[];
  evidence_gaps: string[];
  rewrite_instructions: string;
  must_fix_sections: string[];
}

interface GenerationMeta {
  usedRescue: boolean;
  similarity: number;
  evidenceCoverage: number;
  coverageTarget: number;
  criticScore: number;
  attemptCount: number;
  stageWarnings: string[];
}

function normalizeWords(input: string): string[] {
  return input.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/)
    .filter((w) => w.length >= 4);
}

function extractLinesFromUnknown(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") {
    const v = value.trim();
    return v ? [prefix ? `${prefix}: ${v}` : v] : [];
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [prefix ? `${prefix}: ${String(value)}` : String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((v) => extractLinesFromUnknown(v, prefix));
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .flatMap(([k, v]) => extractLinesFromUnknown(v, k));
  }
  return [];
}

function buildEvidencePack(params: {
  service: Record<string, unknown>;
  city: Record<string, unknown>;
  facts: Record<string, unknown>;
}): EvidencePack {
  const cityName = typeof params.city.city_name === "string"
    ? params.city.city_name
    : "Local city";
  const stateCode = typeof params.city.state_code === "string"
    ? params.city.state_code
    : "";
  const serviceName = typeof params.service.service_name === "string"
    ? params.service.service_name
    : "Home Services";

  const rawItems: EvidenceItem[] = [];
  const add = (source: string, text: string) => {
    const clean = text.trim();
    if (!clean || clean.length < 20) return;
    rawItems.push({
      id: `ev_${rawItems.length + 1}`,
      text: clean,
      source,
    });
  };

  add("city", `${cityName}, ${stateCode} service conditions for ${serviceName}.`);

  extractLinesFromUnknown(params.service.primary_keywords, "primary_keywords")
    .slice(0, 4).forEach((v) => add("service.primary_keywords", v));
  extractLinesFromUnknown(params.service.secondary_keywords, "secondary_keywords")
    .slice(0, 4).forEach((v) => add("service.secondary_keywords", v));
  extractLinesFromUnknown(params.service.primary_intents, "primary_intents")
    .slice(0, 5).forEach((v) => add("service.primary_intents", v));
  extractLinesFromUnknown(params.service.pricing_items, "pricing")
    .slice(0, 6).forEach((v) => add("service.pricing_items", v));

  extractLinesFromUnknown(params.facts.climate_notes, "climate")
    .slice(0, 5).forEach((v) => add("facts.climate_notes", v));
  extractLinesFromUnknown(params.facts.permitting_notes, "permitting")
    .slice(0, 5).forEach((v) => add("facts.permitting_notes", v));
  extractLinesFromUnknown(params.facts.seasonal_timing, "seasonal")
    .slice(0, 5).forEach((v) => add("facts.seasonal_timing", v));
  extractLinesFromUnknown(params.facts.homeowner_context, "homeowner_context")
    .slice(0, 5).forEach((v) => add("facts.homeowner_context", v));
  extractLinesFromUnknown(params.facts.trust_data, "trust_data")
    .slice(0, 5).forEach((v) => add("facts.trust_data", v));

  const deduped: EvidenceItem[] = [];
  const seen = new Set<string>();
  for (const item of rawItems) {
    const key = item.text.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ ...item, id: `ev_${deduped.length + 1}` });
    if (deduped.length >= 24) break;
  }

  return {
    items: deduped,
    coverage_target: Math.min(8, Math.max(4, Math.floor(deduped.length / 3))),
    summary: deduped.slice(0, 8).map((x) => x.text),
  };
}

function countEvidenceCoverage(text: string, evidenceItems: EvidenceItem[]): number {
  const textTokens = new Set(normalizeWords(text));
  let covered = 0;

  for (const item of evidenceItems) {
    const evTokens = normalizeWords(item.text);
    if (evTokens.length < 4) continue;
    let overlap = 0;
    for (const tok of evTokens) {
      if (textTokens.has(tok)) overlap += 1;
    }
    if (overlap >= 4 && overlap / evTokens.length >= 0.45) {
      covered += 1;
    }
  }

  return covered;
}

function getHeadingCount(page: GeneratedLocalServicePage): number {
  const html = page.html_content || "";
  const htmlHeads = extractHeadings(html);
  if (htmlHeads.length > 0) return htmlHeads.length;

  const text = page.text_content || "";
  return (text.match(/^##\s+/gm) || []).length;
}

function parseCritique(raw: unknown): CritiqueResult {
  const input = asObject(raw);
  const failures = Array.isArray(input.failures)
    ? input.failures.filter((x) => typeof x === "string") as string[]
    : [];
  const evidenceGaps = Array.isArray(input.evidence_gaps)
    ? input.evidence_gaps.filter((x) => typeof x === "string") as string[]
    : [];
  const mustFixSections = Array.isArray(input.must_fix_sections)
    ? input.must_fix_sections.filter((x) => typeof x === "string") as string[]
    : [];

  return {
    pass: input.pass === true,
    score: typeof input.score === "number" ? input.score : 0,
    failures,
    evidence_gaps: evidenceGaps,
    rewrite_instructions: typeof input.rewrite_instructions === "string"
      ? input.rewrite_instructions
      : "",
    must_fix_sections: mustFixSections,
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

async function runJsonCompletion(params: {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<Record<string, unknown>> {
  const provider = Deno.env.get("LLM_PROVIDER");
  if (provider !== "deepseek") {
    throw new Error("LLM_PROVIDER must be 'deepseek' for local service generation");
  }

  const parsed = await withTimeout(
    runAgenticCompletion({
      provider: "deepseek",
      model: Deno.env.get("DEEPSEEK_MODEL") ?? "deepseek-chat",
      prompt: params.prompt,
      response_format: "json",
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 3500,
    }),
    params.timeoutMs ?? 90000,
    "deepseek_completion",
  );

  return asObject(parsed);
}

function buildRescuePage(params: {
  serviceName: string;
  serviceSlug: string;
  cityName: string;
  stateCode: string;
  countyName?: string;
  climateNotes: string[];
  permittingNotes: string[];
  seasonalNotes: string[];
  complianceDisclaimer: string;
  pricingRows: Array<Record<string, unknown>>;
  contentAngle:
    | "emergency-first"
    | "cost-transparency"
    | "climate-risk"
    | "homeowner-mistakes"
    | "repair-vs-replace";
}): GeneratedLocalServicePage {
  const city = params.cityName;
  const state = params.stateCode;
  const county = params.countyName ? `${params.countyName} County` : "the local county";

  const climateA = params.climateNotes[0] || `${city} homes see seasonal pressure on ${params.serviceSlug} systems, which changes service urgency.`;
  const climateB = params.climateNotes[1] || `Temperature swings and occupancy patterns in ${city} can expose weak components quickly.`;
  const permitA = params.permittingNotes[0] || `Major ${params.serviceSlug} replacements may require permits depending on municipal scope.`;
  const seasonalA = params.seasonalNotes[0] || `Peak demand periods in ${city} often stretch scheduling windows and parts lead times.`;

  const headingsByAngle: Record<string, string[]> = {
    "emergency-first": [
      `Emergency ${params.serviceName} Triage for ${city} Households`,
      `What to Document Before You Book a Same-Day Visit`,
      `How Dispatch Priority Works During Demand Spikes`,
      `Repair Stabilization vs Full Resolution Decisions`,
      `What Changes Price in Urgent Call Windows`,
      `Permit Scope Triggers That Affect Timeline`,
      `How to Compare Two Fast Quotes Without Guessing`,
      `Post-Repair Steps to Prevent Repeat Failures`,
    ],
    "cost-transparency": [
      `${city} ${params.serviceName} Cost Drivers by Job Type`,
      `Line Items That Separate Honest Quotes from Vague Totals`,
      `Short-Term Repair Spend vs Replacement Spend Curves`,
      `Seasonal Rate Pressure and Availability Tradeoffs`,
      `Financing, Scope Control, and Change-Order Risk`,
      `Permit and Inspection Cost Effects in ${county}`,
      `How to Build a True Apples-to-Apples Comparison`,
      `90-Day Plan to Control Total Ownership Cost`,
    ],
    "climate-risk": [
      `${city} Climate Stress Patterns and System Failure Risk`,
      `Load Stress Signals Homeowners Usually Miss`,
      `Pre-Season Mitigation Steps That Actually Reduce Outages`,
      `When a Temporary Repair Is Rational`,
      `When Climate Exposure Requires a Replacement Plan`,
      `Code, Safety, and Permit Dependencies`,
      `Timeline Planning for Heat- and Storm-Driven Demand`,
      `Durability Checklist for Long-Term Reliability`,
    ],
    "homeowner-mistakes": [
      `The Most Expensive ${params.serviceName} Mistakes in ${city}`,
      `What Delays Diagnosis and Raises Final Cost`,
      `Scope Errors That Cause Repeat Technician Visits`,
      `How Verbal Estimates Turn Into Change Orders`,
      `Repair-vs-Replace Misreads and Better Decision Signals`,
      `Permit and Documentation Errors to Avoid`,
      `How to Vet Provider Assumptions Before Approval`,
      `Maintenance Habits That Prevent Next-Season Emergencies`,
    ],
    "repair-vs-replace": [
      `Repair vs Replace Framework for ${city} Homes`,
      `Decision Inputs: Age, Runtime, Efficiency, and Failure Frequency`,
      `When Repair Buys Valuable Time`,
      `When Replacement Lowers Risk and Lifetime Spend`,
      `Installation Scope Factors That Change Outcomes`,
      `Permits, Inspection, and Commissioning Timeline`,
      `Cost Scenario Modeling by System Condition`,
      `Final Decision Rubric You Can Use This Week`,
    ],
  };

  const sectionTheses = [
    `If the issue is urgent, the first goal in ${city} is risk containment: protect safety, prevent compounding damage, and collect enough evidence to route the right scope on the first visit.`,
    `Better outcomes start with better inputs. A clear symptom log, timestamped performance notes, and basic system context reduce misdiagnosis and lower callback risk.`,
    `Dispatch outcomes are not random. During heavy demand, queue position usually reflects safety signals, failure severity, and parts certainty more than request order alone.`,
    `Under pressure, many homeowners over-commit to either a patch or a replacement. The stronger move is to map decision thresholds before approval.`,
    `Price movement in ${city} is usually driven by scope clarity, part availability, labor window, and compliance dependencies rather than a single market rate.`,
    `${county} permitting and inspection rules can become timeline bottlenecks if discovered late; confirming scope boundaries early avoids expensive schedule resets.`,
    `Provider comparison should focus on assumptions and exclusions, not headline totals. The quote with the clearest decision logic usually wins long-term.`,
    `After service, reliability comes from verification and prevention steps. A short follow-up plan prevents avoidable repeat failures during the next demand cycle.`,
  ];

  const sectionActions = [
    `Immediate checklist: confirm active safety risks, isolate affected zones when possible, capture symptoms, and state your acceptable response window before you request provider options.`,
    `Before booking: write down failure pattern, recent maintenance, visible wear, filter status, and any comfort drift by room so triage can classify likely root causes faster.`,
    `When scheduling, ask which scenarios are prioritized in ${city}, what information changes queue placement, and what diagnostics are required before final scope approval.`,
    `Use a simple decision matrix: expected service life remaining, repeat-failure probability, efficiency trend, and downstream repair exposure if you defer replacement.`,
    `Request line-item breakdowns for diagnostics, labor assumptions, major parts, code-related scope, and post-work verification so quotes can be compared accurately.`,
    `Ask explicitly: what work in your project triggers permits, who pulls them, what inspections are required, and which dependencies can delay completion.`,
    `Require each provider to list included work, excluded contingencies, and change-order triggers. If the assumptions differ, the totals are not comparable.`,
    `Close the job with verification notes, system baseline readings, and a seasonal maintenance schedule aligned to ${city} demand swings and occupancy patterns.`,
  ];

  const sectionEvidence = [
    `${climateA}`,
    `${climateB}`,
    `${seasonalA}`,
    `${permitA}`,
    `In ${city}, homeowners who clarify scope before approval usually see fewer timeline resets and fewer billing surprises.`,
    `Seasonality in ${city}, ${state} changes provider availability and can affect both response speed and install sequencing.`,
    `A documented process improves first-visit resolution likelihood and reduces repeat dispatch friction.`,
    `Decision quality is measurable: clearer assumptions, fewer scope changes, and lower repeat-failure probability over the next season.`,
  ];

  const headings = headingsByAngle[params.contentAngle] || headingsByAngle["emergency-first"];
  const sections = headings.map((heading, i) => {
    const thesis = sectionTheses[i % sectionTheses.length];
    const actions = sectionActions[i % sectionActions.length];
    const evidence = sectionEvidence[i % sectionEvidence.length];
    return [
      `## ${heading}`,
      thesis,
      `${actions} ${evidence}`,
    ].join("\n");
  });

  const pricingRowsText = params.pricingRows.length
    ? params.pricingRows.map((r) =>
      `- ${String(r.item ?? "Service line")}: ${
        String(r.price_range ?? "Varies by provider and scope")
      }`
    ).join("\n")
    : [
      "- Diagnostic visit: Varies by provider and urgency",
      "- Standard repair scope: Varies by parts, labor, and access complexity",
      "- Full replacement scope: Varies by equipment, installation details, and permitting",
    ].join("\n");

  const faq = [
    {
      q: `Where can I get ${params.serviceName.toLowerCase()} help in ${city}, ${state}?`,
      a: `HomeSimple connects homeowners in ${city}, ${state} with independent local providers so you can compare scope, timing, and pricing assumptions before choosing.`,
    },
    {
      q: `How quickly can emergency ${params.serviceSlug} support arrive in ${city}?`,
      a: `Timing depends on safety severity, demand pressure, and provider capacity. Sharing detailed symptoms improves triage and routing speed.`,
    },
    {
      q: `What should I check before requesting ${params.serviceName.toLowerCase()} in ${city}?`,
      a: `Document system symptoms, timeline urgency, recent maintenance, and visible wear so providers can scope diagnostics correctly on first contact.`,
    },
    {
      q: `What does ${params.serviceName.toLowerCase()} usually cost in ${city}, ${state}?`,
      a: `Costs vary by diagnosis depth, labor assumptions, parts availability, and whether permit-triggering work is included in scope.`,
    },
    {
      q: `Is repair or replacement better for my ${params.serviceSlug} system in ${city}?`,
      a: `Compare age, failure frequency, efficiency decline, and risk of repeat outages versus replacement timeline and budget impact.`,
    },
    {
      q: `Do permits matter for ${params.serviceSlug} projects in ${city}, ${state}?`,
      a: `${permitA}`,
    },
    {
      q: `How do I compare two provider quotes without overpaying?`,
      a: `Use line-item scope, exclusions, change-order triggers, schedule commitments, and verification steps instead of comparing totals only.`,
    },
    {
      q: `How can I reduce repeat failures after service in ${city}?`,
      a: `Confirm root-cause diagnosis, keep baseline performance notes, and schedule preventive maintenance before peak seasonal demand.`,
    },
  ];

  const intro = [
    `# ${params.serviceName} Help in ${city}, ${state}`,
    `Homeowners in ${city}, ${state} can get ${params.serviceName.toLowerCase()} help by using HomeSimple to compare independent local providers with clear scope, timeline, and pricing assumptions before booking.`,
    `This page is built for decision quality, not filler copy. It gives a practical framework for urgent triage, quote comparison, repair-vs-replace logic, and compliance planning in ${county}.`,
  ].join("\n\n");

  const pricingSection = [
    `## Local Pricing Snapshot for ${city}, ${state}`,
    pricingRowsText,
    `These ranges are directional. Final pricing depends on diagnosis depth, parts lead time, labor complexity, and permit/code scope.`,
  ].join("\n");

  const closeSection = [
    `## Next-Step Plan for ${city} Homeowners`,
    `Set urgency boundaries, gather symptom evidence, and compare providers using scope transparency first. In ${city}, this approach reduces misaligned quotes and improves long-term reliability outcomes.`,
  ].join("\n");

  const legal = `## Marketplace Disclosure
${params.complianceDisclaimer}`;

  const expansionParagraphs = [
    `In ${city}, the most consistent way to reduce avoidable service delays is to provide a concise symptom timeline before dispatch: when the issue started, what changed, and which rooms or zones are affected.`,
    `For quote quality, ask for decision assumptions in writing. In ${city}, two similar totals can hide very different risk profiles if exclusions, inspection dependencies, and warranty scope are not explicit.`,
    `${seasonalA} Planning non-urgent work ahead of those windows usually improves provider choice, reduces scheduling stress, and lowers the chance of rushed scope decisions.`,
    `${climateB} A preventive check before high-demand periods can catch wear patterns early and avoid emergency-only decision windows.`,
    `If you receive conflicting recommendations, normalize them into one comparison sheet: proposed scope, dependencies, timeline, verification steps, and expected durability period.`,
    `When major work is involved, confirm permit ownership, inspection sequencing, and closeout documentation before approving the project start date.`,
    `Homeowners who treat service as a lifecycle decision instead of a one-time transaction generally see better reliability and fewer repeat callbacks.`,
    `The practical target is simple: transparent scope, realistic timeline, and verification that the completed work solved the root cause, not just the symptom.`,
  ];

  let text = [intro, ...sections, pricingSection, closeSection, legal].join(
    "\n\n",
  );
  let expansionIndex = 0;
  while (getWordCount(text) < 1200 && expansionIndex < expansionParagraphs.length) {
    text += `\n\n${expansionParagraphs[expansionIndex]}`;
    expansionIndex += 1;
  }
  if (getWordCount(text) < 930) {
    text +=
      `\n\nBefore approving final scope in ${city}, ask for a written closeout checklist with performance verification, warranty boundaries, and maintenance timing so you can confirm the work solved the underlying issue.`;
  }
  if (getWordCount(text) < 930) {
    text +=
      `\n\nFor higher-confidence outcomes in ${city}, compare options using decision quality signals: clear assumptions, realistic timeline dependencies, and a documented prevention plan for the next peak-demand window.`;
  }

  const html = text
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith("- ")) return `<li>${line.slice(2)}</li>`;
      return line.trim().length ? `<p>${line}</p>` : "";
    })
    .join("")
    .replace(/(<li>.*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/<\/ul><ul>/g, "");

  const title = `${params.serviceName} Help in ${city}, ${state} | HomeSimple`;
  const meta = `Need ${params.serviceName.toLowerCase()} help in ${city}, ${state}? Compare local providers with clear pricing, timeline, and repair-vs-replace guidance.`;

  return {
    hero: {
      title: `${params.serviceName} Help in ${city}`,
      description: `Compare local provider options in ${city}, ${state} with clear urgency, scope, and pricing context.`,
    },
    localized_overview: {
      summary: `Actionable local guidance for ${params.serviceName.toLowerCase()} decisions in ${city}, ${state}.`,
    },
    climate_callout: { note: climateA },
    permit_callout: { note: permitA },
    seasonality_callout: { note: seasonalA },
    service_grid: { services: [] },
    pricing_intro: { note: `Pricing is scope-dependent and provider-specific in ${city}.` },
    pricing_rows: params.pricingRows,
    how_it_works: { steps: ["Submit request", "Compare options", "Choose provider"] },
    local_benefits: { note: `Local decision support for ${city}, ${state}.` },
    faq_items: faq,
    nearby_links: {},
    closing_cta: {
      text: `Get ${params.serviceName.toLowerCase()} help in ${city}, ${state} with local provider options now.`,
    },
    legal: { disclosure: params.complianceDisclaimer },
    seo: {
      title,
      meta_description: meta,
      h1: `${params.serviceName} Help in ${city}, ${state}`,
    },
    schema_graph: {},
    html_content: html,
    text_content: text,
  };
}

function asObject(value: unknown): Record<string, unknown> {
  return (typeof value === "object" && value !== null && !Array.isArray(value))
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeGeneratedOutput(raw: unknown): GeneratedLocalServicePage {
  const input = asObject(raw);
  const seoInput = asObject(input.seo);

  const faqRaw = Array.isArray(input.faq_items) ? input.faq_items : [];
  const faqItems = faqRaw
    .map((item) => {
      const row = asObject(item);
      const q = typeof row.q === "string"
        ? row.q
        : (typeof row.question === "string" ? row.question : "");
      const a = typeof row.a === "string"
        ? row.a
        : (typeof row.answer === "string" ? row.answer : "");
      return { q, a };
    })
    .filter((x) => x.q.length > 0 && x.a.length > 0);

  const normalized: GeneratedLocalServicePage = {
    hero: input.hero ?? {},
    localized_overview: input.localized_overview ?? input.overview ?? {},
    climate_callout: input.climate_callout ?? {},
    permit_callout: input.permit_callout ?? {},
    seasonality_callout: input.seasonality_callout ?? {},
    service_grid: input.service_grid ?? {},
    pricing_intro: input.pricing_intro ?? {},
    pricing_rows: Array.isArray(input.pricing_rows) ? input.pricing_rows : [],
    how_it_works: input.how_it_works ?? {},
    local_benefits: input.local_benefits ?? {},
    faq_items: faqItems,
    nearby_links: input.nearby_links ?? {},
    closing_cta: input.closing_cta ?? {},
    legal: input.legal ?? {},
    seo: {
      title: typeof seoInput.title === "string" ? seoInput.title : undefined,
      meta_description: typeof seoInput.meta_description === "string"
        ? seoInput.meta_description
        : (typeof seoInput.description === "string"
          ? seoInput.description
          : undefined),
      h1: typeof seoInput.h1 === "string" ? seoInput.h1 : undefined,
      og_title: typeof seoInput.og_title === "string"
        ? seoInput.og_title
        : undefined,
      og_description: typeof seoInput.og_description === "string"
        ? seoInput.og_description
        : undefined,
      og_image_path: typeof seoInput.og_image_path === "string"
        ? seoInput.og_image_path
        : undefined,
    },
    schema_graph: asObject(input.schema_graph),
    html_content: typeof input.html_content === "string"
      ? input.html_content
      : "",
    text_content: typeof input.text_content === "string"
      ? input.text_content
      : (typeof input.content === "string" ? input.content : ""),
  };

  return normalized;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

async function generateWithLLM(
  prompt: string,
  opts?: { temperature?: number; maxTokens?: number; timeoutMs?: number },
): Promise<GeneratedLocalServicePage> {
  const parsed = await runJsonCompletion({
    prompt,
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    timeoutMs: opts?.timeoutMs,
  });

  const normalized = normalizeGeneratedOutput(parsed);
  if (!validateGeneratedSchema(normalized)) {
    throw new Error("invalid_generation_schema");
  }

  return normalized;
}

async function getSiteBaseUrl(
  supabase: any,
  siteId: string,
): Promise<string> {
  const { data } = await supabase
    .from("sites")
    .select("domain")
    .eq("id", siteId)
    .maybeSingle();

  const rawDomain = (data?.domain as string | undefined)?.trim();
  if (!rawDomain) {
    return `https://${siteId}.org`;
  }

  return rawDomain.startsWith("http")
    ? rawDomain.replace(/\/$/, "")
    : `https://${rawDomain.replace(/\/$/, "")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return Response.json({ ok: false, error: "unauthorized" }, {
      status: 401,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return Response.json(
      { ok: false, error: "missing_supabase_env" },
      { status: 500, headers: corsHeaders },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let pageKey = "unknown";
  let requestPayload: unknown = null;

  try {
    const body = (await req.json()) as Partial<GenerateRequest>;
    requestPayload = body;

    const siteId = body.site_id?.trim();
    const serviceSlug = body.service_slug?.trim();
    const citySlug = body.city_slug?.trim();
    const stateCode = body.state_code?.trim().toUpperCase();
    const mode = body.mode;
    const forceRegenerate = body.force_regenerate === true;

    if (
      !siteId || !serviceSlug || !citySlug || !stateCode || !mode ||
      !isGenerateMode(mode)
    ) {
      return Response.json({ ok: false, error: "missing_required_fields" }, {
        status: 400,
        headers: corsHeaders,
      });
    }

    pageKey = `${siteId}:${serviceSlug}:${citySlug}:${stateCode}`;

    await supabase.from("local_service_page_jobs").insert({
      page_key: pageKey,
      request_payload: body,
      status: "started",
    });

    const [{ data: service }, { data: city }] = await Promise.all([
      supabase
        .from("local_service_context")
        .select("*")
        .eq("service_slug", serviceSlug)
        .eq("is_active", true)
        .single(),
      supabase
        .from("geo_cities")
        .select("*")
        .eq("city_slug", citySlug)
        .eq("state_code", stateCode)
        .eq("is_active", true)
        .single(),
    ]);

    if (!service || !city) {
      await supabase.from("local_service_page_jobs").insert({
        page_key: pageKey,
        request_payload: body,
        status: "failed",
        error: "service_or_city_not_found",
        finished_at: new Date().toISOString(),
      });

      return Response.json({ ok: false, error: "service_or_city_not_found" }, {
        status: 404,
        headers: corsHeaders,
      });
    }

    const { data: facts } = await supabase
      .from("city_service_facts")
      .select("*")
      .eq("city_id", city.id)
      .eq("service_slug", serviceSlug)
      .eq("is_active", true)
      .maybeSingle();

    const siteBaseUrl = await getSiteBaseUrl(supabase, siteId);
    const routePath =
      `services/${serviceSlug}/${citySlug}-${stateCode.toLowerCase()}`;
    const canonicalUrl = `${siteBaseUrl}/${routePath}/`;
    const slug = routePath;

    const sourceHash = await sha256Hex(
      JSON.stringify({ service, city, facts: facts ?? {} }),
    );

    const { data: existing } = await supabase
      .from("local_service_pages")
      .select("id,source_hash,status")
      .eq("site_id", siteId)
      .eq("service_slug", serviceSlug)
      .eq("city_slug", citySlug)
      .eq("state_code", stateCode)
      .maybeSingle();

    const { data: peerPages } = await supabase
      .from("local_service_pages")
      .select("city_slug,state_code,text_content,html_content")
      .eq("site_id", siteId)
      .eq("service_slug", serviceSlug)
      .neq("city_slug", citySlug)
      .limit(40);

    if (
      existing && existing.source_hash === sourceHash && !forceRegenerate &&
      mode !== "publish"
    ) {
      await supabase.from("local_service_page_jobs").insert({
        page_key: pageKey,
        request_payload: body,
        status: "completed",
        result: {
          page_id: existing.id,
          status: existing.status,
          skipped: true,
        },
        finished_at: new Date().toISOString(),
      });

      return Response.json(
        {
          ok: true,
          skipped: true,
          reason: "no_source_change",
          page_id: existing.id,
          status: existing.status,
        },
        { status: 200, headers: corsHeaders },
      );
    }

    let generated: GeneratedLocalServicePage;
    let generationMeta: GenerationMeta = {
      usedRescue: false,
      similarity: 0,
      evidenceCoverage: 0,
      coverageTarget: 0,
      criticScore: 0,
      attemptCount: 0,
      stageWarnings: [],
    };

    try {
      const contentAngle = pickContentAngle(
        `${siteId}:${serviceSlug}:${citySlug}:${stateCode}`,
      ) as ContentAngle;

      const rescuePayload = buildRescuePage({
        serviceName: service.service_name || "Home Services",
        serviceSlug,
        cityName: city.city_name || citySlug,
        stateCode: city.state_code || stateCode,
        countyName: city.county_name ?? undefined,
        climateNotes: toTextArray(facts?.climate_notes),
        permittingNotes: toTextArray(facts?.permitting_notes),
        seasonalNotes: toTextArray(facts?.seasonal_timing),
        complianceDisclaimer:
          typeof service.compliance_disclaimer_short === "string"
            ? service.compliance_disclaimer_short
            : "HomeSimple is a marketplace connecting homeowners with independent providers. Availability and pricing vary by provider.",
        pricingRows: toPricingRows(service.pricing_items),
        contentAngle,
      });

      const factsObj = asObject(facts ?? {});
      const serviceObj = asObject(service);
      const cityObj = asObject(city);
      const evidencePack = buildEvidencePack({
        service: serviceObj,
        city: cityObj,
        facts: factsObj,
      });
      generationMeta.coverageTarget = evidencePack.coverage_target;

      const peerTexts = (peerPages || []).map((p) => p.text_content || "")
        .filter((x) => typeof x === "string" && x.trim().length > 0);
      const avoidHeadings = (peerPages || [])
        .flatMap((p) =>
          extractHeadings(
            typeof p.html_content === "string" ? p.html_content : "",
          )
        )
        .slice(0, 16);

      if (body.force_rescue === true) {
        generated = rescuePayload;
        generationMeta.usedRescue = true;
        generationMeta.stageWarnings.push("forced_rescue_path");
      } else {
        const maxAttempts = 3;
        let attempt = Math.max(1, body.prompt_iteration ?? 1);
        let lastError: Error | null = null;
        let brief: Record<string, unknown> = {
          opening_answer: `Homeowners can get ${service.service_name || "home service"} help in ${city.city_name}, ${city.state_code} through HomeSimple marketplace providers.`,
          section_plan: [],
          faq_plan: [],
        };
        let previousCandidate: GeneratedLocalServicePage | null = null;
        let previousCritique: CritiqueResult = {
          pass: false,
          score: 0,
          failures: [],
          evidence_gaps: [],
          rewrite_instructions: "",
          must_fix_sections: [],
        };
        let result: GeneratedLocalServicePage | null = null;

        try {
          brief = await runJsonCompletion({
            prompt: buildBriefPrompt({
              service,
              geo: city,
              cityData: facts ?? {},
              trustData: factsObj.trust_data ?? {},
              evidencePack,
              contentAngle,
              avoidHeadings,
            }),
            temperature: 0.2,
            maxTokens: 2200,
            timeoutMs: 75000,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "brief_generation_failed";
          generationMeta.stageWarnings.push(`brief_stage_failed:${message}`);
        }

        while (!result && attempt <= maxAttempts) {
          generationMeta.attemptCount = attempt;
          try {
            const prompt = previousCandidate
              ? buildRevisionPrompt({
                service,
                geo: city,
                cityData: facts ?? {},
                trustData: factsObj.trust_data ?? {},
                evidencePack,
                brief,
                previous: previousCandidate,
                critique: previousCritique,
                iteration: attempt,
              })
              : buildDraftPrompt({
                service,
                geo: city,
                cityData: facts ?? {},
                trustData: factsObj.trust_data ?? {},
                evidencePack,
                brief,
                iteration: attempt,
                batchMode: body.batch_mode === true,
                similarityHint: generationMeta.similarity > 0
                  ? `prior_similarity=${generationMeta.similarity.toFixed(2)} requires more divergence`
                  : undefined,
              });

            const candidate = await generateWithLLM(prompt, {
              temperature: previousCandidate ? 0.45 : 0.4,
              maxTokens: 4200,
              timeoutMs: 95000,
            });

            const wordCount = getWordCount(candidate.text_content || "");
            const headingCount = getHeadingCount(candidate);
            const similarity = maxSimilarity(candidate.text_content || "", peerTexts);
            const evidenceCoverage = countEvidenceCoverage(
              candidate.text_content || "",
              evidencePack.items,
            );
            generationMeta.similarity = similarity;
            generationMeta.evidenceCoverage = evidenceCoverage;

            const localFailures: string[] = [];
            if (wordCount < 900) localFailures.push("word_count_below_minimum");
            if (headingCount < 8) localFailures.push("insufficient_section_depth");
            if (similarity > 0.52) localFailures.push("content_similarity_too_high");
            if (evidenceCoverage < evidencePack.coverage_target) {
              localFailures.push("insufficient_local_evidence_coverage");
            }

            let critique: CritiqueResult = {
              pass: false,
              score: 0,
              failures: [],
              evidence_gaps: [],
              rewrite_instructions: "",
              must_fix_sections: [],
            };

            try {
              const critiqueRaw = await runJsonCompletion({
                prompt: buildCritiquePrompt({
                  service,
                  geo: city,
                  evidencePack,
                  brief,
                  candidate,
                  localChecks: {
                    similarityScore: similarity,
                    evidenceCoverageCount: evidenceCoverage,
                    evidenceCoverageTarget: evidencePack.coverage_target,
                    headingCount,
                    wordCount,
                  },
                }),
                temperature: 0.1,
                maxTokens: 1800,
                timeoutMs: 70000,
              });
              critique = parseCritique(critiqueRaw);
            } catch (error) {
              const message = error instanceof Error ? error.message : "critique_stage_failed";
              generationMeta.stageWarnings.push(`critique_stage_failed:${message}`);
            }

            generationMeta.criticScore = critique.score;
            const allFailures = [...localFailures, ...critique.failures];
            if (critique.pass && critique.score >= 70 && allFailures.length === 0) {
              result = candidate;
              break;
            }

            previousCandidate = candidate;
            previousCritique = {
              ...critique,
              failures: allFailures,
            };
            attempt += 1;
          } catch (error) {
            lastError = error instanceof Error
              ? error
              : new Error("generation_failed");
            attempt += 1;
          }
        }

        if (!result) {
          if (mode === "publish") {
            throw lastError ?? new Error("v3_generation_failed_no_publishable_output");
          }
          generated = rescuePayload;
          generationMeta.usedRescue = true;
          generationMeta.stageWarnings.push("rescue_fallback_after_v3_failures");
        } else {
          generated = result;
        }
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "generation_failed";
      const status = message === "invalid_generation_schema" ||
          message === "empty_text_content"
        ? 422
        : 500;

      await supabase.from("local_service_page_jobs").insert({
        page_key: pageKey,
        request_payload: body,
        status: "failed",
        error: message,
        finished_at: new Date().toISOString(),
      });

      if (existing?.id) {
        await supabase
          .from("local_service_pages")
          .update({
            status: "error",
            error_message: message,
            updated_by: body.initiated_by ?? "generate-local-service-page",
          })
          .eq("id", existing.id);
      }

      return Response.json({ ok: false, error: message }, {
        status,
        headers: corsHeaders,
      });
    }

    const quality = validateQuality({
      textContent: generated.text_content || "",
      modules: generated,
      faqItems: generated.faq_items || [],
      cityName: city.city_name,
      stateCode: city.state_code,
    });

    const combinedWarnings = [
      ...quality.warnings,
      ...(generationMeta.similarity > 0.52 ? ["content_similarity_too_high"] : []),
      ...(generationMeta.evidenceCoverage < generationMeta.coverageTarget
        ? ["insufficient_local_evidence_coverage"]
        : []),
      ...(generationMeta.usedRescue ? ["rescue_fallback_used"] : []),
      ...generationMeta.stageWarnings,
    ];

    const dedupWarnings = Array.from(new Set(combinedWarnings));
    const passesAllChecks = quality.min_words_pass &&
      quality.unique_paragraphs_pass &&
      quality.city_specific_facts_pass &&
      quality.required_modules_pass &&
      quality.faq_rules_pass &&
      generationMeta.similarity <= 0.52 &&
      generationMeta.evidenceCoverage >= generationMeta.coverageTarget &&
      !generationMeta.usedRescue;

    const nextStatus = mode === "publish"
      ? (passesAllChecks ? "published" : "draft")
      : (dedupWarnings.length ? "draft" : "ready");

    const fallbackTitle =
      `${service.service_name} in ${city.city_name}, ${city.state_code} | HomeSimple`;
    const fallbackMeta =
      `Explore ${service.service_name.toLowerCase()} options in ${city.city_name}, ${city.state_code} with local guidance, pricing expectations, and FAQs.`;

    const upsertPayload = {
      site_id: siteId,
      service_slug: serviceSlug,
      city_id: city.id,
      city_slug: city.city_slug,
      city_name: city.city_name,
      state_code: city.state_code,
      state_name: city.state_name,
      county_name: city.county_name,
      canonical_url: canonicalUrl,
      slug,
      title: generated.seo?.title || fallbackTitle,
      meta_description: generated.seo?.meta_description || fallbackMeta,
      h1: generated.seo?.h1 ||
        `${service.service_name} in ${city.city_name}, ${city.state_code}`,
      og_title: generated.seo?.og_title ?? null,
      og_description: generated.seo?.og_description ?? null,
      og_image_path: generated.seo?.og_image_path ?? null,
      modules: generated,
      faq_items: generated.faq_items || [],
      pricing_rows: generated.pricing_rows || [],
      schema_graph: generated.schema_graph || {},
      html_content: generated.html_content || "",
      text_content: generated.text_content || "",
      word_count: quality.word_count,
      quality_report: {
        ...quality,
        warnings: dedupWarnings,
        v3: {
          similarity: generationMeta.similarity,
          evidence_coverage_count: generationMeta.evidenceCoverage,
          evidence_coverage_target: generationMeta.coverageTarget,
          critic_score: generationMeta.criticScore,
          attempt_count: generationMeta.attemptCount,
          used_rescue: generationMeta.usedRescue,
          stage_warnings: generationMeta.stageWarnings,
        },
      },
      status: nextStatus,
      error_message: null,
      source_hash: sourceHash,
      published_at: nextStatus === "published"
        ? new Date().toISOString()
        : null,
      created_by: body.initiated_by ?? "generate-local-service-page",
      updated_by: body.initiated_by ?? "generate-local-service-page",
    };

    const { data: page, error: upsertError } = await supabase
      .from("local_service_pages")
      .upsert(upsertPayload, {
        onConflict: "site_id,service_slug,city_slug,state_code",
      })
      .select("id,status,canonical_url,quality_report")
      .single();

    if (upsertError) {
      await supabase.from("local_service_page_jobs").insert({
        page_key: pageKey,
        request_payload: body,
        status: "failed",
        error: upsertError.message,
        finished_at: new Date().toISOString(),
      });

      return Response.json({ ok: false, error: upsertError.message }, {
        status: 500,
        headers: corsHeaders,
      });
    }

    await supabase.from("local_service_page_jobs").insert({
      page_key: pageKey,
      request_payload: body,
      status: "completed",
      result: { page_id: page.id, status: page.status },
      finished_at: new Date().toISOString(),
    });

    return Response.json(
      {
        ok: true,
        page_id: page.id,
        status: page.status,
        canonical_url: page.canonical_url,
        quality: page.quality_report,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    await supabase.from("local_service_page_jobs").insert({
      page_key: pageKey,
      request_payload: requestPayload ?? {},
      status: "failed",
      error: message,
      finished_at: new Date().toISOString(),
    });

    return Response.json({ ok: false, error: message }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
