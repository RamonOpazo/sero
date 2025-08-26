---
slug: project-management
title: Project Management
date: 2025-08-26T10:03:00.000Z
path: ./project-management
---

# Project Management

Projects are the backbone of SERO. They give you a clean perimeter for everything related to a redaction effort—documents, templates, processing history—and they enforce the central security primitive of SERO: a project password that gates decryption. If you remember one mental model, make it this one: a project is a sealed box; the password is the key. Without that key, encrypted artifacts are indistinguishable from noise.

## Why projects exist

Redaction is rarely a one-off. Clinical teams work in batches: a study, a trial, a FOIA response, a partner handoff. Grouping those batches into projects solves three problems at once. It isolates data so that the key used to encrypt one cohort never unlocks another; it gives you a unit of organization for bulk operations; and it provides a natural home for reusable instructions like selection and prompt templates that you can apply across many documents. In short, projects give you security, scale and reuse without ceremony.

## What a project contains

Every project has a stable identifier and human-friendly metadata, plus the security material needed to derive its encryption key. SERO stores a salted verifier for the password (so the server never needs the password in plain text) and uses a key derivation function to turn your password into a symmetric key for encrypting document blobs. The server can check whether a password is correct without learning it, but it cannot decrypt anything unless you present the right password during an operation that touches encrypted payloads. The result is end-to-end encryption at the project boundary.

Alongside that security envelope you’ll find the practical bits you expect: created and updated timestamps, counters for documents and templates, and any descriptive text you supply so collaborators know what they’re looking at. The actual files—original PDFs and their obfuscated derivatives—are written encrypted on disk and are only decrypted transiently when you request them with the correct project key.

## Lifecycle at a glance

There are a handful of actions you’ll perform again and again as you work with projects. The flow below is representative of both the API and the web UI.

1. Create a project by choosing a name and a password. The password is never optional.
2. Unlock the project when you want to touch encrypted material. In the UI this is a password dialog; via API you include the password with calls that require it.
3. Upload documents into the project; they are encrypted as they arrive.
4. Define templates—selections and prompts—you plan to reuse.
5. Run your redaction workflow and download the obfuscated results.

You can rename a project at any time without touching encryption. Rotating the password is possible, but it is a cryptographic operation that re-wraps keys; you must provide the old and new passwords and SERO will update the encryption material accordingly.

## Creating projects

In the UI, the “New Project” button brings up a small form: name, optional description, password. SERO validates that the password meets your policy and persists the project atomically so that you don’t risk creating half-configured storage. If the project is created successfully, you land on its dashboard, which shows an empty document list and convenient entry points for uploading files or creating templates. In the data table views, SERO uses sensible defaults and confirmation dialogs to protect you from accidental destructive actions.

Via API, creation is intentionally boring:

```bash
curl -X POST http://localhost:8000/projects \
  -H "Content-Type: application/json" \
  -d '{
        "name": "Cardio Trials 2024",
        "description": "Phase II anonymization set",
        "password": "use-a-strong-passphrase"
      }'
```

A successful response returns a JSON document with the project `id`, `name`, timestamps, and counts initialized to zero. The interactive documentation at `/docs` exposes the full schema and any server-side validation rules your deployment enforces.

## Unlocking and session scope

It’s perfectly safe to browse the list of projects and their metadata without a password; none of that requires decryption. The moment you try to perform a sensitive action—preview a page, download an original, generate an obfuscated PDF—SERO asks for the password. In the web UI this appears as a password dialog that unlocks the project for the current session so you don’t have to retype it on every click. If your session expires or you navigate away, you’ll be prompted again the next time you need access.

With the API, “unlocking” is just you providing the password with each call that needs it. The most ergonomic pattern is to send it in a dedicated field in the request body for POST/PUT/PATCH actions involving encrypted blobs, and as a header for downloads. Always consult `/docs` for the exact parameter names your build expects.

## Updating metadata

Names and descriptions are editable. These changes don’t affect encryption and are applied immediately.

```bash
curl -X PATCH http://localhost:8000/projects/{project_id} \
  -H "Content-Type: application/json" \
  -d '{ "name": "Cardio Trials 2024 – Cohort B", "description": "Added sites 12–18" }'
```

SERO records the new values and bumps the `updated_at` timestamp. If you have automation that mirrors project metadata into external systems, treat `id` as immutable and everything else as fair game.

## Passwords and key rotation

Treat the project password as you would a vault combination. SERO stores only a salted verifier and the parameters to reproduce the key derivation; it cannot “remind” you of a forgotten password. If you lose it and you didn’t export a recovery artifact, you lose access to encrypted content by design. That’s a feature, not a bug.

When you rotate a password, SERO validates the current password, derives a new key from the new password, and safely re-wraps the encryption keys needed to open your documents. On large projects this can take time proportional to the number of artifacts, but it’s an online operation: the service remains responsive and your data stays encrypted throughout.

```bash
curl -X POST http://localhost:8000/projects/{project_id}/password:rotate \
  -H "Content-Type: application/json" \
  -d '{ "current_password": "old-pass", "new_password": "new-better-pass" }'
```

Keep rotations rare but regular, and always document who initiated them and why. If your team uses the UI, SERO’s confirmation dialogs help prevent accidental rotations and ensure you understand the consequences.

## Working inside a project

