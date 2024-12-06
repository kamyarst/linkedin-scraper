# Setup Guide for LinkedIn Job Scraper with Google Sheets Integration

This guide will help you set up your local environment, configure the necessary credentials, and run the Node.js-based LinkedIn job scraping tool that logs results into a Google Spreadsheet.

## Prerequisites

- **Operating System:** macOS, Linux, or Windows
- **Internet connection** to access Google Cloud Console and LinkedIn.
- **Google Cloud Account** to obtain Google Sheets API credentials.
- **Git Bash or similar shell on Windows** (if using Windows) for running the provided Bash script.

## Step 1: Obtain Google API Credentials (`credentials.json`)

1. **Go to Google Cloud Console:**  
   [Google Cloud Console](https://console.cloud.google.com/)

2. **Create a New Project (or use an existing one):**  
   - Click on the project dropdown at the top.
   - Select **New Project**, give it a name, and confirm.

3. **Enable the Google Sheets API:**  
   - In the left sidebar, select **Library**.
   - Search for **Google Sheets API**.
   - Click **Enable**.

4. **Create a Service Account and JSON Key:**
   - In the left sidebar, go to **APIs & Services > Credentials**.
   - Click **Create Credentials > Service Account** and follow the prompts.
   - Once created, locate your service account under **Credentials**.
   - Click **Manage keys** > **Add Key > Create New Key**.
   - Select **JSON** and download the key file. This is your `credentials.json`.

5. **Make Note of the Service Account Email:**
   - Inside `credentials.json`, note the `client_email`. You’ll need this to share the spreadsheet.

## Step 2: Grant Spreadsheet Access to the Service Account

1. **Open Your Google Spreadsheet:**
   - Go to the Google Sheet you want to use for logging data.
   - Copy the **Spreadsheet ID** from the URL.  
     For example, in `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`,  
     the `SPREADSHEET_ID` is the long string between `/d/` and `/edit`.

2. **Share the Sheet with the Service Account:**
   - Click **Share** in the top-right corner of the Google Sheet.
   - Add the service account email (found in `credentials.json`) as a collaborator with *Editor* access.
   - Save the changes.

## Step 3: Place `credentials.json` in Project Root

1. **Move `credentials.json`:**
   - Put the downloaded `credentials.json` file at the root of your project directory (same place as `main.js`).

## Step 4: Adjust Your Configuration File (`configurations.json`)

Create or update your `configurations.json` configuration file with the following structure:

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
    "token": "",                // Leave blank initially; script updates it upon login
    "user": "hello@gmail.com",  // Your LinkedIn username or email
    "pass": "MyPass",           // Your LinkedIn password
    "date": "r2592000"          // Adjust based on LinkedIn date filters if needed
  },
  "spreadsheet": {
    "id": "SPREADSHEET_ID"      // Replace with your actual Google Spreadsheet ID
  }
}
```

## Step 5: Setup and Run the Project

1. **Run the Setup Script (Bash):**  
   We provide a Bash script (`setup.sh`) that:
   - Installs necessary package managers if missing (e.g., Homebrew on macOS, Chocolatey on Windows).
   - Installs Node.js and npm if not already installed.
   - Installs project dependencies via `npm install`.
   - Runs the main script (`node main.js`).

   To run the script, open your terminal in the project directory and execute:
   ```bash
   ./setup.sh
   ```

#### Note:
 - On Windows, consider using Git Bash or WSL for a smooth experience.
 - If prompted for permissions, confirm them.

2. Login and Fetch Data:
  - The first run triggers a LinkedIn login step using your provided credentials.
  -	After successful login, the script updates the token field in kim.json.
  -	Subsequent runs can now scrape LinkedIn job postings and append them to your spreadsheet.
3.  Verify Results:
  - Once the script completes, open your Google Spreadsheet.
  - You should see appended job listings matching your queries and filters.

## Troubleshooting

#### Missing Dependencies:
If the script fails due to missing dependencies, ensure you’re connected to the internet and rerun `./setup.sh`.

#### LinkedIn Login Issues:
Double-check your LinkedIn credentials in configurations.json.

#### Spreadsheet Not Updated:
Make sure the service account has edit permission and that the spreadsheet.id is correct.