import { NextRequest, NextResponse } from 'next/server';
import { google, Auth } from 'googleapis';
import { Readable } from 'stream';

const VALID_SHEETS = ['Документи', 'Договори', 'Заповеди'];

const getAuth = (): Auth.GoogleAuth => {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail) throw new Error('GOOGLE_CLIENT_EMAIL is not set');
  if (!privateKey || privateKey === '""' || privateKey === '') throw new Error('GOOGLE_PRIVATE_KEY is not set or is empty');

  const formattedKey = privateKey.replace(/\\n/g, '\n');

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: formattedKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
};

const getSheets = async () => {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
};

interface Document {
  id: string;
  regNumber: string;
  date: string;
  correspondent: string;
  subject: string;
  resolution: string;
  status: string;
  fileName: string;
  fileUrl?: string;
}

const SHEET_HEADERS: Record<string, string[]> = {
  'Документи': ['ID', 'Номер', 'Дата', 'Подател/Получател', 'Относно', 'Резолюция', 'Статус', 'Файл', 'Линк'],
  'Договори':  ['ID', 'Номер', 'Дата', 'Контрагент', 'Предмет', 'Резолюция', 'Статус', 'Файл', 'Линк'],
  'Заповеди':  ['ID', 'Номер', 'Дата', 'Относно', 'Предмет', 'Резолюция', 'Статус', 'Файл', 'Линк'],
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetName = searchParams.get('sheet') || 'Документи';

    if (!VALID_SHEETS.includes(sheetName)) {
      return NextResponse.json({ error: 'Invalid sheet name' }, { status: 400 });
    }

    const sheets = await getSheets();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'SPREADSHEET_ID not configured' }, { status: 500 });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:I`,
    });

    const rows = response.data.values || [];
    const documents: Document[] = rows
      .filter((row) => row.length > 0 && row[0])
      .map((row) => ({
        id: row[0] as string,
        regNumber: row[1] as string,
        date: row[2] as string,
        correspondent: row[3] as string,
        subject: row[4] as string,
        resolution: row[5] as string,
        status: row[6] as string,
        fileName: (row[7] as string) || '',
        fileUrl: (row[8] as string) || '',
      }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { document, fileData, sheet } = body as {
      document: Omit<Document, 'id' | 'fileUrl'>;
      fileData?: { name: string; mimeType: string; data: string };
      sheet?: string;
    };

    const sheetName = sheet && VALID_SHEETS.includes(sheet) ? sheet : 'Документи';

    const sheets = await getSheets();
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const driveFolderId = process.env.DRIVE_FOLDER_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'SPREADSHEET_ID not configured' }, { status: 500 });
    }

    // Check if sheet exists, if not create it with headers
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );

    if (!existingSheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:I1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [SHEET_HEADERS[sheetName] || SHEET_HEADERS['Документи']],
        },
      });
    }

    // Get last reg number for auto-numbering
    const existingRows = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!B2:B`,
    });
    const rows = existingRows.data.values || [];
    const nextNumber = rows.length + 1;

    // Auto-generate reg number if empty
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const autoRegNumber = document.regNumber || `${nextNumber}/${dd}.${mm}.${yyyy}`;

    let fileUrl = '';

    // Upload file to Google Drive if provided
    if (fileData && fileData.data && driveFolderId) {
      try {
        const driveAuth = getAuth();
        const drive = google.drive({ version: 'v3', auth: driveAuth });

        const buffer = Buffer.from(fileData.data, 'base64');
        const stream = Readable.from(buffer);

        const driveResponse = await drive.files.create({
          requestBody: {
            name: `${autoRegNumber}_${fileData.name}`,
            parents: [driveFolderId],
          },
          media: {
            mimeType: fileData.mimeType,
            body: stream,
          },
          fields: 'id, webViewLink',
          supportsAllDrives: true,
        });

        fileUrl = driveResponse.data.webViewLink || '';

        if (driveResponse.data.id) {
          await drive.permissions.create({
            fileId: driveResponse.data.id,
            requestBody: { role: 'reader', type: 'anyone' },
            supportsAllDrives: true,
          });
        }
      } catch (driveError) {
        console.error('Drive Upload Error:', driveError);
        throw driveError;
      }
    }

    const id = Date.now().toString();

    const formatDate = (iso: string) => {
      const [y, m, d] = iso.split('-');
      return `${d}.${m}.${y}`;
    };

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:I`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          id,
          autoRegNumber,
          formatDate(document.date),
          document.correspondent,
          document.subject,
          document.resolution,
          document.status,
          document.fileName,
          fileUrl,
        ]],
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id,
        ...document,
        regNumber: autoRegNumber,
        date: formatDate(document.date),
        fileUrl,
      },
    });
  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create document' },
      { status: 500 }
    );
  }
}
