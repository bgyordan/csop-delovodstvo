import { NextRequest, NextResponse } from 'next/server';
import { google, Auth } from 'googleapis';
import { Readable } from 'stream';

const getAuth = (): Auth.GoogleAuth => {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  console.log('=== Google Auth Check ===');
  console.log('Client Email exists:', !!clientEmail);
  console.log('Private Key exists:', !!privateKey);
  console.log('Private Key length:', privateKey?.length || 0);
  console.log('Private Key first 50 chars:', privateKey?.substring(0, 50) || 'N/A');

  if (!clientEmail) {
    throw new Error('GOOGLE_CLIENT_EMAIL is not set');
  }

  if (!privateKey || privateKey === '""' || privateKey === '') {
    throw new Error('GOOGLE_PRIVATE_KEY is not set or is empty');
  }

  // Replace \n with actual newlines
  const formattedKey = privateKey.replace(/\\n/g, '\n');

  console.log('Formatted key first line:', formattedKey.split('\n')[0]);

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

export async function GET() {
  try {
    const sheets = await getSheets();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'SPREADSHEET_ID not configured' },
        { status: 500 }
      );
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Документи!A2:I',
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
    console.error('=== GET Error ===');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Full error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  console.log('=== POST Request Started ===');

  try {
    const body = await req.json();
    const { document, fileData } = body as {
      document: Omit<Document, 'id' | 'fileUrl'>;
      fileData?: { name: string; mimeType: string; data: string };
    };

    console.log('Received document:', { regNumber: document.regNumber, resolution: document.resolution, status: document.status });
    console.log('File data present:', !!fileData, fileData ? { name: fileData.name, mimeType: fileData.mimeType, dataSize: fileData.data.length } : null);

    const sheets = await getSheets();
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const driveFolderId = process.env.DRIVE_FOLDER_ID;

    console.log('Spreadsheet ID:', spreadsheetId);
    console.log('Drive Folder ID:', driveFolderId);

    if (!spreadsheetId) {
      console.error('SPREADSHEET_ID not configured');
      return NextResponse.json(
        { error: 'SPREADSHEET_ID not configured' },
        { status: 500 }
      );
    }

    // Check if sheet exists, if not create it
    console.log('Checking if sheet exists...');
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = 'Документи';
    const existingSheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );

    console.log('Sheet exists:', !!existingSheet);

    if (!existingSheet) {
      console.log('Creating new sheet...');
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: sheetName },
              },
            },
          ],
        },
      });

      // Add header row
      console.log('Adding header row...');
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Документи!A1:I1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              'ID',
              'Номер',
              'Дата',
              'Подател/Получател',
              'Относно',
              'Резолюция',
              'Статус',
              'Файл',
              'Линк',
            ],
          ],
        },
      });
      console.log('Header row added');
    }

    let fileUrl = '';

    // Upload file to Google Drive if provided
    if (fileData && fileData.data) {
      console.log('=== Starting Drive upload ===');

      if (!driveFolderId) {
        console.error('DRIVE_FOLDER_ID not configured');
        return NextResponse.json(
          { error: 'DRIVE_FOLDER_ID not configured' },
          { status: 500 }
        );
      }

      try {
        const driveAuth = getAuth();
        const drive = google.drive({ version: 'v3', auth: driveAuth });

        console.log('Uploading file to Drive...');
        console.log('File name:', `${document.regNumber}_${fileData.name}`);
        console.log('Parent folder:', driveFolderId);
        console.log('MIME type:', fileData.mimeType);

        // Convert base64 data to Buffer and create Readable stream
        const buffer = Buffer.from(fileData.data, 'base64');
        const stream = Readable.from(buffer);

        const driveResponse = await drive.files.create({
          requestBody: {
            name: `${document.regNumber}_${fileData.name}`,
            parents: [driveFolderId],
          },
          media: {
            mimeType: fileData.mimeType,
            body: stream,
          },
          fields: 'id, webViewLink',
          supportsAllDrives: true,
        });

        console.log('Drive response status:', driveResponse.status);
        console.log('Drive file ID:', driveResponse.data.id);
        console.log('Drive web link:', driveResponse.data.webViewLink);

        fileUrl = driveResponse.data.webViewLink || '';

        // Make file accessible by anyone with the link
        if (driveResponse.data.id) {
          console.log('Setting file permissions...');
          await drive.permissions.create({
            fileId: driveResponse.data.id,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
            supportsAllDrives: true,
          });
          console.log('Permissions set successfully');
        }
      } catch (driveError) {
        console.error('=== Drive Upload Error ===');
        console.error('Error message:', driveError instanceof Error ? driveError.message : String(driveError));
        console.error('Full error:', JSON.stringify(driveError, null, 2));
        throw driveError;
      }
    }

    // Generate ID
    const id = Date.now().toString();

    // Format date to DD.MM.YYYY
    const formatDate = (iso: string) => {
      const [y, m, d] = iso.split('-');
      return `${d}.${m}.${y}`;
    };

    // Append to sheet
    console.log('=== Appending to Sheet ===');
    console.log('Row data:', {
      id,
      regNumber: document.regNumber,
      date: formatDate(document.date),
      correspondent: document.correspondent,
      subject: document.subject,
      resolution: document.resolution,
      status: document.status,
      fileName: document.fileName,
      fileUrl,
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Документи!A:I',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [
          [
            id,
            document.regNumber,
            formatDate(document.date),
            document.correspondent,
            document.subject,
            document.resolution,
            document.status,
            document.fileName,
            fileUrl,
          ],
        ],
      },
    });

    console.log('=== Document created successfully ===');

    return NextResponse.json({
      success: true,
      document: {
        id,
        ...document,
        date: formatDate(document.date),
        fileUrl,
      },
    });
  } catch (error) {
    console.error('=== POST Error ===');
    console.error('Error type:', error?.constructor?.name || typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }

    // Check for specific Google API errors
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as { response?: { data?: unknown; status?: number } };
      console.error('API Response:', JSON.stringify(apiError.response?.data, null, 2));
      console.error('API Status:', apiError.response?.status);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create document' },
      { status: 500 }
    );
  }
}
