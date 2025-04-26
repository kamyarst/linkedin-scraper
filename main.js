const fs = require('fs').promises;
const LinkedinScraper = require('./linkedinScraper');
const IndeedScraper = require('./indeedScraper');
const GoogleSheet = require('./googleSheet');
const JobLogger = require('./jobLogger');

(async () => {
  console.log("Google credential file is imported!");

  try {
    const rawData = await fs.readFile("./configurations.json", 'utf8');
    const config = JSON.parse(rawData);
    console.log("Configuration file is imported!");

    const googleSheet = new GoogleSheet(config);
    await googleSheet.init();

    const logger = new JobLogger();

    if (config.linkedin.enabled) {
      const linkedin = new LinkedinScraper(config, googleSheet, logger);

      // Login to fetch and update token
      if (config.linkedin.login) {
        await linkedin.login();
      }

      //  Perform scraping and data retrieval
      await linkedin.getJobs();
    }

    if (config.indeed.enabled) {
      const indeed = new IndeedScraper(config, googleSheet, logger);
      await indeed.getJobs();
    }

    logger.displayLog("Results:");
  } catch (e) {
    console.error(e.message);
  }
})();