# Frontend Directory Migration Plan

## Overview
This document outlines the **MANDATORY** step-by-step migration from the current structure to a component-centric organization that **STRICTLY ENFORCES** separation of concerns per `DIRECTORY_STRUCTURE.md`.

**⚠️ WARNING**: This migration MUST be executed in exact order. Each step validates architectural compliance before proceeding.

## Pre-Migration Checklist
- [x] Create directory structure reference (`DIRECTORY_STRUCTURE.md`)
- [x] Create migration plan (`MIGRATION_PLAN.md`)
- [ ] Git add and commit current state
- [ ] Create backup branch: `git checkout -b backup-pre-migration`
- [ ] Verify clean working directory: `git status`
- [ ] Ensure build passes: `pnpm build`
- [ ] Document current import count: `find src -name "*.ts*" | xargs grep -c "^import" | wc -l`

## Migration Progress Tracker

### Phase Overview
- [ ] **Phase 1**: Create Directory Structure (5 min)
- [ ] **Phase 2**: Move Pages & Remove Legacy (10 min)  
- [ ] **Phase 3**: ProjectsView Module Migration (20 min)
- [ ] **Phase 4**: DocumentsView Module Migration (20 min)
- [ ] **Phase 5**: DocumentEditor Module Migration (20 min)
- [ ] **Phase 6**: Shared Components Reorganization (15 min)
- [ ] **Phase 7**: Layout Components Migration (10 min)
- [ ] **Phase 8**: Hook Encapsulation Enforcement (15 min)
- [ ] **Phase 9**: Import Path Updates & Compliance (25 min)
- [ ] **Phase 10**: Dialog Export Cleanup (10 min)
- [ ] **Phase 11**: Build Validation & Testing (15 min)

**Total Estimated Time**: 165 minutes (~2.75 hours)

---

## Detailed Migration Steps

### Phase 1: Create Directory Structure (5 minutes)
**COMPLIANCE TARGET**: Establish all required directories per `DIRECTORY_STRUCTURE.md`

#### 1.1 Create Page Directories
- [ ] Execute: `mkdir -p src/pages/docs`
- [ ] Verify: `ls -la src/pages/` shows `docs/` directory
- [ ] **COMPLIANCE CHECK**: Directory matches `DIRECTORY_STRUCTURE.md` line 18

#### 1.2 Create Component Module Directories  
- [ ] Execute: `mkdir -p src/components/ProjectsView/{dialogs,__tests__}`
- [ ] Execute: `mkdir -p src/components/DocumentsView/{dialogs,__tests__}`
- [ ] Execute: `mkdir -p src/components/DocumentEditor/{dialogs,__tests__}`
- [ ] Execute: `mkdir -p src/components/Layout/__tests__`
- [ ] Execute: `mkdir -p src/components/shared/{EmptyState,ConfirmationDialog,ThemeToggle}`
- [ ] Verify: `tree src/components/` shows all module directories
- [ ] **COMPLIANCE CHECK**: Directories match `DIRECTORY_STRUCTURE.md` lines 26-77

#### 1.3 Create Test Directories for Shared Components
- [ ] Execute: `mkdir -p src/components/shared/{EmptyState,ConfirmationDialog,ThemeToggle}/__tests__`
- [ ] Verify: `find src/components/shared -name "__tests__" | wc -l` returns `3`
- [ ] **COMPLIANCE CHECK**: Testing colocation per directive #5

#### 1.4 Phase 1 Validation
- [ ] **MANDATORY**: All directories created successfully
- [ ] **MANDATORY**: No permission errors occurred
- [ ] **MANDATORY**: Directory structure matches `DIRECTORY_STRUCTURE.md`
- [ ] Ready for Phase 2: YES / NO

### Phase 2: Move Pages & Remove Legacy (10 minutes)
**COMPLIANCE TARGET**: Establish proper page layer per directive #2

