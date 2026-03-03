/**
 * Test script for nonfiction-book-writer edge function
 * 
 * Tests the function with the retirement income blueprint markdown file
 */

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTY3ODcsImV4cCI6MjA2NTkzMjc4N30.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/nonfiction-book-writer`;

const fs = require('fs');
const path = require('path');

async function testBookGeneration() {
  console.log('📚 Testing Nonfiction Book Writer Function\n');

  // Read the markdown file
  const markdownPath = path.join(
    __dirname,
    '../../../docs/The Complete \'$47 Retirement Income Blueprint\' Content Outline.md'
  );

  if (!fs.existsSync(markdownPath)) {
    console.error('❌ Markdown file not found at:', markdownPath);
    console.log('Please ensure the file exists in the docs directory');
    return;
  }

  const markdownContent = fs.readFileSync(markdownPath, 'utf-8');
  console.log(`✅ Loaded markdown file (${markdownContent.length} characters)\n`);

  // Prepare request
  const requestBody = {
    input_type: 'markdown_file',
    input_content: markdownContent,
    book_title: 'The Retirement Income Blueprint: 7 Proven Strategies to Never Run Out of Money',
    target_length: 15000,
    num_chapters: 12,
    tone: 'fun',
    target_audience: 'retirees and pre-retirees',
    stream_output: false, // For testing, we'll wait for complete response
    site_id: 'seniorsimple', // Use SeniorSimple persona profile
  };

  console.log('📤 Sending request to edge function...\n');
  console.log('Request config:', {
    input_type: requestBody.input_type,
    book_title: requestBody.book_title,
    target_length: requestBody.target_length,
    num_chapters: requestBody.num_chapters,
  });
  console.log('');

  try {
    const startTime = Date.now();
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Request completed in ${elapsed} seconds\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', response.status, response.statusText);
      console.error('Error details:', errorText);
      return;
    }

    const result = await response.json();
    
    console.log('✅ Book generation successful!\n');
    console.log('📊 Results:');
    console.log(`   Book ID: ${result.book_id}`);
    console.log(`   Title: ${result.title}`);
    console.log(`   Total Words: ${result.total_words}`);
    console.log(`   Chapters: ${result.chapters}`);
    console.log(`   Status: ${result.status}\n`);

    if (result.chapters && result.chapters.length > 0) {
      console.log('📑 Chapter Summary:');
      result.chapters.forEach((chapter, index) => {
        console.log(`   ${chapter.number}. ${chapter.title} (${chapter.word_count} words)`);
      });
      console.log('');
    }

    // Save the generated book to a file
    if (result.content) {
      const outputPath = path.join(__dirname, 'generated-book.md');
      fs.writeFileSync(outputPath, result.content, 'utf-8');
      console.log(`💾 Full book saved to: ${outputPath}\n`);
    }

    // Save individual chapters
    if (result.chapters && result.chapters.length > 0) {
      const chaptersDir = path.join(__dirname, 'chapters');
      if (!fs.existsSync(chaptersDir)) {
        fs.mkdirSync(chaptersDir, { recursive: true });
      }

      result.chapters.forEach((chapter) => {
        const chapterPath = path.join(chaptersDir, `chapter-${chapter.number}-${chapter.title.toLowerCase().replace(/\s+/g, '-')}.md`);
        fs.writeFileSync(chapterPath, chapter.content, 'utf-8');
      });

      console.log(`📁 Individual chapters saved to: ${chaptersDir}\n`);
    }

    console.log('🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testBookGeneration();
}

module.exports = { testBookGeneration };

