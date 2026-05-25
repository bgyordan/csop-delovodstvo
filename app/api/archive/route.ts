import { NextRequest, NextResponse } from 'next/server';
import { google, Auth } from 'googleapis';

const getAuth = (): Auth.GoogleAuth => {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!clientEmail) throw new Error('GOOGLE_CLIENT_EMAIL is not set');
  if (!privateKey) throw new Error('GOOGLE_PRIVATE_KEY is not set');
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

export async function POST(req: NextRequest) {
  try {
    const { sheet } = await req.json();
    const year = new Date().getFullYear();
    const archiveName = `${sheet} ${year}`;

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'SPREADSHEET_ID not configured' }, { status: 500 });
    }

    // Вземи всички данни от текущия sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheet}!A1:I`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return NextResponse.json({ error: 'Няма записи за архивиране' }, { status: 400 });
    }

    // Провери дали архивният sheet вече съществува
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingArchive = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === archiveName
    );

    if (existingArchive) {
      return NextResponse.json({ error: `Архив "${archiveName}" вече съществува!` }, { status: 400 });
    }

    // Създай нов архивен sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: archiveName } } }],
      },
    });

    // Копирай данните в архива
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${archiveName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });

    // Изчисти оригиналния sheet (остави само заглавния ред)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheet}!A2:Z1000`,
    });

    return NextResponse.json({
      success: true,
      message: `Архивирани ${rows.length - 1} записа в "${archiveName}"`,
      count: rows.length - 1,
    });
  } catch (error) {
    console.error('Archive error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при архивиране' },
      { status: 500 }
    );
  }
}