#### 2.1 Move Documentation Pages
- [ ] Verify source exists: `ls src/views/ApiReferencePage.tsx`
- [ ] Execute: `mv src/views/ApiReferencePage.tsx src/pages/docs/`
- [ ] Verify source exists: `ls src/views/DocumentationPage.tsx`
- [ ] Execute: `mv src/views/DocumentationPage.tsx src/pages/docs/`
- [ ] Verify source exists: `ls src/views/GettingStartedPage.tsx`
- [ ] Execute: `mv src/views/GettingStartedPage.tsx src/pages/docs/`
- [ ] Verify source exists: `ls src/views/SecurityPage.tsx`
- [ ] Execute: `mv src/views/SecurityPage.tsx src/pages/docs/`
- [ ] Verify source exists: `ls src/views/TroubleshootingPage.tsx`
- [ ] Execute: `mv src/views/TroubleshootingPage.tsx src/pages/docs/`
- [ ] Verify: `ls src/pages/docs/` shows 5 files
- [ ] **COMPLIANCE CHECK**: Documentation pages in correct location per `DIRECTORY_STRUCTURE.md` lines 19-24

#### 2.2 Move Main Pages
- [ ] Verify source exists: `ls src/views/HomePage.tsx`
- [ ] Execute: `mv src/views/HomePage.tsx src/pages/`
- [ ] Verify source exists: `ls src/views/SettingsPage.tsx`
- [ ] Execute: `mv src/views/SettingsPage.tsx src/pages/`
- [ ] Verify: `ls src/pages/` shows `HomePage.tsx` and `SettingsPage.tsx`
- [ ] **COMPLIANCE CHECK**: Entry pages in correct location per `DIRECTORY_STRUCTURE.md` lines 15-16

#### 2.3 Create Missing Pages
- [ ] Check if `DeveloperPage.tsx` exists: `ls src/views/DeveloperPage.tsx` (may fail)
- [ ] If missing, note for future creation
- [ ] **MANDATORY**: Verify all required entry-level pages accounted for
- [ ] **COMPLIANCE CHECK**: Page layer boundary enforcement per directive #2

#### 2.4 Remove Legacy Files
- [ ] Verify target exists: `ls src/views/HomeView.tsx`
- [ ] Execute: `rm src/views/HomeView.tsx`
- [ ] Verify removal: `ls src/views/HomeView.tsx` (should fail)
- [ ] **COMPLIANCE CHECK**: No redundant files remain

#### 2.5 Create Pages Index Files
- [ ] Create `src/pages/index.ts` with content:
```typescript
export { HomePage } from './HomePage'
export { SettingsPage } from './SettingsPage'
// export { DeveloperPage } from './DeveloperPage'  // Uncomment when created
export * from './docs'
```
- [ ] Verify file created: `ls src/pages/index.ts`
- [ ] Create `src/pages/docs/index.ts` with content:
```typescript
export { DocumentationPage } from './DocumentationPage'
export { ApiReferencePage } from './ApiReferencePage'
export { GettingStartedPage } from './GettingStartedPage'
export { SecurityPage } from './SecurityPage'
export { TroubleshootingPage } from './TroubleshootingPage'
```
- [ ] Verify file created: `ls src/pages/docs/index.ts`
- [ ] **COMPLIANCE CHECK**: Clean public APIs per directive #6

#### 2.6 Phase 2 Validation
- [ ] **MANDATORY**: All pages moved to correct locations
- [ ] **MANDATORY**: Index files created with correct exports
- [ ] **MANDATORY**: Legacy files removed
- [ ] **MANDATORY**: No broken file references
- [ ] Test quick build: `pnpm build` (may have import errors - expected)
- [ ] Ready for Phase 3: YES / NO

### Phase 3: ProjectsView Module Migration (20 minutes)
**COMPLIANCE TARGET**: Establish complete component encapsulation per directive #1

