# Book Expansion Strategy: 13K → 20K+ Words with Voice Preservation

## Problem Statement

You have:
- ✅ **13K word generation** with excellent narrative voice and editorial style
- ✅ **Source document** with more content/depth but lacking editorial voice
- ✅ **Local .md outline** that structures the book
- 🎯 **Goal**: Expand to 20,000+ words while maintaining the narrative voice

## Strategy Overview

The key is to **extract the voice/style from the 13K generation** and use it as a template, while **mining the source document for depth** and following the **outline structure**.

## Step-by-Step Approach

### Phase 1: Voice Extraction & Analysis

1. **Analyze the 13K Generation**
   - Extract writing patterns, sentence structures, tone markers
   - Identify key phrases, transitions, and stylistic elements
   - Document the "editorial voice" characteristics:
     - Sentence length patterns
     - Paragraph structure
     - Use of examples/stories
     - Transition phrases
     - Voice markers (first-person, conversational elements)

2. **Create a Voice Profile Document**
   ```markdown
   ## Voice Characteristics
   - Tone: [extract from 13K]
   - Sentence structure: [patterns]
   - Example usage: [how examples are woven in]
   - Transition style: [how chapters flow]
   - Personal voice markers: [specific phrases/patterns]
   ```

### Phase 2: Content Mining from Source Document

1. **Extract Key Content Points**
   - Identify all substantive content in source document
   - Map content to outline chapters
   - Note missing depth areas in 13K generation
   - Create content inventory by chapter

2. **Content Gap Analysis**
   - Compare 13K generation to source document
   - Identify where source has more depth
   - Note topics/concepts not covered in 13K
   - Create expansion opportunities list

### Phase 3: Chapter-by-Chapter Expansion

For each chapter in the outline:

1. **Current State Analysis**
   - Word count of current chapter
   - Content coverage vs. source document
   - Voice consistency check

2. **Expansion Plan**
   - Target word count per chapter (aim for 1,200-1,500 words per chapter for 20K total)
   - Identify specific content from source to incorporate
   - Plan where to add depth (examples, stories, explanations)

3. **Voice-Guided Rewrite**
   - Use voice profile as guide
   - Rewrite/expand using source content
   - Maintain narrative flow and editorial style
   - Add depth without losing voice

## Implementation: Enhanced Book Writer Function

### Updated System Prompt Strategy

The key is to provide BOTH:
1. **Voice reference** (from 13K generation)
2. **Content reference** (from source document)
3. **Outline structure** (from .md file)

### Enhanced Chapter Generation Prompt

```typescript
async function generateExpandedChapter(
  chapterNumber: number,
  chapterTitle: string,
  chapterDescription: string,
  voiceReference: string,        // Excerpt from 13K generation showing voice
  sourceContent: string,         // Full source document content
  outlineStructure: string,       // The .md outline
  previousChapters: Array<{ title: string; content: string }> = [],
  personaProfile?: any
): Promise<string> {
  
  let systemPrompt = `You are a professional nonfiction book writer. Your task is to expand a chapter while maintaining a specific editorial voice and incorporating depth from source material.

## VOICE REFERENCE (Maintain This Style):
${voiceReference.substring(0, 2000)}

## YOUR WRITING STYLE MUST MATCH:
- The tone, pacing, and voice shown in the VOICE REFERENCE above
- First-person, conversational where appropriate
- Editorial depth and insight
- Narrative flow and storytelling elements
- The specific stylistic patterns from the reference

## SOURCE MATERIAL (Use for Depth):
${sourceContent.substring(0, 5000)}${sourceContent.length > 5000 ? '...' : ''}

## CHAPTER STRUCTURE (From Outline):
${outlineStructure}

## EXPANSION REQUIREMENTS:
- Target: 1,200-1,500 words (expand significantly from current ~800 words)
- Incorporate relevant content from SOURCE MATERIAL
- Maintain the VOICE REFERENCE style throughout
- Add depth: examples, stories, explanations, case studies
- Follow the structure from CHAPTER STRUCTURE
- Ensure smooth transitions from previous chapters

## CRITICAL INSTRUCTIONS:
1. **Voice First**: Match the editorial voice from VOICE REFERENCE exactly
2. **Depth Second**: Pull substantive content from SOURCE MATERIAL
3. **Structure Third**: Follow the outline structure
4. **Expand Thoughtfully**: Don't just add words - add meaningful depth
5. **Maintain Flow**: Ensure narrative continuity with previous chapters`;

  // Enhance with persona if available
  systemPrompt = buildPersonaSystemPrompt(systemPrompt, personaProfile);

  const userPrompt = `Write Chapter ${chapterNumber}: "${chapterTitle}"

