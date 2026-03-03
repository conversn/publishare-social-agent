/**
 * Helper script to resume book generation if it times out
 * 
 * This script automatically checks for incomplete books and continues generation
 * until completion.
 * 
 * Usage:
 *   node resume-book-generation.js [book_id]
 * 
 * If book_id is provided, resumes that specific book.
 * If not provided, finds and resumes the most recent incomplete book.
 */

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTY3ODcsImV4cCI6MjA2NTkzMjc4N30.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/nonfiction-book-writer`;

async function findIncompleteBooks() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/book_generations?select=id,title,status,current_chapter,chapters,updated_at&status=eq.generating&order=updated_at.desc&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch books: ${response.status}`);
  }

  return await response.json();
}

async function resumeBook(bookId) {
  console.log(`\n🔄 Resuming book generation: ${bookId}\n`);

  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      book_id: bookId,
      resume: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to resume: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result;
}

async function checkAndResume(bookId = null) {
  try {
    if (bookId) {
      // Resume specific book
      const result = await resumeBook(bookId);
      
      if (result.status === 'completed') {
        console.log('✅ Book completed!');
        console.log(`   Title: ${result.title}`);
        console.log(`   Total Words: ${result.total_words}`);
        console.log(`   Chapters: ${result.chapters}`);
        return { completed: true, book_id: bookId };
      } else {
        console.log(`⏳ Book still generating...`);
        console.log(`   Completed: ${result.completed_chapters || 0}/${result.chapters}`);
        console.log(`   Current Chapter: ${result.current_chapter}`);
        return { completed: false, book_id: bookId, result };
      }
    } else {
      // Find and resume most recent incomplete book
      console.log('🔍 Finding incomplete books...\n');
      const incompleteBooks = await findIncompleteBooks();

      if (incompleteBooks.length === 0) {
        console.log('✅ No incomplete books found.');
        return { completed: true };
      }

      console.log(`Found ${incompleteBooks.length} incomplete book(s):\n`);
      incompleteBooks.forEach((book, index) => {
        console.log(`${index + 1}. ${book.title}`);
        console.log(`   ID: ${book.id}`);
        console.log(`   Progress: ${book.current_chapter || 0}/${book.chapters} chapters`);
        console.log(`   Last Updated: ${new Date(book.updated_at).toLocaleString()}\n`);
      });

      // Resume the most recent one
      const mostRecent = incompleteBooks[0];
      console.log(`📚 Resuming most recent: ${mostRecent.title}\n`);
      
      const result = await resumeBook(mostRecent.id);
      
      if (result.status === 'completed') {
        console.log('✅ Book completed!');
        console.log(`   Title: ${result.title}`);
        console.log(`   Total Words: ${result.total_words}`);
        console.log(`   Chapters: ${result.chapters}`);
        return { completed: true, book_id: mostRecent.id };
      } else {
        console.log(`⏳ Book still generating...`);
        console.log(`   Completed: ${result.completed_chapters || 0}/${result.chapters}`);
        console.log(`   Current Chapter: ${result.current_chapter}`);
        console.log(`\n💡 Run again to continue: node resume-book-generation.js ${mostRecent.id}`);
        return { completed: false, book_id: mostRecent.id, result };
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return { completed: false, error: error.message };
  }
}

// Auto-retry logic: Keep resuming until complete
async function resumeUntilComplete(bookId = null, maxAttempts = 10) {
  let attempts = 0;
  let lastBookId = bookId;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Attempt ${attempts}/${maxAttempts}`);
    console.log('='.repeat(60));

    const result = await checkAndResume(lastBookId);

    if (result.completed) {
      console.log(`\n🎉 Successfully completed after ${attempts} attempt(s)!`);
      return result;
    }

    if (result.error) {
      console.error(`\n❌ Error on attempt ${attempts}:`, result.error);
      if (attempts >= maxAttempts) {
        throw new Error(`Failed after ${maxAttempts} attempts`);
      }
      // Wait before retrying
      console.log('⏳ Waiting 5 seconds before retry...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      continue;
    }

    // Update book_id for next attempt
    if (result.book_id) {
      lastBookId = result.book_id;
    }

    // If still generating, wait before next attempt
    if (result.result && result.result.status === 'generating') {
      console.log('\n⏳ Waiting 10 seconds before next continuation...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    } else {
      // Something unexpected happened
      break;
    }
  }

  if (lastBookId) {
    console.log(`\n⚠️  Reached max attempts. Book may still be incomplete.`);
    console.log(`💡 Resume manually: node resume-book-generation.js ${lastBookId}`);
  }

  return { completed: false, book_id: lastBookId };
}

// Main execution
if (require.main === module) {
  const bookId = process.argv[2] || null;
  const autoRetry = process.argv.includes('--auto-retry') || process.argv.includes('-a');

  if (autoRetry) {
    console.log('🚀 Auto-retry mode: Will continue until book is complete\n');
    resumeUntilComplete(bookId)
      .then(result => {
        if (result.completed) {
          process.exit(0);
        } else {
          process.exit(1);
        }
      })
      .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  } else {
    checkAndResume(bookId)
      .then(result => {
        if (result.completed) {
          process.exit(0);
        } else {
          console.log('\n💡 Tip: Use --auto-retry flag to automatically continue until complete');
          process.exit(1);
        }
      })
      .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  }
}

module.exports = { checkAndResume, resumeUntilComplete };