#### 3.1 Move Main Components
- [ ] Verify source exists: `ls src/views/ProjectsView.tsx`
- [ ] Execute: `mv src/views/ProjectsView.tsx src/components/ProjectsView/`
- [ ] Verify moved: `ls src/components/ProjectsView/ProjectsView.tsx`
- [ ] Verify source exists: `ls src/views/ProjectsDataTable.tsx`
- [ ] Execute: `mv src/views/ProjectsDataTable.tsx src/components/ProjectsView/`
- [ ] Verify moved: `ls src/components/ProjectsView/ProjectsDataTable.tsx`
- [ ] Verify source exists: `ls src/hooks/useProjectsDataTable.ts`
- [ ] Execute: `mv src/hooks/useProjectsDataTable.ts src/components/ProjectsView/useProjectsView.ts`
- [ ] Verify moved: `ls src/components/ProjectsView/useProjectsView.ts`
- [ ] **COMPLIANCE CHECK**: Business logic hook co-located per directive #4

#### 3.2 Move Project Dialogs
- [ ] Verify source exists: `ls src/components/dialogs/CreateProjectDialog.tsx`
- [ ] Execute: `mv src/components/dialogs/CreateProjectDialog.tsx src/components/ProjectsView/dialogs/`
- [ ] Verify moved: `ls src/components/ProjectsView/dialogs/CreateProjectDialog.tsx`
- [ ] Verify source exists: `ls src/components/dialogs/EditProjectDialog.tsx`
- [ ] Execute: `mv src/components/dialogs/EditProjectDialog.tsx src/components/ProjectsView/dialogs/`
- [ ] Verify moved: `ls src/components/ProjectsView/dialogs/EditProjectDialog.tsx`
- [ ] **COMPLIANCE CHECK**: Dialog domain ownership per directive #3

#### 3.3 Create ProjectsView Index
- [ ] Create `src/components/ProjectsView/index.ts` with content:
```typescript
export { ProjectsView } from './ProjectsView'
export { ProjectsDataTable } from './ProjectsDataTable'
export { useProjectsView } from './useProjectsView'
export * from './dialogs'
```
- [ ] Verify file created: `ls src/components/ProjectsView/index.ts`
- [ ] **COMPLIANCE CHECK**: Clean public API per directive #6

#### 3.4 Create ProjectsView Dialogs Index
- [ ] Create `src/components/ProjectsView/dialogs/index.ts` with content:
```typescript
export { CreateProjectDialog } from './CreateProjectDialog'
export { EditProjectDialog } from './EditProjectDialog'
```
- [ ] Verify file created: `ls src/components/ProjectsView/dialogs/index.ts`
- [ ] **COMPLIANCE CHECK**: Clean dialog exports per directive #6

#### 3.5 Phase 3 Validation
- [ ] **MANDATORY**: All ProjectsView files moved to correct locations
- [ ] **MANDATORY**: Hook encapsulation enforced (business logic co-located)
- [ ] **MANDATORY**: Dialog domain ownership enforced
- [ ] **MANDATORY**: Clean public APIs created
- [ ] Verify structure: `tree src/components/ProjectsView/`
- [ ] Ready for Phase 4: YES / NO

### Phase 4: Create DocumentsView Module (15 minutes)

#### 4.1 Move Main Component
```bash
# Move main view component
mv src/views/DocumentsView.tsx src/components/DocumentsView/
```

