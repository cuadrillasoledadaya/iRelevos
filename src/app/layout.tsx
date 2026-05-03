import type { Metadata, Viewport } from 'next'
import { Cinzel, Lato } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { AppInitializer } from '@/components/AppInitializer'

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '900'],
  variable: '--font-cinzel',
  display: 'swap',
})

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-lato',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Relevos Costaleros',
  description: 'Gestión de relevos y rotaciones para costaleros de Semana Santa',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Costaleros',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#f5f0e8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${cinzel.variable} ${lato.variable}`}>
        <AuthProvider>
          <AppInitializer>
            {children}
          </AppInitializer>
        </AuthProvider>
      </body>
    </html>
  )
}
