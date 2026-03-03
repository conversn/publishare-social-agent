/**
 * Supabase Edge Function: Non-Fiction Book Writer
 * 
 * Transforms a source file (outline, blog post, or detailed abstract) into a full-length
 * nonfiction "how-to" book (~15,000 words, 100 pages), written in a simple, fun, and
 * motivational tone to help entrepreneurs start businesses.
 * 
 * Request Body:
 * {
 *   input_type: "markdown_file" | "blog_post" | "google_doc_link" | "url" | "notion_page" | "transcript" | "research_report"
 *   input_content: string (the actual content or URL)
 *   input_file_path?: string (for markdown_file type)
 *   book_title?: string (optional, will be generated if not provided)
 *   target_length?: number (default: 15000 words)
 *   num_chapters?: number (default: 12-15, auto-determined)
 *   tone?: "fun" | "motivational" | "conversational" | "professional"
 *   target_audience?: string
 *   stream_output?: boolean (default: true)
 * }
 * 
 * Response:
 * {
 *   book_id: string
 *   title: string
 *   total_words: number
 *   chapters: number
 *   status: "generating" | "completed"
 *   content?: string (full markdown if completed)
 *   chapters?: Array<{ number: number, title: string, word_count: number, content: string }>
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookWriterRequest {
  input_type?: 'markdown_file' | 'blog_post' | 'google_doc_link' | 'url' | 'notion_page' | 'transcript' | 'research_report' | 'plain_text';
  input_content?: string;
  input_file_path?: string;
  book_title?: string;
  target_length?: number;
  num_chapters?: number;
  tone?: string;
  target_audience?: string;
  stream_output?: boolean;
  site_id?: string; // Site ID to fetch persona profile (e.g., 'seniorsimple', 'rateroots')
  book_id?: string; // Optional: Resume existing book generation OR expand existing book
  resume?: boolean; // Optional: If true, resume from checkpoint
  continue_from_chapter?: number; // Optional: Start from specific chapter (for manual resume)
  // Expansion mode parameters
  expand_mode?: boolean; // Optional: If true, expand existing completed book
  voice_reference?: string; // Optional: Voice samples from original book (auto-extracted if not provided)
  source_document?: string; // Optional: Additional source material for expansion
  target_chapter_words?: number; // Optional: Target words per chapter for expansion (default: 1400)
}

interface BookState {
  book_id: string;
  title: string;
  total_words: number;
  chapters: number;
  status: 'generating' | 'completed';
  content?: string;
  chapter_list?: Array<{ number: number; title: string; word_count: number; content: string }>;
  current_chapter?: number;
  checkpoint_data?: any;
}

/**
 * Parse markdown file and extract structure
 */
function parseMarkdown(markdown: string): {
  title: string;
  chapters: Array<{ level: number; title: string; content: string }>;
  raw_content: string;
} {
  const lines = markdown.split('\n');
  const chapters: Array<{ level: number; title: string; content: string }> = [];
  let currentChapter: { level: number; title: string; content: string } | null = null;
  let title = '';
  let rawContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    rawContent += line + '\n';

    // Extract title (first H1)
    if (!title && line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '').trim();
      continue;
    }

    // Detect chapter headings (H1 or H2)
    if (line.startsWith('# ')) {
      if (currentChapter) {
        chapters.push(currentChapter);
      }
      currentChapter = {
        level: 1,
        title: line.replace(/^#\s+/, '').trim(),
        content: line + '\n',
      };
    } else if (line.startsWith('## ')) {
      if (currentChapter) {
        chapters.push(currentChapter);
      }
      currentChapter = {
        level: 2,
        title: line.replace(/^##\s+/, '').trim(),
        content: line + '\n',
      };
    } else if (currentChapter) {
      currentChapter.content += line + '\n';
    }
  }

  if (currentChapter) {
    chapters.push(currentChapter);
  }

  return {
    title: title || 'Untitled Book',
    chapters,
    raw_content: rawContent,
  };
}

/**
 * Preprocess input based on type
 */
