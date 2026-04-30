# Deployment Guide for Relevos App

## Prerequisites
- Node.js 18+ 
- npm or yarn
- GitHub account
- Vercel account

## Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd relevos-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Visit http://localhost:3000

## Environment Variables

Required variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key  
- `ICUADRILLA_API_TOKEN`: Your iCuadrilla API token
- `ICUADRILLA_API_URL`: Your iCuadrilla API URL

## Deployment to Vercel

### Method 1: Vercel CLI (Recommended)
1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Method 2: GitHub Integration
1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "your message"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to vercel.com
   - New Project → Import Repository
   - Connect your GitHub repo
   - Add environment variables
   - Deploy

### Method 3: Git Push Trigger
Your Vercel project is set up to auto-deploy on push to main branch.

## Build Commands

The project uses these commands:
- `npm run build`: Production build
- `npm run lint`: ESLint check
- `npm run type-check`: TypeScript validation
- `npm run check`: Run both lint and type-check

## Production Considerations

- The app uses Next.js with PWA support
- Supabase database is required for full functionality
- iCuadrilla API integration for external data sync
- Responsive design with Tailwind CSS

## Testing

Run tests with:
```bash
npm test
```

## Troubleshooting

### Build Issues
- Check environment variables are set correctly
- Verify all dependencies are installed
- Run `npm run check` before build

### Deployment Issues
- Ensure environment variables are set in Vercel dashboard
- Check Vercel build logs for errors
- Verify domain and DNS settings