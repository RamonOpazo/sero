#!/bin/sh
set -e  # Exit immediately if a command fails

TEMP_DIR="/tmp/.sero"
REPO_URL="https://github.com/RamonOpazo/sero.git"

echo "Installing sero..."

echo "Checking uv installation..."
if ! command -v uv &> /dev/null; then
    read -p "Could not find uv. Do you want to install it? (y/N): " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Installing uv..."
        curl -LsSf https://astral.sh/uv/install.sh | sh
        echo "✅ uv installed successfully!"
    else
        echo "Installation aborted!"
        exit 1
    fi
else
    echo "✅ uv already installed."
fi

rm -rf "$TEMP_DIR"

echo "Downloading sero..."
git clone --depth 1 "$REPO_URL" "$TEMP_DIR"

echo "Building and installing sero..."
uv build "$TEMP_DIR"
LATEST_PACKAGE=$(ls -t $TEMP_DIR/dist/sero-*.tar.gz | head -n 1)
uv tool install "$LATEST_PACKAGE"

echo "✅ sero installed successfully! Run 'sero --help' to get started."
