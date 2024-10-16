require 'google/apis/sheets_v4'
require 'googleauth'
require 'json'
require 'fileutils'
require "dotenv"

Dotenv.load(".env-kim")

class GoogleSheet
  APPLICATION_NAME = 'LinkedIn Scrabber'
  SPREADSHEET_ID = ENV['SPREADSHEET_ID']
  SERVICE_ACCOUNT_KEY_PATH = './credentials.json'

  # Authorize using the service account key
  def authorize_service_account
    key_file = File.read(SERVICE_ACCOUNT_KEY_PATH)
    key = JSON.parse(key_file)
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
  def add_to_sheet(row, service)

    range = "Sheet1!A2"
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
      SPREADSHEET_ID,
      range,
      value_range_object,
      value_input_option: 'RAW'
    )
  end


  public def add_to_sheet_if_needed(row)
    sleep 1 # to avoid limit
    
    service = initialize_service
    range = 'Sheet1!A:A' # Define the range to check (first column in Sheet1)

    # Fetch all values from the first column
    response = service.get_spreadsheet_values(SPREADSHEET_ID, range)

    # Check if the ID exists in the first column
    if response.values.flatten.include?(row[:id].to_s)
      puts "⏭️ Already imported"
    else
      add_to_sheet(row, service)
      puts "✅ Added"
    end
  end
end