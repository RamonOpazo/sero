# Frontend Directory Structure Reference

## Component-Centric Architecture

**IMPERATIVE: This application follows STRICT separation of concerns principles. Every component, hook, dialog, and utility must be properly encapsulated within its domain boundaries. Violations of this architecture are not acceptable.**

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
├── 📁 components/                     # Component-centric organization
│   ├── 📁 ProjectsView/              # Complete projects component module
│   │   ├── 📄 ProjectsView.tsx        # Main view component (entry from ProjectsPage)
│   │   ├── 📄 ProjectsDataTable.tsx   # Data table with business logic
│   │   ├── 📄 useProjectsView.ts      # Business logic hook
│   │   ├── 📁 dialogs/               # Project-specific dialogs
│   │   │   ├── 📄 CreateProjectDialog.tsx
│   │   │   ├── 📄 EditProjectDialog.tsx
│   │   │   └── 📄 index.ts
│   │   ├── 📁 __tests__/              # Co-located tests
│   │   │   ├── 📄 ProjectsView.test.tsx
│   │   │   ├── 📄 useProjectsView.test.ts
│   │   │   └── 📄 ProjectsDataTable.test.tsx
│   │   └── 📄 index.ts               # Public API
│   ├── 📁 DocumentsView/             # Complete documents component module
│   │   ├── 📄 DocumentsView.tsx       # Main view component
│   │   ├── 📄 DocumentsDataTable.tsx  # Documents table with logic
│   │   ├── 📄 useDocumentsView.ts     # Business logic hook
│   │   ├── 📁 dialogs/               # Document-specific dialogs
│   │   │   ├── 📄 EditDocumentDialog.tsx
│   │   │   ├── 📄 UploadDocumentsDialog.tsx  # Renamed from CreateDocumentDialog for better semantics
│   │   │   └── 📄 index.ts
│   │   ├── 📁 __tests__/
│   │   └── 📄 index.ts
│   ├── 📁 DocumentEditor/            # Document editing component module (renamed from FileViewer)
│   │   ├── 📄 DocumentEditor.tsx      # Main editor component
│   │   ├── 📄 useDocumentEditor.ts    # Editor business logic hook
│   │   ├── 📁 dialogs/               # Editor-specific dialogs
│   │   │   ├── 📄 DocumentPasswordDialog.tsx  # Context-specific name
│   │   │   └── 📄 index.ts
│   │   ├── 📁 __tests__/
│   │   └── 📄 index.ts
│   ├── 📁 Layout/                    # Layout components
│   │   ├── 📄 AppLayout.tsx           # Main app layout
│   │   ├── 📄 Navigation.tsx          # Navigation component
│   │   ├── 📄 Breadcrumbs.tsx         # Breadcrumb navigation
│   │   ├── 📁 __tests__/
│   │   └── 📄 index.ts
│   └── 📁 shared/                    # Truly shared components
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
├── 📁 context/                       # Global contexts
│   ├── 📄 ProjectProvider.tsx        # Main app context
│   ├── 📄 ThemeContext.tsx          # Theme management
│   ├── 📄 DocumentViewerContext.tsx  # Document viewer context
│   └── 📄 index.ts
├── 📁 lib/                          # Utility libraries
│   ├── 📄 api.ts                    # API client
│   ├── 📄 result.ts                 # Result type utilities
│   ├── 📄 utils.ts                  # General utilities
│   ├── 📄 crypto.ts                 # Crypto utilities
│   └── 📄 axios.ts                  # HTTP client
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
- Project dialogs → `ProjectsView/dialogs/`
- Document dialogs → `DocumentsView/dialogs/`
- Editor dialogs → `DocumentEditor/dialogs/`
- Generic dialogs → `shared/` (ONLY if used across 3+ domains)

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
// components/ProjectsView/index.ts
export { ProjectsView } from './ProjectsView'
export { useProjectsView } from './useProjectsView'
export type { ProjectsViewProps } from './ProjectsView'
export * from './dialogs'
```

### Import Standards
**MANDATORY**: Use clean import patterns:

```typescript
// ✅ CORRECT: Clean imports via index.ts
import { ProjectsView } from '@/components/ProjectsView'
import { DocumentEditor } from '@/components/DocumentEditor'
import { EmptyState } from '@/components/shared/EmptyState'

// ❌ FORBIDDEN: Deep imports
import { ProjectsView } from '@/components/ProjectsView/ProjectsView'
import { useProjectsView } from '@/components/ProjectsView/useProjectsView'

// ❌ FORBIDDEN: Cross-domain business logic imports
import { useProjectsView } from '@/components/ProjectsView/useProjectsView'
// in DocumentsView component
```

## Domain Boundaries

### Allowed Dependencies
- ✅ Components can import from `@/ui/`
- ✅ Components can import from `@/lib/`
- ✅ Components can import from `@/types/`
- ✅ Components can import from `@/components/shared/`
- ✅ Components can import from global `@/hooks/` (UI utilities only)
- ✅ Components can import from global `@/context/`

### Forbidden Dependencies
- ❌ Components cannot import from other component domains
- ❌ Business logic hooks cannot be shared between domains
- ❌ Deep imports bypassing index.ts files
- ❌ Circular dependencies

## Enforcement

This structure is enforced through:
1. **Code Review**: All PRs must maintain these boundaries
2. **ESLint Rules**: Import restrictions (when configured)
3. **Architecture Tests**: Automated boundary validation
4. **Documentation**: This reference document is law