async function preprocessInput(
  inputType: string,
  inputContent?: string,
  filePath?: string
): Promise<{ title: string; content: string; structure: any }> {
  let content = '';
  let title = '';

  switch (inputType) {
    case 'markdown_file':
      if (filePath) {
        // Read from file system (for local testing)
        try {
          const fileContent = await Deno.readTextFile(filePath);
          const parsed = parseMarkdown(fileContent);
          return {
            title: parsed.title,
            content: parsed.raw_content,
            structure: { chapters: parsed.chapters },
          };
        } catch (error) {
          console.error('Error reading markdown file:', error);
          throw new Error(`Failed to read markdown file: ${error.message}`);
        }
      } else if (inputContent) {
        const parsed = parseMarkdown(inputContent);
        return {
          title: parsed.title,
          content: parsed.raw_content,
          structure: { chapters: parsed.chapters },
        };
      }
      throw new Error('markdown_file requires either input_content or input_file_path');

    case 'plain_text':
      if (!inputContent) throw new Error('plain_text requires input_content');
      return {
        title: 'Generated Book',
        content: inputContent,
        structure: {},
      };

    case 'url':
      if (!inputContent) throw new Error('url requires input_content');
      // TODO: Implement URL scraping with Mercury Parser or headless browser
      throw new Error('URL preprocessing not yet implemented');

    case 'google_doc_link':
      if (!inputContent) throw new Error('google_doc_link requires input_content');
      // TODO: Implement Google Docs API extraction
      throw new Error('Google Docs preprocessing not yet implemented');

    case 'notion_page':
      if (!inputContent) throw new Error('notion_page requires input_content');
      // TODO: Implement Notion API extraction
      throw new Error('Notion preprocessing not yet implemented');

    case 'blog_post':
    case 'transcript':
    case 'research_report':
      if (!inputContent) throw new Error(`${inputType} requires input_content`);
      return {
        title: 'Generated Book',
        content: inputContent,
        structure: {},
      };

    default:
      throw new Error(`Unsupported input type: ${inputType}`);
  }
}

/**
 * Get persona profile for a site
 */
async function getPersonaProfile(
  supabase: any,
  siteId: string
): Promise<any> {
  if (!siteId) return null;
  
  try {
    const { data: avatarConfig } = await supabase
      .from('heygen_avatar_config')
      .select('persona_profile')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .single();
    
    return avatarConfig?.persona_profile || null;
  } catch (error) {
    console.warn(`⚠️  Failed to fetch persona profile for site ${siteId}:`, error);
    return null;
  }
}

/**
 * Build persona-enhanced system prompt
 */
function buildPersonaSystemPrompt(
  basePrompt: string,
  personaProfile: any
): string {
  if (!personaProfile) {
    return basePrompt;
  }

  const personaSection = `
## PERSONA VOICE
You are writing as ${personaProfile.name || 'the brand expert'}.
Writing Style: ${personaProfile.voice?.writing_style || 'Clear, conversational'}
Tone: ${personaProfile.voice?.tone || 'Warm but authoritative'}
Worldview: ${personaProfile.voice?.worldview || 'Educational and empowering'}
Philosophy: ${personaProfile.voice?.philosophy || 'Education empowers people'}

${personaProfile.voice?.speech_patterns ? `Speech Patterns: ${personaProfile.voice.speech_patterns}` : ''}
${personaProfile.background ? `Background: ${personaProfile.background}` : ''}
${personaProfile.expertise ? `Expertise: ${personaProfile.expertise.join(', ')}` : ''}

When writing, channel this persona's voice, expertise, and communication style.`;

  return basePrompt + personaSection;
}

/**
 * Generate book outline using AI
 */
async function generateBookOutline(
  sourceContent: string,
  sourceTitle: string,
  targetChapters?: number,
  personaProfile?: any
): Promise<{
  title: string;
  chapters: Array<{ number: number; title: string; description: string }>;
}> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable not set');
  }

  let systemPrompt = `You are a professional nonfiction book editor and outline creator. Your job is to analyze source material and create a comprehensive book outline that expands the content into a full-length book (12-15 chapters, ~15,000 words total).

Guidelines:
- Create engaging chapter titles that are clear and benefit-focused
- Each chapter should be substantial (800-1,200 words)
- Maintain logical flow and progression
- Ensure chapters build upon each other
- Include practical, actionable content in each chapter`;

  // Enhance with persona if available
  systemPrompt = buildPersonaSystemPrompt(systemPrompt, personaProfile);

  const userPrompt = `Analyze the following source material and create a detailed book outline:

SOURCE TITLE: ${sourceTitle}

SOURCE CONTENT:
${sourceContent.substring(0, 5000)}${sourceContent.length > 5000 ? '...' : ''}

Create a book outline with ${targetChapters || '12-15'} chapters. For each chapter, provide:
1. Chapter number
2. Chapter title (engaging and clear)
3. Brief description (2-3 sentences of what will be covered)

Return the response as JSON in this format:
{
  "title": "Book Title (compelling and clear)",
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "description": "What this chapter covers..."
    },
    ...
  ]
}`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content;

  if (!aiResponse) {
    throw new Error('No response from AI');
  }

  try {
    const outline = JSON.parse(aiResponse);
    return outline;
  } catch (error) {
    throw new Error(`Failed to parse outline JSON: ${error.message}`);
  }
}

/**
 * Extract voice reference samples from existing chapters
 */
