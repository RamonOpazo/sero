# Frontend Directory Structure Reference

## Component-Centric Architecture

**IMPERATIVE: This application follows STRICT separation of concerns principles. Every component, hook, dialog, and utility must be properly encapsulated within its domain boundaries. Violations of this architecture are not acceptable.**

## File Naming Convention

**MANDATORY DIRECTIVE: All files MUST use dashed-case naming convention (kebab-case)**

✅ **CORRECT Examples:**
- `workspace-provider.tsx` (files are dashed-case)
- `projects-view.tsx` 
- `document-editor.tsx`
- `use-projects-view.ts`
- `api-reference-page.tsx`

❌ **FORBIDDEN Examples:**
- `WorkspaceProvider.tsx` (PascalCase files)
- `ProjectsView.tsx` 
- `DocumentEditor.tsx`
- `useProjectsView.ts` (camelCase files)
- `ApiReferencePage.tsx`

**Rationale**: Dashed-case file names provide visual distinction between files (dashed-case) and functions/objects/components (PascalCase/camelCase), improving code navigation and consistency.

### Architecture Overview

```
src/
├── 📄 App.tsx                         # Main app component
├── 📄 main.tsx                        # React entry point
├── 🎨 index.css                       # Global styles
├── 📁 pages/                          # Top-level entry pages (routing level)
│   ├── 📄 HomePage.tsx                 # Landing page (/)
│   ├── 📄 SettingsPage.tsx            # Settings page
│   ├── 📄 DeveloperPage.tsx           # Developer tools page
│   └── 📁 docs/                       # Documentation pages
│       ├── 📄 DocumentationPage.tsx   # Main docs page
│       ├── 📄 ApiReferencePage.tsx    # API documentation
│       ├── 📄 GettingStartedPage.tsx  # Getting started guide
│       ├── 📄 SecurityPage.tsx        # Security documentation
│       ├── 📄 TroubleshootingPage.tsx # Troubleshooting guide
│       └── 📄 index.ts                # Clean exports
├── 📁 views/                         # Application view components
│   ├── 📁 projects-view/            # Complete projects view module
│   │   ├── 📄 projects-view.tsx       # Main view component (entry from pages)
│   │   ├── 📄 projects-data-table.tsx # Data table with business logic
│   │   ├── 📄 use-projects-view.ts    # Business logic hook
│   │   ├── 📁 dialogs/               # Project-specific dialogs
│   │   │   ├── 📄 create-project-dialog.tsx
│   │   │   ├── 📄 edit-project-dialog.tsx
│   │   │   └── 📄 index.ts
│   │   ├── 📁 __tests__/              # Co-located tests
│   │   │   ├── 📄 projects-view.test.tsx
│   │   │   ├── 📄 use-projects-view.test.ts
│   │   │   └── 📄 projects-data-table.test.tsx
│   │   └── 📄 index.ts               # Public API
│   ├── 📁 documents-view/           # Complete documents view module
│   │   ├── 📄 documents-view.tsx      # Main view component
│   │   ├── 📄 documents-data-table.tsx # Documents table with logic
│   │   ├── 📄 use-documents-view.ts   # Business logic hook
│   │   ├── 📁 dialogs/               # Document-specific dialogs
│   │   │   ├── 📄 edit-document-dialog.tsx
│   │   │   ├── 📄 upload-documents-dialog.tsx
│   │   │   ├── 📄 delete-document-dialog.tsx
│   │   │   └── 📄 index.ts
│   │   ├── 📁 __tests__/
│   │   └── 📄 index.ts
│   ├── 📁 editor-view/              # Document editor view module
│   │   ├── 📄 editor-view.tsx         # Main editor component
│   │   ├── 📄 use-editor-view.ts      # Editor business logic hook
│   │   ├── 📁 dialogs/               # Editor-specific dialogs
│   │   │   ├── 📄 document-password-dialog.tsx
│   │   │   └── 📄 index.ts
│   │   ├── 📁 __tests__/
│   │   └── 📄 index.ts
│   └── 📄 index.ts                   # Views public API
├── 📁 components/                     # Reusable UI components
│   ├── 📁 layout/                    # Layout components
│   │   ├── 📄 main-layout.tsx         # Main app layout
│   │   ├── 📄 site-header.tsx         # Site header/navigation
│   │   ├── 📁 __tests__/
│   │   └── 📄 index.ts
│   ├── 📁 shared/                    # Truly shared components
│       ├── 📁 EmptyState/            # Empty state component
│       │   ├── 📄 EmptyState.tsx
│       │   ├── 📁 __tests__/
│       │   └── 📄 index.ts
│       ├── 📁 ConfirmationDialog/    # Generic confirmation dialog
│       │   ├── 📄 ConfirmationDialog.tsx
│       │   ├── 📁 __tests__/
│       │   └── 📄 index.ts
│       ├── 📁 ThemeToggle/           # Theme switching component
│       │   ├── 📄 ThemeToggle.tsx
│       │   ├── 📁 __tests__/
│       │   └── 📄 index.ts
│       └── 📄 index.ts
├── 📁 features/                       # Complex self-contained features
│   ├── 📁 document-viewer/           # PDF viewer feature (PRESERVE STRUCTURE)
│   │   ├── 📁 core/                  # Core state management
│   │   ├── 📁 dialogs/               # Feature-specific dialogs
│   │   ├── 📁 hooks/                 # Feature-specific hooks
│   │   ├── 📁 layouts/               # Layout components
│   │   ├── 📁 tooldeck/              # Toolbar components
│   │   ├── 📁 types/                 # Feature types
│   │   ├── 📁 viewport/              # Rendering layers
│   │   ├── 📄 DocumentViewer.tsx     # Main component
│   │   └── 📄 index.ts               # Public API
│   └── 📁 data-table/               # Reusable data table feature
│       ├── 📄 DataTable.tsx
│       ├── 📄 DataTablePagination.tsx
│       ├── 📄 DataTableToolbar.tsx
│       └── 📄 index.ts
├── 📁 hooks/                         # Only global/shared hooks
│   ├── 📄 use-mobile.ts              # UI utility hooks
│   ├── 📄 useColumnNavigation.ts     # Navigation hooks
│   └── 📄 index.ts
├── 📁 providers/                     # Global state providers
│   ├── 📄 workspace-provider.tsx     # Main app workspace state (projects, documents)
│   ├── 📄 theme-provider.tsx         # Theme management
│   └── 📄 index.ts
├── 📁 lib/                          # Utility libraries
│   ├── 📄 axios.ts                  # HTTP client
│   ├── 📄 result.ts                 # Result type utilities
│   ├── 📄 utils.ts                  # General utilities
│   ├── 📄 crypto.ts                 # Crypto utilities
│   ├── 📄 editor-api.ts             # Editor-specific API functions
│   └── 📄 document-viewer-api.ts    # Document viewer API functions
├── 📁 types/                        # Global type definitions
│   ├── 📄 project.ts                # Project-related types
│   ├── 📄 document.ts               # Document-related types
│   ├── 📄 file.ts                   # File-related types
│   ├── 📄 api.ts                    # API types
│   └── 📄 index.ts                  # Type exports
├── 📁 utils/                        # Pure utility functions
│   ├── 📄 content.ts                # Content utilities
│   └── 📄 conversions.ts            # Data conversion utilities
└── 📁 ui/                          # Base UI components (shadcn)
    ├── 📄 button.tsx
    ├── 📄 dialog.tsx
    ├── 📄 table.tsx
    └── ... (all existing ui components)
```

