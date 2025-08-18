# Frontend Directory Migration Plan

## Overview
This document outlines the step-by-step migration from the current structure to a component-centric organization that enhances encapsulation, testability, and maintainability.

## Pre-Migration Checklist
- [x] Create directory structure reference (`DIRECTORY_STRUCTURE.md`)
- [x] Create migration plan (`MIGRATION_PLAN.md`)
- [ ] Git add and commit current state
- [ ] Create backup branch

## Migration Steps

### Phase 1: Create Directory Structure (5 minutes)

#### 1.1 Create Page Directories
```bash
mkdir -p src/pages/docs
```

#### 1.2 Create Component Module Directories
```bash
mkdir -p src/components/ProjectsView/{dialogs,__tests__}
mkdir -p src/components/DocumentsView/{dialogs,__tests__}
mkdir -p src/components/DocumentEditor/{dialogs,__tests__}
mkdir -p src/components/Layout/__tests__
mkdir -p src/components/shared/{EmptyState,ConfirmationDialog,ThemeToggle}
```

#### 1.3 Create Test Directories for Shared Components
```bash
mkdir -p src/components/shared/{EmptyState,ConfirmationDialog,ThemeToggle}/__tests__
```

### Phase 2: Move Pages (10 minutes)

#### 2.1 Move Documentation Pages
```bash
# Documentation pages to docs subfolder
mv src/views/ApiReferencePage.tsx src/pages/docs/
mv src/views/DocumentationPage.tsx src/pages/docs/
mv src/views/GettingStartedPage.tsx src/pages/docs/
mv src/views/SecurityPage.tsx src/pages/docs/
mv src/views/TroubleshootingPage.tsx src/pages/docs/
```

#### 2.2 Move Main Pages
```bash
# Entry-level pages
mv src/views/HomePage.tsx src/pages/
mv src/views/SettingsPage.tsx src/pages/
```

#### 2.3 Remove Unused Files
```bash
# Remove placeholder HomeView
rm src/views/HomeView.tsx
```

#### 2.4 Create Pages Index
Create `src/pages/index.ts`:
```typescript
export { HomePage } from './HomePage'
export { SettingsPage } from './SettingsPage'
export * from './docs'
```

Create `src/pages/docs/index.ts`:
```typescript
export { DocumentationPage } from './DocumentationPage'
export { ApiReferencePage } from './ApiReferencePage'
export { GettingStartedPage } from './GettingStartedPage'
export { SecurityPage } from './SecurityPage'
export { TroubleshootingPage } from './TroubleshootingPage'
```

### Phase 3: Create ProjectsView Module (15 minutes)

#### 3.1 Move Main Components
```bash
# Move main view component
mv src/views/ProjectsView.tsx src/components/ProjectsView/

# Move data table component  
mv src/views/ProjectsDataTable.tsx src/components/ProjectsView/

# Move business logic hook
mv src/hooks/useProjectsDataTable.ts src/components/ProjectsView/useProjectsView.ts
```

#### 3.2 Move Project Dialogs
```bash
# Move project-specific dialogs
mv src/components/dialogs/CreateProjectDialog.tsx src/components/ProjectsView/dialogs/
mv src/components/dialogs/EditProjectDialog.tsx src/components/ProjectsView/dialogs/
```

#### 3.3 Create ProjectsView Index
Create `src/components/ProjectsView/index.ts`:
```typescript
export { ProjectsView } from './ProjectsView'
export { ProjectsDataTable } from './ProjectsDataTable'
export { useProjectsView } from './useProjectsView'
export * from './dialogs'
```

#### 3.4 Create ProjectsView Dialogs Index
Create `src/components/ProjectsView/dialogs/index.ts`:
```typescript
export { CreateProjectDialog } from './CreateProjectDialog'
export { EditProjectDialog } from './EditProjectDialog'
```

### Phase 4: Create DocumentsView Module (15 minutes)

