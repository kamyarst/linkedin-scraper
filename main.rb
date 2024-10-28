require_relative 'grab'

# Define the file path
google_creds_path = "./credentials.json"

# Check if the file exists
if File.exist?(google_creds_path)
  puts "File exists!"
else
  raise "Google Credentials file does not exist."
end

# Define the file path
configurations_path = "./configurations.json"

# Check if the file exists
if File.exist?(configurations_path)
  puts "File exists!"
else
  raise "Configurations file does not exist."
end

# grabber = Grabber.new("./kim.json")
grabber = Grabber.new(configurations_path)

grabber.login
grabber.get
