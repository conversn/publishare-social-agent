# Non-Fiction Book Writer - Setup & Usage Guide

## Overview

The `nonfiction-book-writer` edge function transforms source material (outlines, blog posts, markdown files) into full-length nonfiction books (~15,000 words, 12-15 chapters) with a conversational, motivational tone.

## Architecture

### Components

1. **Edge Function**: `supabase/functions/nonfiction-book-writer/index.ts`
   - Handles input preprocessing
   - Generates book outline via AI
   - Generates chapters sequentially
   - Saves checkpoints after each chapter
   - Assembles final book

2. **Database Table**: `book_generations`
   - Stores book metadata and content
   - Tracks generation progress
   - Enables checkpoint recovery

3. **Test Script**: `test-book-generation.js`
   - Tests function with retirement income blueprint
   - Saves output to files

## Setup

### 1. Deploy Database Migration

```bash
cd publishare
supabase db push
```

Or manually run:
```sql
-- Run: supabase/migrations/20250113000001_create_book_generations_table.sql
```

### 2. Deploy Edge Function

```bash
cd publishare
supabase functions deploy nonfiction-book-writer
```

### 3. Set Environment Variables

Ensure these are set in Supabase Dashboard → Settings → Edge Functions:
- `DEEPSEEK_API_KEY` - Your DeepSeek API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (auto-set)

## Usage

### Basic Request

```bash
curl -X POST https://your-project.supabase.co/functions/v1/nonfiction-book-writer \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input_type": "markdown_file",
    "input_content": "# Book Title\n\n## Chapter 1\n\nContent...",
    "target_length": 15000,
    "num_chapters": 12
  }'
```

### With Markdown File

The function accepts markdown content directly:

```json
{
  "input_type": "markdown_file",
  "input_content": "# The Complete Retirement Income Blueprint\n\n## Introduction\n\n...",
  "book_title": "The Retirement Income Blueprint",
  "target_length": 15000,
  "num_chapters": 12,
  "tone": "fun",
  "target_audience": "retirees and pre-retirees",
  "site_id": "seniorsimple"
}
```

### Persona Integration

When `site_id` is provided, the function automatically:
1. Fetches the persona profile from `heygen_avatar_config` table
2. Applies the persona's voice, tone, and expertise to all chapters
3. Ensures consistency with the brand's communication style

Example sites:
- `"seniorsimple"` - Uses SeniorSimple expert avatar
- `"rateroots"` - Uses RateRoots financial advisor persona
- Any other site with configured avatar in the database

### Testing with Retirement Income Blueprint

```bash
cd publishare/supabase/functions/nonfiction-book-writer
node test-book-generation.js
```

This will:
1. Load the markdown file from `docs/`
2. Send it to the edge function
3. Save the generated book to `generated-book.md`
4. Save individual chapters to `chapters/` directory

## Input Types Supported

### Currently Implemented

- ✅ `markdown_file` - Markdown content or file path
- ✅ `plain_text` - Plain text content
- ✅ `blog_post` - Blog post content
- ✅ `transcript` - Transcript content
- ✅ `research_report` - Research report content

### Planned (Not Yet Implemented)

- ⏳ `url` - URL scraping with Mercury Parser
- ⏳ `google_doc_link` - Google Docs API extraction
- ⏳ `notion_page` - Notion API extraction

## Output Format

### Response Structure

```json
{
  "book_id": "uuid",
  "title": "Generated Book Title",
  "total_words": 15234,
  "chapters": 12,
  "status": "completed",
  "content": "# Full Markdown Content...",
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "word_count": 1200,
      "content": "## Chapter Content..."
    }
  ]
}
```

### Chapter Structure

Each chapter follows this template:

1. **H2 Heading**: Chapter title
2. **### The Big Idea**: Introduces key concept
3. **### The Nuts and Bolts**: Step-by-step breakdown
4. **### Key Takeaways**: Summary of main points
5. **### Your Action Checklist**: Practical action steps
6. **### Additional Resources**: Tools, books, links

## Writing Style

The function generates content with:

