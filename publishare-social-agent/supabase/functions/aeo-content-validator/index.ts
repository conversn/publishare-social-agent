/**
 * Supabase Edge Function: AEO Content Validator
 * 
 * Validates content meets Answer Engine Optimization (AEO) requirements.
 * 
 * Request Body:
 * {
 *   content?: string (optional) - Content to validate
 *   article_id?: string (optional) - Article ID to validate (fetches from DB)
 *   validate_all?: boolean (optional, default: true) - Validate all checks
 * }
 * 
 * Response:
 * {
 *   valid: boolean
 *   score: number (0-100)
 *   checks: {
 *     answer_first: { valid, summary, issues }
 *     structure: { valid, h1, h2_count, h3_count }
 *     data_points: { valid, count, points }
 *     citations: { valid, count, citations }
 *     schema: { valid, has_schema, schema_type }
 *   }
 *   recommendations: string[]
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AEOValidatorRequest {
  content?: string;
  article_id?: string;
  validate_all?: boolean;
  // Question-Answer Alignment
  question?: string; // Target question the content should answer
  validate_question_alignment?: boolean; // Enable question-answer alignment check
  // Local page quality gates
  validate_doorway_risk?: boolean;
  validate_uniqueness?: boolean;
  validate_claims?: boolean;
  validate_local_schema?: boolean;
  validate_call_routing?: boolean;
  // Parameters for quality gates
  vertical?: string;
  domain_id?: string;
  phone_number?: string;
  call_routing_configured?: boolean;
}

interface ValidationCheck {
  valid: boolean;
  summary?: string;
  issues?: string[];
  h1?: boolean;
  h2_count?: number;
  h3_count?: number;
  count?: number;
  points?: string[];
  citations?: string[];
  has_schema?: boolean;
  schema_type?: string;
}

interface AEOValidatorResponse {
  valid: boolean;
  score: number;
  checks: {
    answer_first: ValidationCheck;
    structure: ValidationCheck;
    data_points: ValidationCheck;
    citations: ValidationCheck;
    schema: ValidationCheck;
    // Local page quality gates
    doorway_risk?: {
      valid: boolean;
      risk_level: 'low' | 'medium' | 'high';
      similarity_score: number;
      similar_pages_count: number;
      issues?: string[];
    };
    uniqueness?: {
      valid: boolean;
      uniqueness_score: number;
      issues?: string[];
    };
    claims?: {
      valid: boolean;
      unverified_claims: string[];
      missing_proof: string[];
    };
    call_routing?: {
      valid: boolean;
      phone_provisioned: boolean;
      routing_configured: boolean;
      fallback_set: boolean;
      issues?: string[];
    };
    question_alignment?: {
      valid: boolean;
      alignment_score: number; // 0-100
      direct_answer_present: boolean;
      answer_relevance: number; // 0-1
      improvements?: string[];
    };
  };
  recommendations: string[];
}

function validateAnswerFirst(content: string): ValidationCheck {
  const first100Words = content.split(/\s+/).slice(0, 100).join(' ');
  const issues: string[] = [];
  
  const hasDirectAnswer = 
    /(is|are|means|refers to|defined as|consists of)/i.test(first100Words) ||
    /\d+/.test(first100Words) ||
    /(yes|no|true|false|correct|incorrect)/i.test(first100Words);
  
  const hasFluff = /^(in today|in this|welcome|introduction|overview)/i.test(first100Words);
  
  if (!hasDirectAnswer) {
    issues.push('Direct answer not found in first 100 words');
  }
  
  if (hasFluff) {
    issues.push('Content starts with fluff instead of direct answer');
  }
  
  const cleanSummary = first100Words
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  
  return {
    valid: hasDirectAnswer && !hasFluff,
    summary: cleanSummary,
    issues
  };
}

function validateStructure(content: string): ValidationCheck {
  const lines = content.split('\n');
  let h1 = false;
  let h2Count = 0;
  let h3Count = 0;
  
  for (const line of lines) {
    if (line.match(/^#\s+/)) h1 = true;
    else if (line.match(/^##\s+/)) h2Count++;
    else if (line.match(/^###\s+/)) h3Count++;
  }
  
  const issues: string[] = [];
  if (!h1) issues.push('Missing H1 heading');
  if (h2Count < 2) issues.push('Need at least 2 H2 headings for proper structure');
  if (h3Count < 1) issues.push('Consider adding H3 headings for better organization');
  
  return {
    valid: h1 && h2Count >= 2,
    h1,
    h2_count: h2Count,
    h3_count: h3Count,
    issues: issues.length > 0 ? issues : undefined
  };
}

function validateDataPoints(content: string): ValidationCheck {
  const dataPoints: string[] = [];
  const patterns = [
    /\$[\d,]+/g,
    /[\d,]+%/g,
    /[\d,]+ (million|billion|thousand|trillion)/gi,
    /\d+\.\d+%/g
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) dataPoints.push(...matches);
  }
  
  const uniquePoints = [...new Set(dataPoints)];
  const issues: string[] = [];
  
  if (uniquePoints.length === 0) {
    issues.push('No data points or statistics found. Consider adding specific numbers, percentages, or statistics.');
  }
  
  return {
    valid: uniquePoints.length > 0,
    count: uniquePoints.length,
    points: uniquePoints,
    issues: issues.length > 0 ? issues : undefined
  };
}

function validateCitations(content: string): ValidationCheck {
  const citations: string[] = [];
  
  // Extract markdown links
  const linkPattern = /\[([^\]]+)\]\(([^\)]+)\)/g;
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    citations.push(match[2]);
  }
  
  // Extract URLs
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urlMatches = content.match(urlPattern);
  if (urlMatches) {
    citations.push(...urlMatches);
  }
  
  const uniqueCitations = [...new Set(citations)];
  const issues: string[] = [];
  
  if (uniqueCitations.length === 0) {
    issues.push('No citations or sources found. Consider adding links to authoritative sources.');
  }
  
  return {
    valid: uniqueCitations.length > 0,
    count: uniqueCitations.length,
    citations: uniqueCitations,
    issues: issues.length > 0 ? issues : undefined
  };
}

function validateSchema(schemaMarkup: any): ValidationCheck {
  const issues: string[] = [];
  
  if (!schemaMarkup) {
    issues.push('No schema markup found. Generate schema for better AEO performance.');
    return {
      valid: false,
      has_schema: false,
      issues
    };
  }
  
  // Basic schema validation
  if (!schemaMarkup['@context'] || schemaMarkup['@context'] !== 'https://schema.org') {
    issues.push('Schema missing @context or incorrect context');
  }
  
  if (!schemaMarkup['@type']) {
    issues.push('Schema missing @type');
  }
  
  return {
    valid: issues.length === 0,
    has_schema: true,
    schema_type: schemaMarkup['@type'] || 'Unknown',
    issues: issues.length > 0 ? issues : undefined
  };
}

function calculateScore(checks: AEOValidatorResponse['checks']): number {
  let score = 0;
  
  // Answer first: 30 points
  if (checks.answer_first.valid) score += 30;
  
  // Structure: 25 points
  if (checks.structure.h1) score += 5;
  if (checks.structure.h2_count && checks.structure.h2_count >= 2) score += 10;
  if (checks.structure.h3_count && checks.structure.h3_count >= 1) score += 5;
  if (checks.structure.valid) score += 5;
  
  // Data points: 25 points
  if (checks.data_points.count && checks.data_points.count > 0) {
    score += Math.min(25, checks.data_points.count * 5);
  }
  
  // Citations: 10 points
  if (checks.citations.count && checks.citations.count > 0) {
    score += Math.min(10, checks.citations.count * 2);
  }
  
  // Schema: 20 points
  if (checks.schema.valid && checks.schema.has_schema) score += 20;
  
  // Quality gates (can reduce score but don't add)
  // Doorway risk: -20 points if high risk
  if (checks.doorway_risk) {
    if (checks.doorway_risk.risk_level === 'high') {
      score -= 20;
    } else if (checks.doorway_risk.risk_level === 'medium') {
      score -= 10;
    }
  }
  
  // Uniqueness: -15 points if low uniqueness
  if (checks.uniqueness && checks.uniqueness.uniqueness_score < 0.3) {
    score -= 15;
  }
  
  // Claims: -10 points if unverified claims
  if (checks.claims && !checks.claims.valid) {
    score -= 10;
  }
  
  // Call routing: -15 points if not configured (for local pages)
  if (checks.call_routing && !checks.call_routing.valid) {
    score -= 15;
  }
  
  // Question-Answer Alignment: +15 points if well-aligned
  if (checks.question_alignment) {
    if (checks.question_alignment.alignment_score >= 80) {
      score += 15;
    } else if (checks.question_alignment.alignment_score >= 60) {
      score += 10;
    } else if (checks.question_alignment.alignment_score < 40) {
      score -= 10; // Penalty for poor alignment
    }
  }
  
  return Math.max(0, Math.min(100, score)); // Clamp between 0 and 100
}

/**
 * Validate question-answer alignment
 */
