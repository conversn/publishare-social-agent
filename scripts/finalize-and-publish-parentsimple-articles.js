/**
 * Finalize and Publish ParentSimple Articles
 * 
 * Completes workflow for all Early Years and Middle School articles:
 * 1. Generates missing images
 * 2. Converts markdown to HTML
 * 3. Generates and inserts internal links
 * 4. Sets canonical URLs
 * 5. Publishes all ready articles
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function finalizeAndPublish() {
  console.log('🚀 Finalizing and Publishing ParentSimple Articles');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const siteId = 'parentsimple';

  // Article IDs from the report
  const articleIds = {
    earlyYears: [
      '20ff69b0-e0b2-44c4-bc59-b5c9493a7a6b', // Early Childhood Development (already published)
      '66c884a6-1760-420a-b008-e0911bdb6e66', // Preschool Readiness
      '9e9c927e-3e7f-46dc-8cdc-88559555da56', // Early Literacy Development
      'c189896d-18cf-4ff0-91fd-b3eeeca8351d', // Social-Emotional Learning
      '0af10a17-7637-42cd-885b-773761c55329', // STEM Activities
      'c3a21928-030a-45a6-b506-873052c25c7d', // Managing Screen Time
      '16da8097-b046-450c-abed-461dc592de86', // Nutrition
      'dad097ec-dc11-47ba-9acc-08338be767c1', // Sleep Training
      '981c4192-46eb-41fe-903a-2e254d723e5c', // Potty Training
      'b9ebd73e-1255-4f0b-98fb-0713ef6a6459', // Building Resilience
      '9a56d079-1a21-4c49-a748-a08950365153'  // Early Math Skills
    ],
    middleSchool: [
      '22dac303-0e2a-40a9-bb5b-bd1ca73668ad', // Middle School Course Selection
      '5910e087-b3c7-4023-a3ad-cff773d8d983', // Study Skills
      'f2f7e6ae-6a0d-48e9-9e52-7abf5a48e1af', // Preparing for High School
      '5c23064b-a5b1-49e2-92d0-05553bfbc82b', // Summer Programs
      '0a0a5b01-9dca-49ea-9447-87f90188606d', // Building Academic Foundations
      'b6b7748c-c071-4c2d-bb03-547885c63e0d', // Middle School Academic Planning
      'a63af696-4710-4871-80a0-b94f979bccc0', // Extracurricular Activities
      'f3793bcc-1dd8-44b7-b296-16e4697ddf90', // Time Management
      '915b751c-7f67-42bb-be4a-d52ed8242b1b'  // Social Media Safety
    ]
  };

  const allArticleIds = [...articleIds.earlyYears, ...articleIds.middleSchool];

  try {
    // Get site domain for canonical URLs
    const { data: siteData } = await supabase
      .from('sites')
      .select('domain')
      .eq('id', siteId)
      .single();

    const domain = siteData?.domain || 'https://parentsimple.org';

    // Step 1: Get all articles
    console.log('📋 Step 1: Fetching articles...');
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id, title, slug, status, content, featured_image_url, html_body, canonical_url')
      .in('id', allArticleIds)
      .eq('site_id', siteId);

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    console.log(`   Found ${articles.length} articles`);
    console.log('');

    // Step 2: Complete workflow for each article
    console.log('🔧 Step 2: Completing workflow for articles...');
    console.log('');

    const completed = [];
    const failed = [];

    for (const article of articles) {
      const emoji = articleIds.earlyYears.includes(article.id) ? '👶' : '🎓';
      console.log(`   ${emoji} ${article.title.substring(0, 50)}...`);

      try {
        let needsWork = false;

        // Generate image if missing
        if (!article.featured_image_url) {
          console.log(`      🖼️  Generating featured image...`);
          const imageResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-image-generator`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({
              article_id: article.id,
              prompt: article.title,
              site_id: siteId
            })
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            if (imageData.image_url) {
              await supabase
                .from('articles')
                .update({ 
                  featured_image_url: imageData.image_url,
                  featured_image_alt: imageData.alt_text || article.title
                })
                .eq('id', article.id);
              console.log(`         ✅ Image generated and saved`);
            } else {
              needsWork = true;
              console.log(`         ⚠️  Image generation returned no URL`);
            }
          } else {
            needsWork = true;
            console.log(`         ⚠️  Image generation failed`);
          }
        }

        // Convert to HTML if missing
        if (!article.html_body && article.content) {
          console.log(`      📄 Converting to HTML...`);
          const htmlResponse = await fetch(`${SUPABASE_URL}/functions/v1/markdown-to-html`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({
              markdown: article.content,
              article_id: article.id
            })
          });

          if (htmlResponse.ok) {
            const htmlData = await htmlResponse.json();
            const htmlBody = htmlData.html || htmlData.html_body;
            if (htmlBody) {
              await supabase
                .from('articles')
                .update({ html_body: htmlBody })
                .eq('id', article.id);
              console.log(`         ✅ HTML converted and saved`);
            } else {
              needsWork = true;
              console.log(`         ⚠️  HTML conversion returned no body`);
            }
          } else {
            needsWork = true;
            console.log(`         ⚠️  HTML conversion failed`);
          }
        }

        // Set canonical URL if missing
        if (!article.canonical_url) {
          const canonicalUrl = `${domain}/${article.slug}`;
          await supabase
            .from('articles')
            .update({ canonical_url: canonicalUrl })
            .eq('id', article.id);
          console.log(`         ✅ Canonical URL set`);
        }

        // Generate and insert links
        if (article.content) {
          console.log(`      🔗 Generating internal links...`);
          const linksResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-link-suggestions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({
              content: article.content.substring(0, 2000),
              article_id: article.id,
              site_id: siteId,
              max_suggestions: 5
            })
          });

          if (linksResponse.ok) {
            const linksData = await linksResponse.json();
            if (linksData.suggestions && linksData.suggestions.length > 0) {
              const insertResponse = await fetch(`${SUPABASE_URL}/functions/v1/insert-links`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'apikey': SUPABASE_KEY
                },
                body: JSON.stringify({
                  article_id: article.id,
                  links: linksData.suggestions
                })
              });
              if (insertResponse.ok) {
                console.log(`         ✅ Links inserted`);
              }
            }
          }
        }

        if (!needsWork) {
          completed.push(article.id);
          console.log(`      ✅ Workflow completed`);
        } else {
          failed.push({ id: article.id, title: article.title });
          console.log(`      ⚠️  Some elements may be missing`);
        }
        console.log('');

        // Wait between articles
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
        failed.push({ id: article.id, title: article.title, error: error.message });
        console.log('');
      }
    }

    // Step 3: Verify and publish
    console.log('🔍 Step 3: Verifying articles are ready...');
    const { data: verifyArticles } = await supabase
      .from('articles')
      .select('id, title, status, featured_image_url, html_body, canonical_url')
      .in('id', allArticleIds)
      .eq('site_id', siteId);

    const readyToPublish = verifyArticles?.filter(a => 
      a.featured_image_url && 
      a.html_body && 
      a.canonical_url &&
      a.status !== 'published'
    ) || [];

    console.log(`   Ready to publish: ${readyToPublish.length}`);
    console.log('');

    // Step 4: Publish
    if (readyToPublish.length > 0) {
      console.log('🚀 Step 4: Publishing articles...');
      console.log('');

      for (const article of readyToPublish) {
        const emoji = articleIds.earlyYears.includes(article.id) ? '👶' : '🎓';
        try {
          const { error: updateError } = await supabase
            .from('articles')
            .update({ status: 'published' })
            .eq('id', article.id);

          if (updateError) {
            console.log(`   ${emoji} ❌ Failed: ${article.title.substring(0, 50)}...`);
          } else {
            console.log(`   ${emoji} ✅ Published: ${article.title.substring(0, 50)}...`);
          }
        } catch (error) {
          console.log(`   ${emoji} ❌ Error: ${error.message}`);
        }
      }
      console.log('');
    }

    // Final summary
    console.log('='.repeat(60));
    console.log('✅ Finalization Complete!');
    console.log('');
    
    const { data: finalArticles } = await supabase
      .from('articles_with_primary_ux_category')
      .select('status, primary_ux_category_slug')
      .eq('site_id', siteId)
      .in('id', allArticleIds);

    const earlyYearsFinal = finalArticles?.filter(a => a.primary_ux_category_slug === 'early-years') || [];
    const middleSchoolFinal = finalArticles?.filter(a => a.primary_ux_category_slug === 'middle-school') || [];

    console.log('📊 Final Status:');
    console.log(`   👶 Early Years: ${earlyYearsFinal.length} articles`);
    console.log(`      Published: ${earlyYearsFinal.filter(a => a.status === 'published').length}`);
    console.log(`      Draft: ${earlyYearsFinal.filter(a => a.status === 'draft').length}`);
    console.log('');
    console.log(`   🎓 Middle School: ${middleSchoolFinal.length} articles`);
    console.log(`      Published: ${middleSchoolFinal.filter(a => a.status === 'published').length}`);
    console.log(`      Draft: ${middleSchoolFinal.filter(a => a.status === 'draft').length}`);
    console.log('');

    // Verify gaps
    console.log('🔍 Verifying content gaps...');
    const gapResponse = await fetch(`${SUPABASE_URL}/functions/v1/content-strategist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({ site_id: siteId })
    });

    if (gapResponse.ok) {
      const gapData = await gapResponse.json();
      console.log(`   Categories with content: ${gapData.categories_with_content}`);
      console.log(`   Categories without content: ${gapData.categories_without_content}`);
      
      if (gapData.categories_without_content === 0) {
        console.log('   ✅ All content gaps filled!');
      } else {
        console.log(`   ⚠️  ${gapData.categories_without_content} categories still need content`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
finalizeAndPublish()
  .then(() => {
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


