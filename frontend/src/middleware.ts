import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const { pathname } = url

  // Reserved top-level routes that should NOT be treated as examination IDs
  const reservedSegments = new Set([
    'health',
    'notebooks',
    'models',
    'users',
    'chats',
    'dashboard',
    'settings',
    'sources',
    'advanced',
    'auth',
    'login',
    'evaluations',
    'reset-password',
    'api',
    '_next',
    'favicon.ico',
  ])

  // if path is "/" or "/<id>" without further segments, rewrite to health page with id param
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) {
    // "/" -> health page
    return NextResponse.rewrite(new URL('/health', req.url))
  }

  if (segments.length === 1) {
    const idCandidate = segments[0]
    // only rewrite if not a reserved route and id matches expected pattern (lowercase alnum, 10-32 chars)
    if (
      !reservedSegments.has(idCandidate) &&
      /^[a-z0-9]{10,32}$/.test(idCandidate)
    ) {
      return NextResponse.rewrite(new URL(`/health/${idCandidate}`, req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}