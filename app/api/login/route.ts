import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { google, Auth } from 'googleapis'

const getAuth = (): Auth.GoogleAuth => {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  if (!clientEmail) throw new Error('GOOGLE_CLIENT_EMAIL is not set')
  if (!privateKey) throw new Error('GOOGLE_PRIVATE_KEY is not set')
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

export async function POST(request: Request) {
  const { username, password } = await request.json()
  try {
    const auth = getAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.SPREADSHEET_ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Потребители!A2:D',
    })
    const rows = response.data.values || []
    const user = rows.find(
      (row) => row[0] === username && row[1] === password
    )
    if (user) {
      const role = user[2] || 'viewer'
      const name = user[3] || username
      cookies().set('auth', process.env.APP_PASSWORD!, {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 60 * 24 * 7,
      })
      // role и username са httpOnly: false за да може JS да ги чете
      cookies().set('role', role, {
        httpOnly: false,
        secure: true,
        maxAge: 60 * 60 * 24 * 7,
      })
      cookies().set('username', name, {
        httpOnly: false,
        secure: true,
        maxAge: 60 * 60 * 24 * 7,
      })
      return NextResponse.json({ ok: true, role, name })
    }
    return NextResponse.json({ error: 'Грешно потребителско име или парола' }, { status: 401 })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Грешка при свързване' }, { status: 500 })
  }
}
