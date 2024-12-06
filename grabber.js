const fs = require('fs').promises;
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const GoogleSheet = require('./googleSheet');

class Grabber {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = {};
  }

  async loadConfig() {
    try {
      const rawData = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(rawData);
    } catch (e) {
      console.error(`Failed to parse config: ${e.message}`);
      this.config = {};
    }
  }

  async initDriver() {
    const options = new chrome.Options();
    options.addArguments('--disable-cache');
    options.addArguments('--disk-cache-size=0');
    options.addArguments('--headless=new');

    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    await driver.manage().window().maximize();
    return driver;
  }

  async setSessionCookie(driver) {
    await driver.get('https://www.linkedin.com');

    // Set the LinkedIn session cookie using the token
    const cookie = {
      name: 'li_at',
      value: this.config.linkedin.token,
      path: '/',
      domain: '.www.linkedin.com',
      secure: true,
      httpOnly: true,
      expiry: Math.floor(Date.now() / 1000) + 60 * 60 * 60 // 60 hours from now
    };

    await driver.manage().addCookie(cookie);
  }

  async login() {
    await this.loadConfig();
    const driver = await this.initDriver();
    const wait = driver.wait.bind(driver);

    try {
      await driver.get('https://www.linkedin.com/login');
      const emailField = await driver.wait(until.elementLocated(By.id('username')), 5000);
      await emailField.sendKeys(this.config.linkedin.user);

      const passField = await driver.findElement(By.id('password'));
      await passField.sendKeys(this.config.linkedin.pass);
      await passField.sendKeys('\n'); // Enter

      await driver.sleep(2000);

      // Retrieve updated cookie
      const cookies = await driver.manage().getCookies();
      const liAtCookie = cookies.find(c => c.name === 'li_at');
      if (liAtCookie) {
        this.config.linkedin.token = liAtCookie.value;
        await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      }

    } finally {
      await driver.quit();
    }
  }

  async getJobs() {
    // Ensure config is loaded
    await this.loadConfig();

    const driver = await this.initDriver();
    const wait = new (require('selenium-webdriver')).Condition('Wait', async () => true);
    const webdriverWait = async (conditionFn, timeout = 5000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        if (await conditionFn()) return true;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      throw new Error('Condition not met within timeout');
    };

    await this.setSessionCookie(driver);

    const queries = this.config.search?.queries || [];
    const includes = this.config.search?.includes || [];
    const excludes = this.config.search?.excludes || [];

    for (const query of queries) {
      try {
        await this.fetchData(query, includes, excludes, driver, webdriverWait);
      } catch (error) {
        console.log(error);
      }
    }

    await driver.quit();
  }

  async fetchData(query, includes, excludes, driver, wait) {
    const dateParam = this.config.linkedin.date;
    const keywords = encodeURIComponent(query);
    const url = `https://www.linkedin.com/jobs/search/?geoId=101165590&keywords=${keywords}&f_TPR=${dateParam}`;
    console.log(`🔗 ${url}`);

    await driver.get(url);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to close any pop-up alert (like cookie rejection)
    try {
      const rejectButton = await driver.findElement(By.xpath('//button[@data-test-global-alert-action="1"]'));
      await rejectButton.click();
      console.log("rejected");
    } catch (e) {
      console.error("not found");
    }

    let page = 0;
    let hasNextPage = true;

    const googleSheet = new GoogleSheet(this.configPath);
    await googleSheet.init();

    while (hasNextPage) {
      const jobsTable = await driver.findElement(By.className('scaffold-layout__list'));
      await driver.wait(until.elementIsVisible(jobsTable), 5000);
      const jobRows = await jobsTable.findElements(By.xpath('//li[@data-occludable-job-id]'));
      const scrollable = await jobsTable.findElement(By.xpath('//*[@id="main"]/div/div[2]/div[1]/div'));

      for (const li of jobRows) {
        const jobId = await li.getAttribute('data-occludable-job-id');
        try {
          const row = await driver.findElement(By.xpath(`//div[@data-job-id="${jobId}"]`));
          await driver.wait(until.elementIsVisible(row), 5000);

          const rowText = await row.getText();
          const data = rowText.split('\n');
          const jobTitle = data[0];
          const jobCompany = data[2];
          const jobLocation = data[3];

          const job = {
            id: jobId,
            title: jobTitle,
            company: jobCompany,
            location: jobLocation
          };

          console.log(job);

          const containsMatch = includes.some(term => jobTitle.toLowerCase().includes(term.toLowerCase()));
          const notExcluded = excludes.every(term => !jobTitle.toLowerCase().includes(term.toLowerCase()));

          if (containsMatch && notExcluded) {
            await li.click();
            const jobDetailElement = await driver.wait(until.elementLocated(By.className("job-details-jobs-unified-top-card__primary-description-container")), 5000);
            await driver.wait(until.elementIsVisible(jobDetailElement), 5000);

            const tvmTextElements = await jobDetailElement.findElements(By.className("tvm__text"));
            // The original code took the third element (index 2)
            if (tvmTextElements[2]) {
              const dateText = await tvmTextElements[2].getText();
              job.date = dateText;
            }

            await googleSheet.addToSheetIfNeeded(job, "LinkedIn");
          } else {
            console.log("⏭️ Not matched");
          }
        } catch (error) {
          console.error(error);
        }

        console.log('-----');

        // Scroll down to load more jobs
        await driver.executeScript("arguments[0].scrollBy(0, 200);", scrollable);
      }

      // Try to go to next page
      try {
        page += 1;
        const nextPageButton = await driver.findElement(By.css(`button[aria-label="Page ${page}"]`));
        await nextPageButton.click();
      } catch (err) {
        hasNextPage = false;
      }
    }
  }
}

module.exports = Grabber;