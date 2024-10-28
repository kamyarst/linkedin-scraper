require 'google/apis/sheets_v4'
require 'googleauth'
require 'json'
require 'fileutils'

class GoogleSheet
  APPLICATION_NAME = 'LinkedIn Scrabber'
  SERVICE_ACCOUNT_KEY_PATH = './credentials.json'
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

  # Authorize using the service account key
  def authorize_service_account
    key_file = File.read(SERVICE_ACCOUNT_KEY_PATH)
    scope = ['https://www.googleapis.com/auth/spreadsheets']

    authorizer = Google::Auth::ServiceAccountCredentials.make_creds(
      json_key_io: StringIO.new(key_file),
      scope: scope
    )
    
    authorizer.fetch_access_token!
    authorizer
  end

  # Initialize the Sheets API
  def initialize_service

    service = Google::Apis::SheetsV4::SheetsService.new
    service.client_options.application_name = APPLICATION_NAME
    service.authorization = authorize_service_account

    service
  end

  # Append an error log to a specific sheet (tab) within the existing spreadsheet
  def add_to_sheet(row, page, service)

    range = "#{page}!A2"
    value_range_object = Google::Apis::SheetsV4::ValueRange.new(
      values: [
        [
        row[:id],
        row[:title],
        row[:company],
        row[:location],
        Time.now.strftime('%Y-%m-%d %H:%M'),
        row[:date],
        "https://www.linkedin.com/jobs/view/#{row[:id]}"
        ]
      ]
    )
    
    service.append_spreadsheet_value(
      config['spreadsheet']['id'],
      range,
      value_range_object,
      value_input_option: 'RAW'
    )
  end

  public def add_to_sheet_if_needed(row, page)
    sleep 1 # to avoid limit
    
    service = initialize_service
    range = "#{page}!A:A" # Define the range to check (first column in #{ENV['SPREADSHEET_PAGE']})

    # Fetch all values from the first column
    response = service.get_spreadsheet_values(config['spreadsheet']['id'], range)

    # Check if the ID exists in the first column
    if response.values.flatten.include?(row[:id].to_s)
      puts "⏭️ Already imported"
    else
      add_to_sheet(row, page, service)
      puts "✅ Added"
    end
  end
end