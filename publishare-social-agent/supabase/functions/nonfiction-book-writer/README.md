# Non-Fiction Book Writer Edge Function

Transforms a source file (outline, blog post, or detailed abstract) into a full-length nonfiction "how-to" book (~15,000 words, 100 pages), written in a simple, fun, and motivational tone.

## Features

- **Multiple Input Types**: Supports markdown files, blog posts, URLs, Google Docs, Notion pages, transcripts, and research reports
- **AI-Powered Outline Generation**: Automatically creates a comprehensive book outline from source material
- **Chapter-by-Chapter Generation**: Generates complete chapters with structured content
- **Checkpoint System**: Saves progress after each chapter for recovery
- **Timeout Resilience**: Can resume from any checkpoint if function times out
- **Automatic Recovery**: Returns partial progress with instructions to resume
- **Streaming Support**: Can stream output as chapters are generated (future enhancement)

## Request Format

### New Book Generation

```json
{
  "input_type": "markdown_file",
  "input_content": "# Book Title\n\nContent here...",
  "input_file_path": "/path/to/file.md",  // Optional, for local file reading
  "book_title": "My Amazing Book",  // Optional, will be generated if not provided
  "target_length": 15000,  // Optional, default: 15000 words
  "num_chapters": 12,  // Optional, default: 12-15 (auto-determined)
  "tone": "fun",  // Optional: "fun" | "motivational" | "conversational" | "professional"
  "target_audience": "entrepreneurs",  // Optional
  "stream_output": true,  // Optional, default: true
  "site_id": "seniorsimple"  // Optional: Site ID to use persona profile (e.g., "seniorsimple", "rateroots")
}
```

### Resume Existing Book (Timeout Recovery)

```json
{
  "book_id": "uuid-of-existing-book",
  "resume": true
}
```

Or resume from a specific chapter:

```json
{
  "book_id": "uuid-of-existing-book",
  "continue_from_chapter": 5
}
```

### Expand Existing Book (Voice Preservation)

Expand a completed book to a higher word count while preserving the narrative voice:

```json
{
  "book_id": "uuid-of-completed-book",
  "expand_mode": true,
  "target_chapter_words": 1400,
  "source_document": "Additional source material (optional)",
  "site_id": "seniorsimple"
}
```

**Expansion Mode Features:**
- Automatically extracts voice reference from existing chapters
- Expands each chapter to target word count (default: 1400 words)
- Preserves narrative voice and editorial style
- Creates new expanded book (original remains unchanged)
- Supports timeout resilience (can resume if interrupted)

## Response Format

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
    },
    ...
  ]
}
```

## Chapter Structure

Each generated chapter follows this structure:

1. **Big Idea** - Introduces the key concept in an exciting, simple way
2. **Nuts and Bolts** - Step-by-step breakdown, explanations, how-to advice
3. **Key Takeaways** - Wraps up key points
4. **Your Action Checklist** - Practical action steps in bullet format
5. **Additional Resources** - Tools, books, links to dive deeper

## Writing Style

- First-person, conversational tone
- Fun, motivational, and encouraging
- Simple language (Flesch-Kincaid Grade 5 readability)
- Short sentences and paragraphs
- Direct response copywriting style
- Actionable, step-by-step guidance
- Real-life examples and stories
- Practical checklists and resources

## Persona Integration

If `site_id` is provided, the function will automatically fetch the persona profile from the `heygen_avatar_config` table and use it to:
- Set the writing voice and tone
- Apply the expert's background and expertise
- Match the persona's communication style
- Incorporate the persona's worldview and philosophy

This ensures the book matches the brand's voice (e.g., SeniorSimple's expert avatar, RateRoots' financial advisor persona, etc.).

## Environment Variables

- `DEEPSEEK_API_KEY` - Required for AI generation
- `SUPABASE_URL` - Required for database access
- `SUPABASE_SERVICE_ROLE_KEY` - Required for database access

## Database Schema

The function uses the `book_generations` table:

- `id` - UUID primary key
- `title` - Book title
- `total_words` - Total word count
- `chapters` - Number of chapters
- `status` - 'generating' | 'completed' | 'failed'
- `content` - Full markdown content
- `chapter_list` - JSONB array of chapter objects
- `current_chapter` - Progress tracking
- `checkpoint_data` - Intermediate state for recovery

## Usage Example

```bash
curl -X POST https://your-project.supabase.co/functions/v1/nonfiction-book-writer \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input_type": "markdown_file",
    "input_content": "# My Book Outline\n\n## Chapter 1\n\nContent...",
    "target_length": 15000,
    "num_chapters": 12
  }'
```

## Testing

See `test-book-generation.js` for a test script that uses the retirement income blueprint markdown file.

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

