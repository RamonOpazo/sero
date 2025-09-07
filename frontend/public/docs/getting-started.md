# Getting Started

Welcome to SERO! This guide will walk you through installing the application on your local computer and running your first project. SERO is designed to run as a local, desktop-like application, giving you a secure and private environment for all your redaction tasks.

## Installation

The installation process is automated with a script for your operating system. Please choose the appropriate guide below.

### For Windows Users

Our PowerShell script uses the Windows Package Manager (`winget`) to ensure a clean installation of all dependencies.

**Step 1: Open PowerShell**

Click the Start menu, type "PowerShell", right-click on "Windows PowerShell", and select **"Run as Administrator"** for the best results.

**Step 2: Set Execution Policy**

By default, PowerShell prevents running scripts from the internet. You need to allow the installer to run for your current session. Copy and paste this command into your PowerShell terminal and press Enter:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
```

**Step 3: Download and Run the Installer**

Now, copy and paste the following command. It will download the installer script and immediately run it.

```powershell
Invoke-RestMethod -Uri https://raw.githubusercontent.com/RamonOpazo/sero/main/install_sero.ps1 | Invoke-Expression
```

The script will now handle everything automatically. It will print color-coded messages to show its progress.

### For macOS and Linux Users

On macOS and Linux, you can download and run the installation script with a single command.

**Step 1: Open Your Terminal**

Open your favorite terminal application (e.g., Terminal, iTerm, Konsole).

**Step 2: Download and Run the Installer**

Copy and paste the following command into your terminal and press Enter. This will download the `install_sero.sh` script and execute it.

```bash
curl -sSL https://raw.githubusercontent.com/RamonOpazo/sero/main/install_sero.sh | bash
```

The script will guide you through the installation, showing its progress at each step.

## What the Installer Does

To be transparent, here is a summary of the actions the installation script performs:

1.  **Checks for Dependencies**: It verifies that required tools (`winget` on Windows, `curl` on Linux/macOS) are present.
2.  **Installs Ollama**: If you don't have Ollama, it will be installed. Ollama is the engine used for AI-powered prompt templates.
3.  **Installs `uv`**: If you don't have `uv`, the high-performance Python package manager is installed.
4.  **Installs SERO**: The script installs the SERO application itself in a clean, isolated environment so it doesn't interfere with other software on your system.
5.  **Creates Shortcuts (Windows Only)**: For convenience, shortcuts are created on your Desktop and in your Startup folder.

## Your First Launch

Once the installer is finished, you are ready to launch the application.

1.  **Open a NEW Terminal**: It's important to open a new terminal window (or restart your existing one) so that it recognizes the new `sero` command.
2.  **Run the Command**: Simply type the following command and press Enter:
    ```bash
    sero
    ```
    *(On Windows, you can also use the new shortcut on your Desktop.)*

    You will see server logs appear in your terminal window. This means SERO is running! This terminal window must remain open while you use the application.

3.  **Access the Web Interface**: Open your favorite web browser and navigate to:
    [**http://localhost:8000**](http://localhost:8000)

    You should now see the SERO user interface.

## A Quick Tour: Your First Project

Now that SERO is running, let's quickly walk through the core workflow.

1.  **Create a Project**: From the dashboard, click **"New Project"**. Give it a name (e.g., "My First Redactions") and, most importantly, a **strong password**. This password encrypts everything in the project.
2.  **Upload a Document**: Inside your new project, click **"Upload"** and select a PDF file from your computer.
3.  **Apply Redactions**: Once uploaded, you can begin redacting. For now, you can explore creating a **Selection Template** to manually draw redaction boxes on the document.
4.  **Download the Result**: After applying your redactions, you can download the new, secured version of your document.

## Next Steps

You have successfully installed and run SERO. To learn more about its powerful features, please continue with our other documentation:

-   **[Project Management](./project-management.md)**: Learn the ins and outs of managing your encrypted projects.
-   **[The Redaction Workflow](./redaction-workflow.md)**: A deeper dive into creating templates and the redaction lifecycle.
-   **[Security Overview](./security.md)**: Understand the cryptographic principles that keep your data safe.