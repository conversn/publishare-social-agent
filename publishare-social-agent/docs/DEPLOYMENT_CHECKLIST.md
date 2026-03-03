# Deployment Checklist - Link Validation System

## Pre-Deployment

- [ ] Supabase CLI installed and authenticated
- [ ] Service role key available
- [ ] Node.js installed (for validation scripts)
- [ ] Access to Supabase project: `vpysqshhafthuxvokwqj`

## Deployment Steps

### Database

- [ ] Deploy migration: `supabase db push --include-all`
- [ ] Verify `sites.article_route_path` column exists
- [ ] Verify `link_validation_results` table exists
- [ ] Verify route paths set: RateRoots = `/library`, SeniorSimple = `/articles`

### Edge Functions

- [ ] Deploy `link-validator` function
- [ ] Deploy `link-repair` function
- [ ] Deploy updated `ai-link-suggestions` function
- [ ] Deploy updated `agentic-content-gen` function

### Validation

- [ ] Run initial validation: `node scripts/validate-all-links.js --site rateroots`
- [ ] Clean up broken links if found: `node scripts/remove-broken-keyword-links.js --site=rateroots`
- [ ] Verify 0 broken links after cleanup

### Testing

- [ ] Test link suggestions return real articles only
- [ ] Test link suggestions use correct route paths
- [ ] Test new article generation creates valid links
- [ ] Verify frontend routes match `article_route_path`

## Post-Deployment

- [ ] Monitor broken links: `SELECT * FROM broken_links_summary;`
- [ ] Set up scheduled validation (optional)
- [ ] Document any issues or edge cases

## Rollback (If Needed)

- [ ] Revert functions to previous versions
- [ ] Remove validation table if needed: `DROP TABLE link_validation_results;`
- [ ] Remove route path column if needed: `ALTER TABLE sites DROP COLUMN article_route_path;`

---

**Status**: ✅ Ready for Preview Deployment
**Last Updated**: 2025-01-29




