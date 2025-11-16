# Vercel Deployment Guide

## Quick Deploy

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub** (already done ✅)

2. **Go to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "Add New" → "Project"

3. **Import Your Repository**:
   - Select your repository from the list
   - Click "Import"

4. **Configure Project**:
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

5. **Set Environment Variables**:
   Click "Environment Variables" and add:

   ```
   DATABASE_URL=your-postgres-connection-string
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
   ANTHROPIC_API_KEY=your-anthropic-api-key
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

   # Optional OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

6. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete (2-3 minutes)
   - Your app will be live at `https://your-app.vercel.app`

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - What's your project's name? holiday-planner
# - In which directory is your code located? ./
# - Want to override settings? No

# Deploy to production
vercel --prod
```

## Database Setup

You need a PostgreSQL database. Here are recommended options:

### Option 1: Vercel Postgres (Easiest)

1. In your Vercel project dashboard:
   - Go to "Storage" tab
   - Click "Create Database"
   - Select "Postgres"
   - Choose a name (e.g., `holiday-planner-db`)
   - Select region (same as your app)
   - Click "Create"

2. Vercel will automatically add `DATABASE_URL` to your environment variables

3. Run migrations:
   ```bash
   # Install Vercel CLI if not already
   npm i -g vercel

   # Pull environment variables
   vercel env pull .env.local

   # Run Prisma migrations
   npx prisma db push
   ```

### Option 2: Supabase (Free Tier)

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get connection string from Settings → Database
4. Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
5. Add to Vercel environment variables as `DATABASE_URL`

### Option 3: Railway

1. Go to [railway.app](https://railway.app)
2. New Project → Provision PostgreSQL
3. Copy connection string
4. Add to Vercel environment variables

### Option 4: Neon (Serverless Postgres)

1. Go to [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Add to Vercel environment variables

## Post-Deployment Setup

### 1. Run Database Migrations

After setting up your database:

```bash
# If using Vercel CLI
vercel env pull .env.local
npx prisma generate
npx prisma db push

# Or manually update your local .env and run:
npx prisma db push
```

### 2. Update OAuth Callback URLs

If using OAuth providers:

**Google OAuth**:
- Go to Google Cloud Console
- Add authorized redirect URI:
  - `https://your-app.vercel.app/api/auth/callback/google`

**GitHub OAuth**:
- Go to GitHub Developer Settings
- Add callback URL:
  - `https://your-app.vercel.app/api/auth/callback/github`

### 3. Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Add this to your Vercel environment variables.

### 4. Get Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create API key
3. Add to Vercel as `ANTHROPIC_API_KEY`

## Environment Variables Checklist

Make sure these are set in Vercel:

- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `NEXTAUTH_URL` - Your Vercel app URL
- ✅ `NEXTAUTH_SECRET` - Random secure string
- ✅ `ANTHROPIC_API_KEY` - Your Claude API key
- ✅ `NEXT_PUBLIC_APP_URL` - Your Vercel app URL
- ⚪ `GOOGLE_CLIENT_ID` (optional)
- ⚪ `GOOGLE_CLIENT_SECRET` (optional)
- ⚪ `GITHUB_CLIENT_ID` (optional)
- ⚪ `GITHUB_CLIENT_SECRET` (optional)

## Troubleshooting

### Build Fails

**Error: Prisma Client not generated**
```bash
# Add to package.json scripts if not present:
"postinstall": "prisma generate"
```

**Error: Cannot find module '@prisma/client'**
- Make sure `prisma generate` runs during build
- Check that `@prisma/client` is in dependencies, not devDependencies

### Database Connection Issues

**Error: Can't reach database**
- Verify `DATABASE_URL` is correct
- Check database allows connections from Vercel IPs
- For Supabase: Enable "Direct Connection" string, not "Connection Pooling"

### Authentication Issues

**Error: Invalid callback URL**
- Update OAuth provider settings with Vercel URL
- Make sure `NEXTAUTH_URL` matches your deployment URL

### AI Chat Not Working

**Error: Anthropic API error**
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check your Anthropic account has API access
- Verify you have credits available

## Monitoring & Logs

View logs in Vercel:
1. Go to your project dashboard
2. Click "Deployments"
3. Click on latest deployment
4. Click "Runtime Logs" or "Build Logs"

## Custom Domain (Optional)

1. In Vercel project settings
2. Go to "Domains"
3. Add your custom domain
4. Update DNS settings as instructed
5. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to use custom domain

## Automatic Deployments

Vercel automatically deploys:
- **Production**: When you push to `main` branch
- **Preview**: When you push to feature branches

Each deployment gets a unique URL for testing.

## Performance Optimization

The app is already optimized with:
- ✅ Server-side rendering (SSR)
- ✅ Static generation where possible
- ✅ Image optimization
- ✅ Code splitting
- ✅ Prisma connection pooling ready

## Security Notes

- All environment variables are encrypted
- HTTPS is automatic
- Database credentials never exposed to client
- API routes are server-side only
- CORS configured for Vercel domains

## Cost Estimate

**Free Tier** includes:
- Unlimited deployments
- 100GB bandwidth/month
- Automatic HTTPS
- Preview deployments

**Database** (choose one):
- Vercel Postgres: $0.29/GB/month
- Supabase: Free tier (500MB)
- Railway: Free tier ($5 credit)
- Neon: Free tier (10GB)

**Anthropic API**:
- Pay-as-you-go based on usage
- Approximately $0.003 per 1K input tokens
- $0.015 per 1K output tokens

---

**Need Help?**
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
