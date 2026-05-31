// This file should be in the root of your src directory
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request) {
  // Handle preflight requests quickly
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Create response with CORS headers
  const response = NextResponse.next()
  const allowedOrigin = process.env.ALLOWED_ORIGIN || request.headers.get('origin') || '*'
  // Prefer explicit origin in production via ALLOWED_ORIGIN env var
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // Enable credentialed CORS requests only for specific origins.
  // Browsers do not allow Access-Control-Allow-Credentials with a wildcard (*) origin.
  if (allowedOrigin !== '*') {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  // Only check authentication for protected routes
  const { pathname } = request.nextUrl

  // Support old sign-in URLs while rendering the root sign-in page.
  if (pathname === '/auth/signin') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    return NextResponse.redirect(redirectUrl)
  }
  
  // Skip auth check for public API routes
  const publicRoutes = ['/api/auth', '/api/webteam', '/api/events/*','/api/notice/*','/api/faculty/*']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  if (isPublicRoute) {
    return response
  }

  // Only perform token validation for non-public routes
  try {
    const token = await getToken({ req: request })

    if (token) {
      if (pathname.startsWith('/club-management') && token.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/', request.url))
      }

      if (pathname.startsWith('/club-profile') && token.role !== 'CLUB_ADMIN') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    if (!token && pathname.startsWith('/api/')) {
      // Only return 401 for API routes that require auth
      const protectedApiRoutes = ['/api/create', '/api/update', '/api/delete', '/api/upload']
      const isProtectedApi = protectedApiRoutes.some(route => pathname.startsWith(route))
      
      // if (isProtectedApi) {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      // }
    }
  } catch (error) {
    console.error('Middleware auth error:', error)
  }
  
  return response
}

export const config = {
  matcher: [
    '/api/((?!auth|webteam|events/active).*)',
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ],
} 
