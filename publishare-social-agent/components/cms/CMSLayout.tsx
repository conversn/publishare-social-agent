'use client'

import { useAuth } from '@/app/providers'
import CMSHeader from './CMSHeader'

interface CMSLayoutProps {
  children: React.ReactNode
}

export default function CMSLayout({ children }: CMSLayoutProps) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <CMSHeader user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