## Architectural Principles (IMPERATIVES)

### 1. Strict Component Encapsulation
**MANDATORY**: Each major component must be fully self-contained:
- Main component file
- Custom hooks for ALL business logic
- Sub-components when needed
- Component-specific dialogs
- Co-located tests (`__tests__/` folder)
- Clean public API via `index.ts`
- **NO external dependencies beyond shared utilities and UI components**

### 2. Absolute Boundary Enforcement
**MANDATORY**: Clear separation between layers:
- **Pages**: Route-level components ONLY (routing, page-level state)
- **Components**: Business logic containers with complete encapsulation
- **Features**: Complex self-contained modules (document-viewer)
- **Shared**: ONLY truly reusable components across ALL domains
- **UI**: Pure presentational components (shadcn/ui)

### 3. Dialog Domain Ownership
**MANDATORY**: Dialogs belong to their respective domains:
- Project dialogs → `views/projects-view/dialogs/`
- Document dialogs → `views/documents-view/dialogs/`
- Editor dialogs → `views/editor-view/dialogs/`
- Generic dialogs → `components/shared/` (ONLY if used across 3+ domains)

### 4. Hook Encapsulation Rules
**MANDATORY**: Business logic isolation:
- Component-specific hooks MUST live with their components
- Global `/hooks/` ONLY for cross-cutting concerns (UI utilities)
- API hooks may be global if used by 3+ components
- NO business logic leakage between components

### 5. Testing Colocation
**MANDATORY**: Tests live with their subjects:
- Component integration tests
- Hook unit tests
- Sub-component tests
- Feature-specific test utilities

### 6. Import Hygiene
**MANDATORY**: Clean import patterns:
- Use index.ts for public APIs
- No deep imports (`../../../`)
- Domain boundaries enforced via imports
- Circular dependencies prohibited

## Component API Standards

### Public Interface Requirements
Every component module MUST export a clean public API:

```typescript
// views/projects-view/index.ts
export { ProjectsView } from './projects-view'
export { useProjectsView } from './use-projects-view'
export type { ProjectsViewProps } from './projects-view'
export * from './dialogs'
```

### Import Standards
**MANDATORY**: Use clean import patterns:

```typescript
// ✅ CORRECT: Clean imports via index.ts
import { ProjectsView } from '@/views/projects-view'
import { EditorView } from '@/views/editor-view'
import { EmptyState } from '@/components/shared/EmptyState'

// ❌ FORBIDDEN: Deep imports
import { ProjectsView } from '@/views/projects-view/projects-view'
import { useProjectsView } from '@/views/projects-view/use-projects-view'

// ❌ FORBIDDEN: Cross-domain business logic imports
import { useProjectsView } from '@/views/projects-view/use-projects-view'
// in documents-view component
```

## Domain Boundaries

### Allowed Dependencies
- ✅ Views can import from `@/components/ui/`
- ✅ Views can import from `@/lib/`
- ✅ Views can import from `@/types/`
- ✅ Views can import from `@/components/shared/`
- ✅ Views can import from global `@/hooks/` (UI utilities only)
- ✅ Views can import from global `@/providers/`
- ✅ Components can import from all of the above

### Forbidden Dependencies
- ❌ Views cannot import from other view domains
- ❌ Components cannot import from view domains
- ❌ Business logic hooks cannot be shared between domains
- ❌ Deep imports bypassing index.ts files
- ❌ Circular dependencies

## Enforcement

This structure is enforced through:
1. **Code Review**: All PRs must maintain these boundaries
2. **ESLint Rules**: Import restrictions (when configured)
3. **Architecture Tests**: Automated boundary validation
4. **Documentation**: This reference document is law
