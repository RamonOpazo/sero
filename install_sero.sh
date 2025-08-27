#!/bin/bash
#
# SERO Installation Script
#
# This script installs Ollama, uv, and the SERO application from its GitHub repository.
#
set -e

# --- Helper Functions ---
echo_step() {
  echo ""
  echo "-----> $1"
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# --- Prerequisite Check (curl) ---
echo_step "Checking for curl..."
if ! command_exists curl; then
  echo "Error: 'curl' is required to download installers but is not found."
  exit 1
fi
echo "curl is available."

# --- Ollama Installation ---
echo_step "Checking for Ollama..."
if command_exists ollama; then
  echo "Ollama is already installed."
else
  echo "Ollama not found. Installing..."
  curl -fsSL https://ollama.com/install.sh | sh
  echo "Ollama installed successfully."
fi

# --- uv Installation ---
echo_step "Checking for uv..."
if command_exists uv; then
  echo "uv is already installed."
else
  echo "uv not found. Installing..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  # The uv installer script instructs to source the cargo env, need to do that here.
  source "$HOME/.cargo/env"
  echo "uv installed successfully."
fi

# --- SERO Installation ---
echo_step "Installing the SERO application..."

# This is the GitHub repository URL for the project.
GITHUB_REPO_URL="git+https://github.com/RamonOpazo/sero.git"

INSTALL_DIR="$HOME/sero_app"
VENV_DIR="$INSTALL_DIR/.venv"

echo "SERO will be installed in: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo "Creating virtual environment..."
uv venv

echo "Installing SERO from GitHub..."
# Activate the venv to install into it
source "$VENV_DIR/bin/activate"
uv pip install "$GITHUB_REPO_URL"

echo ""
echo "-------------------------------------------------"
echo "SERO installation complete!"
echo "-------------------------------------------------"
echo ""
echo "To run the application:"
echo "1. Change into the application directory:"
echo "   cd $INSTALL_DIR"
echo ""
echo "2. Activate the virtual environment:"
echo "   source .venv/bin/activate"
echo ""
echo "3. Run the application:"
echo "   sero"
echo ""
