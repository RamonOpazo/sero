# CHANGELOG


## v0.4.0 (2025-07-30)

### Bug Fixes

- Fixed an issue between the selection layer and the document layer, in which the selections were
  rendered before the page was rendered, thus producing a race condition that affected the
  calculation of the selections' size.
  ([`6ef21ab`](https://github.com/RamonOpazo/sero/commit/6ef21abeee3398b5db0ef8e7cd5cf0e1eaa12808))

- Fixed issue in the document layer in which, upon zooming on a given document, it blew up the its
  container, overflowing and breaking the view.
  ([`eb8d757`](https://github.com/RamonOpazo/sero/commit/eb8d757ac11337f1d4eea15a9bb050b17610654d))

### Features

- Enhance DataTable and refine UI/layout
  ([`eda16a5`](https://github.com/RamonOpazo/sero/commit/eda16a57adb3aeabf66c5f563116ae6455665146))

- Improve selection layer synchronization and visibility
  ([`7edd7e9`](https://github.com/RamonOpazo/sero/commit/7edd7e99c371e856e511f93016cc0c72845777de))

- Visual improvement and new actions in document viewer.
  ([`e04d95a`](https://github.com/RamonOpazo/sero/commit/e04d95a084e3c447f965bea74654839a4b4c359d))

- Working panning and zooming, with correct positioning (though a little bit laggy) of the selection
  layer.
  ([`77aa204`](https://github.com/RamonOpazo/sero/commit/77aa2044a94f801ad5397b17a8ad94bef992debf))

- **frontend**: Overhaul application layout with responsive sidebar
  ([`5135021`](https://github.com/RamonOpazo/sero/commit/51350212fe7a81774ac284205b3cf5fc9f41a310))

This commit introduces a complete overhaul of the frontend application layout, replacing the static
  layout with a modern, responsive, and collapsible sidebar navigation system.

Key changes include: - A new `Sidebar` component, which is collapsible, responsive for mobile, and
  configurable. - A completely redesigned main `Layout` that integrates the new sidebar. - New UI
  components such as `Widget`, `Avatar`, `Tooltip`, and `Collapsible` to build a more consistent and
  polished interface. - Refactored application routing (`App.tsx`) to be more semantic and RESTful
  (e.g., `/projects/:id/documents`). - An improved `Breadcrumbs` component that dynamically
  generates paths based on the new routing structure. - A new `HomeView` to serve as the
  application's landing page. - Enhancements to the `DataTable` component for better alignment and a
  cleaner look.

### Refactoring

- Added optional ids for selection and prompt creation, and reflected changes on the frontend side.
  ([`b51c82c`](https://github.com/RamonOpazo/sero/commit/b51c82c7e84201806ad2eeb10e802bf9c94edd1e))

- Better column handling of datatables.
  ([`adf5112`](https://github.com/RamonOpazo/sero/commit/adf511206da41d57a53178de05ef4c65ea6e8264))

- Complete overhaul of the document-viewer component for propper PDF rendering and selection layer.
  ([`0b8e147`](https://github.com/RamonOpazo/sero/commit/0b8e147d23aa7779bf2aa41bd4e05091a868edfd))

- Refactored frontend import/exports.
  ([`9763d29`](https://github.com/RamonOpazo/sero/commit/9763d29204bd5ffb5c265b1c58f3b7e56422ea7c))

- Rename types and resolve map errors
  ([`562f50f`](https://github.com/RamonOpazo/sero/commit/562f50fdbc52a0fa4bf8052e347c9c98b6415d55))


## v0.3.0 (2025-07-26)

### Chores

- **release**: V0.3.0 [skip ci]
  ([`48b84ab`](https://github.com/RamonOpazo/sero/commit/48b84ab84fa3fb1916561299f08db7915a44a4f7))

### Features

- **ci**: Disable build and publish steps in release workflow
  ([`10aad44`](https://github.com/RamonOpazo/sero/commit/10aad4454d9d84e843a47a20233137cea59f10a4))

Commented out the 'Build package' and 'Publish to PyPI' steps in the release workflow as they are
  not currently needed and were causing errors.


## v0.2.0 (2025-07-26)

### Bug Fixes

- Configure semantic release with VCS versioning
  ([`35c1ae3`](https://github.com/RamonOpazo/sero/commit/35c1ae36cc2b1bd425ec17f140f45ad09d2dfbb2))

- **ci**: Disable semantic-release build command
  ([`1e71ab9`](https://github.com/RamonOpazo/sero/commit/1e71ab9688e32713da0b18424279a6134b7ff58a))

The 'uv' command was not found in the semantic-release action's environment, causing the release
  workflow to fail. This change disables the build step within semantic-release, as the build is
  already handled by a separate step in the 'release.yml' workflow.

### Chores

- **release**: V0.2.0 [skip ci]
  ([`c7ea276`](https://github.com/RamonOpazo/sero/commit/c7ea2764736b0e146e5d7af213aecd6e59cfefb5))

### Documentation

- **release**: Add PyPI publishing instructions to pyproject.toml
  ([`601dedf`](https://github.com/RamonOpazo/sero/commit/601dedf2b82171b4f7cafcc2fbfb26615da23751))

Removed the build_command from semantic-release configuration and added comments explaining how to
  configure PyPI publishing, including build_command and upload_to_pypi.

### Features

- Complete SQLite migration with timezone-aware datetime handling
  ([`9d38e82`](https://github.com/RamonOpazo/sero/commit/9d38e82bbb08a72a7b3b4f6c451ef15af541ba33))

- Implement custom TimezoneAwareDateTime type for SQLite compatibility - Add comprehensive database
  tests for UUID and SQLite functionality - Fix timezone validation issues in Pydantic schemas - Add
  timezone-aware datetime tests with proper UTC handling - Update static assets after frontend
  rebuild - Fix trailing slash issues in API test endpoints - Fix file download test parameter
  requirements - All 114 tests now passing with complete test coverage - Robust SQLite backend with
  WAL mode and foreign key constraints

- Enhance document management with file upload and improved table functionality
  ([`d10f416`](https://github.com/RamonOpazo/sero/commit/d10f4168d4ffa565f2556a20d49162d4d94219fd))

- Replace CreateDocumentDialog with file upload functionality - Support multiple PDF file uploads
  via bulk API endpoint - Add password field for document security - Include optional description
  template for uploaded files - Update DocumentsView to use new upload workflow

- Add description column to documents table - Display document descriptions with proper truncation -
  Position between Status and Selections columns

- Implement comprehensive table sorting - Add sorting to Status, Selections, Prompts, and Size
  columns - Fix Name column sorting using proper accessorFn - Use numerical priorities for status
  sorting (pending → processed → failed) - Sort by actual byte values for file sizes with
  human-readable display

- Update file size handling - Change File interface size field from string to number - Add
  formatFileSize helper for byte-to-readable conversion - Sort by actual integer byte values while
  displaying formatted sizes

- Add toast notification for document ID copying - Show success/error feedback when copying document
  IDs to clipboard - Match ProjectsView toast patterns for consistency

- Improve toast messaging consistency - Align all document operation toasts with ProjectsView
  patterns - Better error handling and user feedback across all operations

- Implement frontend data integration and 30/70 layout with dark mode
  ([`6573b9e`](https://github.com/RamonOpazo/sero/commit/6573b9ea892663453b1f54fd8ca4c3f01bf5204f))

Frontend Integration: - Fix API routing issues by removing trailing slash requirements - Connect
  ProjectsView to backend /api/projects endpoint - Connect DocumentsView to backend
  /api/projects/id/{id} and /api/documents/search - Update TypeScript types to match actual backend
  response structure - Fix document status detection and original file handling

UI/UX Improvements: - Implement 30/70 sidebar layout with navigation - Add dark mode support with
  ThemeProvider and ThemeToggle - Create responsive sidebar with Projects, Documents, Settings
  navigation - Add smooth theme transitions and system theme detection - Include built frontend
  assets in backend static directory

Backend API Fixes: - Update API routers to handle routes without trailing slashes - Fix FastAPI
  routing to prioritize API endpoints over frontend fallback - Add stream parameter to file download
  endpoint for inline viewing - Update CORS and static file serving configuration

Project Structure: - Frontend builds to src/backend/static for unified serving - API calls work
  correctly from built frontend - Theme preferences persist in localStorage

- Implement PDF redaction and obfuscation functionality
  ([`83f6399`](https://github.com/RamonOpazo/sero/commit/83f639902137e2e226e014db658db7d4ee2cf06c))

- Add PDFRedactor class with selection-based redaction using PyMuPDF - Implement document processing
  API endpoint for applying redactions - Add comprehensive tests for PDF redaction and document
  processing - Update FileViewer component with functional Obfuscate button - Add loading states and
  error handling for obfuscation process - Implement automatic switching to obfuscated view after
  processing - Ensure obfuscated files maintain same password encryption as originals - Fix
  canObfuscate logic to enable button when selections exist - Add redaction markers with unique
  UUIDs for traceability

The obfuscated files are password-encrypted and created by applying black rectangles over
  user-selected areas, extracting text content before redaction, and maintaining full audit trail
  with redaction UUIDs.

- Implement secure password management and fix coordinate normalization
  ([`e114bd4`](https://github.com/RamonOpazo/sero/commit/e114bd44dbe99489dbb2041ae2ee40b36655ef55))

Security improvements: - Remove passwords from URL parameters to prevent exposure in browser history
  and server logs - Implement secure sessionStorage-based password management with automatic expiry
  - Add activity-based password extension with throttling - Clean up expired passwords automatically

PDF coordinate system improvements: - Implement normalized coordinates (0-1 range) for PDF
  selections - Add coordinate conversion utilities in FilePDFViewer - Update selection rendering to
  handle zoom-independent coordinates - Fix coordinate display in UI to show percentage values

Technical improvements: - Add utility functions for throttle, debounce, and other common operations
  - Fix TypeScript compilation errors and variable declaration order - Ensure consistent coordinate
  handling across all components - Add comprehensive error handling and cleanup logic

This commit addresses critical security vulnerabilities while improving the robustness of the PDF
  selection system.

- Improve DataTable column navigation with fixed-width pagination
  ([`71fc16f`](https://github.com/RamonOpazo/sero/commit/71fc16f87cdbe1d5a8c6ec28a11195680a1cd144))

- Replace horizontal scrolling with pagination-style column navigation - Add navigation column with
  left/right buttons for one-column-at-a-time scrolling - Fix Actions column to always stay sticky
  on the right side - Set fixed widths for navigation column (96px) and actions column (120px) -
  Maintain selection column sticky on the left side - Show only 4 columns at a time with smooth
  single-column navigation - Preserve all existing DataTable functionality (sorting, filtering,
  selection, etc.) - Ensure theme-aware styling for both light and dark modes

This replaces the problematic ScrollArea approach that broke sticky column positioning with a much
  more intuitive and stable column navigation system.

- Restructure project with React frontend integration
  ([`de0d61c`](https://github.com/RamonOpazo/sero/commit/de0d61cfaa0cbd9c4187232cc83031339a423ed7))

- Restructure backend from src/sero to src/backend for better separation - Add complete React + Vite
  + TypeScript + Tailwind + shadcn/ui frontend - Update pyproject.toml for new project structure and
  build configuration - Fix CLI functions to use correct module paths and coverage settings - Add
  comprehensive frontend components: - ProjectsView: searchable grid of projects - DocumentsView:
  paginated document grid with status badges - DocumentEditor: placeholder for PDF viewer
  integration - Complete shadcn/ui component library setup - Configure Vite to build assets into
  backend static directory - Set up React Router for SPA navigation with clean URLs - Add TypeScript
  types matching backend schema exactly - Fix DocumentsView HTML structure and layout issues -
  Maintain monorepo structure: src/backend/ (Python) + src/frontend/ (React)

### Refactoring

- Clean up file viewer component and minor tweaks to the rest of the UI
  ([`3b84b6c`](https://github.com/RamonOpazo/sero/commit/3b84b6c45543a46dd242de9dc033f171077b463d))

- Major API simplification and Tag model removal
  ([`9395feb`](https://github.com/RamonOpazo/sero/commit/9395febad4f32c825c83bdbd1d40a96b04524aa2))

BREAKING CHANGES: - Remove Tag model and related entities completely - Tags are now simple list of
  strings on Document model - Remove all Tag-related controllers, routers, schemas, and CRUD
  operations

Core Changes: - Document.tags: Changed from relationship to List[str] with default [] - Remove Tag
  model, tag_document association table - Simplify document operations by removing tag joins -
  Update all document schemas to reflect tags as list of strings

New Features: - Add template description support to bulk document upload - Optional
  template_description parameter applies '[bulk upload] <description>' to each document - Add
  comprehensive document summarize endpoint with detailed analytics - Add comprehensive project
  summarize endpoint with aggregated statistics

Controller Improvements: - documents_controller: Remove tag-related operations, simplify queries,
  add bulk upload template descriptions - projects_controller: Add detailed summarize function with
  comprehensive project analytics - files_controller: Simplify to basic get/delete/download
  operations - Create new prompts_controller and selections_controller with consistent patterns -
  Apply functional programming paradigms and consistent error handling across all controllers

Router Improvements: - Remove all tag-related endpoints - Add new prompts and selections routers
  with simplified CRUD operations - Update bulk upload to support template descriptions - Consistent
  endpoint patterns and documentation across all routers

Schema Updates: - documents_schema: Update tags field to List[str], remove tag relationships - Add
  DocumentSummary schema with comprehensive analytics - Add ProjectSummary schema with detailed
  project statistics - Remove all tag-related schemas - Update all schemas to reflect simplified
  data model

CRUD Layer: - Remove tags CRUD operations completely - Add originals.py and redacted.py for
  specialized file operations - Simplify document CRUD by removing tag joins - Update base CRUD with
  improved patterns - Enhanced project CRUD with summary capabilities

Database Model: - Document.tags: Column(JSON) with default=[] instead of relationship - Remove Tag
  model and tag_document association table - Simplified model relationships and queries

Infrastructure: - Update app.py to include new routers, remove tag router - Enhanced timezone
  handling in tests - Updated dependencies in uv.lock - Remove outdated entity relationship diagrams
  - Update documentation to reflect new simplified architecture

This refactor significantly simplifies the codebase by: 1. Removing unnecessary Tag entity
  complexity 2. Implementing consistent controller patterns 3. Adding comprehensive analytics
  capabilities 4. Improving error handling and functional programming patterns 5. Maintaining
  backward compatibility where possible 6. Enhancing bulk upload functionality

The result is a cleaner, more maintainable API with reduced complexity while preserving all
  essential business logic.

- Move password validation to DocumentsView and modularize FileViewer
  ([`fe33fb9`](https://github.com/RamonOpazo/sero/commit/fe33fb9f58e556ce41e290c6f8d2788adc407319))

- Move password validation logic from FileViewer to DocumentsView - Enhance PasswordDialog with
  error states and loading indicators - Validate passwords using GET request with Range header
  before navigation - Remove all password-related logic from FileViewer components - Modularize
  FileViewer into smaller sub-components: - FileHeader: document metadata and view mode switching -
  FileControls: PDF navigation, zoom, rotate, selection controls - FileSelectionInfo: selection
  count and clear functionality - FilePDFViewer: core PDF rendering and display - Fix React hooks
  rule violations by ensuring consistent hook order - Improve error handling for different HTTP
  status codes (401, 500) - Clean architecture with proper separation of concerns

- **core**: Overhaul backend CRUD operations and frontend DataTable
  ([`ec83ac8`](https://github.com/RamonOpazo/sero/commit/ec83ac8626fad17eeae5076ee1c4dcb71218ff09))

This commit introduces a significant architectural refactoring of both the backend and frontend to
  improve maintainability, reduce code duplication, and enhance performance.

### Backend

- **Generic CRUD Layer:** Introduced a `CRUDBase` class that abstracts common database operations
  (create, read, update, delete). All existing CRUD modules for projects, documents, files, etc.,
  have been refactored to inherit from this base class. This drastically reduces boilerplate and
  standardizes data access patterns.

- **API & Schema Simplification:** The API routers and Pydantic schemas have been updated to align
  with the new generic CRUD layer, resulting in cleaner and more consistent endpoint
  implementations.

### Frontend

- **New DataTable Component:** The existing `DataTable.old.tsx` has been replaced with a completely
  new, more powerful, and reusable `DataTable` component. The new implementation is decoupled into
  smaller, more manageable sub-components for content, pagination, and toolbar actions.

- **Type-Safe & Generic:** The new DataTable is fully generic and type-safe, allowing it to be
  easily adapted for displaying different types of data (e.g., Projects, Documents, Files) with
  minimal effort.

- **Improved UI/UX:** The views for Projects, Documents, and Files have been updated to use the new
  DataTable, providing a more consistent and responsive user experience.

This holistic refactoring establishes a more robust and scalable foundation for future development.


## v0.1.0 (2025-07-21)

### Features

- Add automated releases and CLI commands
  ([`5532880`](https://github.com/RamonOpazo/sero/commit/5532880f27bba53f0ab803f95000da8a2fb8ff28))
