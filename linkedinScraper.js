const fs = require('fs').promises;
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

class LinkedinScraper {

  constructor(config, googleSheet, logger) {
    this.config = config;
    this.googleSheet = googleSheet;
    this.logger = logger;
  }

  async initDriver() {
    const options = new chrome.Options();
    // Memory optimization options
    options.addArguments('--disable-cache');
    options.addArguments('--disable-software-rasterizer');
    options.addArguments('--disk-cache-size=0');
    options.addArguments('--headless=new');
    options.addArguments("--disable-blink-features=AutomationControlled"); // Disable automation controls
    options.addArguments('--disable-infobars'); // Disable infobars indicating automation
    options.addArguments('--disable-dev-shm-usage'); // Overcome limited resource issues
    options.addArguments('--no-sandbox'); // Bypass OS security model
    options.addArguments('--disable-gpu'); // Disable GPU acceleration
    options.addArguments('--remote-debugging-port=9222'); // Enable remote debugging
    options.addArguments('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'); // Set consistent user agent

    // Additional options to better mimic real browser behavior
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--start-maximized');
    options.addArguments('--disable-extensions');
    options.addArguments('--lang=en-US,en;q=0.9');
    options.addArguments('--disable-web-security');

    // Set CDP chrome properties to bypass detection
    options.addArguments("--disable-features=IsolateOrigins,site-per-process");

    // Memory optimization additions
    // options.addArguments('--js-flags=--max-old-space-size=500'); // Limit JS heap size
    // options.addArguments('--single-process'); // Use single process to reduce memory footprint
    options.addArguments('--aggressive-cache-discard'); // Aggressively free memory when possible
    options.addArguments('--disable-pinch');
    options.addArguments('--disable-component-extensions-with-background-pages');

    // Set additional preferences
    options.setUserPreferences({
      'credentials_enable_service': false,
      'profile.password_manager_enabled': false,
      'useAutomationExtension': false,
      'plugins.always_open_pdf_externally': true,
      // 'profile.default_content_setting_values.images': 2, // Don't load images to save memory
      // 'profile.managed_default_content_settings.images': 2
    });

    // Remove WebDriver-specific identifiers
    options.excludeSwitches(['enable-automation']); // Prevent Chrome from enabling automation mode
    options.setUserPreferences({ 'useAutomationExtension': false });

    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

    // Override navigator.webdriver property to avoid detection
    await driver.executeScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");

    await driver.manage().window().maximize();
    return driver;
  }

  async login() {
    let driver = await this.initDriver();

    try {
      if (await this.isValidSession(driver) == false) {

        await driver.get('https://www.linkedin.com/login');
        const emailField = await driver.wait(until.elementLocated(By.id('username')), 5000);
        await emailField.sendKeys(this.config.linkedin.user);

        const passField = await driver.findElement(By.id('password'));
        await passField.sendKeys(this.config.linkedin.pass);
        await passField.sendKeys('\n'); // Enter

        await driver.sleep(20000);

        // Retrieve updated cookie
        const cookies = await driver.manage().getCookies();
        const liAtCookie = cookies.find(c => c.name === 'li_at');
        if (liAtCookie) {
          this.config.linkedin.token = liAtCookie.value;
          await fs.writeFile("./configurations.json", JSON.stringify(this.config, null, 2), 'utf8');
        }
      }
    } finally {
      if (driver) {
        await this.releaseDriver(driver);
        driver = null;
      }
    }
  }

  async releaseDriver(driver) {
    try {
      // Clear browser cache and session storage before quitting
      // await driver.executeScript('window.localStorage.clear();');
      // await driver.executeScript('window.sessionStorage.clear();');
      // await driver.executeScript('var cookies = document.cookie.split(";"); for (var i = 0; i < cookies.length; i++) { var cookie = cookies[i]; var eqPos = cookie.indexOf("="); var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie; document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT"; }');
      
      // Close all open windows except the main one
      await this.closeWindow(driver);
      
      // Quit the driver
      await driver.quit();
    } catch (error) {
      console.error('Error releasing driver resources:', error);
    }
  }

  async isValidSession(driver) {
    try {
      await driver.get('https://www.linkedin.com/');

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

      await driver.get('https://www.linkedin.com/login');

      const finalUrl = await driver.getCurrentUrl();
      console.log(finalUrl);
      return finalUrl.includes("feed");

    } catch {
      return false
    }
  }

  async getJobs() {
    let driver = await this.initDriver();
    try {
      await this.setSessionCookie(driver);

      const queries = this.config.search?.queries || [];
      const includes = this.config.search?.includes || [];
      const excludes = this.config.search?.excludes || [];

      for (const query of queries) {
        try {
          await this.fetchData(query, includes, excludes, driver);
        } catch (error) {
          console.log(error);
        }
      }
    } finally {
      if (driver) {
        await this.releaseDriver(driver);
        driver = null;
      }
    }
  }