BOOK TITLE: [from outline]
CHAPTER DESCRIPTION: ${chapterDescription}

PREVIOUS CHAPTERS CONTEXT:
${previousChapters.slice(-2).map(c => `- ${c.title}`).join('\n')}

Write a complete, expanded chapter (1,200-1,500 words) that:
- Matches the voice style from VOICE REFERENCE
- Incorporates depth from SOURCE MATERIAL
- Follows the structure from CHAPTER STRUCTURE
- Expands meaningfully on the current chapter content

Start with: "## ${chapterTitle}"`;

  // ... rest of API call
}
```

## Practical Workflow

### Option 1: Manual Chapter-by-Chapter Expansion

1. **For each chapter:**
   - Extract current chapter from 13K generation
   - Extract corresponding section from source document
   - Extract voice reference (2-3 paragraphs from 13K showing best voice)
   - Run enhanced generation function
   - Review and refine

### Option 2: Batch Expansion with Voice Preservation

1. **Prepare inputs:**
   - Extract voice reference sections from 13K (best examples)
   - Prepare source document by chapter
   - Load outline structure

2. **Generate expanded chapters:**
   - Process each chapter with voice + source + outline
   - Review each chapter for voice consistency
   - Refine as needed

### Option 3: Iterative Refinement

1. **First pass:** Expand all chapters to target length
2. **Voice check:** Review each chapter against voice reference
3. **Refinement pass:** Adjust chapters that don't match voice
4. **Final polish:** Ensure narrative flow and depth

## Key Success Factors

### 1. Voice Preservation
- **Extract multiple voice samples** from 13K generation (not just one)
- Use different types of content (narrative, explanatory, examples)
- Reference voice samples in every generation call

### 2. Content Integration
- **Don't just copy** from source document
- **Rewrite in the voice** from 13K generation
- **Synthesize** source content with editorial voice

### 3. Structure Adherence
- Follow the outline structure strictly
- Ensure chapters build on each other
- Maintain narrative arc

### 4. Depth Addition
- Add examples and stories
- Expand explanations
- Include case studies
- Add practical applications
- Include "why" behind "what"

## Technical Implementation

### Updated Function Parameters

```typescript
interface ExpandedBookRequest {
  // Existing
  input_type: string;
  input_content: string;
  book_title?: string;
  target_length: number;  // 20000
  num_chapters?: number;
  
  // NEW: Voice preservation
  voice_reference_content: string;  // Excerpts from 13K generation
  voice_reference_chapters?: Array<{ number: number; content: string }>;
  
  // NEW: Source content
  source_document_content: string;  // Full source document
  
  // NEW: Outline
  outline_structure?: string;  // The .md outline content
  
  // Existing
  tone?: string;
  target_audience?: string;
  site_id?: string;
}
```

### Enhanced Generation Logic

```typescript
// For each chapter:
const voiceSample = selectBestVoiceSample(chapterNumber, voiceReferenceChapters);
const sourceSection = extractRelevantSourceContent(chapterNumber, sourceDocument);
const outlineGuidance = extractChapterFromOutline(chapterNumber, outlineStructure);

const expandedChapter = await generateExpandedChapter(
  chapterNumber,
  chapterTitle,
  chapterDescription,
  voiceSample,           // Voice reference
  sourceSection,         // Source content
  outlineGuidance,       // Outline structure
  previousChapters,
  personaProfile
);
```

## Quality Checklist

After expansion, verify each chapter:

- [ ] Word count: 1,200-1,500 words
- [ ] Voice matches 13K generation style
- [ ] Incorporates depth from source document
- [ ] Follows outline structure
- [ ] Maintains narrative flow
- [ ] Adds meaningful content (not fluff)
- [ ] Includes examples/stories where appropriate
- [ ] Transitions smoothly from previous chapter

## Expected Outcome

- **Total word count:** 20,000+ words
- **Voice consistency:** Matches 13K generation style
- **Content depth:** Incorporates source document insights
- **Structure:** Follows outline precisely
- **Quality:** Editorial depth with narrative voice

## Next Steps

1. Extract voice reference samples from 13K generation
2. Prepare source document content by chapter
3. Load outline structure
4. Update nonfiction-book-writer function with enhanced prompts
5. Generate expanded chapters iteratively
6. Review and refine for voice consistency
7. Final polish and word count verification


