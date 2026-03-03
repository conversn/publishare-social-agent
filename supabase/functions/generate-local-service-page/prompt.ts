function toJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

export function buildBriefPrompt(context: {
  service: unknown;
  geo: unknown;
  cityData: unknown;
  trustData: unknown;
  evidencePack: unknown;
  contentAngle:
    | "emergency-first"
    | "cost-transparency"
    | "climate-risk"
    | "homeowner-mistakes"
    | "repair-vs-replace";
  avoidHeadings?: string[];
}) {
  const avoidHeadingDirective = context.avoidHeadings?.length
    ? `\nAvoid these heading phrases from nearby pages:\n- ${
      context.avoidHeadings.slice(0, 12).join("\n- ")
    }\n`
    : "";

  return `
You are a senior local SEO/AEO content strategist.
Create a PAGE BRIEF only (not final article) for a local service landing page.

Inputs:
- service: ${toJson(context.service)}
- geo: ${toJson(context.geo)}
- city_data: ${toJson(context.cityData)}
- trust_data: ${toJson(context.trustData)}
- evidence_pack: ${toJson(context.evidencePack)}
- content_angle: ${context.contentAngle}

Return valid JSON only with keys:
opening_answer,
positioning,
section_plan,
faq_plan,
schema_plan,
voice_constraints,
anti_repetition_rules,
evidence_usage_plan

Requirements:
- section_plan must contain 8-10 sections, each with:
  id, heading, user_intent, thesis, required_evidence_ids (array), rhetorical_mode, avoid_overlap_with (array of section ids)
- Each section must have a distinct intent and rhetorical mode.
- faq_plan must contain 8-12 questions with intent tags.
- anti_repetition_rules must include explicit forbidden repeats.
- evidence_usage_plan must map each evidence id to at least one target section.
- No generic headings.
${avoidHeadingDirective}
`;
}

export function buildDraftPrompt(context: {
  service: unknown;
  geo: unknown;
  cityData: unknown;
  trustData: unknown;
  evidencePack: unknown;
  brief: unknown;
  iteration: number;
  batchMode?: boolean;
  similarityHint?: string;
}) {
  const batchDirective = context.batchMode
    ? "\nBatch mode: keep output schema strict and section bodies concise but unique."
    : "";
  const similarityDirective = context.similarityHint
    ? `\nUniqueness constraint: ${context.similarityHint}\n`
    : "";
  const iterativeDirective = context.iteration > 1
    ? `\nIteration ${context.iteration}: materially change section sequence and thesis framing from prior attempt.`
    : "";

  return `
You are writing a LOCAL SERVICE LANDING PAGE using an approved content brief.

Inputs:
- service: ${toJson(context.service)}
- geo: ${toJson(context.geo)}
- city_data: ${toJson(context.cityData)}
- trust_data: ${toJson(context.trustData)}
- evidence_pack: ${toJson(context.evidencePack)}
- brief: ${toJson(context.brief)}

Return JSON only with keys:
hero, localized_overview, climate_callout, permit_callout, seasonality_callout,
service_grid, pricing_intro, pricing_rows, how_it_works, local_benefits,
faq_items, nearby_links, closing_cta, legal, seo, schema_graph, html_content, text_content

Non-negotiable quality rules:
1) First 80 words directly answer where to get [service] help in [city].
2) text_content >= 1200 words.
3) html_content has 8-12 substantial H2/H3 sections aligned to brief.section_plan.
4) Each section must use a different rhetorical mode and unique opening sentence.
5) FAQ 8-12 items, at least 4 questions include city name.
6) Ground claims in evidence_pack; no fabricated specifics.
7) Include marketplace disclosure in legal.

Anti-slop rules:
- Never repeat a 2+ sentence block.
- Do not reuse one paragraph skeleton under different headings.
- Avoid generic headers and CTA fluff.
- Use concrete homeowner decision guidance and local operating context.
${iterativeDirective}
${batchDirective}
${similarityDirective}
`;
}

export function buildCritiquePrompt(context: {
  service: unknown;
  geo: unknown;
  evidencePack: unknown;
  brief: unknown;
  candidate: unknown;
  localChecks: {
    similarityScore: number;
    evidenceCoverageCount: number;
    evidenceCoverageTarget: number;
    headingCount: number;
    wordCount: number;
  };
}) {
  return `
You are a strict content QA editor for local SEO/AEO pages.
Evaluate candidate content for quality, uniqueness, evidence grounding, and intent coverage.

Inputs:
- service: ${toJson(context.service)}
- geo: ${toJson(context.geo)}
- evidence_pack: ${toJson(context.evidencePack)}
- brief: ${toJson(context.brief)}
- candidate: ${toJson(context.candidate)}
- local_checks: ${toJson(context.localChecks)}

Return JSON only with keys:
pass,
score,
failures,
evidence_gaps,
rewrite_instructions,
must_fix_sections

Requirements:
- pass is boolean.
- score is 0-100.
- failures is array of concrete failed criteria.
- evidence_gaps is array of missing evidence ids or claims needing grounding.
- rewrite_instructions is a concise imperative list.
- must_fix_sections is array of section headings/ids.
- Fail if there is repeated section body language, generic fluff, or weak local specificity.
`;
}

export function buildRevisionPrompt(context: {
  service: unknown;
  geo: unknown;
  cityData: unknown;
  trustData: unknown;
  evidencePack: unknown;
  brief: unknown;
  previous: unknown;
  critique: unknown;
  iteration: number;
}) {
  return `
Rewrite the local page to resolve critique failures while preserving valid schema.

Inputs:
- service: ${toJson(context.service)}
- geo: ${toJson(context.geo)}
- city_data: ${toJson(context.cityData)}
- trust_data: ${toJson(context.trustData)}
- evidence_pack: ${toJson(context.evidencePack)}
- brief: ${toJson(context.brief)}
- previous_output: ${toJson(context.previous)}
- critique: ${toJson(context.critique)}
- iteration: ${context.iteration}

Return JSON only with keys:
hero, localized_overview, climate_callout, permit_callout, seasonality_callout,
service_grid, pricing_intro, pricing_rows, how_it_works, local_benefits,
faq_items, nearby_links, closing_cta, legal, seo, schema_graph, html_content, text_content

Rewrite directives:
- Prioritize fixes listed in critique.must_fix_sections and critique.rewrite_instructions.
- Replace repeated language with section-specific logic.
- Improve evidence grounding and local specificity.
- Keep all required keys populated and valid.
`;
}