Once a project exists, it’s your workspace. Uploading documents is the first step; SERO encrypts files as they arrive and registers each PDF with page count, size and a checksum so that downstream processes can safely reference them. Templates—selection templates that mark areas to obfuscate and prompt templates that guide extraction—live at the project level so you can apply them consistently across many files. This is how you scale up without reinventing the wheel for each document set.

When you process a document, SERO uses those templates in combination with the selection lifecycle implemented in the viewer. Roughly speaking, you work with unstaged selections, stage them when they’re ready, then commit them when you want the operation to become part of the document’s record. The UI surfaces this lifecycle clearly in side panels and toolbars and provides typed confirmation dialogs for the irreversible bits.

## Bulk operations

Projects are also the unit of bulk. Batch uploads put many PDFs under the same password umbrella, and template management allows you to import or duplicate patterns from one project into another when policy allows. SERO’s backend and UI are optimized to keep these flows efficient: you can drop a directory of files, attach a template set, and let the service chew through the queue while you monitor status. That’s the day-to-day for clinical teams under a deadline.

## Archiving and deletion

Archiving is a policy decision in your environment; operationally, SERO treats “archive” as metadata that hides a project from the default list without destroying anything. Deletion is different. Deleting a project is irreversible because the encryption keys and all encrypted blobs go away together. Expect a double confirmation in the UI and a requirement to re-enter the password. Use role-based process controls outside of SERO to ensure only the right people can initiate deletion, and consider a cooling-off period in your own SOPs.

```bash
curl -X DELETE http://localhost:8000/projects/{project_id} \
  -H "Content-Type: application/json" \
  -d '{ "password": "use-a-strong-passphrase", "confirm": true }'
```

## Examples you can adapt

Create a project and immediately upload files:

```bash
# 1) create
PROJECT_ID=(
  curl -s http://localhost:8000/projects \
    -H "Content-Type: application/json" \
    -d '{ "name":"Dermatology Set A", "password":"horse-battery-staple" }' \
  | jq -r .id
)

# 2) upload two PDFs into it
for f in scans/*.pdf; do
  curl -X POST "http://localhost:8000/projects/$PROJECT_ID/documents" \
    -H "Content-Type: multipart/form-data" \
    -F "password=horse-battery-staple" \
    -F "file=@$f"
done
```

List projects and show counts:

```bash
curl -s http://localhost:8000/projects | jq -r '.[] | "\(.name)\t\(.documents)\t\(.templates)"'
```

Attach a reusable selection template to all documents created this week:

```bash
TEMPLATE_ID="sel:mask-all-phi"
curl -s "http://localhost:8000/projects/$PROJECT_ID/documents?created_since=2025-08-18" \
| jq -r '.[].id' \
| xargs -I {} curl -X POST "http://localhost:8000/projects/$PROJECT_ID/documents/{}/templates" \
     -H "Content-Type: application/json" \
     -d '{ "password": "horse-battery-staple", "template_id": "'$TEMPLATE_ID'" }'
```

Rotate the password and verify you can still download a file:

```bash
curl -X POST "http://localhost:8000/projects/$PROJECT_ID/password:rotate" \
  -H "Content-Type: application/json" \
  -d '{ "current_password":"horse-battery-staple", "new_password":"correct-horse-battery" }'

curl -o out.pdf "http://localhost:8000/projects/$PROJECT_ID/documents/{document_id}/download" \
  -H "X-Project-Password: correct-horse-battery"
```

The exact endpoint names in your build may differ; always check the interactive OpenAPI documentation SERO exposes at `/docs` when running locally.

## Operational tips and conventions

Prefer one study per project. If a project spans too many unrelated cohorts, password rotation becomes painful and auditing loses clarity. Use descriptive names with a stable prefix so you can group in your logs and dashboards, and keep descriptions up to date; it’s your first line of context when new team members onboard.

Plan for password management. Store project passwords in your organization’s secrets manager. Rotate on a schedule that reflects your risk profile, and rotate early if you suspect exposure. Make sure you understand who can approve and perform rotations.

Automate the boring bits. The examples above are deliberately shell-friendly so you can bake them into small scripts. Teams that script project creation and initial asset loading rarely regret it.

Use the lifecycle. Staging and committing selections isn’t just UI polish; it gives you review checkpoints. Treat “commit” as the point of record for compliance.

Know when to delete. If your data retention policy says a project is done at 180 days, wire that policy into your workflows and delete timely. Cryptography is great, but data you don’t have can’t leak.

## Troubleshooting

If a password that used to work now fails, verify you’re operating on the intended project. Identifiers are unambiguous; names are not. If you rotated the password, ensure every integration was updated, especially any job runners that perform nightly exports or reprocessing.

If creation succeeds but uploads fail, confirm that you are providing the password with the upload call. Uploading is an encryption event; it cannot proceed without a key.

If you see UI confirmations you didn’t expect, remember that SERO intentionally protects destructive actions with typed confirmation dialogs. They’re there to help you avoid mistakes; read them carefully and proceed when you’re sure.

## Where to look next

Now that you understand projects, you’re ready to dive into document handling and template authoring. Those two topics, together with the selection lifecycle, make up the core of day-to-day SERO work. And if you like to explore APIs, start the server locally and open the interactive docs at `/docs`; they are the ground truth for payloads and endpoints.

---

SERO is built on a modern Python/FastAPI stack with DuckDB for fast embedded storage and uses cryptography primitives such as Fernet for symmetric encryption and Passlib for password hashing. That foundation is why project boundaries can double as security boundaries and why the service stays responsive even as your workload grows.
