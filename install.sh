#!/bin/bash
#
# SERO Installation Script
#
# This script installs Ollama, uv, and the SERO application using a modular,
# function-based approach with color-coded output.
#
set -e

# --- Configuration ---
OLLAMA_MODEL="llama2"
GITHUB_OWNER="RamonOpazo"
GITHUB_REPO="sero"
GITHUB_REPO_URL="git+https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git"
APP_NAME="sero"

# --- Color Definitions ---
C_RED='\033[0;31m'
C_GREEN='\033[0;32m'
C_BLUE='\033[0;34m'
C_GRAY='\033[0;90m'
C_NC='\033[0m' # No Color

# --- Helper Functions ---
echo_step() {
  echo ""
  echo -e "${C_BLUE}-----> $1${C_NC}"
}

echo_success() {
  echo -e "${C_GREEN}✓ $1${C_NC}"
}

echo_error() {
  echo -e "${C_RED}✗ ERROR: $1${C_NC}" >&2
}

echo_info() {
  echo -e "${C_BLUE}  $1${C_NC}"
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# --- Installation Functions ---

check_prerequisites() {
  echo_step "Step 1: Checking for prerequisites..."
  if ! command_exists curl; then
    echo_error "'curl' is required to download installers but is not found."
    exit 1
  fi
  echo_success "curl is available."
}

ensure_ollama() {
  echo_step "Step 2: Ensuring Ollama is installed and configured..."
  if command_exists ollama; then
    echo_success "Ollama is already installed."
  else
    echo_info "Ollama not found. Installing..."
    if ! curl -fsSL https://ollama.com/install.sh | sh; then
      echo_error "Ollama installation failed."
      exit 1
    fi
    echo_success "Ollama installed successfully."
  fi

  echo_info "Checking for Ollama model: $OLLAMA_MODEL..."
  if ollama list | grep -q "$OLLAMA_MODEL"; then
    echo_success "Model '$OLLAMA_MODEL' is already available."
  else
    echo_info "Model not found. Pulling '$OLLAMA_MODEL' (this may take a while)..."
    if ! ollama pull "$OLLAMA_MODEL"; then
        echo_error "Failed to pull Ollama model '$OLLAMA_MODEL'."
        exit 1
    fi
    echo_success "Model '$OLLAMA_MODEL' pulled successfully."
  fi
}

ensure_uv() {
  echo_step "Step 3: Ensuring uv is installed..."
  if command_exists uv; then
    echo_success "uv is already installed."
  else
    echo_info "uv not found. Installing..."
    if ! curl -LsSf https://astral.sh/uv/install.sh | sh; then
        echo_error "uv installation failed."
        exit 1
    fi
    # The uv installer script instructs to source the cargo env.
    # This is for the current shell session. The user's shell profile should be updated by the script.
    source "$HOME/.cargo/env"
    echo_success "uv installed successfully."
  fi
}

install_sero_app() {
  echo_step "Step 4: Installing the SERO application..."
  echo_info "Installing '$APP_NAME' from GitHub release tarball using 'uv tool install'..."

  # Allow explicit override via env var
  if [ -n "${SERO_TARBALL_URL:-}" ]; then
    TAR_URL="$SERO_TARBALL_URL"
  else
    # Determine release tag (allow override via RELEASE_TAG)
    if [ -n "${RELEASE_TAG:-}" ]; then
      TAG="$RELEASE_TAG"
    else
      # Query GitHub API for the latest release tag
      TAG=$(curl -fsSL "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest" \
        | grep -m1 -oE '"tag_name"[[:space:]]*:[[:space:]]*"[^"]+"' \
        | sed -E 's/.*:\s*"([^"]+)"/\1/') || TAG=""
    fi

    if [ -z "$TAG" ]; then
      echo_info "Could not determine release tag (API rate limit or no releases). Falling back to VCS install..."
      if ! uv tool install --from "$GITHUB_REPO_URL" "$APP_NAME"; then
        echo_error "Failed to install '$APP_NAME' from GitHub (VCS fallback)."
        exit 1
      fi
      echo_success "'$APP_NAME' installed (VCS fallback)."
      return
    fi

    TAR_URL="https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${TAG}/sero-backend-with-static.tar.gz#subdirectory=backend"
  fi

  if ! uv tool install "$TAR_URL"; then
    echo_error "Failed to install '$APP_NAME' from release tarball: $TAR_URL"
    exit 1
  fi
  echo_success "'$APP_NAME' installed."
}

print_completion_message() {
  echo ""
  echo -e "${C_GREEN}-------------------------------------------------${C_NC}"
  echo -e "${C_GREEN}🎉 SERO installation complete!${C_NC}" # Re-added the final emoji as it is a good touch
  echo -e "${C_GREEN}-------------------------------------------------${C_NC}"
  echo ""
  echo_info "'$APP_NAME' is now installed in an isolated environment."
  echo_info "You can now run it from anywhere by simply typing:"
  echo ""
  echo -e "   ${C_GREEN}$APP_NAME${C_NC}"
  echo ""
  echo -e "${C_GRAY}NOTE: You may need to restart your terminal session for the '$APP_NAME' command to be available in your PATH.${C_NC}"
  echo ""
}

# --- Main Execution Pipeline ---
main() {
  # Use a trap to catch errors and print a generic failure message.
  trap 'echo_error "An unexpected error occurred. Installation failed."; exit 1' ERR

  check_prerequisites
  ensure_ollama
  ensure_uv
  install_sero_app
  print_completion_message

  # Disable the trap on successful completion
  trap - ERR
}

# Run the main function
main
