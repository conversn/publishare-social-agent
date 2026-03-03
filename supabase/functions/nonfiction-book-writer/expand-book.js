/**
 * Helper script to expand an existing completed book
 * 
 * Usage:
 *   node expand-book.js <book_id> [target_chapter_words] [source_document_path]
 * 
 * Example:
 *   node expand-book.js 103c9c20-9945-401b-a363-5d293fc2eab6 1400
 */

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTY3ODcsImV4cCI6MjA2NTkzMjc4N30.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/nonfiction-book-writer`;

const fs = require('fs');
const https = require('https');

async function checkBookStatus(bookId) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/rest/v1/book_generations?select=id,title,status,total_words,chapters&id=eq.${bookId}`;
    
    https.get(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result[0] || null);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function expandBook(bookId, targetChapterWords = 1400, sourceDocument = null) {
  return new Promise((resolve, reject) => {
    const payload = {
      book_id: bookId,
      expand_mode: true,
      target_chapter_words: targetChapterWords,
    };

    if (sourceDocument) {
      payload.source_document = sourceDocument;
    }

    const data = JSON.stringify(payload);

    const options = {
      hostname: 'vpysqshhafthuxvokwqj.supabase.co',
      path: '/functions/v1/nonfiction-book-writer',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function monitorExpansion(expandedBookId) {
  console.log(`\n📊 Monitoring expansion progress...\n`);
  
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    const book = await checkBookStatus(expandedBookId);
    
    if (!book) {
      console.log(`[${i + 1}] Book not found yet...`);
      continue;
    }

    const progress = book.status === 'completed' 
      ? '✅ COMPLETED'
      : `Chapter ${book.current_chapter || 0}/${book.chapters || 0}`;
    
    console.log(`[${i + 1}] ${book.status.toUpperCase()} | ${progress} | ${book.total_words || 0} words`);

    if (book.status === 'completed') {
      return book;
    }
  }

  return null;
}

async function main() {
  const bookId = process.argv[2];
  const targetWords = parseInt(process.argv[3]) || 1400;
  const sourceDocPath = process.argv[4];

  if (!bookId) {
    console.error('❌ Error: Book ID required');
    console.log('\nUsage: node expand-book.js <book_id> [target_chapter_words] [source_document_path]');
    console.log('\nExample:');
    console.log('  node expand-book.js 103c9c20-9945-401b-a363-5d293fc2eab6 1400');
    process.exit(1);
  }

  console.log(`📖 Checking book: ${bookId}\n`);

  // Check if book exists and is completed
  const originalBook = await checkBookStatus(bookId);
  
  if (!originalBook) {
    console.error(`❌ Book ${bookId} not found`);
    process.exit(1);
  }

  if (originalBook.status !== 'completed') {
    console.error(`❌ Book is not completed (status: ${originalBook.status}). Cannot expand incomplete books.`);
    process.exit(1);
  }

  console.log(`✅ Found book: "${originalBook.title}"`);
  console.log(`   Current: ${originalBook.total_words} words, ${originalBook.chapters} chapters`);
  console.log(`   Target: ~${targetWords * originalBook.chapters} words (${targetWords} per chapter)\n`);

  // Load source document if provided
  let sourceDocument = null;
  if (sourceDocPath) {
    try {
      sourceDocument = fs.readFileSync(sourceDocPath, 'utf-8');
      console.log(`📄 Loaded source document: ${sourceDocument.length} characters\n`);
    } catch (error) {
      console.warn(`⚠️  Could not read source document: ${error.message}`);
    }
  }

  // Start expansion
  console.log('🚀 Starting expansion...\n');
  
  try {
    const result = await expandBook(bookId, targetWords, sourceDocument);
    
    if (result.status === 200 && result.data.book_id) {
      const expandedBookId = result.data.book_id;
      console.log(`✅ Expansion started!`);
      console.log(`   Expanded Book ID: ${expandedBookId}`);
      console.log(`   Original Book ID: ${bookId}\n`);

      // Monitor progress
      const finalBook = await monitorExpansion(expandedBookId);
      
      if (finalBook && finalBook.status === 'completed') {
        console.log(`\n🎉 Expansion complete!`);
        console.log(`   Title: ${finalBook.title}`);
        console.log(`   Total Words: ${finalBook.total_words}`);
        console.log(`   Chapters: ${finalBook.chapters}`);
        console.log(`   Expansion Ratio: ${((finalBook.total_words / originalBook.total_words) * 100).toFixed(1)}%`);
        console.log(`\n💡 Expanded book ID: ${expandedBookId}`);
      } else {
        console.log(`\n⏳ Expansion in progress. Use resume script to continue if needed.`);
        console.log(`   Expanded Book ID: ${expandedBookId}`);
      }
    } else if (result.status === 206) {
      // Partial content - expansion interrupted
      console.log(`\n⏳ Expansion interrupted (timeout). Progress saved.`);
      console.log(`   Expanded Book ID: ${result.data.book_id}`);
      console.log(`   Completed: ${result.data.completed_chapters || 0}/${result.data.chapters || 0} chapters`);
      console.log(`\n💡 Resume with: node resume-book-generation.js ${result.data.book_id}`);
    } else {
      console.error(`\n❌ Expansion failed:`, result.data);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { expandBook, checkBookStatus };


