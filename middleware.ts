import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const auth = request.cookies.get('auth')?.value
  
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next()
  }
  if (request.nextUrl.pathname === '/api/login') {
    return NextResponse.next()
  }
  if (auth === process.env.APP_PASSWORD) {
    return NextResponse.next()
  }
  
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
}
