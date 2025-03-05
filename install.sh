#!/bin/bash
set -e  # Exit immediately if a command fails

INSTALL_DIR="$HOME/.sero"
BIN_DIR="$HOME/.bin"
BIN_PATH="$BIN_DIR/sero"
REPO_URL="https://github.com/your-repo/sero.git"

echo "🔹 Installing Sero..."

mkdir -p "$BIN_DIR"

if ! command -v uv &> /dev/null; then
    echo "⚡ Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi

rm -rf "$INSTALL_DIR"
echo "📥 Downloading Sero..."
git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"

echo "⚙️ Setting up environment..."
uv venv "$INSTALL_DIR"
"$INSTALL_DIR/bin/uv" pip install "$INSTALL_DIR"

ln -sf "$INSTALL_DIR/bin/sero" "$BIN_PATH"

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo 'export PATH="$HOME/.bin:$PATH"' >> "$HOME/.bashrc"
    echo 'export PATH="$HOME/.bin:$PATH"' >> "$HOME/.zshrc"
    export PATH="$HOME/.bin:$PATH"
fi

echo "✅ Sero installed successfully! Run 'sero --help' to get started."


# uv build
# uv tool install dist/file.whl