#### 4.1 Move Main Component
```bash
# Move main view component
mv src/views/DocumentsView.tsx src/components/DocumentsView/
```

#### 4.2 Move Document Dialogs with Renaming
```bash
# Move and rename document dialogs for better context
mv src/components/dialogs/CreateDocumentDialog.tsx src/components/DocumentsView/dialogs/DocumentUploadDialog.tsx
mv src/components/dialogs/EditDocumentDialog.tsx src/components/DocumentsView/dialogs/EditDocumentDialog.tsx
```

#### 4.3 Create DocumentsView Business Logic
Create `src/components/DocumentsView/useDocumentsView.ts` (new file - extract logic from DocumentsView.tsx)

#### 4.4 Create DocumentsView Index
Create `src/components/DocumentsView/index.ts`:
```typescript
export { DocumentsView } from './DocumentsView'
export { useDocumentsView } from './useDocumentsView'
export * from './dialogs'
```

#### 4.5 Create DocumentsView Dialogs Index
Create `src/components/DocumentsView/dialogs/index.ts`:
```typescript
export { DocumentUploadDialog } from './DocumentUploadDialog'
export { EditDocumentDialog } from './EditDocumentDialog'
```

### Phase 5: Create DocumentEditor Module (15 minutes)

#### 5.1 Move and Rename Main Component
```bash
# Rename FileViewer to DocumentEditor
mv src/views/FileViewer.tsx src/components/DocumentEditor/DocumentEditor.tsx
```

#### 5.2 Move Editor Dialogs with Context Renaming
```bash
# Move password dialog with contextual naming
mv src/components/dialogs/PasswordDialog.tsx src/components/DocumentEditor/dialogs/DocumentPasswordDialog.tsx
```

#### 5.3 Create DocumentEditor Business Logic
Create `src/components/DocumentEditor/useDocumentEditor.ts` (new file - extract logic from DocumentEditor.tsx)

#### 5.4 Create DocumentEditor Index
Create `src/components/DocumentEditor/index.ts`:
```typescript
export { DocumentEditor } from './DocumentEditor'
export { useDocumentEditor } from './useDocumentEditor'
export * from './dialogs'
```

#### 5.5 Create DocumentEditor Dialogs Index
Create `src/components/DocumentEditor/dialogs/index.ts`:
```typescript
export { DocumentPasswordDialog } from './DocumentPasswordDialog'
```

### Phase 6: Organize Shared Components (10 minutes)

#### 6.1 Move EmptyState Component
```bash
mv src/components/shared/EmptyState.tsx src/components/shared/EmptyState/EmptyState.tsx
```
Create `src/components/shared/EmptyState/index.ts`:
```typescript
export { EmptyState } from './EmptyState'
```

#### 6.2 Move ConfirmationDialog Component
```bash
mv src/components/dialogs/ConfirmationDialog.tsx src/components/shared/ConfirmationDialog/ConfirmationDialog.tsx
```
Create `src/components/shared/ConfirmationDialog/index.ts`:
```typescript
export { ConfirmationDialog } from './ConfirmationDialog'
```

#### 6.3 Move ThemeToggle Component
```bash
mv src/components/shared/ThemeToggle.tsx src/components/shared/ThemeToggle/ThemeToggle.tsx
```
Create `src/components/shared/ThemeToggle/index.ts`:
```typescript
export { ThemeToggle } from './ThemeToggle'
```

#### 6.4 Create Shared Components Index
Update `src/components/shared/index.ts`:
```typescript
export * from './EmptyState'
export * from './ConfirmationDialog'  
export * from './ThemeToggle'
```

### Phase 7: Move Layout Components (10 minutes)

#### 7.1 Move Breadcrumbs
```bash
mv src/components/features/breadcrumbs/Breadcrumbs.tsx src/components/Layout/Breadcrumbs.tsx
```

