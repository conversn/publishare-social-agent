import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppHeader, Footer } from '@/components/layout'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Publishare — All‑in‑One Content Publishing, Interactivity & ROI Analytics',
  description: 'Create, publish, and share interactive content across channels. Build calculators, drive engagement, and track ROI in one AI‑powered platform.',
  authors: [{ name: 'Publishare Team' }],
  keywords: ['content marketing platform', 'interactive content', 'content analytics', 'AI content', 'lead generation software', 'content ROI'],
  openGraph: {
    title: 'Publishare: Where Content Meets Results',
    description: 'Publish, share, and prove ROI—without juggling tools.',
    url: 'https://www.publishare.com/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Publishare',
    title: 'Publishare: Where Content Meets Results',
    description: 'Publish, share, and prove ROI—without juggling tools.',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`min-h-screen bg-cloud font-sans antialiased ${inter.className}`}>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <AppHeader />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}

