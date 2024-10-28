#!/bin/bash

# Function to check if a command exists
function command_exists {
  command -v "$1" >/dev/null 2>&1
}

# Determine OS type
OS_TYPE="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
  OS_TYPE="mac"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  OS_TYPE="linux"
elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]] || [[ "$OSTYPE" == "win32"* ]]; then
  OS_TYPE="windows"
else
  echo "Unsupported OS type: $OSTYPE"
  exit 1
fi

echo "Running on: $OS_TYPE"

# Mac specific: Check and install Homebrew
if [[ "$OS_TYPE" == "mac" ]]; then
  if ! command_exists brew; then
    echo "Homebrew is not installed. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Add Homebrew to PATH
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.bash_profile
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
fi

# Windows specific: Check and install Chocolatey
if [[ "$OS_TYPE" == "windows" ]]; then
  if ! command_exists choco; then
    echo "Chocolatey is not installed. Installing Chocolatey..."
    powershell -NoProfile -ExecutionPolicy Bypass -Command \
    "Set-ExecutionPolicy Bypass -Scope Process -Force; \
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; \
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    # Refresh environment variables
    export PATH="$PATH:/c/ProgramData/chocolatey/bin"
  fi
fi

# Check if gem is installed
if ! command_exists gem; then
  echo "RubyGems (gem) is not installed."

  if [[ "$OS_TYPE" == "mac" ]]; then
    echo "Installing Ruby via Homebrew..."
    brew install ruby
    # Add Ruby to PATH
    echo 'export PATH="/usr/local/opt/ruby/bin:$PATH"' >> ~/.bash_profile
    export PATH="/usr/local/opt/ruby/bin:$PATH"
  elif [[ "$OS_TYPE" == "windows" ]]; then
    echo "Installing Ruby via Chocolatey..."
    choco install ruby -y
    # Refresh environment variables
    export PATH="$PATH:/c/tools/ruby27/bin"
  else
    echo "Please install Ruby manually."
    exit 1
  fi
fi

# Check again if gem is installed
if ! command_exists gem; then
  echo "RubyGems (gem) is still not installed. Exiting."
  exit 1
fi

# Check if bundler is installed
if ! gem list -i bundler >/dev/null 2>&1; then
  echo "Bundler is not installed. Installing Bundler..."
  gem install bundler
fi

# Run bundle install
echo "Running 'bundle install'..."
bundle install

ruby main.rb
