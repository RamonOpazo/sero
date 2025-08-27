#!/bin/bash
#
# SERO Installation Script (v2)
#
# This script installs Ollama, uv, and the SERO application using the `uv tool` command
# for a clean, isolated installation.
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

# --- Ollama Model Setup ---
OLLAMA_MODEL="llama2"
echo_step "Checking for Ollama model: $OLLAMA_MODEL..."
if ollama list | grep -q "$OLLAMA_MODEL"; then
  echo "ollama model '$OLLAMA_MODEL' is already available."
else
  echo "Model not found. Pulling '$OLLAMA_MODEL' (this may take a while)..."
  ollama pull "$OLLAMA_MODEL"
  echo "ollama model '$OLLAMA_MODEL' pulled successfully."
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
APP_NAME="sero"

echo "Installing '$APP_NAME' from GitHub using 'uv tool install'..."
uv tool install --from "$GITHUB_REPO_URL" "$APP_NAME"

echo ""
echo "SERO installation complete!"
echo ""
echo "'$APP_NAME' is now installed in an isolated environment."
echo "You can now run it from anywhere by simply typing:"
echo ""
echo "   $APP_NAME"
echo ""
echo "NOTE: You may need to restart your terminal session for the '$APP_NAME' command to be available in your PATH."
echo ""
