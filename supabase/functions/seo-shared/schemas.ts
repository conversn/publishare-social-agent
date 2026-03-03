// =====================================================
// JSON Schemas for Validation
// =====================================================

import type { Classification, RootCause } from './types.ts';

export const ROOT_CAUSE_TYPES: RootCause[] = [
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
  'UNKNOWN_NEEDS_HUMAN_REVIEW',
];

export const CLASSIFICATION_SCHEMA = {
  type: 'object',
  required: ['root_cause', 'confidence', 'recommended_actions', 'autofix_plan', 'notes'],
  properties: {
    root_cause: {
      type: 'string',
      enum: ROOT_CAUSE_TYPES,
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    recommended_actions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['action', 'detail', 'priority'],
        properties: {
          action: { type: 'string' },
          detail: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    autofix_plan: {
      type: 'object',
      required: ['safe_to_autofix', 'patches', 'requires_human_review'],
      properties: {
        safe_to_autofix: { type: 'boolean' },
        patches: {
          type: 'array',
          items: {
            type: 'object',
            required: ['fix_type', 'target', 'parameters', 'estimated_impact'],
          },
        },
        requires_human_review: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    notes: { type: 'string' },
  },
};

// Validate classification response
export function validateClassification(data: unknown): data is Classification {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Partial<Classification>;

  if (!obj.root_cause || !ROOT_CAUSE_TYPES.includes(obj.root_cause)) {
    return false;
  }

  if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1) {
    return false;
  }

  if (!Array.isArray(obj.recommended_actions)) return false;
  if (!obj.autofix_plan || typeof obj.autofix_plan !== 'object') return false;
  if (typeof obj.notes !== 'string') return false;

  return true;
}

// Expected LLM response structure
export const LLM_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['root_cause', 'confidence', 'recommended_actions', 'autofix_plan', 'notes'],
  properties: {
    root_cause: {
      type: 'string',
      description: 'One of the predefined root cause types',
      enum: ROOT_CAUSE_TYPES,
    },
    confidence: {
      type: 'number',
      description: 'Confidence level from 0 to 1',
      minimum: 0,
      maximum: 1,
    },
    recommended_actions: {
      type: 'array',
      description: 'List of recommended actions with priority',
      items: {
        type: 'object',
        required: ['action', 'detail', 'priority'],
        properties: {
          action: {
            type: 'string',
            description: 'Short action code (e.g., ADD_INTERNAL_LINKS)',
          },
          detail: {
            type: 'string',
            description: 'Detailed explanation of the action',
          },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
          },
        },
      },
    },
    autofix_plan: {
      type: 'object',
      required: ['safe_to_autofix', 'patches', 'requires_human_review'],
      properties: {
        safe_to_autofix: {
          type: 'boolean',
          description: 'Whether this can be auto-fixed without approval',
        },
        patches: {
          type: 'array',
          description: 'Specific fix patches to apply',
          items: {
            type: 'object',
            required: ['fix_type', 'target', 'parameters', 'estimated_impact'],
            properties: {
              fix_type: { type: 'string' },
              target: { type: 'string' },
              parameters: { type: 'object' },
              estimated_impact: { type: 'string' },
            },
          },
        },
        requires_human_review: {
          type: 'array',
          description: 'Reasons why human review is needed',
          items: { type: 'string' },
        },
      },
    },
    notes: {
      type: 'string',
      description: 'Additional context and reasoning',
    },
  },
};



