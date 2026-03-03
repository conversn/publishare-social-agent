# Download Existing Edge Functions

## Instructions

The following functions exist in Supabase but need to be downloaded locally before enhancement:

1. `agentic-content-gen` (v22)
2. `ai-content-generator` (v19)

## Method 1: Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/functions
2. Click on each function
3. Copy the code from the editor
4. Save to:
   - `supabase/functions/agentic-content-gen/index.ts`
   - `supabase/functions/ai-content-generator/index.ts`

## Method 2: Supabase CLI (when Docker is available)

```bash
cd supabase/functions
supabase functions download agentic-content-gen --project-ref vpysqshhafthuxvokwqj
supabase functions download ai-content-generator --project-ref vpysqshhafthuxvokwqj
```

## After Download

Once downloaded, merge the existing code with the AEO enhancements provided in:
- `supabase/functions/agentic-content-gen/index.ts` (enhanced version)
- `supabase/functions/ai-content-generator/index.ts` (enhanced version)

The enhanced versions include comments marking where existing code should be preserved.


