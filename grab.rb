require 'selenium-webdriver'
require 'json'
require_relative 'google_sheet'

class Grabber

  attr_reader :config
  
  # Initializer to get the path and save config
  def initialize(file_path)
    @file_path = file_path
    load_config
  end

  private

  # Method to load and parse JSON file
  def load_config
    if File.exist?(@file_path)
      begin
        @config = JSON.parse(File.read(@file_path))
      rescue JSON::ParserError => e
        puts "Failed to parse JSON: #{e.message}"
        @config = {}
      end
    else
      puts "File not found: #{@file_path}"
      @config = {}
    end
  end

  def init_driver
    # Create a new instance of the Chrome driver
    chrome_options = Selenium::WebDriver::Chrome::Options.new
    chrome_options.add_argument('--disable-cache')
    chrome_options.add_argument('--disk-cache-size=0')
    chrome_options.add_argument('--headless=new')
        
        # Initialize the driver with the options
    driver = Selenium::WebDriver.for :chrome, options: chrome_options
    driver.manage.timeouts.implicit_wait = 15
    driver.manage.window.maximize

    driver
  end

  def set_session_cookie(driver)
    driver.navigate.to "https://www.linkedin.com"

    cookie = {
      name: 'li_at',  # The name of the cookie
      value: config['linkedin']['token'],  
      path: '/',            
      domain: '.www.linkedin.com', # Optional: domain of the cookie (must match the current domain)
      secure: true,         # Optional: set to true if it's a secure cookie
      http_only: true,      # Optional: set to true if it's an HttpOnly cookie
      expiry: (Time.now + (60 * 60 * 60)).to_i # Optional: set an expiry time (1 hour from now)
    }

    # Add the cookie to the browser session
    driver.manage.add_cookie(cookie)
  end

  public def get()
    driver = init_driver
    wait = Selenium::WebDriver::Wait.new(:timeout => 5)
    queries = config['search']['queries']
    includes = config['search']['includes']
    excludes = config['search']['excludes']

    set_session_cookie(driver)

    queries.each do |query|
      fetch_data(query, includes, excludes, driver, wait)
    end

    driver.quit
  end

  def fetch_data(query, includes, excludes, driver, wait)
    unless driver.is_a?(Selenium::WebDriver::Driver)
      raise ArgumentError, "Expected driver to be a Selenium::WebDriver::Driver"
    end

    unless wait.is_a?(Selenium::WebDriver::Wait)
      raise ArgumentError, "Expected wait to be a Selenium::WebDriver::Wait"
    end

    keywords = query.gsub(' ', '%20')
    url = "https://www.linkedin.com/jobs/search/?geoId=101165590&keywords=#{keywords}&f_TPR=#{config['linkedin']['date']}"
    # &sortBy=DD
    puts "🔗 #{url}"

    # Navigate to LinkedIn
    driver.navigate.to url

    begin
      sleep 3
      puts "looking"
      driver.find_element(:xpath, '//button[@data-test-global-alert-action="1"]').click
      puts "rejected"
    rescue
      puts "not found"
    end

    page = 0
    has_next_page = true

    while(has_next_page) do

      jobs_table = driver.find_element(:class_name, 'scaffold-layout__list-container')
      wait.until { jobs_table.displayed? }
      job_rows = jobs_table.find_elements(:xpath, '//li[@data-occludable-job-id]')
      scrollable = driver.find_element(:class_name, "jobs-search-results-list")

      job_rows.each_with_index do |li, index|

        job_id = li.attribute('data-occludable-job-id')

        row = li.find_element(:xpath, "//div[@data-job-id=\"#{job_id}\"]")
        wait.until { row.displayed? }

        data = row.text.split("\n")
        job_title = data[0]
        job_company = data[2]
        job_location = data[3]

        job = {
            id: job_id,
            title: job_title,
            company: job_company,
            location: job_location
        }

        puts job

        contains_match = includes.any? do |term|
          job_title.downcase.include?(term.downcase)
        end

        excluded = excludes.none? do |term|
          job_title.downcase.include?(term.downcase)
        end

        if contains_match && excluded
          li.click

          job_detail_element = driver.find_element(:class_name, "job-details-jobs-unified-top-card__primary-description-container")
          wait.until { job_detail_element.displayed? }

          date = job_detail_element.find_elements(:class_name, "tvm__text")[2]
          job[:date] = date.text

          GoogleSheet.new(@file_path).add_to_sheet_if_needed(job, "LinkedIn")
        else
          puts "⏭️ Not matched"
        end
        
        puts '-----'

        driver.execute_script("arguments[0].scrollBy(0, #{row.size.height});", scrollable)  # Scroll down 200 pixels
      end

      begin
        next_page_button = driver.find_element(:xpath, "//li[@data-test-pagination-page-btn=#{page + 1}]")
        has_next_page = true
        page = page + 1
        next_page_button.click
      rescue 
        has_next_page = false
      end
    end
  end

  public def login
  
    driver = init_driver
    wait = Selenium::WebDriver::Wait.new(:timeout => 5)

    driver.navigate.to "https://www.linkedin.com/login"

    email_field = driver.find_element(:id, "username")
    wait.until { email_field.displayed? }
    email_field.send_keys(config['linkedin']['user'])

    pass_field = driver.find_element(:id, "password")
    pass_field.send_keys(config['linkedin']['pass'])
    pass_field.send_keys(:enter)

    sleep 2

    token = driver.manage.cookie_named('li_at')[:value]
    config['linkedin']['token'] = token
    File.write(@file_path, JSON.pretty_generate(@config))
  end
end