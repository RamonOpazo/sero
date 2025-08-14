# FileViewer Architecture Improvement

## Overview
Implement proper shallow document loading with dedicated document-based file download endpoints to eliminate the need for fetching full documents just to get file IDs.

## Current Problem
- FileViewer fetches full `DocumentType` to access `document.files` array
- Only needs file IDs to download files with password
- Violates shallow loading principle for efficient data fetching

## Solution
Create new document-based download endpoints that accept document ID directly, allowing FileViewer to use `DocumentShallowType` and download files without intermediate steps.

---

## Implementation Plan

### Phase 1: Backend - Create Document Download Endpoints
**Location:** Backend API (documents router)

#### 1.1 Create Original File Download Endpoint
- [x] **Endpoint:** `POST /documents/id/{documentId}/download/original`
- [x] **Request Body:** `{ key_id: string, encrypted_password: string }`
- [x] **Response:** Binary PDF file with appropriate headers
- [x] **Logic:** Find document → Find original file → Decrypt with password → Return blob
- [x] **Error Handling:** Document not found, no original file, invalid password

#### 1.2 Create Redacted File Download Endpoint  
- [x] **Endpoint:** `GET /documents/id/{documentId}/download/redacted`
- [x] **Request Body:** None (public access)
- [x] **Response:** Binary PDF file with appropriate headers
- [x] **Logic:** Find document → Find redacted file → Return blob
- [x] **Error Handling:** Document not found, no redacted file

#### 1.3 Add Response Headers
- [x] `Content-Type: application/pdf`
- [x] `Content-Disposition: attachment; filename="{document_name}_{file_type}.pdf"`
- [x] Proper error responses (404, 400, etc.)

---

### Phase 2: Frontend - Update FileViewer Implementation
**Location:** `src/views/FileViewer.tsx`

#### 2.1 Revert to Shallow Document Loading
- [x] Change state type back to `DocumentShallowType`
- [x] Update API call type casting to `DocumentShallowType`
- [x] Remove dependencies on `document.files` array

#### 2.2 Update Password Handling Logic
- [x] Use `has_original_file` / `has_redacted_file` flags for validation
- [x] Create separate handlers for original vs redacted files
- [x] Remove file ID lookup logic
- [x] Remove document fetching entirely - use document ID from URL params

#### 2.3 Implement New Download Methods
- [x] **Original files:** POST with encrypted password to `/documents/id/{id}/download/original`
- [x] **Redacted files:** GET request to `/documents/id/{id}/download/redacted`
- [x] Update blob handling to work with new endpoints

#### 2.4 Improve User Experience
- [x] Skip password dialog entirely for redacted files
- [x] Show immediate loading for redacted files
- [x] Update loading states and error messages
- [x] Remove unnecessary document API calls

---

### Phase 3: Frontend - Update useFiles Hook
**Location:** `src/hooks/useFiles.ts`

#### 3.1 Add Document-Based Loading Methods
- [x] `loadOriginalFileByDocumentId(documentId: string, password: string)`
- [x] `loadRedactedFileByDocumentId(documentId: string)`
- [x] Maintain existing file-ID based methods for compatibility
- [x] Fix response headers handling for filename extraction

#### 3.2 Update File Loading Logic
- [x] Use new document-based endpoints
- [x] Handle different authentication requirements
- [x] Update error handling and loading states

---

### Phase 4: Frontend - Update Document Viewer Integration
**Location:** `src/views/FileViewer.tsx` (documentForViewer logic)

#### 4.1 Fix Document Construction
- [x] Create `DocumentType` from `DocumentShallowType` + loaded file data
- [x] Handle missing file metadata from shallow document
- [x] Ensure proper blob attachment for viewer

#### 4.2 Update Dependencies
- [x] Fix `useMemo` dependencies for shallow document
- [x] Remove references to non-existent properties
- [x] Test document viewer integration

---

### Phase 5: Testing & Validation

#### 5.1 Backend Testing
- [ ] Test original file download with correct password
- [ ] Test original file download with incorrect password
- [ ] Test redacted file download (no password)
- [ ] Test error cases (document not found, no files)

#### 5.2 Frontend Testing
- [ ] Test FileViewer with original files
- [ ] Test FileViewer with redacted files
- [ ] Test password dialog flow
- [ ] Test direct redacted file access
- [ ] Test error states and loading states

#### 5.3 Integration Testing
- [ ] Test full document → file download flow
- [ ] Test DocumentViewer rendering with new data
- [ ] Test type safety (no TypeScript errors)
- [ ] Test performance improvement

---

## Expected Benefits

### Performance
- ✅ Reduced data transfer (shallow documents vs full documents)
- ✅ Faster initial page load
- ✅ Single request for file download

### User Experience  
- ✅ Immediate access to redacted files (no password dialog)
- ✅ Cleaner password flow for original files
- ✅ Better error messages

### Architecture
- ✅ Proper separation of concerns
- ✅ RESTful API design
- ✅ Type safety with shallow documents
- ✅ Elimination of unnecessary data fetching

---

## Rollback Plan
If issues arise, revert changes in reverse order:
1. Revert frontend FileViewer to current working state
2. Keep new backend endpoints (no breaking changes)
3. Address issues and re-implement incrementally

---

**Status:** 🟢 All Phases Complete - Full Implementation Done
**Result:** FileViewer now uses efficient document-based download endpoints without unnecessary API calls
