#!/usr/bin/env bash

set -euo pipefail

# Function to print an error message and exit
function error_exit {
  echo "Error: $1" >&2
  exit 1
}

# Function to check if a command exists
function command_exists {
  command -v "$1" >/dev/null 2>&1
}

# Detect OS type
OS_TYPE="unknown"
case "$OSTYPE" in
  darwin*)  OS_TYPE="mac" ;;
  linux*)   OS_TYPE="linux" ;;
  msys*|cygwin*|win32*) OS_TYPE="windows" ;;
  *) error_exit "Unsupported OS type: $OSTYPE" ;;
esac

echo "Running on: $OS_TYPE"

### Installers/Package managers ###

# Mac: Homebrew
if [[ "$OS_TYPE" == "mac" ]] && ! command_exists brew; then
  echo "Homebrew not found. Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || error_exit "Failed to install Homebrew."
  # Add Homebrew to PATH for this script runtime
  if [[ -f "/opt/homebrew/bin/brew" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -f "/usr/local/bin/brew" ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  else
    error_exit "Homebrew installed but not found in expected locations."
  fi
fi

# Windows: Chocolatey
if [[ "$OS_TYPE" == "windows" ]] && ! command_exists choco; then
  echo "Chocolatey not found. Installing Chocolatey..."
  powershell -NoProfile -ExecutionPolicy Bypass -Command \
  "Set-ExecutionPolicy Bypass -Scope Process -Force; \
   [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; \
   iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" || error_exit "Failed to install Chocolatey."
  # Add Chocolatey to PATH for this script runtime
  export PATH="$PATH:/c/ProgramData/chocolatey/bin"
fi

### Node.js and npm installation ###

if ! command_exists node || ! command_exists npm; then
  echo "Node.js or npm not found. Installing Node.js..."

  case "$OS_TYPE" in
    mac)
      brew install node || error_exit "Failed to install Node.js via Homebrew."
      ;;
    linux)
      # Using apt for Debian/Ubuntu based systems
      if command_exists apt; then
        sudo apt-get update -y
        sudo apt-get install -y nodejs npm || error_exit "Failed to install Node.js and npm via apt."
      else
        error_exit "No supported package manager found. Please install Node.js manually."
      fi
      ;;
    windows)
      choco install -y nodejs || error_exit "Failed to install Node.js via Chocolatey."
      # Add Node.js to PATH for this script runtime if needed (usually not needed on Windows)
      ;;
  esac
fi

# Check again if node and npm are installed
if ! command_exists node || ! command_exists npm; then
  error_exit "Node.js or npm is still not installed. Please install manually."
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

### Install project dependencies ###

if [ ! -f package.json ]; then
  error_exit "No package.json found. Make sure you're running this script from the project directory."
fi

echo "Installing project dependencies..."
npm install || error_exit "npm install failed."

### Run the project ###

echo "Starting the project..."
node main.js || error_exit "Failed to run main.js."