- **Tone**: First-person, conversational, fun, motivational
- **Readability**: Flesch-Kincaid Grade 5 (simple language)
- **Format**: Short sentences and paragraphs
- **Style**: Direct response copywriting
- **Content**: Actionable, step-by-step guidance with real examples

## Checkpoint System

The function saves progress after each chapter:

- **State Storage**: Saved to `book_generations` table
- **Recovery**: Can resume from last completed chapter
- **Progress Tracking**: `current_chapter` field tracks position

## Database Schema

```sql
CREATE TABLE book_generations (
  id UUID PRIMARY KEY,
  title VARCHAR(500),
  total_words INTEGER,
  chapters INTEGER,
  status VARCHAR(50), -- 'generating' | 'completed' | 'failed'
  content TEXT, -- Full markdown
  chapter_list JSONB, -- Array of chapter objects
  current_chapter INTEGER,
  checkpoint_data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Error Handling

The function handles:

- Missing input content
- Invalid input types
- DeepSeek API errors
- Database save failures
- File read errors (for markdown_file with path)

Errors return:
```json
{
  "error": "Error message",
  "details": "Stack trace (in development)"
}
```

## Performance

- **Generation Time**: ~2-5 minutes for 12 chapters
- **Token Usage**: ~50,000-100,000 tokens per book
- **API Calls**: 1 for outline + N for chapters (N = number of chapters)

## Future Enhancements

- [ ] Streaming output support
- [ ] URL scraping with Mercury Parser
- [ ] Google Docs API integration
- [ ] Notion API integration
- [ ] PDF export
- [ ] EPUB export
- [ ] Cover image generation
- [ ] Table of contents with page numbers
- [ ] Index generation
- [ ] Multi-language support

## Timeout Resilience

The function is designed to handle timeouts gracefully:

### Automatic Checkpoint System

- **Saves after each chapter**: Progress is saved to database after every chapter
- **Resume capability**: Can resume from any checkpoint
- **Partial progress returned**: If timeout occurs, returns completed chapters with resume instructions

### Resuming a Book

If generation times out, you can resume in two ways:

#### Method 1: Using the Resume Script (Recommended)

```bash
cd supabase/functions/nonfiction-book-writer
node resume-book-generation.js [book_id]
```

**Auto-retry mode** (continues until complete):
```bash
node resume-book-generation.js [book_id] --auto-retry
```

#### Method 2: Manual API Call

```bash
curl -X POST https://your-project.supabase.co/functions/v1/nonfiction-book-writer \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "book_id": "uuid-from-previous-response",
    "resume": true
  }'
```

### Finding Incomplete Books

```sql
SELECT id, title, current_chapter, chapters, status, updated_at
FROM book_generations
WHERE status = 'generating'
ORDER BY updated_at DESC;
```

## Troubleshooting

### Function Not Deploying

```bash
# Check function syntax
deno check supabase/functions/nonfiction-book-writer/index.ts

# Check Supabase CLI is logged in
supabase status
```

### Database Errors

```bash
# Check migration was applied
supabase db diff

# Manually run migration if needed
supabase db reset
```

### API Errors

- Verify `DEEPSEEK_API_KEY` is set
- Check API key has sufficient credits
- Review function logs in Supabase Dashboard

### Generation Times Out

1. **Check progress**: Query `book_generations` table to see completed chapters
2. **Resume automatically**: Use `resume-book-generation.js --auto-retry`
3. **Manual resume**: Call function with `book_id` and `resume: true`
4. **Check logs**: Review Supabase function logs for errors

### Generation Fails Midway

- Check `book_generations` table for checkpoint data
- Review `current_chapter` to see where it stopped
- Use resume script or API call to continue
- All completed chapters are preserved

## Example: Retirement Income Blueprint

The test script uses:
- **Source**: `docs/The Complete '$47 Retirement Income Blueprint' Content Outline.md`
- **Target**: 12 chapters, 15,000 words
- **Tone**: Fun, motivational
- **Audience**: Retirees and pre-retirees

This generates a complete book expanding the outline into full chapters with actionable content.

