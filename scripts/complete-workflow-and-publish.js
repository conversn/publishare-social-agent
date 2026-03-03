/**
 * Complete Workflow and Publish Articles
 * 
 * 1. Completes workflow for existing drafts (images, HTML, links, etc.)
 * 2. Generates final Middle School article
 * 3. Publishes all articles when ready
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function completeWorkflowAndPublish() {
  console.log('🚀 Completing Workflow and Publishing Articles');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const siteId = 'parentsimple';

  try {
    // Step 1: Get all draft articles for Early Years and Middle School
    console.log('📋 Step 1: Finding draft articles...');
    const { data: draftArticles, error: draftError } = await supabase
      .from('articles_with_primary_ux_category')
      .select('id, title, status, primary_ux_category_slug, featured_image_url, html_body, content, canonical_url')
      .eq('site_id', siteId)
      .in('primary_ux_category_slug', ['early-years', 'middle-school'])
      .in('status', ['draft', 'published'])
      .order('created_at', { ascending: false });

    if (draftError) {
      throw new Error(`Failed to fetch articles: ${draftError.message}`);
    }

    const earlyYears = draftArticles?.filter(a => a.primary_ux_category_slug === 'early-years') || [];
    const middleSchool = draftArticles?.filter(a => a.primary_ux_category_slug === 'middle-school') || [];

    console.log(`   👶 Early Years: ${earlyYears.length} articles`);
    console.log(`   🎓 Middle School: ${middleSchool.length} articles`);
    console.log('');

    // Step 2: Complete workflow for articles missing elements
    console.log('🔧 Step 2: Completing workflow for articles...');
    
    const articlesNeedingWork = draftArticles?.filter(article => {
      return !article.featured_image_url || !article.html_body || !article.canonical_url;
    }) || [];

    console.log(`   Found ${articlesNeedingWork.length} articles needing workflow completion`);
    console.log('');

    for (const article of articlesNeedingWork) {
      const emoji = article.primary_ux_category_slug === 'early-years' ? '👶' : '🎓';
      console.log(`   ${emoji} Completing workflow for: ${article.title.substring(0, 50)}...`);
      
      const needs = [];
      if (!article.featured_image_url) needs.push('image');
      if (!article.html_body) needs.push('HTML');
      if (!article.canonical_url) needs.push('canonical URL');
      console.log(`      Missing: ${needs.join(', ')}`);

      try {
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
            console.log(`         ✅ Image generated`);
          } else {
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
            console.log(`         ✅ HTML converted`);
          } else {
            console.log(`         ⚠️  HTML conversion failed`);
          }
        }

        // Generate links if missing
        console.log(`      🔗 Generating internal links...`);
        const linksResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-link-suggestions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'apikey': SUPABASE_KEY
          },
          body: JSON.stringify({
            content: article.content?.substring(0, 2000) || '',
            article_id: article.id,
            site_id: siteId,
            max_suggestions: 5
          })
        });

        if (linksResponse.ok) {
          const linksData = await linksResponse.json();
          if (linksData.suggestions && linksData.suggestions.length > 0) {
            // Insert links
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

        // Update canonical URL if missing
        if (!article.canonical_url) {
          const { data: siteData } = await supabase
            .from('sites')
            .select('domain')
            .eq('id', siteId)
            .single();

          const domain = siteData?.domain || 'https://parentsimple.org';
          const slug = article.title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          const canonicalUrl = `${domain}/${slug}`;

          await supabase
            .from('articles')
            .update({ canonical_url: canonicalUrl })
            .eq('id', article.id);

          console.log(`         ✅ Canonical URL set`);
        }

        console.log(`      ✅ Workflow completed`);
        console.log('');

        // Wait between articles
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
        console.log('');
      }
    }

    // Step 3: Generate final Middle School article if needed
    console.log('📝 Step 3: Checking if final Middle School article needed...');
    if (middleSchool.length < 10) {
      const needed = 10 - middleSchool.length;
      console.log(`   Need ${needed} more Middle School article(s)`);
      console.log('');

      // Get content strategist recommendations
      const strategyResponse = await fetch(`${SUPABASE_URL}/functions/v1/content-strategist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY
        },
        body: JSON.stringify({
          site_id: siteId,
          create_strategy_entries: true,
          ux_categories: ['middle-school']
        })
      });

      if (strategyResponse.ok) {
        const strategyData = await strategyResponse.json();
        console.log(`   ✅ Created ${strategyData.strategy_entries_created || 0} strategy entries`);
        console.log('');

        // Process via batch-strategy-processor
        if (strategyData.strategy_entries_created > 0) {
          console.log('   🚀 Processing via batch-strategy-processor...');
          const batchResponse = await fetch(`${SUPABASE_URL}/functions/v1/batch-strategy-processor`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({
              site_id: siteId,
              limit: needed
            })
          });

          if (batchResponse.ok) {
            const batchData = await batchResponse.json();
            console.log(`   ✅ Generated ${batchData.succeeded || 0} article(s)`);
            console.log('');
          }
        }
      }
    } else {
      console.log('   ✅ Already have 10+ Middle School articles');
      console.log('');
    }

    // Step 4: Verify all articles are ready
    console.log('🔍 Step 4: Verifying articles are ready for publishing...');
    const { data: allArticles, error: verifyError } = await supabase
      .from('articles_with_primary_ux_category')
      .select('id, title, status, primary_ux_category_slug, featured_image_url, html_body, canonical_url, focus_keyword, og_title')
      .eq('site_id', siteId)
      .in('primary_ux_category_slug', ['early-years', 'middle-school'])
      .in('status', ['draft', 'published']);

    if (verifyError) {
      throw new Error(`Failed to verify articles: ${verifyError.message}`);
    }

    const readyToPublish = allArticles?.filter(article => {
      return article.featured_image_url && 
             article.html_body && 
             article.canonical_url &&
             article.focus_keyword &&
             article.og_title;
    }) || [];

    const alreadyPublished = allArticles?.filter(a => a.status === 'published') || [];
    const needsWork = allArticles?.filter(a => !readyToPublish.find(r => r.id === a.id) && a.status !== 'published') || [];

    console.log(`   ✅ Ready to publish: ${readyToPublish.length}`);
    console.log(`   ✅ Already published: ${alreadyPublished.length}`);
    console.log(`   ⚠️  Needs work: ${needsWork.length}`);
    console.log('');

    // Step 5: Publish ready articles
    if (readyToPublish.length > 0) {
      console.log('🚀 Step 5: Publishing ready articles...');
      
      const toPublish = readyToPublish.filter(a => a.status !== 'published');
      console.log(`   Publishing ${toPublish.length} articles...`);
      console.log('');

      for (const article of toPublish) {
        const emoji = article.primary_ux_category_slug === 'early-years' ? '👶' : '🎓';
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
    console.log('✅ Workflow Complete!');
    console.log('');
    
    const { data: finalArticles } = await supabase
      .from('articles_with_primary_ux_category')
      .select('status, primary_ux_category_slug')
      .eq('site_id', siteId)
      .in('primary_ux_category_slug', ['early-years', 'middle-school']);

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

    // Verify gaps are filled
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
completeWorkflowAndPublish()
  .then(() => {
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


