import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const auth = request.cookies.get('auth')?.value
  const role = request.cookies.get('role')?.value

  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next()
  }
  if (request.nextUrl.pathname === '/api/login') {
    return NextResponse.next()
  }
  if (auth !== process.env.APP_PASSWORD) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // viewer не може да POST-ва към API
  if (
    role === 'viewer' &&
    request.method === 'POST' &&
    request.nextUrl.pathname.startsWith('/api/')
  ) {
    return NextResponse.json({ error: 'Нямате права за това действие' }, { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
}
