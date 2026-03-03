# Creatomate Unified Template System

## Overview

The Simple Media Network uses a unified video template system with 4 master templates that work across all 8 verticals. Templates are dynamically branded using brand colors, logos, and domain names.

## Master Templates

| Template | Template ID | Use Case |
|----------|-------------|----------|
| **Long Form — Simple Explainer** | `45e99fdb-0130-453c-a3eb-aaadd5ac4bd4` | 10+ minute educational content |
| **Short Form — Story Spark** | `e1a24ce7-9501-417c-a28c-1c2171142fff` | Engaging short-form content |
| **Short Form — Steps & Mistakes** | `f80fd478-c290-49c4-8d5e-2ea311945a39` | Step-by-step guides, how-to content |
| **Short Form — Concept in 20s** | `36934f8f-5b78-4788-8d1e-96c3ad92f965` | Definitions, concept explanations |

## Brand Configuration

### Brand Colors

Each vertical has a single accent color applied to:
- Title text
- Final CTA (domain)
- Optional overlay ribbon

**Color Mapping**:
```typescript
{
  'seniorsimple': '#5A7186',
  'mortgagesimple': '#2E5EAA',
  'lendingsimple': '#0F7B6C',
  'rateroots': '#249C77',
  'creditrepairsimple': '#8841D1',
  'parentsimple': '#375172',
  'smallbizsimple': '#3A7A4C',
  'scalingsimple': '#444F88'
}
```

### Brand Domains

```typescript
{
  'seniorsimple': 'SeniorSimple.com',
  'mortgagesimple': 'MortgageSimple.com',
  'lendingsimple': 'LendingSimple.com',
  'rateroots': 'RateRoots.com',
  'creditrepairsimple': 'CreditRepairSimple.com',
  'parentsimple': 'ParentSimple.com',
  'smallbizsimple': 'SmallBizSimple.com',
  'scalingsimple': 'ScalingSimple.com'
}
```

### Logo Overlay

- **Position**: Top-left
- **Padding**: 80px left, 80px top
- **Size**: Max 240px width, auto height
- **Fit**: Contain

Logo URLs are configured in the edge function and can be stored in:
- Supabase Storage
- Google Cloud Storage
- CDN

## Safe Zone Rules

All overlay text must stay inside safe zones:

- **Top safe zone**: 120px
- **Bottom safe zone**: 160px (for Reels UI)
- **Left/Right padding**: 80px

These are enforced through Creatomate template modifications.

## Template Field Requirements

### Story Spark Template

**Required Fields**:
```json
{
  "hook_text": "",
  "concept_text": "",
  "broll_label_1": "",
  "broll_clip_1": "",
  "presenter_clip_url": "",
  "brand_color": "",
  "domain": ""
}
```

### Steps & Mistakes Template

**Required Fields**:
```json
{
  "title_text": "",
  "step_1_text": "",
  "step_2_text": "",
  "step_3_text": "",
  "step_1_clip": "",
  "step_2_clip": "",
  "step_3_clip": "",
  "brand_color": "",
  "domain": ""
}
```

### Concept in 20s Template

**Required Fields**:
```json
{
  "concept_title": "",
  "concept_detail": "",
  "broll_clip": "",
  "presenter_clip": "",
  "brand_color": "",
  "domain": ""
}
```

### Long Form Template

**Required Fields**:
```json
{
  "cold_open_broll": "",
  "cold_open_text": "",
  "host_intro_clip": "",
  "act_1_broll": "",
  "act_1_text": "",
  "act_2_broll": "",
  "act_2_text": "",
  "act_3_broll": "",
  "act_3_text": "",
  "brand_color": "",
  "domain": ""
}
```

**Optional Audio Fields** (for voice):
```json
{
  "act_1_audio": "",
  "act_2_audio": "",
  "act_3_audio": ""
}
```

## Auto-Template Selection

The system automatically selects a template based on article content:

1. **Steps & Mistakes**: If content contains "step", "how to", or similar
2. **Concept in 20s**: If content contains "what is", "definition", or similar
3. **Story Spark**: Default for engaging content
4. **Long Form**: Explicitly requested or for 10+ minute content

## Validation Rules

The edge function validates:

- ✅ No empty strings in required fields
- ✅ All URLs end in `.mp4` or image formats (`.jpg`, `.jpeg`, `.png`, `.webp`)
- ✅ All required fields exist
- ✅ No extra unrecognized fields
- ✅ Correct template ID for template type
- ✅ Valid brand color hex code

## Asset Requirements

### B-Roll Clips
- **Shorts**: Vertical 9:16 format
- **Long Form**: Horizontal 16:9 format
- **Minimum**: 1080p resolution

### Presenter Clips
- **Format**: 1080×1920 (vertical)
- **No captions**: Burned-in captions not allowed
- **No background music**: Clean audio only

### Text Content
- **Hook Text**: Max 150 characters
- **Concept Text**: Max 300 characters
- **Step Text**: Max 150 characters per step
- **Title Text**: Max 100 characters

## API Usage

### Request

```typescript
POST /functions/v1/creatomate-video-generator
{
  "article_id": "uuid",
  "template_type": "story-spark" | "steps-mistakes" | "concept-20s" | "long-form",
  "use_voice": boolean // default: false for shorts, true for long-form
}
```

### Response

```typescript
{
  "success": boolean,
  "video_url": string,
  "render_id": string,
  "provider": "creatomate",
  "template_id": string,
  "template_type": string,
  "error": string // if failed
}
```

## Implementation Notes

1. **Logo URLs**: Currently configured as Google Cloud Storage URLs. Update `BRAND_LOGO_URLS` in the edge function to point to your actual logo storage location.

2. **Presenter Clips**: Not yet integrated. These will be added when presenter video assets are available.

3. **B-Roll Clips**: Currently uses `featured_image_url` from articles. Full b-roll library integration pending.

4. **Audio Generation**: Long-form videos support ElevenLabs audio generation. Set `use_voice: true` to enable.

## Next Steps

- [ ] Configure actual logo URLs in Supabase Storage or CDN
- [ ] Integrate presenter clip library
- [ ] Integrate b-roll clip library
- [ ] Add support for custom template modifications
- [ ] Implement video metadata storage in `video_content` table


