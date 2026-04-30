#!/bin/bash

# Deployment script for Relevos App
# This script prepares the project for deployment and pushes to GitHub

set -e

echo "🚀 Starting deployment preparation..."

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -f "next.config.js" ]; then
    echo "❌ Error: Not in the project root directory"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Git repository not initialized"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run checks
echo "🔍 Running pre-deployment checks..."
npm run check

# Build the project
echo "🏗️ Building project..."
npm run build

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

# Add all changes to git
echo "📝 Adding changes to git..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️ No changes to commit"
else
    # Commit changes
    echo "💾 Committing changes..."
    git commit -m "chore: prepare deployment $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push origin main

echo "🎉 Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Go to your Vercel dashboard"
echo "2. Trigger deployment or wait for auto-deploy"
echo "3. Check environment variables in Vercel dashboard"
echo "4. Test the application"