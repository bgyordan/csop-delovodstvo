import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { password } = await request.json()
  
  if (password === process.env.APP_PASSWORD) {
    cookies().set('auth', process.env.APP_PASSWORD!, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 7, // 7 дни
    })
    return NextResponse.json({ ok: true })
  }
  
  return NextResponse.json({ error: 'Грешна парола' }, { status: 401 })
}
