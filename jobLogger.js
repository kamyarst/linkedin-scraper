class JobLogger {
  constructor() {
    this.metrics = {
      insertedLinkedInJobs: 0,
      insertedIndeedJobs: 0,
      totalLinkedInJobs: 0,
      totalIndeedJobs: 0
    };
  }

  logLinkedInJob() {
    this.metrics.insertedLinkedInJobs += 1;
    this.logScanLinkedInJob();
  }

  logScanLinkedInJob() {
    this.metrics.totalLinkedInJobs += 1;
  }

  logIndeedJob() {
    this.metrics.insertedIndeedJobs += 1;
    this.logScanIndeedJob();
  }

  logScanIndeedJob() {
    this.metrics.totalIndeedJobs += 1;
  }

  displayLog(message) {
    console.log(`LOG: ${message}`);
    console.log("Current Metrics:", this.metrics);
  }

  getMetrics() {
    return this.metrics;
  }
}

module.exports = JobLogger;
