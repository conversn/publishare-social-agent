# Practical Implementation: Expanding Book with Voice Preservation

## Quick Start Guide

This guide shows you exactly how to expand your 13K word book to 20K+ words while maintaining the narrative voice.

## Prerequisites

1. **13K word generation** (the one with great voice) - saved as markdown
2. **Source document** (the one with more content) - saved as markdown  
3. **Outline file** (.md file) - your book structure
4. Access to nonfiction-book-writer function

## Step 1: Extract Voice Reference Samples

Create a file `voice-reference.md` with 3-5 best examples from your 13K generation:

```markdown
# Voice Reference Samples

## Sample 1: Narrative Opening
[Copy 2-3 paragraphs that show great narrative voice]

## Sample 2: Explanatory Section
[Copy 2-3 paragraphs showing how explanations are written]

## Sample 3: Example/Story Integration
[Copy 2-3 paragraphs showing how examples are woven in]

## Sample 4: Transition Style
[Copy 1-2 paragraphs showing chapter transitions]

## Sample 5: Conclusion Style
[Copy 1-2 paragraphs showing how chapters conclude]
```

## Step 2: Prepare Chapter-by-Chapter Expansion

For each chapter, you'll need:

1. **Current chapter** from 13K generation
2. **Corresponding section** from source document
3. **Voice reference** (relevant sample from Step 1)
4. **Outline guidance** (chapter description from .md file)

## Step 3: Enhanced API Call Structure

### Modified Request Format

```json
{
  "input_type": "markdown_file",
  "input_content": "[Current chapter from 13K generation]",
  "book_title": "Your Book Title",
  "target_length": 20000,
  "num_chapters": 15,
  "tone": "editorial",
  "target_audience": "your audience",
  "site_id": "seniorsimple",
  
  // NEW: Voice preservation
  "voice_reference": "[Voice reference sample - 500-1000 words]",
  "source_document": "[Relevant section from source document - 2000-3000 words]",
  "chapter_expansion_mode": true,
  "target_chapter_words": 1400
}
```

## Step 4: Custom Prompt for Chapter Expansion

If modifying the function, use this enhanced prompt structure:

```typescript
const expansionPrompt = `
You are expanding a chapter while maintaining a specific editorial voice.

## YOUR TASK:
Expand Chapter ${chapterNumber}: "${chapterTitle}" from ~800 words to 1,400 words.

## VOICE REFERENCE (Match This Style Exactly):
${voiceReference}

## CURRENT CHAPTER (Expand This):
${currentChapterContent}

## SOURCE MATERIAL (Use for Depth):
${sourceDocumentSection}

## CHAPTER DESCRIPTION (From Outline):
${chapterDescription}

## EXPANSION REQUIREMENTS:
1. **Maintain Voice**: Match the tone, style, and voice from VOICE REFERENCE
2. **Add Depth**: Incorporate relevant content from SOURCE MATERIAL
3. **Expand Meaningfully**: Add examples, stories, explanations, case studies
4. **Target Length**: 1,400 words (expand from current ~800 words)
5. **Structure**: Follow the chapter structure from CURRENT CHAPTER
6. **Flow**: Ensure smooth narrative flow and transitions

## CRITICAL INSTRUCTIONS:
- DO NOT change the voice/style - match VOICE REFERENCE exactly
- DO NOT just add filler - add substantive depth from SOURCE MATERIAL
- DO NOT lose the narrative flow - maintain the editorial style
- DO expand thoughtfully - add meaningful content that enhances understanding
- DO maintain consistency with previous chapters

Write the expanded chapter now, maintaining the voice from VOICE REFERENCE while incorporating depth from SOURCE MATERIAL.
`;
```

## Step 5: Iterative Expansion Workflow

### Manual Process (Recommended for Quality)

For each chapter (1-15):

1. **Load chapter from 13K generation**
2. **Load corresponding section from source document**
3. **Select appropriate voice reference sample**
4. **Load chapter description from outline**
5. **Call expansion function with all inputs**
6. **Review generated chapter:**
   - Check voice consistency
   - Verify word count (target: 1,400 words)
   - Ensure depth was added
   - Check narrative flow
7. **Refine if needed** (regenerate with adjusted prompts)

### Automated Batch Process

```typescript
// Pseudo-code for batch expansion
const chapters = loadChaptersFrom13K();
const sourceSections = loadSourceDocumentByChapter();
const voiceReferences = loadVoiceReferenceSamples();
const outline = loadOutline();

for (let i = 0; i < chapters.length; i++) {
  const chapter = chapters[i];
  const sourceSection = sourceSections[i];
  const voiceSample = selectBestVoiceSample(chapter);
  const outlineDesc = outline.chapters[i].description;
  
  const expanded = await expandChapter({
    currentChapter: chapter.content,
    sourceMaterial: sourceSection,
    voiceReference: voiceSample,
    chapterDescription: outlineDesc,
    targetWords: 1400
  });
  
  // Save expanded chapter
  saveChapter(expanded);
  
  // Review before proceeding
  await reviewChapter(expanded);
}
```

## Step 6: Voice Consistency Check

After expanding all chapters, review for voice consistency:

### Checklist

- [ ] Each chapter matches voice reference style
- [ ] Sentence structure patterns are consistent
- [ ] Tone remains consistent throughout
- [ ] Examples/stories are integrated similarly
- [ ] Transitions maintain narrative flow
- [ ] No sections feel "off voice"

### If Voice Doesn't Match

1. **Identify the problem**: What's different?
2. **Select better voice reference**: Use a more relevant sample
3. **Regenerate with emphasis**: Add explicit instruction to match voice
4. **Manual refinement**: Edit to match voice manually

## Step 7: Final Polish

1. **Word count verification**: Ensure 20,000+ total words
2. **Narrative flow check**: Read through entire book
3. **Voice consistency**: Spot-check random chapters
4. **Content depth**: Verify all source material insights included
5. **Structure adherence**: Confirm outline followed

## Example: Expanding Chapter 1

### Inputs:

**Current Chapter (from 13K):**
```markdown
## Chapter 1: Getting Started

[800 words of great narrative voice content]
```

**Source Document Section:**
```markdown
[2000 words of detailed content on same topic]
```

**Voice Reference:**
```markdown
[500 words showing the editorial voice style]
```

**Outline Description:**
```markdown
Chapter 1 introduces the core concept and sets the foundation for the book.
```

### Output:

**Expanded Chapter:**
```markdown
## Chapter 1: Getting Started

[1,400 words maintaining voice + incorporating source depth]
```

## Troubleshooting

### Problem: Voice doesn't match
**Solution:** Use longer/more specific voice reference samples

### Problem: Not enough depth added
**Solution:** Provide more source material context in prompt

### Problem: Word count too low
**Solution:** Increase target words and add explicit expansion instructions

### Problem: Content feels forced
**Solution:** Regenerate with emphasis on natural integration

## Success Metrics

- ✅ Total word count: 20,000+
- ✅ Voice consistency: 95%+ match with 13K generation
- ✅ Content depth: All key insights from source included
- ✅ Structure: Outline followed precisely
- ✅ Quality: Editorial depth maintained throughout

## Next Steps

1. Extract voice reference samples
2. Prepare source document by chapter
3. Set up expansion workflow
4. Expand chapters iteratively
5. Review and refine
6. Final polish


