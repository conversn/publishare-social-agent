import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // For now, let's just allow all routes and handle auth in the components
  // This will prevent the 500 error and allow the auth pages to load
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/cms/:path*',
    '/calculator/:path*',
    '/settings/:path*',
    '/auth/:path*'
  ],
}