function extractVoiceReference(
  chapters: Array<{ number: number; title: string; content: string }>,
  numSamples: number = 3
): string {
  if (!chapters || chapters.length === 0) {
    return '';
  }

  // Select diverse samples (beginning, middle, end)
  const samples: string[] = [];
  const step = Math.max(1, Math.floor(chapters.length / numSamples));

  for (let i = 0; i < chapters.length && samples.length < numSamples; i += step) {
    const chapter = chapters[i];
    if (chapter && chapter.content) {
      // Extract first 500-800 words as voice sample
      const words = chapter.content.split(/\s+/);
      const sample = words.slice(0, 600).join(' ');
      if (sample.length > 200) {
        samples.push(`## Sample from Chapter ${chapter.number}: ${chapter.title}\n\n${sample}`);
      }
    }
  }

  return samples.join('\n\n---\n\n');
}

/**
 * Expand an existing chapter while preserving voice
 */
async function expandChapter(
  currentChapter: string,
  chapterNumber: number,
  chapterTitle: string,
  voiceReference: string,
  sourceMaterial: string,
  targetWords: number,
  bookTitle: string,
  previousChapters: Array<{ title: string; content: string }> = [],
  personaProfile?: any
): Promise<string> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable not set');
  }

  let systemPrompt = `You are a professional nonfiction book writer. Your task is to expand a chapter while maintaining a specific editorial voice and incorporating depth from source material.

## VOICE REFERENCE (Maintain This Style Exactly):
${voiceReference.substring(0, 2000)}${voiceReference.length > 2000 ? '...' : ''}

## YOUR WRITING STYLE MUST MATCH:
- The tone, pacing, and voice shown in the VOICE REFERENCE above
- First-person, conversational where appropriate
- Editorial depth and insight
- Narrative flow and storytelling elements
- The specific stylistic patterns from the reference

## SOURCE MATERIAL (Use for Depth):
${sourceMaterial.substring(0, 5000)}${sourceMaterial.length > 5000 ? '...' : ''}

## EXPANSION REQUIREMENTS:
- Target: ${targetWords} words (expand from current ~${currentChapter.split(/\s+/).length} words)
- Incorporate relevant content from SOURCE MATERIAL
- Maintain the VOICE REFERENCE style throughout
- Add depth: examples, stories, explanations, case studies
- Ensure smooth transitions from previous chapters

## CRITICAL INSTRUCTIONS:
1. **Voice First**: Match the editorial voice from VOICE REFERENCE exactly
2. **Depth Second**: Pull substantive content from SOURCE MATERIAL
3. **Expand Thoughtfully**: Don't just add words - add meaningful depth
4. **Maintain Flow**: Ensure narrative continuity with previous chapters
5. **Preserve Structure**: Keep the chapter structure from CURRENT CHAPTER`;

  // Enhance with persona if available
  systemPrompt = buildPersonaSystemPrompt(systemPrompt, personaProfile);

  const previousContext = previousChapters.length > 0
    ? `\n\nPREVIOUS CHAPTERS CONTEXT:\n${previousChapters.slice(-2).map(c => `- ${c.title}`).join('\n')}`
    : '';

  const userPrompt = `Expand Chapter ${chapterNumber}: "${chapterTitle}"

BOOK TITLE: ${bookTitle}

## CURRENT CHAPTER (Expand This):
${currentChapter.substring(0, 3000)}${currentChapter.length > 3000 ? '...' : ''}
${previousContext}

Write an expanded version of this chapter (target: ${targetWords} words) that:
- Matches the voice style from VOICE REFERENCE exactly
- Incorporates depth from SOURCE MATERIAL
- Expands meaningfully on the current chapter content
- Maintains the chapter structure and flow

Start with: "## ${chapterTitle}"`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 6000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const chapterContent = data.choices?.[0]?.message?.content;

  if (!chapterContent) {
    throw new Error('No chapter content generated');
  }

  return chapterContent;
}

/**
 * Generate a single chapter
 */
