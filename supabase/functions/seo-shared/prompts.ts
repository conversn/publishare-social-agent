// =====================================================
// LLM Prompts for SEO Classification
// =====================================================

import type { LLMPromptPayload } from './types.ts';
import { ROOT_CAUSE_TYPES, LLM_RESPONSE_SCHEMA } from './schemas.ts';

export const SYSTEM_PROMPT = `You are an SEO technical auditor specializing in Google Search Console indexability issues.

Your role is to analyze diagnostic signals and classify root causes with precision.

CRITICAL RULES:
1. Only use the provided signals - do not infer or guess
2. Output must STRICTLY match the required JSON schema
3. Choose ONE root cause type from the allowed list
4. If uncertain, choose UNKNOWN_NEEDS_HUMAN_REVIEW and explain why
5. Confidence must be realistic (0.0 to 1.0)
6. Recommended actions must be specific and actionable
7. Autofix plans must be conservative - only mark safe_to_autofix=true for low-risk changes

ALLOWED ROOT CAUSE TYPES:
${ROOT_CAUSE_TYPES.map((t) => `- ${t}`).join('\n')}

OUTPUT SCHEMA:
${JSON.stringify(LLM_RESPONSE_SCHEMA, null, 2)}

Remember: Your classification directly impacts automated fixes. Be conservative.`;

export function buildUserPrompt(payload: LLMPromptPayload): string {
  const {
    issue_type,
    url,
    signals,
    canonical_target,
    robots,
    sitemap,
    internal,
    gsc_hint,
  } = payload;

  return `Analyze this indexability issue and provide a structured classification.

## ISSUE CONTEXT
Issue Type: ${issue_type}
URL: ${url}

## DIAGNOSTIC SIGNALS

### Page Fetch & Headers
- Status Code: ${signals.status_code || 'N/A'}
- Canonical Tag: ${signals.canonical || 'NONE'}
- Meta Robots: ${signals.meta_robots || 'NONE'}
- X-Robots-Tag: ${signals.x_robots_tag || 'NONE'}
- Has noindex: ${signals.has_noindex ? 'YES ⚠️' : 'NO'}
- Has nofollow: ${signals.has_nofollow ? 'YES' : 'NO'}

### Content Signals
- Title: ${signals.title || 'NONE'}
- H1: ${signals.h1 || 'NONE'}
- Word Count: ${signals.word_count || 'UNKNOWN'}
- Hreflang Count: ${signals.hreflang_count || 0}

### Canonical Target Analysis
${
    canonical_target
      ? `- Canonical URL: ${canonical_target.url}
- Target Status: ${canonical_target.status_code}
- Self-Canonical OK: ${canonical_target.self_canonical_ok ? 'YES' : 'NO ⚠️'}
- Target Indexable: ${canonical_target.indexable_bool ? 'YES' : 'NO ⚠️'}
- Target Meta Robots: ${canonical_target.meta_robots || 'NONE'}`
      : '- NO CANONICAL TARGET (page has no canonical tag)'
  }

### Robots.txt Check
- Blocked: ${robots.blocked_bool ? 'YES ⚠️' : 'NO'}
- Matched Rule: ${robots.matched_rule || 'NONE'}
- Robots.txt URL: ${robots.robots_txt_url}

### Sitemap Check
- In Sitemap: ${sitemap.in_sitemap_bool ? 'YES' : 'NO'}
- Sitemap URL: ${sitemap.sitemap_url || 'UNKNOWN'}
- Canonical in Sitemap: ${sitemap.canonical_in_sitemap ? 'YES' : 'NO'}

### Internal Signals
- Internal Links: ${internal.inlinks_count}
- Orphan Page: ${internal.orphan_bool ? 'YES ⚠️' : 'NO'}
- Depth Estimate: ${internal.depth_estimate || 'UNKNOWN'}
${internal.top_linking_pages ? `- Top Linking Pages: ${internal.top_linking_pages.slice(0, 3).join(', ')}` : ''}

### Google Search Console Hint
${gsc_hint ? `- Indexed: ${gsc_hint.indexed ? 'YES' : 'NO ⚠️'}
- Google Selected Canonical: ${gsc_hint.google_selected_canonical || 'UNKNOWN'}
- GSC Reason: "${gsc_hint.reason}"` : '- NO GSC DATA AVAILABLE'}

## YOUR TASK

Based on ONLY the signals above, provide:

1. **Root Cause Classification**: Choose ONE from the allowed list
2. **Confidence Score**: 0.0 to 1.0 (be realistic)
3. **Recommended Actions**: Specific, actionable steps with priority
4. **Autofix Plan**: 
   - Set safe_to_autofix=true ONLY for low-risk changes (sitemap regen, redirect enforcement, canonical template fixes)
   - Set safe_to_autofix=false for content edits, internal link placement, or complex fixes
   - List what requires human review
5. **Notes**: Your reasoning and any important context

OUTPUT FORMAT: Valid JSON matching the schema provided in the system prompt.

Think step-by-step:
1. What is the primary issue? (noindex conflict? robots block? weak signals?)
2. Is the canonical setup correct?
3. Are there conflicting signals?
4. What's the most likely root cause?
5. What can be safely auto-fixed vs. needs review?

Respond with ONLY valid JSON - no markdown, no explanation outside the JSON structure.`;
}

// Helper to extract JSON from LLM response (in case model wraps in markdown)
export function extractJSON(response: string): unknown {
  // Try to parse directly
  try {
    return JSON.parse(response);
  } catch {
    // Look for JSON in markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Look for JSON object in the response
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    throw new Error('No valid JSON found in LLM response');
  }
}



