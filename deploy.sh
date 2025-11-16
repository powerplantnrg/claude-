#!/bin/bash

echo "🚀 Holiday Planner - Vercel Deployment Script"
echo "=============================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Check if user is logged in
echo "📝 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel:"
    vercel login
fi

echo ""
echo "📦 Building and deploying to Vercel..."
echo ""

# Deploy to Vercel
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Set up your PostgreSQL database (see DEPLOYMENT.md)"
echo "2. Add environment variables in Vercel dashboard"
echo "3. Run: vercel env pull .env.local"
echo "4. Run: npx prisma db push"
echo ""
echo "📖 Full deployment guide: DEPLOYMENT.md"
echo ""