async function generateChapter(
  chapterNumber: number,
  chapterTitle: string,
  chapterDescription: string,
  sourceContent: string,
  bookTitle: string,
  previousChapters: Array<{ title: string; content: string }> = [],
  personaProfile?: any
): Promise<string> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable not set');
  }

  let systemPrompt = `You are a professional nonfiction book writer specializing in "how-to" books. Your writing style is:

- First-person, conversational tone
- Fun, motivational, and encouraging
- Simple language (Flesch-Kincaid Grade 5 readability)
- Short sentences and paragraphs
- Direct response copywriting style
- Actionable, step-by-step guidance
- Real-life examples and stories
- Practical checklists and resources

Chapter Structure:
1. Big Idea: Introduce the key concept in an exciting, simple way
2. Nuts and Bolts: Step-by-step breakdown, explanations, how-to advice
3. Conclusion: Wrap up key takeaways
4. Checklist: Practical action steps in bullet format
5. Additional Resources: Tools, books, links to dive deeper

Use markdown formatting with H2 and H3 headings, bullet lists, and emojis where appropriate.`;

  // Enhance with persona if available
  systemPrompt = buildPersonaSystemPrompt(systemPrompt, personaProfile);

  const previousContext = previousChapters.length > 0
    ? `\n\nPREVIOUS CHAPTERS CONTEXT:\n${previousChapters.slice(-2).map(c => `- ${c.title}`).join('\n')}`
    : '';

  const userPrompt = `Write Chapter ${chapterNumber}: "${chapterTitle}"

BOOK TITLE: ${bookTitle}
CHAPTER DESCRIPTION: ${chapterDescription}

SOURCE MATERIAL (for reference):
${sourceContent.substring(0, 3000)}${sourceContent.length > 3000 ? '...' : ''}
${previousContext}

Write a complete, engaging chapter (800-1,200 words) following the structure:
- Start with an H2 heading: "## ${chapterTitle}"
- Big Idea section (H3: "### The Big Idea")
- Nuts and Bolts section (H3: "### The Nuts and Bolts")
- Conclusion section (H3: "### Key Takeaways")
- Checklist section (H3: "### Your Action Checklist")
- Additional Resources section (H3: "### Additional Resources")

Write in first-person, conversational tone. Be motivational and practical. Use emojis sparingly but effectively.`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const chapterContent = data.choices?.[0]?.message?.content;

  if (!chapterContent) {
    throw new Error('No chapter content generated');
  }

  return chapterContent;
}

/**
 * Save book state to Supabase
 */
async function saveBookState(
  supabase: any,
  state: BookState
): Promise<void> {
  const { error } = await supabase
    .from('book_generations')
    .upsert({
      id: state.book_id,
      title: state.title,
      total_words: state.total_words,
      chapters: state.chapters,
      status: state.status,
      content: state.content,
      chapter_list: state.chapter_list,
      current_chapter: state.current_chapter,
      checkpoint_data: state.checkpoint_data,
      updated_at: new Date().toISOString(),
      completed_at: state.status === 'completed' ? new Date().toISOString() : null,
    }, {
      onConflict: 'id',
    });

  if (error) {
    console.error('Error saving book state:', error);
    throw error;
  }
}

/**
 * Resume existing book generation from checkpoint
 */
async function resumeBookGeneration(
  supabase: any,
  bookId: string
): Promise<BookState | null> {
  try {
    const { data, error } = await supabase
      .from('book_generations')
      .select('*')
      .eq('id', bookId)
      .single();
    
    if (error || !data) {
      console.warn(`⚠️  Could not find book with id: ${bookId}`);
      return null;
    }
    
    if (data.status === 'completed') {
      console.log(`✅ Book ${bookId} is already completed`);
      return {
        book_id: data.id,
        title: data.title,
        total_words: data.total_words || 0,
        chapters: data.chapters || 0,
        status: 'completed',
        content: data.content,
        chapter_list: data.chapter_list || [],
        current_chapter: data.current_chapter || 0,
        checkpoint_data: data.checkpoint_data,
      };
    }
    
    if (data.status !== 'generating') {
      console.warn(`⚠️  Book ${bookId} has status: ${data.status}, cannot resume`);
      return null;
    }
    
    console.log(`🔄 Resuming book generation from chapter ${data.current_chapter || 0}`);
    
    return {
      book_id: data.id,
      title: data.title,
      total_words: data.total_words || 0,
      chapters: data.chapters || 0,
      status: data.status || 'generating',
      content: data.content,
      chapter_list: data.chapter_list || [],
      current_chapter: data.current_chapter || 0,
      checkpoint_data: data.checkpoint_data,
    };
  } catch (error) {
    console.error('Error resuming book generation:', error);
    return null;
  }
}

/**
 * Load book outline from checkpoint data
 */
