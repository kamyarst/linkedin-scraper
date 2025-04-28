const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

class IndeedScraper {

  constructor(config, googleSheet, logger) {
    this.config = config;
    this.googleSheet = googleSheet;
    this.logger = logger
  }

  async initDriver() {
    const options = new chrome.Options();
    // options.addArguments('--disable-cache');
    // options.addArguments('--disk-cache-size=0');
    options.addArguments('--headless=new');
    options.addArguments("--disable-blink-features=AutomationControlled"); // Disable automation controls
    options.addArguments('--disable-infobars'); // Disable infobars indicating automation
    options.addArguments('--disable-dev-shm-usage'); // Overcome limited resource issues
    options.addArguments('--no-sandbox'); // Bypass OS security model
    options.addArguments('--disable-gpu'); // Disable GPU acceleration
    options.addArguments('--remote-debugging-port=9222'); // Enable remote debugging
    options.addArguments('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

    // Remove WebDriver-specific identifiers
    options.excludeSwitches(['enable-automation']); // Prevent Chrome from enabling automation mode
    options.setUserPreferences({ 'useAutomationExtension': false });

    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    await driver.manage().window().maximize();
    await driver.executeScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    return driver;
  }

  async getJobs() {
    const queries = this.config.search?.queries || [];
    const includes = this.config.search?.includes || [];
    const excludes = this.config.search?.excludes || [];

    for (const query of queries) {
      const driver = await this.initDriver();
      try {
        await this.fetchData(query, includes, excludes, driver);
      } catch (error) {
        console.log(error);
      } finally {
        await driver.quit();
      }
    }
  }

  async fetchData(query, includes, excludes, driver) {
    const dateParam = await this.getDate(this.config.search.date);
    const keywords = query.replace(/ /g, "+");
    const url = `https://uk.indeed.com/jobs?q=${keywords}&l=United+Kingdom${dateParam}`;
    console.log(`🔗 ${url}`);

    try {
      await driver.get(url);

      let hasNextPage = true;

      while (hasNextPage) {
        const jobsTableLocator = By.className('mosaic mosaic-provider-jobcards mosaic-provider-hydrated');
        await driver.wait(until.elementLocated(jobsTableLocator), 10000);
        const jobsTable = await driver.findElement(jobsTableLocator);
        const jobRows = await jobsTable.findElements(By.xpath('./ul/li'));

        for (const li of jobRows) {
          try {
            const row = await li.findElement(By.xpath(".//td[contains(@class, 'resultContent')]"));
            const jobTitleElement = await row.findElement(By.css("a"));
            const jobId = await jobTitleElement.getAttribute('data-jk');

            const locationElement = await row.findElement(By.xpath(`.//div[@data-testid="text-location"]`));
            const companyElement = await row.findElement(By.xpath(`.//span[@data-testid="company-name"]`));
            await driver.wait(until.elementIsVisible(locationElement), 5000);

            const jobTitle = await jobTitleElement.getText();
            const jobCompany = await companyElement.getText();
            const jobLocation = await locationElement.getText();

            const job = {
              id: jobId,
              title: jobTitle,
              company: jobCompany,
              location: jobLocation,
              link: `https://uk.indeed.com/viewjob?jk=${jobId}`,
              date: ""
            };

            console.log(job);

            const containsMatch = includes.some(term => jobTitle.toLowerCase().includes(term.toLowerCase()));
            const notExcluded = excludes.every(term => !jobTitle.toLowerCase().includes(term.toLowerCase()));

            if (containsMatch && notExcluded) {
              await this.googleSheet.addToSheetIfNeeded(job, "Indeed");
              this.logger.logIndeedJob();
            } else {
              console.log("⏭️ Not matched");
              this.logger.logScanIndeedJob();
            }
          } catch (error) {
            console.error(error);
          }
          console.log('-----');

          // Scroll down to load more jobs
          const { height } = (await li.getRect());

          await driver.actions()
            .scroll(0, 0, 0, height)
            .perform();
        }

        // Try to go to next page
        try {
          const nextPageButton = await driver.findElement(By.xpath(`//a[@data-testid="pagination-page-next"]`));
          await nextPageButton.click();
        } catch (err) {
          hasNextPage = false;
        }
      }
    } catch (error) {
      console.error('Error during scraping:', error);
      throw error;
    }
  }

  async getDate(dateType) {
    if (dateType == "MONTH") {
      return "&fromage=14"
    } else if (dateType == "WEEK") {
      return "&fromage=7"
    } else if (dateType == "DAY") {
      return "&fromage=1"
    } else {
      return ""
    }
  }
}

module.exports = IndeedScraper;