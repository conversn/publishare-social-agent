/**
 * Script to remove broken keyword-based links from articles
 * These are links like /articles/loans, /articles/business that don't point to real articles
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function removeBrokenKeywordLinks(siteId = 'rateroots') {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
    process.exit(1);
  }

  console.log(`🔗 Removing broken keyword-based links for site: ${siteId}\n`);

  try {
    // Get all published articles for the site
    const articlesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?site_id=eq.${siteId}&status=eq.published&select=id,title,content,html_body`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );

    if (!articlesResponse.ok) {
      throw new Error(`Failed to fetch articles: ${articlesResponse.status}`);
    }

    const articles = await articlesResponse.json();
    console.log(`📄 Found ${articles.length} articles to process\n`);

    let totalRemoved = 0;
    let articlesUpdated = 0;

    for (const article of articles) {
      const content = article.html_body || article.content || '';
      const isHtml = !!article.html_body;
      
      // Pattern to match broken keyword links: /articles/{single-word}
      // These are typically fake keyword-based links
      const brokenLinkPattern = isHtml
        ? /<a[^>]+href=["']\/articles\/[^\/"']+["'][^>]*>([^<]+)<\/a>/gi
        : /\[([^\]]+)\]\(\/articles\/[^\/)]+\)/g;

      let updatedContent = content;
      let removedCount = 0;
      let match;

      // Remove broken links and replace with plain text
      if (isHtml) {
        updatedContent = updatedContent.replace(brokenLinkPattern, (match, linkText) => {
          removedCount++;
          return linkText; // Replace with just the text
        });
      } else {
        updatedContent = updatedContent.replace(brokenLinkPattern, (match, linkText) => {
          removedCount++;
          return linkText; // Replace with just the text
        });
      }

      if (removedCount > 0) {
        // Update article
        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/articles?id=eq.${article.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              [isHtml ? 'html_body' : 'content']: updatedContent,
              updated_at: new Date().toISOString()
            })
          }
        );

        if (updateResponse.ok) {
          console.log(`✅ ${article.title}: Removed ${removedCount} broken link(s)`);
          totalRemoved += removedCount;
          articlesUpdated++;
        } else {
          console.error(`❌ Failed to update: ${article.title}`);
        }
      }
    }

    console.log(`\n✨ Complete!`);
    console.log(`   Articles updated: ${articlesUpdated}`);
    console.log(`   Total links removed: ${totalRemoved}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const siteId = args.find(arg => arg.startsWith('--site='))?.split('=')[1] || 'rateroots';

removeBrokenKeywordLinks(siteId);