async function validateQuestionAnswerAlignment(
  question: string,
  content: string,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<AEOValidatorResponse['checks']['question_alignment']> {
  if (!question) {
    return {
      valid: false,
      alignment_score: 0,
      direct_answer_present: false,
      answer_relevance: 0,
      improvements: ['No question provided for alignment validation']
    };
  }

  // Extract first 100 words as the answer
  const first100Words = content.split(/\s+/).slice(0, 100).join(' ');
  
  // Check for direct answer indicators
  const directAnswerIndicators = [
    /^(yes|no|true|false|correct|incorrect)/i,
    /(is|are|means|refers to|defined as|consists of)/i,
    /\d+/, // Contains numbers
    /(answer|solution|result|conclusion)/i
  ];
  
  const hasDirectAnswer = directAnswerIndicators.some(pattern => 
    pattern.test(first100Words)
  );

  // Calculate keyword relevance (simple matching)
  const questionWords = new Set(
    question.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['what', 'how', 'why', 'when', 'where', 'who', 'which'].includes(w))
  );
  
  const answerWords = new Set(
    first100Words.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
  );
  
  let keywordMatches = 0;
  for (const word of questionWords) {
    if (answerWords.has(word)) keywordMatches++;
  }
  
  const answerRelevance = questionWords.size > 0 
    ? keywordMatches / questionWords.size 
    : 0;

  // Call answer completeness scorer for deeper analysis
  let alignmentScore = 0;
  let improvements: string[] = [];
  
  if (supabaseUrl && supabaseKey) {
    try {
      const completenessResponse = await fetch(`${supabaseUrl}/functions/v1/aeo-answer-completeness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          question: question,
          content: content
        })
      });

      if (completenessResponse.ok) {
        const completenessData = await completenessResponse.json();
        alignmentScore = completenessData.question_coverage || 0;
        if (completenessData.recommendations) {
          improvements = completenessData.recommendations;
        }
      }
    } catch (error) {
      console.error('Error calling answer completeness scorer:', error);
    }
  }

  // Fallback: calculate basic alignment score
  if (alignmentScore === 0) {
    alignmentScore = Math.round(
      (hasDirectAnswer ? 40 : 0) +
      (answerRelevance * 40) +
      (first100Words.length > 50 ? 20 : 0)
    );
  }

  const valid = alignmentScore >= 60 && hasDirectAnswer && answerRelevance >= 0.3;

  if (!valid && improvements.length === 0) {
    if (!hasDirectAnswer) {
      improvements.push('Start with a direct answer to the question in the first 100 words');
    }
    if (answerRelevance < 0.3) {
      improvements.push('Include more keywords from the question in your answer');
    }
    if (alignmentScore < 60) {
      improvements.push('Provide a more complete answer that fully addresses the question');
    }
  }

  return {
    valid,
    alignment_score: alignmentScore,
    direct_answer_present: hasDirectAnswer,
    answer_relevance: answerRelevance,
    improvements: improvements.length > 0 ? improvements : undefined
  };
}

/**
 * Validate doorway risk by calling validate-doorway-risk function
 * Returns both doorway risk check and similar pages for uniqueness validation
 */
async function validateDoorwayRisk(
  content: string,
  pageId: string,
  vertical: string,
  domainId?: string,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<{
  doorwayRisk: AEOValidatorResponse['checks']['doorway_risk'];
  similarPages: any[];
}> {
  if (!supabaseUrl || !supabaseKey) {
    return {
      doorwayRisk: {
        valid: false,
        risk_level: 'high',
        similarity_score: 0,
        similar_pages_count: 0,
        issues: ['Unable to validate doorway risk: missing Supabase configuration']
      },
      similarPages: []
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/validate-doorway-risk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        page_content: content,
        page_id: pageId,
        domain_id: domainId,
        vertical: vertical,
        threshold: 0.85
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        doorwayRisk: {
          valid: false,
          risk_level: 'high',
          similarity_score: 0,
          similar_pages_count: 0,
          issues: [`Doorway risk validation failed: ${errorText.substring(0, 200)}`]
        },
        similarPages: []
      };
    }

    const data = await response.json();
    
    return {
      doorwayRisk: {
        valid: data.can_publish,
        risk_level: data.risk_level,
        similarity_score: data.similarity_score,
        similar_pages_count: data.similar_pages?.length || 0,
        issues: data.risk_level === 'high' ? ['High doorway risk detected'] : undefined
      },
      similarPages: data.similar_pages || []
    };
  } catch (error) {
    console.error('Error validating doorway risk:', error);
    return {
      doorwayRisk: {
        valid: false,
        risk_level: 'high',
        similarity_score: 0,
        similar_pages_count: 0,
        issues: [`Error during doorway risk validation: ${error instanceof Error ? error.message : 'Unknown error'}`]
      },
      similarPages: []
    };
  }
}

/**
 * Validate content uniqueness
 */
function validateUniqueness(
  content: string,
  similarPages: any[]
): AEOValidatorResponse['checks']['uniqueness'] {
  // Calculate uniqueness score (inverse of similarity)
  // If no similar pages, uniqueness is high
  if (similarPages.length === 0) {
    return {
      valid: true,
      uniqueness_score: 1.0,
    };
  }

  // Use highest similarity to calculate uniqueness
  const highestSimilarity = similarPages[0]?.similarity || 0;
  const uniquenessScore = 1.0 - highestSimilarity;

  const issues: string[] = [];
  if (uniquenessScore < 0.3) {
    issues.push('Content is too similar to existing pages (uniqueness < 30%)');
    issues.push('Add more unique local content, city-specific details, and original insights');
  } else if (uniquenessScore < 0.5) {
    issues.push('Content has moderate uniqueness (30-50%)');
    issues.push('Consider adding more unique sections to differentiate this page');
  }

  return {
    valid: uniquenessScore >= 0.3, // At least 30% unique
    uniqueness_score: Math.round(uniquenessScore * 100) / 100,
    issues: issues.length > 0 ? issues : undefined
  };
}

/**
 * Validate operational claims in content
 */
function validateClaims(
  content: string,
  phoneNumber?: string,
  callRoutingConfigured?: boolean
): AEOValidatorResponse['checks']['claims'] {
  const unverifiedClaims: string[] = [];
  const missingProof: string[] = [];

  // Check for "24/7" claims
  if (/\b24\s*\/\s*7\b|\b24\/7\b|\btwenty-four\s*seven\b/i.test(content)) {
    // For now, we can't verify 24/7 operation automatically
    // In production, would check against CallReady system
    unverifiedClaims.push('24/7 availability claim');
    if (!callRoutingConfigured) {
      missingProof.push('24/7 claim requires verified call routing configuration');
    }
  }

  // Check for response time claims (e.g., "30 minutes", "1 hour")
  const responseTimePattern = /\b(\d+)\s*(minute|hour|hr)\s*response/i;
  const responseTimeMatch = content.match(responseTimePattern);
  if (responseTimeMatch) {
    unverifiedClaims.push(`${responseTimeMatch[0]} response time claim`);
    missingProof.push('Response time claims require verified call-to-dispatch data');
  }

  // Check for licensing/insured claims
  if (/\b(licensed|insured|bonded|certified)\b/i.test(content)) {
    unverifiedClaims.push('Licensing/insurance claim');
    missingProof.push('Licensing claims require verification against partner network data');
  }

  // Check for "guaranteed" claims (often problematic)
  if (/\bguaranteed\b/i.test(content)) {
    unverifiedClaims.push('Guarantee claim');
    missingProof.push('Guarantee claims may violate advertising guidelines');
  }

  return {
    valid: unverifiedClaims.length === 0,
    unverified_claims: unverifiedClaims,
    missing_proof: missingProof
  };
}

/**
 * Validate call routing configuration
 */
async function validateCallRouting(
  phoneNumber: string | undefined,
  callRoutingConfigured: boolean | undefined,
  supabase: any
): Promise<AEOValidatorResponse['checks']['call_routing']> {
  const issues: string[] = [];

  // Check if phone number is provided
  const phoneProvisioned = !!phoneNumber;
  if (!phoneProvisioned) {
    issues.push('Phone number not provided');
  } else {
    // Validate phone number format (basic check)
    const phonePattern = /^[\d\s\(\)\-\+\.]+$/;
    if (!phonePattern.test(phoneNumber)) {
      issues.push('Phone number format appears invalid');
    }
  }

  // Check if call routing is configured
  const routingConfigured = callRoutingConfigured === true;
  if (!routingConfigured) {
    issues.push('Call routing not configured in CallReady system');
  }

  // Note: In production, would check CallReady API to verify:
  // - Phone number exists in CallReady
  // - Routing rules are configured
  // - Fallback path is set
  // For now, we rely on the call_routing_configured flag

  const fallbackSet = routingConfigured; // Assume fallback is set if routing is configured

  return {
    valid: phoneProvisioned && routingConfigured,
    phone_provisioned: phoneProvisioned,
    routing_configured: routingConfigured,
    fallback_set: fallbackSet,
    issues: issues.length > 0 ? issues : undefined
  };
}

function generateRecommendations(checks: AEOValidatorResponse['checks']): string[] {
  const recommendations: string[] = [];
  
  if (!checks.answer_first.valid) {
    recommendations.push('Move the direct answer to the first 100 words of the content');
    recommendations.push('Remove introductory fluff and start with the answer immediately');
  }
  
  if (!checks.structure.valid) {
    if (!checks.structure.h1) {
      recommendations.push('Add an H1 heading at the beginning of the content');
    }
    if (checks.structure.h2_count && checks.structure.h2_count < 2) {
      recommendations.push('Add at least 2 H2 headings to structure the content');
    }
  }
  
  if (!checks.data_points.valid) {
    recommendations.push('Add specific data points, statistics, or numbers to support your content');
    recommendations.push('Include percentages, dollar amounts, or other quantifiable metrics');
  }
  
  if (!checks.citations.valid) {
    recommendations.push('Add citations and links to authoritative sources');
    recommendations.push('Link to relevant research, studies, or expert sources');
  }
  
  if (!checks.schema.valid) {
    recommendations.push('Generate schema markup for this article');
    recommendations.push('Use the schema-generator function to create JSON-LD schema');
  }

  // Local page quality gate recommendations
  if (checks.doorway_risk && !checks.doorway_risk.valid) {
    recommendations.push(`Doorway risk: ${checks.doorway_risk.risk_level} (${(checks.doorway_risk.similarity_score * 100).toFixed(1)}% similarity)`);
    recommendations.push('Rewrite content to be more unique. Add city-specific details and local examples.');
  }

  if (checks.uniqueness && !checks.uniqueness.valid) {
    recommendations.push(`Uniqueness score too low: ${(checks.uniqueness.uniqueness_score * 100).toFixed(1)}%`);
    recommendations.push('Add more unique local content to differentiate this page from similar pages');
  }

  if (checks.claims && !checks.claims.valid) {
    recommendations.push(`Found ${checks.claims.unverified_claims.length} unverified claim(s)`);
    checks.claims.unverified_claims.forEach(claim => {
      recommendations.push(`- Verify or remove: "${claim}"`);
    });
  }

  if (checks.call_routing && !checks.call_routing.valid) {
    if (!checks.call_routing.phone_provisioned) {
      recommendations.push('Phone number required for local pages');
    }
    if (!checks.call_routing.routing_configured) {
      recommendations.push('Configure call routing in CallReady system before publishing');
    }
  }

  if (checks.question_alignment && !checks.question_alignment.valid) {
    recommendations.push(`Question-Answer Alignment: ${checks.question_alignment.alignment_score}/100`);
    if (checks.question_alignment.improvements) {
      recommendations.push(...checks.question_alignment.improvements);
    }
  }
  
  return recommendations;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                       'https://vpysqshhafthuxvokwqj.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                       Deno.env.get('SUPABASE_ANON_KEY') ||
                       req.headers.get('apikey') || '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: AEOValidatorRequest = await req.json();
    
    let content = body.content || '';
    let schemaMarkup = null;
    
    // Fetch article from database if article_id provided
    let article: any = null;
    if (body.article_id && !content) {
      const { data: articleData, error } = await supabase
        .from('articles')
        .select('content, html_body, schema_markup, page_type, city, state, vertical, phone_number, call_routing_configured, domain_id')
        .eq('id', body.article_id)
        .single();
      
      if (error) {
        return new Response(
          JSON.stringify({
            valid: false,
            score: 0,
            checks: {},
            recommendations: [`Error fetching article: ${error.message}`],
            error: error.message
          } as any),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      article = articleData;
      content = article?.content || article?.html_body || '';
      schemaMarkup = article?.schema_markup;
      
      // Use article data for quality gates if not provided in request
      if (!body.vertical && article?.vertical) {
        (body as any).vertical = article.vertical;
      }
      if (!body.domain_id && article?.domain_id) {
        (body as any).domain_id = article.domain_id;
      }
      if (!body.phone_number && article?.phone_number) {
        (body as any).phone_number = article.phone_number;
      }
      if (body.call_routing_configured === undefined && article?.call_routing_configured !== undefined) {
        (body as any).call_routing_configured = article.call_routing_configured;
      }
    }
    
    if (!content) {
      return new Response(
        JSON.stringify({
          valid: false,
          score: 0,
          checks: {},
          recommendations: ['No content provided to validate'],
          error: 'Content or article_id is required'
        } as any),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Perform all validation checks
    const answerFirstCheck = validateAnswerFirst(content);
    const structureCheck = validateStructure(content);
    const dataPointsCheck = validateDataPoints(content);
    const citationsCheck = validateCitations(content);
    const schemaCheck = validateSchema(schemaMarkup);
    
    const checks: AEOValidatorResponse['checks'] = {
      answer_first: answerFirstCheck,
      structure: structureCheck,
      data_points: dataPointsCheck,
      citations: citationsCheck,
      schema: schemaCheck
    };

    // Local page quality gates (if enabled and applicable)
    const isLocalPage = article?.page_type === 'local_page' || body.validate_doorway_risk || body.validate_uniqueness;
    
    if (isLocalPage || body.validate_doorway_risk) {
      if (body.vertical) {
        console.log('🔍 Validating doorway risk...');
        const doorwayRiskResult = await validateDoorwayRisk(
          content,
          body.article_id || '',
          body.vertical,
          body.domain_id,
          supabaseUrl,
          supabaseKey
        );
        checks.doorway_risk = doorwayRiskResult.doorwayRisk;
        
        // Use similar pages for uniqueness validation
        if (doorwayRiskResult.similarPages.length > 0) {
          checks.uniqueness = validateUniqueness(content, doorwayRiskResult.similarPages);
        } else {
          // No similar pages found - high uniqueness
          checks.uniqueness = {
            valid: true,
            uniqueness_score: 1.0
          };
        }
      }
    }

    if (body.validate_uniqueness && !checks.uniqueness) {
      // If uniqueness not set from doorway risk, calculate it
      checks.uniqueness = {
        valid: true,
        uniqueness_score: 1.0 // Default to high uniqueness if no similar pages found
      };
    }

    if (body.validate_claims || isLocalPage) {
      console.log('🔍 Validating claims...');
      checks.claims = validateClaims(
        content,
        body.phone_number,
        body.call_routing_configured
      );
    }

    if (body.validate_call_routing || (isLocalPage && body.phone_number)) {
      console.log('🔍 Validating call routing...');
      checks.call_routing = await validateCallRouting(
        body.phone_number,
        body.call_routing_configured,
        supabase
      );
    }

    // Question-Answer Alignment validation
    if (body.validate_question_alignment || body.question) {
      console.log('🔍 Validating question-answer alignment...');
      const question = body.question || 
        (article?.primary_keyword ? `What is ${article.primary_keyword}?` : null);
      
      if (question) {
        checks.question_alignment = await validateQuestionAnswerAlignment(
          question,
          content,
          supabaseUrl,
          supabaseKey
        );
      }
    }
    
    const score = calculateScore(checks);
    const recommendations = generateRecommendations(checks);
    
    // Determine overall validity
    // Must pass AEO checks (score >= 70) AND quality gates if enabled
    let valid = score >= 70;
    
    if (checks.doorway_risk && !checks.doorway_risk.valid) {
      valid = false; // High doorway risk blocks publishing
    }
    
    if (checks.call_routing && !checks.call_routing.valid && isLocalPage) {
      valid = false; // Call routing required for local pages
    }
    
    const response: AEOValidatorResponse = {
      valid,
      score,
      checks,
      recommendations
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('AEO Content Validator Error:', error);
    
    return new Response(
      JSON.stringify({
        valid: false,
        score: 0,
        checks: {},
        recommendations: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      } as any),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