#### 4.2 Move Document Dialogs with Renaming
```bash
# Move document dialogs - keeping CreateDocumentDialog, adding DocumentUploadDialog alias
mv src/components/dialogs/CreateDocumentDialog.tsx src/components/DocumentsView/dialogs/CreateDocumentDialog.tsx
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
export { CreateDocumentDialog } from './CreateDocumentDialog'
export { EditDocumentDialog } from './EditDocumentDialog'
// Alias for semantic clarity
export { CreateDocumentDialog as DocumentUploadDialog } from './CreateDocumentDialog'
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

### Phase 8: Clean Up Hooks (10 minutes)

#### 8.1 Enforce Hook Encapsulation Rules
**MANDATORY**: Apply strict hook encapsulation per architectural directives:

Keep in global `/hooks/` (cross-cutting UI utilities):
- `use-mobile.ts` ✅ (UI utility)
- `useColumnNavigation.ts` ✅ (navigation utility)

Keep in global `/hooks/` (API hooks used by 3+ components):
- `useProjects.ts` ✅ (used by ProjectsView, ProjectsPage, DocumentsView)
- `useDocuments.ts` ✅ (used by DocumentsView, DocumentEditor, ProjectsView)
- `useFiles.ts` ✅ (used by DocumentEditor, DocumentsView, FileViewer)
- `usePrompts.ts` ✅ (used by DocumentEditor, DocumentViewer, PromptsView)
- `useSelections.ts` ✅ (used by DocumentEditor, DocumentViewer, SelectionsView)

#### 8.2 Handle API Hooks According to Usage
**MANDATORY COMPLIANCE**: Follow hook encapsulation rules:
- Keep API hooks in global `/hooks/` ONLY if used by 3+ components
- Move component-specific API logic to component hooks
- Ensure no business logic leakage between components

Decision: Keep `useProjects.ts`, `useDocuments.ts`, `useFiles.ts` in global `/hooks/` as they meet the 3+ component usage criteria.

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
**MANDATORY**: Ensure compliance with import hygiene directive #6:

```typescript
// ✅ CORRECT: Clean imports via index.ts (per directive)
import { ProjectsView } from '@/components/ProjectsView'
import { CreateProjectDialog } from '@/components/ProjectsView'
import { DocumentEditor } from '@/components/DocumentEditor'
import { EmptyState } from '@/components/shared/EmptyState'

// ❌ FORBIDDEN: Deep imports bypassing index.ts
import { CreateProjectDialog } from '@/components/ProjectsView/dialogs/CreateProjectDialog'
import { useProjectsView } from '@/components/ProjectsView/useProjectsView'

// ❌ FORBIDDEN: Cross-domain business logic imports
import { useProjectsView } from '@/components/ProjectsView'
// in DocumentsView component

// Before (violations)
import { ProjectsView } from '@/views/ProjectsView'
import { CreateProjectDialog } from '@/components/dialogs'

// After (compliant)
import { ProjectsView } from '@/components/ProjectsView'
import { CreateProjectDialog } from '@/components/ProjectsView'
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

**MANDATORY COMPLIANCE**: All dialogs moved to their domain per architectural directive #3.

| Old Name | New Location | New Name | Compliance Status | Reason |
|----------|-------------|----------|------------------|--------|
| `CreateProjectDialog` | `ProjectsView/dialogs/` | `CreateProjectDialog` | ✅ Domain ownership | Context clear |
| `EditProjectDialog` | `ProjectsView/dialogs/` | `EditProjectDialog` | ✅ Domain ownership | Context clear |
| `CreateDocumentDialog` | `DocumentsView/dialogs/` | `CreateDocumentDialog` | ✅ Domain ownership | Maintains original name |
| `EditDocumentDialog` | `DocumentsView/dialogs/` | `EditDocumentDialog` | ✅ Domain ownership | Context clear |
| `PasswordDialog` | `DocumentEditor/dialogs/` | `DocumentPasswordDialog` | ✅ Domain ownership | Context-specific |
| `ConfirmationDialog` | `shared/ConfirmationDialog/` | `ConfirmationDialog` | ✅ 3+ domain usage | Truly generic |

**Note**: `DocumentUploadDialog` is provided as a semantic alias for `CreateDocumentDialog`.

## Validation Checklist

**MANDATORY COMPLIANCE VERIFICATION**:

After migration, verify architectural directives are met:
- [ ] All files moved to correct locations per DIRECTORY_STRUCTURE
- [ ] Component encapsulation: Each component fully self-contained
- [ ] Dialog domain ownership: All dialogs in their respective domains
- [ ] Hook encapsulation: Business logic hooks co-located with components
- [ ] Import hygiene: All imports use index.ts, no deep imports
- [ ] Boundary enforcement: No cross-domain business logic imports
- [ ] Testing colocation: __tests__ folders created for all components
- [ ] Public APIs: All index.ts files created with clean exports
- [ ] Build passes without errors
- [ ] No broken imports
- [ ] All architectural principles enforced
- [ ] App runs correctly

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