function loadOutlineFromCheckpoint(checkpointData: any): {
  title: string;
  chapters: Array<{ number: number; title: string; description: string }>;
} | null {
  if (!checkpointData || !checkpointData.outline) {
    return null;
  }
  
  return checkpointData.outline;
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestBody: BookWriterRequest = await req.json();
    const {
      input_type,
      input_content,
      input_file_path,
      book_title,
      target_length = 15000,
      num_chapters,
      tone = 'fun',
      target_audience,
      stream_output = true,
      site_id,
      book_id,
      resume,
      continue_from_chapter,
      expand_mode,
      voice_reference,
      source_document,
      target_chapter_words = 1400,
    } = requestBody;

    // Check if expanding existing book
    if (book_id && expand_mode) {
      // EXPANSION MODE: Expand existing completed book
      console.log(`📖 Expanding book: ${book_id}`);
      
      const existingBook = await resumeBookGeneration(supabase, book_id);
      
      if (!existingBook || existingBook.status !== 'completed') {
        return new Response(
          JSON.stringify({ error: `Book ${book_id} not found or not completed. Cannot expand incomplete books.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!existingBook.chapter_list || existingBook.chapter_list.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Book has no chapters to expand' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Initialize persona profile
      let expansionPersonaProfile = null;

      // Fetch persona if site_id provided
      if (site_id) {
        expansionPersonaProfile = await getPersonaProfile(supabase, site_id);
      }

      // Extract voice reference from existing chapters
      const extractedVoiceReference = voice_reference || extractVoiceReference(
        existingBook.chapter_list.map(c => ({ number: c.number, title: c.title, content: c.content }))
      );

      if (!extractedVoiceReference) {
        return new Response(
          JSON.stringify({ error: 'Could not extract voice reference from existing book' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get source material (use provided or from checkpoint)
      const expansionSourceMaterial = source_document || existingBook.checkpoint_data?.source_content || '';

      // Create new book state for expanded version
      const expandedBookId = crypto.randomUUID();
      let expandedBookState: BookState = {
        book_id: expandedBookId,
        title: `${existingBook.title} (Expanded)`,
        total_words: 0,
        chapters: existingBook.chapters,
        status: 'generating',
        chapter_list: [],
        current_chapter: 0,
        checkpoint_data: {
          original_book_id: book_id,
          voice_reference: extractedVoiceReference.substring(0, 2000),
          expansion_mode: true,
        },
      };

      await saveBookState(supabase, expandedBookState);

      // Expand each chapter
      console.log(`✍️  Expanding ${existingBook.chapter_list.length} chapters...`);
      const expandedChapters: Array<{ number: number; title: string; word_count: number; content: string }> = [];

      for (let i = 0; i < existingBook.chapter_list.length; i++) {
        const originalChapter = existingBook.chapter_list[i];
        console.log(`📝 Expanding Chapter ${originalChapter.number}: ${originalChapter.title}`);

        try {
          const expandedContent = await expandChapter(
            originalChapter.content,
            originalChapter.number,
            originalChapter.title,
            extractedVoiceReference,
            expansionSourceMaterial,
            target_chapter_words,
            existingBook.title,
            expandedChapters.map(c => ({ title: c.title, content: c.content })),
            expansionPersonaProfile
          );

          const wordCount = expandedContent.split(/\s+/).length;
          expandedChapters.push({
            number: originalChapter.number,
            title: originalChapter.title,
            word_count: wordCount,
            content: expandedContent,
          });

          // Update state
          expandedBookState.current_chapter = originalChapter.number;
          expandedBookState.chapter_list = expandedChapters;
          expandedBookState.total_words = expandedChapters.reduce((sum, c) => sum + c.word_count, 0);

          // Save checkpoint
          await saveBookState(supabase, expandedBookState);
          console.log(`✅ Chapter ${originalChapter.number} expanded (${wordCount} words, checkpoint saved)`);
        } catch (error) {
          console.error(`❌ Error expanding chapter ${originalChapter.number}:`, error);
          
          // Save state even on error
          expandedBookState.status = 'generating';
          await saveBookState(supabase, expandedBookState);
          
          return new Response(
            JSON.stringify({
              book_id: expandedBookId,
              title: expandedBookState.title,
              total_words: expandedBookState.total_words,
              chapters: existingBook.chapters,
              status: 'generating',
              completed_chapters: expandedChapters.length,
              current_chapter: expandedBookState.current_chapter,
              chapters: expandedChapters,
              error: `Failed at chapter ${originalChapter.number}: ${error.message}`,
              message: 'Expansion interrupted. Use book_id and resume=true to continue.',
            }),
            {
              status: 206, // Partial Content
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Assemble full expanded book
      console.log('📑 Assembling expanded book...');
      const frontMatter = `# ${existingBook.title} (Expanded Edition)\n\n*Expanded from original ${existingBook.total_words} words to ${expandedBookState.total_words} words*\n*Generated on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
      const tableOfContents = `## Table of Contents\n\n${expandedChapters.map(c => `${c.number}. ${c.title}`).join('\n')}\n\n---\n\n`;
      const fullContent = frontMatter + tableOfContents + expandedChapters.map(c => c.content).join('\n\n---\n\n');

      // Final state
      expandedBookState.status = 'completed';
      expandedBookState.content = fullContent;
      expandedBookState.total_words = fullContent.split(/\s+/).length;
      expandedBookState.current_chapter = existingBook.chapters;

      await saveBookState(supabase, expandedBookState);

      console.log(`✅ Book expansion complete! Total words: ${expandedBookState.total_words}`);

      return new Response(
        JSON.stringify({
          book_id: expandedBookId,
          title: expandedBookState.title,
          total_words: expandedBookState.total_words,
          chapters: existingBook.chapters,
          status: 'completed',
          content: fullContent,
          chapters: expandedChapters,
          original_book_id: book_id,
          original_words: existingBook.total_words,
          expansion_ratio: `${((expandedBookState.total_words / existingBook.total_words) * 100).toFixed(1)}%`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if resuming existing book
    let bookState: BookState | null = null;
    let outline: { title: string; chapters: Array<{ number: number; title: string; description: string }> } | null = null;
    let sourceContent = '';
    let sourceTitle = '';
    let personaProfile = null;
    let finalTitle = '';
    let startChapterIndex = 0;

    if (book_id && (resume || continue_from_chapter !== undefined)) {
      // RESUME MODE: Load existing book state
      console.log(`🔄 Resuming book generation for book_id: ${book_id}`);
      
      bookState = await resumeBookGeneration(supabase, book_id);
      
      if (!bookState) {
        return new Response(
          JSON.stringify({ error: `Could not resume book with id: ${book_id}. It may not exist or may already be completed.` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (bookState.status === 'completed') {
        // Book already completed, return it
        return new Response(
          JSON.stringify({
            book_id: bookState.book_id,
            title: bookState.title,
            total_words: bookState.total_words,
            chapters: bookState.chapters,
            status: 'completed',
            content: bookState.content,
            chapters: bookState.chapter_list,
            message: 'Book was already completed',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Check if this is an expansion mode book
      if (bookState.checkpoint_data?.expansion_mode) {
        // RESUME EXPANSION MODE
        console.log(`📖 Resuming expansion mode book`);
        
        const originalBookId = bookState.checkpoint_data.original_book_id;
        if (!originalBookId) {
          return new Response(
            JSON.stringify({ error: 'Expansion book missing original book reference' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Load original book to get chapter list
        const originalBook = await resumeBookGeneration(supabase, originalBookId);
        if (!originalBook || !originalBook.chapter_list) {
          return new Response(
            JSON.stringify({ error: 'Could not load original book for expansion resume' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get voice reference and source material from checkpoint
        const extractedVoiceReference = bookState.checkpoint_data.voice_reference || extractVoiceReference(
          originalBook.chapter_list.map(c => ({ number: c.number, title: c.title, content: c.content }))
        );
        const expansionSourceMaterial = source_document || originalBook.checkpoint_data?.source_content || '';
        
        // Fetch persona if site_id provided
        if (site_id) {
          personaProfile = await getPersonaProfile(supabase, site_id);
        }
        
        // Determine starting chapter
        const completedChapters = bookState.chapter_list || [];
        const lastChapterNumber = bookState.current_chapter || 0;
        const remainingChapters = originalBook.chapter_list.filter(c => c.number > lastChapterNumber);
        
        if (remainingChapters.length === 0) {
          // All chapters completed, assemble final book
          const frontMatter = `# ${originalBook.title} (Expanded Edition)\n\n*Expanded from original ${originalBook.total_words} words to ${bookState.total_words} words*\n*Generated on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
          const tableOfContents = `## Table of Contents\n\n${completedChapters.map(c => `${c.number}. ${c.title}`).join('\n')}\n\n---\n\n`;
          const fullContent = frontMatter + tableOfContents + completedChapters.map(c => c.content).join('\n\n---\n\n');
          
          bookState.status = 'completed';
          bookState.content = fullContent;
          bookState.total_words = fullContent.split(/\s+/).length;
          bookState.current_chapter = originalBook.chapters;
          
          await saveBookState(supabase, bookState);
          
          return new Response(
            JSON.stringify({
              book_id: bookState.book_id,
              title: bookState.title,
              total_words: bookState.total_words,
              chapters: originalBook.chapters,
              status: 'completed',
              content: fullContent,
              chapters: completedChapters,
              original_book_id: originalBookId,
              original_words: originalBook.total_words,
              expansion_ratio: `${((bookState.total_words / originalBook.total_words) * 100).toFixed(1)}%`,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        // Continue expanding remaining chapters
        console.log(`✍️  Continuing expansion: ${remainingChapters.length} chapters remaining...`);
        
        for (let i = 0; i < remainingChapters.length; i++) {
          const originalChapter = remainingChapters[i];
          console.log(`📝 Expanding Chapter ${originalChapter.number}: ${originalChapter.title}`);
          
          try {
            const expandedContent = await expandChapter(
              originalChapter.content,
              originalChapter.number,
              originalChapter.title,
              extractedVoiceReference,
              expansionSourceMaterial,
              target_chapter_words,
              originalBook.title,
              completedChapters.map(c => ({ title: c.title, content: c.content })),
              personaProfile
            );
            
            const wordCount = expandedContent.split(/\s+/).length;
            completedChapters.push({
              number: originalChapter.number,
              title: originalChapter.title,
              word_count: wordCount,
              content: expandedContent,
            });
            
            // Update state
            bookState.current_chapter = originalChapter.number;
            bookState.chapter_list = completedChapters;
            bookState.total_words = completedChapters.reduce((sum, c) => sum + c.word_count, 0);
            
            // Save checkpoint
            await saveBookState(supabase, bookState);
            console.log(`✅ Chapter ${originalChapter.number} expanded (${wordCount} words, checkpoint saved)`);
          } catch (error) {
            console.error(`❌ Error expanding chapter ${originalChapter.number}:`, error);
            
            // Save state even on error
            bookState.status = 'generating';
            await saveBookState(supabase, bookState);
            
            return new Response(
              JSON.stringify({
                book_id: bookState.book_id,
                title: bookState.title,
                total_words: bookState.total_words,
                chapters: originalBook.chapters,
                status: 'generating',
                completed_chapters: completedChapters.length,
                current_chapter: bookState.current_chapter,
                chapters: completedChapters,
                error: `Failed at chapter ${originalChapter.number}: ${error.message}`,
                message: 'Expansion interrupted. Use book_id and resume=true to continue.',
              }),
              {
                status: 206, // Partial Content
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        }
        
        // Assemble final expanded book
        console.log('📑 Assembling expanded book...');
        const frontMatter = `# ${originalBook.title} (Expanded Edition)\n\n*Expanded from original ${originalBook.total_words} words to ${bookState.total_words} words*\n*Generated on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
        const tableOfContents = `## Table of Contents\n\n${completedChapters.map(c => `${c.number}. ${c.title}`).join('\n')}\n\n---\n\n`;
        const fullContent = frontMatter + tableOfContents + completedChapters.map(c => c.content).join('\n\n---\n\n');
        
        // Final state
        bookState.status = 'completed';
        bookState.content = fullContent;
        bookState.total_words = fullContent.split(/\s+/).length;
        bookState.current_chapter = originalBook.chapters;
        
        await saveBookState(supabase, bookState);
        
        console.log(`✅ Book expansion complete! Total words: ${bookState.total_words}`);
        
        return new Response(
          JSON.stringify({
            book_id: bookState.book_id,
            title: bookState.title,
            total_words: bookState.total_words,
            chapters: originalBook.chapters,
            status: 'completed',
            content: fullContent,
            chapters: completedChapters,
            original_book_id: originalBookId,
            original_words: originalBook.total_words,
            expansion_ratio: `${((bookState.total_words / originalBook.total_words) * 100).toFixed(1)}%`,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Regular resume mode (not expansion)
      // Load outline from checkpoint
      outline = loadOutlineFromCheckpoint(bookState.checkpoint_data);
      if (!outline) {
        return new Response(
          JSON.stringify({ error: 'Could not load outline from checkpoint. Please start a new generation.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      finalTitle = bookState.title;
      
      // Determine starting chapter
      if (continue_from_chapter !== undefined) {
        startChapterIndex = outline.chapters.findIndex(c => c.number === continue_from_chapter);
        if (startChapterIndex === -1) {
          startChapterIndex = bookState.current_chapter || 0;
        }
      } else {
        // Resume from last completed chapter + 1
        const lastChapterNumber = bookState.current_chapter || 0;
        startChapterIndex = outline.chapters.findIndex(c => c.number > lastChapterNumber);
        if (startChapterIndex === -1) {
          // All chapters completed, just need to assemble
          startChapterIndex = outline.chapters.length;
        }
      }
      
      console.log(`📖 Resuming from chapter index: ${startChapterIndex} (Chapter ${outline.chapters[startChapterIndex]?.number || 'N/A'})`);
      
      // Fetch persona if site_id provided (for consistency)
      if (site_id) {
        personaProfile = await getPersonaProfile(supabase, site_id);
      }
    } else {
      // NEW GENERATION MODE
      if (!input_type) {
        return new Response(
          JSON.stringify({ error: 'input_type is required for new book generation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📚 Starting new book generation - Type: ${input_type}${site_id ? `, Site: ${site_id}` : ''}`);

      // Step 0: Fetch persona profile if site_id provided
      if (site_id) {
        console.log(`👤 Fetching persona profile for site: ${site_id}...`);
        personaProfile = await getPersonaProfile(supabase, site_id);
        if (personaProfile) {
          console.log(`✅ Using persona: ${personaProfile.name || 'Expert'}`);
        } else {
          console.log(`⚠️  No persona profile found for site: ${site_id}, using default voice`);
        }
      }

      // Step 1: Preprocess input
      console.log('📖 Preprocessing input...');
      const preprocessed = await preprocessInput(input_type, input_content, input_file_path);
      sourceContent = preprocessed.content;
      sourceTitle = preprocessed.title;

      // Step 2: Generate book outline
      console.log('📋 Generating book outline...');
      outline = await generateBookOutline(sourceContent, sourceTitle, num_chapters, personaProfile);
      finalTitle = book_title || outline.title;

      // Step 3: Create book state
      const bookId = book_id || crypto.randomUUID();
      bookState = {
        book_id: bookId,
        title: finalTitle,
        total_words: 0,
        chapters: outline.chapters.length,
        status: 'generating',
        chapter_list: [],
        current_chapter: 0,
        checkpoint_data: {
          outline: outline,
          source_content: sourceContent.substring(0, 5000), // Store first 5000 chars for reference
          source_title: sourceTitle,
        },
      };

      // Save initial state with outline in checkpoint
      await saveBookState(supabase, bookState);
    }

    // Step 4: Generate chapters (starting from resume point if applicable)
    const generatedChapters = bookState.chapter_list || [];
    const remainingChapters = outline.chapters.slice(startChapterIndex);
    
    console.log(`✍️  Generating ${remainingChapters.length} remaining chapters (${generatedChapters.length} already completed)...`);

    for (let i = 0; i < remainingChapters.length; i++) {
      const chapterOutline = remainingChapters[i];
      const chapterIndex = startChapterIndex + i;
      
      console.log(`📝 Writing Chapter ${chapterOutline.number}: ${chapterOutline.title} (${chapterIndex + 1}/${outline.chapters.length})`);

      try {
        // Get source content from checkpoint if resuming
        const chapterSourceContent = sourceContent || bookState.checkpoint_data?.source_content || '';
        
        const chapterContent = await generateChapter(
          chapterOutline.number,
          chapterOutline.title,
          chapterOutline.description,
          chapterSourceContent,
          finalTitle,
          generatedChapters.map(c => ({ title: c.title, content: c.content })),
          personaProfile
        );

        const wordCount = chapterContent.split(/\s+/).length;
        generatedChapters.push({
          number: chapterOutline.number,
          title: chapterOutline.title,
          word_count: wordCount,
          content: chapterContent,
        });

        // Update state
        bookState.current_chapter = chapterOutline.number;
        bookState.chapter_list = generatedChapters;
        bookState.total_words = generatedChapters.reduce((sum, c) => sum + c.word_count, 0);

        // Save checkpoint after each chapter (critical for timeout resilience)
        await saveBookState(supabase, bookState);
        console.log(`✅ Chapter ${chapterOutline.number} saved (checkpoint updated)`);
      } catch (error) {
        console.error(`❌ Error generating chapter ${chapterOutline.number}:`, error);
        
        // Save state even on error so we can resume
        bookState.status = 'generating'; // Keep as generating so it can be resumed
        await saveBookState(supabase, bookState);
        
        // Return partial progress so caller can resume
        return new Response(
          JSON.stringify({
            book_id: bookState.book_id,
            title: finalTitle,
            total_words: bookState.total_words,
            chapters: outline.chapters.length,
            status: 'generating',
            completed_chapters: generatedChapters.length,
            current_chapter: bookState.current_chapter,
            chapters: generatedChapters,
            error: `Failed at chapter ${chapterOutline.number}: ${error.message}`,
            message: 'Generation interrupted. Use book_id and resume=true to continue.',
          }),
          {
            status: 206, // Partial Content
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Step 5: Assemble full book
    console.log('📑 Assembling full book...');
    const frontMatter = `# ${finalTitle}\n\n*Generated on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
    const tableOfContents = `## Table of Contents\n\n${outline.chapters.map(c => `${c.number}. ${c.title}`).join('\n')}\n\n---\n\n`;
    const fullContent = frontMatter + tableOfContents + generatedChapters.map(c => c.content).join('\n\n---\n\n');

    // Final state
    bookState.status = 'completed';
    bookState.content = fullContent;
    bookState.total_words = fullContent.split(/\s+/).length;
    bookState.current_chapter = outline.chapters.length; // Mark all chapters complete

    await saveBookState(supabase, bookState);

    console.log(`✅ Book generation complete! Total words: ${bookState.total_words}`);

    return new Response(
      JSON.stringify({
        book_id: bookState.book_id,
        title: finalTitle,
        total_words: bookState.total_words,
        chapters: outline.chapters.length,
        status: 'completed',
        content: fullContent,
        chapters: generatedChapters,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error generating book:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate book',
        details: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