#### 7.2 Create Layout Index
Create `src/components/Layout/index.ts`:
```typescript
export { Breadcrumbs } from './Breadcrumbs'
// TODO: Add AppLayout and Navigation when created
```

### Phase 8: Clean Up Hooks (5 minutes)

#### 8.1 Move Global Hooks to Global Hooks Directory
Keep only truly global hooks in `/hooks/`:
- `use-mobile.ts` ✅ (stays)
- `useColumnNavigation.ts` ✅ (stays)

#### 8.2 Move API Hooks to Context or Keep Global
Decision: Keep API hooks (`useProjects.ts`, `useDocuments.ts`, etc.) in global `/hooks/` since they're used across multiple components.

### Phase 9: Update Import Paths (20 minutes)

#### 9.1 Update App.tsx Imports
Update routing and component imports in `App.tsx`

#### 9.2 Update Component Imports
Search and replace import paths across the codebase:

```bash
# Find all TypeScript files and update imports
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "from.*views/"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "from.*dialogs"
```

#### 9.3 Common Import Updates
```typescript
// Before
import { ProjectsView } from '@/views/ProjectsView'
import { CreateProjectDialog } from '@/components/dialogs'

// After
import { ProjectsView } from '@/components/ProjectsView'
import { CreateProjectDialog } from '@/components/ProjectsView/dialogs'
```

### Phase 10: Update Dialog Exports (5 minutes)

#### 10.1 Update Main Dialogs Index
Update `src/components/dialogs/index.ts` to remove moved dialogs:
```typescript
// Remove moved dialogs, keep only remaining ones
export { AddPromptDialog } from './AddPromptDialog'
// NOTE: This file might be empty after migration
```

#### 10.2 Clean Up Empty Directories
```bash
# Remove empty dialogs directory if no files remain
rmdir src/components/dialogs # Only if empty
```

### Phase 11: Build and Test (10 minutes)

#### 11.1 Run TypeScript Check
```bash
pnpm run type-check  # or tsc --noEmit
```

#### 11.2 Run Build
```bash
pnpm build
```

#### 11.3 Fix Import Errors
Address any remaining import errors found during build.

## Files That Need Manual Updates

### Component Files
After moving files, these will need import path updates:
- `App.tsx` - Update all route component imports
- All moved components - Update their internal imports
- Test files - Update import paths

### Configuration Files
- `tsconfig.json` - Verify path mappings still work
- `vite.config.ts` - Check if any build configs need updates

## Dialog Renaming Reference

| Old Name | New Location | New Name | Reason |
|----------|-------------|----------|---------|
| `CreateProjectDialog` | `ProjectsView/dialogs/` | `CreateProjectDialog` | Context clear |
| `EditProjectDialog` | `ProjectsView/dialogs/` | `EditProjectDialog` | Context clear |
| `CreateDocumentDialog` | `DocumentsView/dialogs/` | `DocumentUploadDialog` | Better describes action |
| `EditDocumentDialog` | `DocumentsView/dialogs/` | `EditDocumentDialog` | Context clear |
| `PasswordDialog` | `DocumentEditor/dialogs/` | `DocumentPasswordDialog` | Context-specific |
| `ConfirmationDialog` | `shared/ConfirmationDialog/` | `ConfirmationDialog` | Truly generic |

## Validation Checklist

After migration, verify:
- [ ] All files moved to correct locations
- [ ] All import paths updated
- [ ] Build passes without errors  
- [ ] No broken imports
- [ ] All index.ts files created
- [ ] Removed unused files
- [ ] App still runs correctly

## Rollback Plan

If migration fails:
1. Reset to backup branch: `git checkout backup-branch`
2. Or reset to last commit: `git reset --hard HEAD~1`
3. Address issues and retry migration steps

## Post-Migration Tasks

1. Update documentation to reflect new structure
2. Create component-specific tests in `__tests__/` folders
3. Add JSDoc comments to component APIs
4. Consider creating component stories for Storybook
5. Review and optimize component interfaces
