#Requires -Version 5.1
<#
.SYNOPSIS
    Installs the SERO application and its dependencies on Windows.
.DESCRIPTION
    This script provides a complete, automated installation for SERO. It ensures
    that winget, Ollama, and uv are available, installs the SERO application from
    GitHub, and creates convenient shortcuts.
.NOTES
    Run this script in a PowerShell terminal with administrator privileges for best results,
    especially for installing new software via winget.
#>

# --- Configuration ---
$owner = "RamonOpazo"
$repo = "sero"
$repoUrl = "https://github.com/$owner/$repo.git"
$appName = "sero"
$ollamaModel = "llama2"
# Optional: Provide a full path to a .ico file for the shortcuts.
# If left empty, no icon will be assigned.
$iconPath = ""

# --- Script Setup ---
$ErrorActionPreference = "Stop" # Exit script on any error, similar to 'set -e'

# --- Helper Functions for Colorized Output ---
function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "-----> $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    # Write-Error cmdlet is more idiomatic for terminating errors
    Write-Error "✗ ERROR: $Message"
}

function Write-Info {
    param([string]$Message)
    Write-Host "  $Message" -ForegroundColor Blue
}

# --- Installation Functions ---

function Check-Prerequisites {
    Write-Step "Step 1: Checking for prerequisites..."
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Error "Windows Package Manager (winget) not found. Please install it from the Microsoft Store or update your system."
    }
    Write-Success "Windows Package Manager (winget) is available."
}

function Ensure-Ollama {
    Write-Step "Step 2: Ensuring Ollama is installed and configured..."
    if (Get-Command ollama -ErrorAction SilentlyContinue) {
        Write-Success "Ollama is already installed."
    } else {
        Write-Info "Ollama not found. Installing via winget..."
        try {
            winget install -e --id Ollama.Ollama --accept-package-agreements --accept-source-agreements
            Write-Success "Ollama installed successfully."
        } catch {
            Write-Error "Ollama installation failed. Please try installing it manually."
        }
    }

    Write-Info "Checking for Ollama model: $ollamaModel..."
    if (ollama list | Select-String -Pattern $ollamaModel -Quiet) {
        Write-Success "Model '$ollamaModel' is already available."
    } else {
        Write-Info "Model not found. Pulling '$ollamaModel' (this may take a while)..."
        try {
            ollama pull $ollamaModel
            Write-Success "Model '$ollamaModel' pulled successfully."
        } catch {
            Write-Error "Failed to pull Ollama model '$ollamaModel'."
        }
    }
}

function Ensure-Uv {
    Write-Step "Step 3: Ensuring uv is installed..."
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        Write-Success "uv is already installed."
    } else {
        Write-Info "uv not found. Installing via winget..."
        try {
            winget install -e --id Astral.Uv --accept-package-agreements --accept-source-agreements
            Write-Success "uv installed successfully."
        } catch {
            Write-Error "uv installation failed. Please try installing it manually."
        }
    }
}

function Install-SeroApp {
    Write-Step "Step 4: Installing the SERO application..."
    Write-Info "Installing '$appName' from GitHub using 'uv tool install'..."
    try {
        # Ensure install from backend subdirectory in monorepo
        uv tool install --from "git+$repoUrl#subdirectory=backend" $appName
        Write-Success "'$appName' installed."
    } catch {
        Write-Error "Failed to install '$appName' from GitHub."
    }
}

function Create-Shortcuts {
    Write-Step "Step 5: Creating shortcuts..."
    
    # Find the executable path
    $exePath = ""
    try {
        $exePath = (Get-Command $appName -ErrorAction Stop).Source
    } catch {
        Write-Error "Could not find the installed '$appName' executable. Cannot create shortcuts."
        return
    }

    $WScriptShell = New-Object -ComObject WScript.Shell

    # Create Desktop Shortcut
    try {
        $desktop = [Environment]::GetFolderPath("Desktop")
        $desktopShortcutPath = Join-Path $desktop "$appName.lnk"
        $shortcut = $WScriptShell.CreateShortcut($desktopShortcutPath)
        $shortcut.TargetPath = $exePath
        if ($iconPath -and (Test-Path $iconPath)) { $shortcut.IconLocation = $iconPath }
        $shortcut.Save()
        Write-Success "Desktop shortcut created."
    } catch {
        Write-Warning "Could not create desktop shortcut: $($_.Exception.Message)"
    }

    # Create Startup Shortcut
    try {
        $startupFolder = [System.Environment]::GetFolderPath("Startup")
        $startupShortcutPath = Join-Path $startupFolder "$appName.lnk"
        $shortcut = $WScriptShell.CreateShortcut($startupShortcutPath)
        $shortcut.TargetPath = $exePath
        if ($iconPath -and (Test-Path $iconPath)) { $shortcut.IconLocation = $iconPath }
        $shortcut.Save()
        Write-Success "Startup shortcut created."
    } catch {
        Write-Warning "Could not create startup shortcut: $($_.Exception.Message)"
    }
}

function Print-CompletionMessage {
    Write-Host ""
    Write-Host "-------------------------------------------------" -ForegroundColor Green
    Write-Host "🎉 SERO installation complete!" -ForegroundColor Green
    Write-Host "-------------------------------------------------" -ForegroundColor Green
    Write-Host ""
    Write-Info "'$appName' is now available as a command and from the shortcuts created."
    Write-Info "You can run it from any PowerShell or CMD terminal by typing:"
    Write-Host ""
    Write-Host "   $appName" -ForegroundColor Green
    Write-Host ""
    Write-Host "NOTE: You may need to restart your terminal session for the command to be available." -ForegroundColor Gray
    Write-Host ""
}

# --- Main Execution Pipeline ---
function main {
    try {
        Check-Prerequisites
        Ensure-Ollama
        Ensure-Uv
        Install-SeroApp
        Create-Shortcuts
        Print-CompletionMessage
    } catch {
        # This block catches terminating errors from the pipeline
        # The Write-Error in the helper function will have already printed the specific message.
        Write-Host "`nInstallation stopped due to an error." -ForegroundColor Red
        exit 1
    }
}

# Run the main function
main
