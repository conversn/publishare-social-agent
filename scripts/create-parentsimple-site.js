/**
 * Create parentsimple site in database
 */

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';

async function createParentSimpleSite() {
  console.log('🔧 Creating parentsimple site...\n');
  
  // Check if site exists
  const checkResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/sites?id=eq.parentsimple&select=id`,
    {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const existing = await checkResponse.json();
  
  if (existing && existing.length > 0) {
    console.log('✅ Site parentsimple already exists');
    return;
  }
  
  // Create site
  const insertResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/sites`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: 'parentsimple',
        name: 'ParentSimple',
        domain: 'parentsimple.org',
        description: 'Parenting resources and family education'
      })
    }
  );
  
  if (!insertResponse.ok) {
    const error = await insertResponse.text();
    console.error(`❌ Failed to create site: ${error}`);
    process.exit(1);
  } else {
    const data = await insertResponse.json();
    console.log(`✅ Site created: ${data[0]?.id || 'parentsimple'}`);
  }
}

createParentSimpleSite().catch(console.error);


