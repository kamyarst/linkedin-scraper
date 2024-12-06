const fs = require('fs');
const path = require('path');
const Grabber = require('./grabber');

(async () => {
  const googleCredsPath = path.resolve(__dirname, 'credentials.json');
  const configPath = path.resolve(__dirname, 'configurations.json');

  // Check Google credentials file
  if (!fs.existsSync(googleCredsPath)) {
    throw new Error('Google Credentials file does not exist.');
  }
  console.log("Google credential file is imported!");

  // Check configuration file
  if (!fs.existsSync(configPath)) {
    throw new Error('Configurations file does not exist.');
  }
  console.log("Configuration file is imported!");

  const grabber = new Grabber(configPath);

  // Login to fetch and update token
  await grabber.login();

  // Perform scraping and data retrieval
  await grabber.getJobs();
})();