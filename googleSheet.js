const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class GoogleSheet {
  constructor(filePath) {
    this.filePath = filePath;
    this.config = {};
  }

  async init() {
    this.config = await this.loadConfig(this.filePath);
    this.service = await this.initializeService();
  }

  async loadConfig(filePath) {
    try {
      const rawData = await fs.readFile(filePath, 'utf8');
      return JSON.parse(rawData);
    } catch (e) {
      console.error(`Failed to load config from ${filePath}: ${e.message}`);
      return {};
    }
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
        row.date,
        `https://www.linkedin.com/jobs/view/${row.id}`
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
}

module.exports = GoogleSheet;