---
slug: redaction-workflow
title: The Redaction Workflow
date: 2025-08-26T10:04:00.000Z
next: security
---

# The Redaction Workflow

Sero was designed to make redaction approachable and predictable even for teams who don’t want to write API calls or scripts. Every action you can perform with the API is mirrored in the user interface, and the interface is usually where first-time users will spend most of their time. This section walks through the entire redaction workflow as it looks from the UI: what you see on screen, what you are expected to provide, and what results to expect after each step.

## Step 1 — Starting with a project

When you log into Sero you land on the **Projects dashboard**. This page lists every project you have already created, together with metadata like description and creation date. To begin redaction, click **“New Project”**. A dialog opens asking for three things:

- **Name**: a human-friendly label (e.g., “Cohort 2025 Discharge Summaries”).
- **Description**: an optional field to help you remember the context later.
- **Password**: the key that will protect every document in this project.

The password is crucial. The UI reminds you that it will be needed again to download either the original or redacted files. Once you click **Create**, the project appears in your dashboard and becomes a container for your dataset.

## Step 2 — Uploading documents

Inside the project view you see two main panels: **Documents** and **Templates**. In the **Documents** panel, click **“Upload”**. A file picker lets you select one or many PDFs from your machine. After you confirm, the UI establishes a project trust session (prompting for the password if needed) and encrypts the password in transit with a fresh ephemeral RSA key. A progress bar shows each file being encrypted and stored. The UI will display them in a table once complete, showing filename, upload time, and status.

At this stage, no redaction has happened yet. You have only safely deposited your source material into an encrypted vault.

## Step 3 — Defining templates

The **Templates** panel is where you describe what needs to be hidden or obfuscated. The interface gives you two different creation wizards.

1. **Selection template wizard**: you open a sample PDF page in a viewer and drag rectangles with your mouse to mark areas that must always be blocked (for example, headers with patient IDs or footers with barcodes). Each rectangle is added to the template, and you can apply it to all pages or specify particular page ranges. The wizard shows shaded overlays so you can visually confirm coverage.

2. **Prompt template wizard**: you are presented with a text area where you can type rules or instructions in plain language. For instance: “Replace clinician names with generic tokens like ‘Provider [n]’” or “Obfuscate phone numbers and email addresses.” The interface provides autocomplete for common patterns (like dates, phone numbers, addresses) and lets you preview how replacements would look in a text sample.

Once saved, templates appear in the **Templates list** with their type (selection or prompt) and a description. You can edit or clone them later if you need new versions.

## Step 4 — Testing on a single document

Before running a large batch, it’s wise to test. In the **Documents** panel, click on a document you uploaded. A details page opens with a **“Process”** button. When you click it, the UI prompts you to select one or more templates to apply. It also asks whether you want a **Preview** or a **Final run**.

Choosing **Preview** generates a redacted copy and opens it directly in the browser. You’ll see black boxes wherever selection templates applied, and tokenized text where prompt templates matched. This is the moment to inspect closely. If, for example, a header line is only partially covered, you can return to the template wizard, adjust the rectangle, and try again.

## Step 5 — Processing the whole project

When you are satisfied with the preview, go back to the project dashboard. At the top-right you will find a **“Process All”** button. This command lets you apply a chosen set of templates to every document in the project. If the project isn’t already unlocked, the UI will prompt you to unlock it; otherwise it will reuse the active trust session and re-encrypt your password per request with a fresh ephemeral key. You’ll then see a progress table showing each file being processed. Large projects will process in the background; you can leave the page and return later.

The **status column** updates to show whether each document has been successfully redacted. Failures, if any, are clearly marked with error messages so you can re-try after fixing the underlying issue.

## Step 6 — Downloading results

Each document row in the **Documents** panel now shows two download icons: one for the **Original** and one for the **Obfuscated** version. Clicking either brings up a password prompt. Only when you provide the correct project password does the download begin. This ensures that even if someone sees your dashboard they cannot exfiltrate files without the key.

You can also bulk-download all redacted files by clicking **“Download All”** at the project level. Again, the UI enforces the password check.

## Example end-to-end run in the UI

Imagine you need to share 200 discharge summaries with an external research group:

1. You create a project named *Cohort-2025-Discharge* with a strong password.
2. You upload all 200 PDFs. They appear in the Documents table, each marked as *Encrypted*.
3. You open the selection wizard and drag boxes to mask the header and footer. Then you save this as “Mask Header/Footer”.
4. You open the prompt wizard and type rules for de-identifying clinician names and phone numbers, saving this as “Provider & Contact Obfuscation”.
5. You select one representative document, process it with both templates in **Preview**, and scroll through the result. You notice that the footer mask is slightly too short. You edit the template, make it 20px taller, and preview again—this time everything is covered.
6. Confident in the templates, you click **Process All**, select both templates, and watch the progress table until all 200 are marked *Processed*.
7. You bulk-download the **Obfuscated** versions, type the project password once, and receive a zip file of clean, shareable PDFs.

## What you should expect

At the end of this workflow you will always have a one-to-one correspondence: every uploaded PDF remains available in its encrypted original form, and every processed PDF is downloadable in its redacted/obfuscated form. You control the redaction logic via templates, and the UI ensures that every sensitive step—upload, process, download—is gated by the project password. The trust session is held in memory only and per-request credentials are re-encrypted with fresh ephemeral keys to avoid reuse. The experience is deliberately interactive: drag rectangles, preview replacements, review a sample, and only then commit to batch operations. This gives you both safety and confidence.

## Tips from the UI perspective

- Use the **Preview** mode often. It is the safest way to iterate on templates without committing a whole project run.
- Label templates clearly in the wizard. When you accumulate many, descriptive names like “Mask Header v2” or “Provider Obfuscation 2025” help you track revisions.
- Don’t forget the **Description** field on projects. When you return months later, it’s the fastest way to recall why a project exists.
- Make use of the **status indicators** in the Documents table—they are the quickest check that everything has been properly processed before you share results.