  async fetchData(query, includes, excludes, driver) {
    await this.closeWindow(driver);

    const dateParam = await this.getDate(this.config.search.date);
    const location = encodeURIComponent(this.config.search.location);
    const keywords = encodeURIComponent(query);
    const url = `https://www.linkedin.com/jobs/search/?location=${location}&keywords=${keywords}${dateParam}`;
    console.log(`🔗 ${url}`);

    await driver.get(url);
    await driver.sleep(3000); // Wait longer for page to fully load in headless mode

    // Try to close any pop-up alert (like cookie rejection)
    try {
      const rejectButton = await driver.findElement(By.xpath('//button[@data-test-global-alert-action="1"]'));
      await rejectButton.click();
      console.log("rejected");
    } catch (e) {
      console.error("not found");
    }

    let page = 1;
    let hasNextPage = true;

    while (hasNextPage && page <= this.config.linkedin.page_limit) {
      const jobsTable = await driver.findElement(By.className('scaffold-layout__list'));
      await driver.wait(until.elementIsVisible(jobsTable), 5000);
      const jobRows = await jobsTable.findElements(By.xpath('//li[@data-occludable-job-id]'));
      const scrollable = await jobsTable.findElement(By.xpath('//*[@id="main"]/div/div[2]/div[1]/div'));

      for (const li of jobRows) {
        try {
          const jobId = await li.getAttribute('data-occludable-job-id');
          const row = await li.findElement(By.xpath(`//div[@data-job-id="${jobId}"]`));
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
            location: jobLocation,
            link: `https://www.linkedin.com/jobs/view/${jobId}`
          };

          const containsMatch = includes.some(term => jobTitle.toLowerCase().includes(term.toLowerCase()));
          const notExcluded = excludes.every(term => !jobTitle.toLowerCase().includes(term.toLowerCase()));

          if (containsMatch && notExcluded) {
            await li.click();
            const jobDetailElement = await driver.wait(until.elementLocated(By.className("job-details-jobs-unified-top-card__primary-description-container")), 5000);
            await driver.wait(until.elementIsVisible(jobDetailElement), 5000);

            const tvmTextElements = await jobDetailElement.findElements(By.className("tvm__text"));

            // Look for element that has "ago" in text instead of using fixed index
            let dateText = '';
            for (const element of tvmTextElements) {
              const text = await element.getText();
              if (text.includes('ago')) {
                dateText = text;
                break;
              }
            }
            job.date = dateText;

            console.log(job);

            // Cache these keyword arrays to avoid creating new arrays for each job
            const dayKeywords = ['min', 'hour', '1 day'];
            const weekKeywords = ['min', 'hour', '1 day', 'day', '1 week'];

            const containsKeyword = (text, keywords) =>
              keywords.some(keyword => text.toLowerCase().includes(keyword));

            if (this.config.search.date === "DAY" && containsKeyword(job.date, dayKeywords)) {
              await this.googleSheet.addToSheetIfNeeded(job, "LinkedIn");
              this.logger.logLinkedInJob();
            } else if (this.config.search.date === "WEEK" && containsKeyword(job.date, weekKeywords)) {
              await this.googleSheet.addToSheetIfNeeded(job, "LinkedIn");
              this.logger.logLinkedInJob();
            } else if (job.date == '') {
              await this.googleSheet.addToSheetIfNeeded(job, "LinkedIn");
              this.logger.logLinkedInJob();
            } else {
              console.log("⏭️ Outdated job");
              this.logger.logScanLinkedInJob();
            }
          } else {
            console.log(job);
            console.log("⏭️ Not matched");
            this.logger.logScanLinkedInJob();
          }
        } catch (error) {
          console.error(error);
        }

        console.log('-----');

        // Scroll down to load more jobs
        const { height } = (await li.getRect());
        await driver.executeScript(`arguments[0].scrollBy(0, ${height});`, scrollable);
        await driver.sleep(200);
      }

      // Try to go to next page
      try {
        page += 1;
        const nextPageButton = await driver.findElement(By.css(`button[aria-label="Page ${page}"]`));
        await nextPageButton.click();
        await driver.sleep(2000);
      } catch (err) {
        hasNextPage = false;
      }
    }
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

  async getDate(dateType) {
    if (dateType == "MONTH") {
      return "&f_TPR=r2592000"
    } else if (dateType == "WEEK") {
      return "&f_TPR=r604800"
    } else if (dateType == "DAY") {
      return "&f_TPR=r86400"
    } else {
      return ""
    }
  }

  async closeWindow(driver) {
    try {
      const handles = await driver.getAllWindowHandles();
      for (let i = 1; i < handles.length; i++) {
        await driver.switchTo().window(handles[i]);
        await driver.close();
      }
      await driver.switchTo().window(handles[0]);
    } catch (error) {
      console.error("Error closing windows:", error);
    }
  }
}

module.exports = LinkedinScraper;