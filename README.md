# Guide to Setup Google Sheets API Access and Configure JSON Parameters

This document provides step-by-step instructions to let you run the script.

## Step 1: Obtain Google API Credentials (credentials.json)

1. **Go to Google Cloud Console**: [Google Cloud Console](https://console.cloud.google.com/)
2. **Create a New Project** (or use an existing project):
   - Click on the dropdown at the top of the page.
   - Select **New Project**.
3. **Enable Google Sheets API**:
   - In the dashboard, go to **Library**.
   - Search for **Google Sheets API** and **enable** it.
4. **Create Service Account Credentials**:
   - In the **APIs & Services** menu, go to **Credentials**.
   - Click **Create Credentials** > **Service Account**.
   - Follow the prompts to create a Service Account.
5. **Download `credentials.json`**:
   - Once created, go back to the **Credentials** tab.
   - Find your new Service Account and click **Create Key**.
   - Select **JSON** and download the file. This file is your `credentials.json`.

## Step 2: Set Up Google Spreadsheet Access

1. **Share Google Spreadsheet with Service Account**:
   - Open the Google Sheet you wish to access.
   - Copy the **Spreadsheet ID** from the URL. It's the long string between `/d/` and `/edit`.
   - Share the spreadsheet with the email of the Service Account from `credentials.json`. The email will look like `your-service-account@your-project-id.iam.gserviceaccount.com`.

## Step 3: Copy `credentials.json` to Project Root Directory

1. **Move `credentials.json`**:
   - Place the downloaded `credentials.json` file in the root directory of your project.

## Step 4: Fill in JSON Parameters

Open your configuration file and fill in the necessary parameters as shown below.

### JSON Template

Replace the placeholders in the JSON configuration:

```json
{
  "search": {
    "queries": [
      "ios developer",
      "swift engineer"
    ],
    "includes": [
      "ios",
      "swift"
    ],
    "excludes": [
      "junior",
      "intern"
    ]
  },
  "linkedin": {
    "token": "",                // Add your LinkedIn token here
    "user": "hello@gmail.com",  // LinkedIn username or email
    "pass": "MyPass",           // LinkedIn password
    "date": "r2592000"          // Adjust as needed for session expiration
  },
  "spreadsheet": {
    "id": "SPREADSHEET_ID"      // Replace with the actual Spreadsheet ID
  }
}