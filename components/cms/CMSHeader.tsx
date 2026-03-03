'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  BarChart3,
  Calculator,
  HelpCircle,
  Settings,
  Plus,
  Search,
  Bell,
  User,
  Menu,
  X,
  Home,
  Image,
  TrendingUp,
  Shield
} from 'lucide-react'

interface CMSHeaderProps {
  user?: any
}

export default function CMSHeader({ user }: CMSHeaderProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/cms', icon: Home, current: pathname === '/cms' },
    { name: 'Articles', href: '/cms/articles', icon: FileText, current: pathname.startsWith('/cms/articles') || pathname.startsWith('/cms/new') || pathname.startsWith('/cms/edit') || pathname.startsWith('/cms/preview') },
    { name: 'Media', href: '/cms/media', icon: Image, current: pathname.startsWith('/cms/media') },
    { name: 'Analytics', href: '/cms/analytics', icon: TrendingUp, current: pathname.startsWith('/cms/analytics') },
    { name: 'Quizzes', href: '/cms/quizzes', icon: HelpCircle, current: pathname.startsWith('/cms/quizzes') },
    { name: 'Calculators', href: '/cms/calculators', icon: Calculator, current: pathname.startsWith('/cms/calculators') },
    { name: 'Admin', href: '/cms/admin', icon: Shield, current: pathname.startsWith('/cms/admin') },
  ]

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Primary Navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/cms" className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">CMS</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:ml-8 md:flex md:space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    item.current
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Quick Actions */}
            <div className="hidden sm:flex items-center space-x-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/cms/new">
                  <Plus className="w-4 h-4 mr-1" />
                  New Article
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/cms/new?method=ai">
                  <FileText className="w-4 h-4 mr-1" />
                  AI Generate
                </Link>
              </Button>
            </div>

            {/* Search */}
            <Button size="sm" variant="ghost" className="hidden sm:flex">
              <Search className="w-4 h-4" />
            </Button>

            {/* Notifications */}
            <Button size="sm" variant="ghost" className="relative">
              <Bell className="w-4 h-4" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                3
              </Badge>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user?.email || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button
              size="sm"
              variant="ghost"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors ${
                    item.current
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              ))}
            </nav>
            
            {/* Mobile Quick Actions */}
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <Button className="w-full justify-start" asChild>
                <Link href="/cms/new">
                  <Plus className="w-4 h-4 mr-2" />
                  New Article
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/cms/new?method=ai">
                  <FileText className="w-4 h-4 mr-2" />
                  AI Generate
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

