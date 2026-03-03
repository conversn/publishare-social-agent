# Nonfiction Book Writer - Timeout Resilience System

## Overview

The nonfiction-book-writer function is designed to **absolutely complete books** even if the Supabase Edge Function times out (typically ~60 seconds). It uses a checkpoint system that saves progress after every chapter, allowing seamless resumption.

## How It Works

### 1. Checkpoint System

After **each chapter** is generated, the function:
- Saves the chapter content to the database
- Updates `current_chapter` to track progress
- Stores the outline in `checkpoint_data` for recovery
- Sets `status: 'generating'` until completion

### 2. Automatic Resume Detection

If a function call times out:
- All completed chapters are preserved in the database
- The `book_id` is returned in the response (even if partial)
- The function can be called again with `resume: true` to continue

### 3. Resume Capability

The function can resume from:
- **Last checkpoint**: Automatically continues from the last completed chapter
- **Specific chapter**: Can resume from a specific chapter number
- **Any point**: All progress is preserved, no work is lost

## Usage Patterns

### Pattern 1: Automatic Resume Script (Recommended)

Use the helper script that automatically continues until complete:

```bash
cd supabase/functions/nonfiction-book-writer
node resume-book-generation.js [book_id] --auto-retry
```

This will:
1. Check for incomplete books
2. Resume generation
3. Wait and retry if still incomplete
4. Continue until book is fully generated

### Pattern 2: Manual Resume

If you have the `book_id` from a previous call:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/nonfiction-book-writer \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "book_id": "uuid-from-previous-call",
    "resume": true
  }'
```

### Pattern 3: Find and Resume

The resume script can find incomplete books automatically:

```bash
node resume-book-generation.js
# Finds most recent incomplete book and resumes it
```

## Response Handling

### Successful Completion

```json
{
  "book_id": "uuid",
  "title": "Book Title",
  "status": "completed",
  "total_words": 15234,
  "chapters": 12,
  "content": "# Full markdown...",
  "chapters": [...]
}
```

### Partial Progress (Timeout)

```json
{
  "book_id": "uuid",
  "title": "Book Title",
  "status": "generating",
  "completed_chapters": 5,
  "chapters": 12,
  "current_chapter": 5,
  "chapters": [...completed chapters...],
  "error": "Failed at chapter 6: ...",
  "message": "Generation interrupted. Use book_id and resume=true to continue."
}
```

**Status Code**: `206 Partial Content` (indicates partial success)

### Already Completed

If you try to resume a completed book:

```json
{
  "book_id": "uuid",
  "status": "completed",
  "message": "Book was already completed",
  "content": "# Full markdown...",
  ...
}
```

## Database Schema

The `book_generations` table stores:

- `id` - Book UUID (use for resume)
- `status` - `'generating'` or `'completed'`
- `current_chapter` - Last completed chapter number
- `chapter_list` - JSONB array of all completed chapters
- `checkpoint_data` - Contains outline and source content for recovery
- `content` - Full markdown (only when completed)

## Example Workflow

### Step 1: Start Generation

```bash
curl -X POST ... -d '{
  "input_type": "markdown_file",
  "input_content": "...",
  "site_id": "seniorsimple"
}'
```

**Response** (if times out after 5 chapters):
```json
{
  "book_id": "abc-123",
  "status": "generating",
  "completed_chapters": 5,
  "chapters": 12,
  "message": "Generation interrupted. Use book_id and resume=true to continue."
}
```

### Step 2: Resume Generation

```bash
curl -X POST ... -d '{
  "book_id": "abc-123",
  "resume": true
}'
```

**Response** (continues from chapter 6):
```json
{
  "book_id": "abc-123",
  "status": "generating",
  "completed_chapters": 8,
  "chapters": 12,
  ...
}
```

### Step 3: Continue Until Complete

Keep calling with `resume: true` until `status: "completed"`, or use the auto-retry script.

## Timeout Scenarios

### Scenario 1: Function Times Out Mid-Chapter

- **What happens**: Chapter generation fails, but previous chapters are saved
- **Recovery**: Resume will retry the failed chapter
- **Result**: Chapter is regenerated (may differ slightly, but content is preserved)

### Scenario 2: Function Times Out Between Chapters

- **What happens**: Last chapter is saved, function times out before next chapter
- **Recovery**: Resume continues from next chapter seamlessly
- **Result**: No work lost, continues exactly where it left off

### Scenario 3: Multiple Timeouts

- **What happens**: Function times out multiple times
- **Recovery**: Each resume call continues from last checkpoint
- **Result**: Book eventually completes, all chapters preserved

## Best Practices

### 1. Always Save the `book_id`

When you start generation, save the `book_id` from the response. You'll need it to resume.

### 2. Use Auto-Retry Script

For production use, use the `resume-book-generation.js --auto-retry` script. It handles:
- Finding incomplete books
- Resuming automatically
- Retrying on errors
- Continuing until complete

### 3. Monitor Progress

Check the database periodically:

```sql
SELECT id, title, current_chapter, chapters, status, updated_at
FROM book_generations
WHERE status = 'generating'
ORDER BY updated_at DESC;
```

### 4. Handle Partial Responses

Your client code should:
- Check for `status: "generating"` in response
- Save `book_id` for resume
- Call resume endpoint if incomplete
- Handle `206 Partial Content` status code

## Error Recovery

### Chapter Generation Fails

If a specific chapter fails to generate:
- Function saves current state
- Returns `206 Partial Content` with error message
- All completed chapters are preserved
- Resume will retry the failed chapter

### Database Save Fails

If checkpoint save fails:
- Function logs error but continues
- Next chapter save will retry
- If critical, function returns error with partial progress

### API Errors

If DeepSeek API fails:
- Function catches error
- Saves current state
- Returns partial progress with error
- Resume will retry from last successful checkpoint

## Guarantees

✅ **No work is lost**: Every completed chapter is saved immediately  
✅ **Resume from any point**: Can resume from any checkpoint  
✅ **Multiple timeouts OK**: Can handle multiple timeouts and resume each time  
✅ **Automatic recovery**: Helper script can automatically complete books  
✅ **Progress visibility**: Always know how many chapters are complete  

## Limitations

⚠️ **Chapter regeneration**: If a chapter fails mid-generation, it will be regenerated (may differ)  
⚠️ **Source content**: Only first 5000 chars of source stored in checkpoint (for reference)  
⚠️ **No streaming yet**: Full book returned only when complete (streaming planned)  

## Testing Timeout Resilience

To test the system:

1. Start a book generation
2. Let it run until it times out (or manually interrupt)
3. Check database for `book_id` and `current_chapter`
4. Call resume endpoint with `book_id` and `resume: true`
5. Verify it continues from correct chapter
6. Repeat until complete

## Summary

The nonfiction-book-writer function is **fully resilient to timeouts**. It will absolutely complete books by:

1. Saving progress after every chapter
2. Allowing seamless resumption from any checkpoint
3. Providing helper tools for automatic completion
4. Preserving all work even if function times out

**You can be confident that books will complete, even if it takes multiple function calls.**


