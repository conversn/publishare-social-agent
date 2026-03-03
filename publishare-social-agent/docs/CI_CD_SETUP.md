# CI/CD Setup Guide for Publishare

This document provides complete instructions for setting up CI/CD for the Publishare project.

## Overview

The CI/CD pipeline includes:
- **GitHub Actions** for automated testing, building, and deployment
- **Vercel** for Next.js application hosting (automatic via GitHub integration)
- **Supabase** for Edge Functions deployment

## Repository Setup

### 1. Initialize Git Repository (if not already done)

```bash
cd 02-Expansion-Operations-Planning/Products-Services/2.\ Software-Platforms/publishare
git init
git remote add origin https://github.com/conversn-io/publishare.git
git branch -M main
```

### 2. Create .gitignore (if not exists)

Ensure `.gitignore` includes:
```
node_modules/
.next/
.env.local
.env*.local
.vercel
.DS_Store
*.log
```

## GitHub Secrets Configuration

### Required Secrets

Add these secrets in GitHub: **Settings → Secrets and variables → Actions → New repository secret**

#### Next.js Application Secrets
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
  - Example: `https://vpysqshhafthuxvokwqj.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
  - Found in: Supabase Dashboard → Settings → API

#### Supabase Edge Functions Secrets
- `SUPABASE_ACCESS_TOKEN` - Supabase CLI access token
  - Generate at: https://supabase.com/dashboard/account/tokens
  - Required for deploying edge functions
- `OPEN_AI_PUBLISHARE_KEY` - OpenAI API key for image generation
  - Used by `ai-image-generator` function
- `OPENAI_API_KEY` - Fallback OpenAI API key (optional)

### Setting Up Supabase Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Copy the token
4. Add as `SUPABASE_ACCESS_TOKEN` secret in GitHub

## Vercel Setup

### 1. Connect Repository to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import repository: `conversn-io/publishare`
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install`

### 2. Configure Vercel Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

**Production, Preview, and Development:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Production Only (if needed):**
- `SUPABASE_SERVICE_ROLE_KEY` (if used in API routes)

### 3. Enable Automatic Deployments

Vercel will automatically:
- Deploy on push to `main` branch (production)
- Create preview deployments for pull requests
- Deploy on push to other branches (preview)

## Workflow Files

### Main CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

This workflow runs on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**
1. **Lint & Type Check** - Runs ESLint and TypeScript type checking
2. **Build Next.js** - Builds the Next.js application
3. **Deploy Edge Functions** - Deploys all Supabase Edge Functions (main/develop only)
4. **Vercel Deployment** - Informational (actual deployment via Vercel integration)

### Edge Functions Only (`.github/workflows/edge-functions-only.yml`)

This workflow allows:
- Manual deployment of specific functions via GitHub Actions UI
- Automatic deployment when edge function files change

**Usage:**
1. Go to Actions tab in GitHub
2. Select "Deploy Edge Functions Only"
3. Click "Run workflow"
4. Choose function to deploy (or "all" for all functions)

## Deployment Process

### Automatic Deployment (Recommended)

1. **Make changes** to code
2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```
3. **GitHub Actions runs:**
   - Lint and type check
   - Build Next.js app
   - Deploy edge functions (if on main/develop)
4. **Vercel automatically deploys** Next.js app
5. **Check status:**
   - GitHub Actions: https://github.com/conversn-io/publishare/actions
   - Vercel Dashboard: https://vercel.com/dashboard

### Manual Edge Function Deployment

If you need to deploy edge functions manually:

**Option 1: GitHub Actions UI**
1. Go to Actions → "Deploy Edge Functions Only"
2. Click "Run workflow"
3. Select function(s) to deploy

**Option 2: Local Script**
```bash
cd supabase/functions
./deploy.sh
```

**Option 3: Supabase CLI**
```bash
supabase functions deploy ai-image-generator --project-ref vpysqshhafthuxvokwqj
```

## Branch Strategy

### Main Branch
- **Production deployments**
- All edge functions deployed automatically
- Vercel production URL

### Develop Branch
- **Staging deployments**
- Edge functions deployed for testing
- Vercel preview URL

### Feature Branches
- **Preview deployments**
- Edge functions NOT deployed automatically
- Vercel preview URL for each PR

## Edge Functions Deployment

### Functions Deployed

1. **ai-image-generator** - AI image generation
2. **ai-link-suggestions** - Link suggestion generation
3. **insert-links** - Markdown link insertion
4. **markdown-to-html** - Markdown to HTML conversion
5. **link-image-to-article** - Image to article linking

### Function URLs

After deployment, functions are available at:
- `https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/{function-name}`

### Setting Edge Function Secrets

Secrets are set automatically during deployment. To update manually:

```bash
supabase secrets set OPEN_AI_PUBLISHARE_KEY=your-key --project-ref vpysqshhafthuxvokwqj
supabase secrets set OPENAI_API_KEY=your-key --project-ref vpysqshhafthuxvokwqj
```

## Testing the Pipeline

### 1. Test Lint and Build

Create a test branch:
```bash
git checkout -b test-ci-cd
git push origin test-ci-cd
```

Check GitHub Actions to verify:
- Lint passes
- Type check passes
- Build succeeds

### 2. Test Edge Function Deployment

1. Make a small change to an edge function
2. Commit and push to `main` or `develop`
3. Check GitHub Actions for deployment status
4. Test the function endpoint

### 3. Test Vercel Deployment

1. Make a change to the Next.js app
2. Push to `main`
3. Check Vercel dashboard for deployment
4. Verify the change is live

## Troubleshooting

### GitHub Actions Failures

**Lint/Type Check Fails:**
- Fix linting errors locally: `npm run lint`
- Fix type errors: `npm run type-check`

**Build Fails:**
- Check build logs in GitHub Actions
- Test build locally: `npm run build`
- Verify environment variables are set

**Edge Function Deployment Fails:**
- Verify `SUPABASE_ACCESS_TOKEN` is set correctly
- Check Supabase project reference is correct
- Ensure you have access to the Supabase project

### Vercel Deployment Issues

**Build Fails:**
- Check Vercel build logs
- Verify environment variables in Vercel dashboard
- Test build locally: `npm run build`

**Environment Variables Missing:**
- Add variables in Vercel Dashboard → Settings → Environment Variables
- Redeploy after adding variables

### Edge Function Issues

**Function Not Deploying:**
- Check GitHub Actions logs
- Verify Supabase CLI is authenticated
- Test deployment locally: `supabase functions deploy {function-name}`

**Secrets Not Set:**
- Secrets are set automatically during deployment
- To update: Use Supabase Dashboard → Edge Functions → Settings → Secrets

## Monitoring

### GitHub Actions
- View runs: https://github.com/conversn-io/publishare/actions
- Check for failed workflows
- Review deployment logs

### Vercel
- Dashboard: https://vercel.com/dashboard
- View deployments
- Check build logs
- Monitor function invocations

### Supabase
- Dashboard: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj
- Edge Functions: Monitor invocations and errors
- Logs: View function execution logs

## Next Steps

1. ✅ Set up GitHub repository
2. ✅ Configure GitHub secrets
3. ✅ Connect to Vercel
4. ✅ Test the pipeline
5. ✅ Monitor deployments

## Support

- **GitHub Issues**: https://github.com/conversn-io/publishare/issues
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs

