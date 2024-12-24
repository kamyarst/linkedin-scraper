const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class GoogleSheet {

  constructor(config) {
    this.config = config;
  }

  async init() {
    this.service = await this.initializeService();
    await this.addSheetIfNotExists("LinkedIn");
    await this.addSheetIfNotExists("Indeed");
  }

  async authorizeServiceAccount() {
    // Reading service account credentials
    const keyFilePath = path.resolve(__dirname, 'credentials.json');
    let keyFileData;

    try {
      keyFileData = await fs.readFile(keyFilePath, 'utf8');
    } catch (err) {
      throw new Error(`Service account key file not found: ${keyFilePath}`);
    }

    const parsedKeyFile = JSON.parse(keyFileData);

    const jwtClient = new google.auth.JWT(
      parsedKeyFile.client_email,
      null,
      parsedKeyFile.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    await jwtClient.authorize();
    return jwtClient;
  }

  async initializeService() {
    const auth = await this.authorizeServiceAccount();
    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
  }

  async addToSheetIfNeeded(row, page) {
    // Wait 1 second to avoid rate limits (mimicking original code)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const spreadsheetId = this.config.spreadsheet?.id;
    if (!spreadsheetId) {
      console.error('Spreadsheet ID not found in config.');
      return;
    }

    const range = `${page}!A:A`;

    const response = await this.service.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const existingValues = response.data.values || [];
    const ids = existingValues.flat();
    if (ids.includes(row.id.toString())) {
      console.log('⏭️ Already imported');
    } else {
      await this.addToSheet(row, page);
      console.log('✅ Added');
    }
  }

  async addToSheet(row, page) {
    const spreadsheetId = this.config.spreadsheet?.id;
    if (!spreadsheetId) {
      console.error('Spreadsheet ID not found in config.');
      return;
    }

    const range = `${page}!A2`;
    const values = [
      [
        row.id,
        row.title,
        row.company,
        row.location,
        new Date().toISOString().replace('T', ' ').slice(0, 16),
        row.date || "",
        row.link
      ],
    ];

    await this.service.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });
  }

  async addSheetIfNotExists(sheetName) {
    const spreadsheetId = this.config.spreadsheet.id;
    try {
      // Step 1: Get all sheets in the spreadsheet
      const response = await this.service.spreadsheets.get({
        spreadsheetId,
      });

      const existingSheets = response.data.sheets.map(sheet => sheet.properties.title);

      // Step 2: Check if the sheet already exists
      if (existingSheets.includes(sheetName)) {
        console.log(`Sheet "${sheetName}" already exists.`);
        return;
      }

      // Step 3: Add the new sheet
      await this.service.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });

      console.log(`Sheet "${sheetName}" created successfully.`);
    } catch (error) {
      console.error('Error managing sheets:', error);
    }
  }
}

module.exports = GoogleSheet;