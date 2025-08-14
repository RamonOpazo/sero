# Document Viewer Refactoring Plan

## Overview
This document outlines the comprehensive refactoring plan for the Document Viewer component to address performance issues, eliminate selection lag during panning, and improve overall architecture.

## Current Issues Identified

### 1. Selection Lag During Panning
- **Root Cause**: `SelectionsLayer` recalculates page rectangles via `getBoundingClientRect()` after each pan operation
- **Impact**: Visual lag where selections appear to "snap" into place after panning stops
- **Technical Debt**: Separate coordinate systems for different layers cause synchronization issues

### 2. Complex State Management
- **Multiple Contexts**: `DocumentViewerContext`, `PDFContext`, and selection hooks manage overlapping concerns
- **State Fragmentation**: View state scattered across multiple hooks and contexts
- **Performance Impact**: Unnecessary re-renders due to context splitting

### 3. Performance Bottlenecks
- **Expensive DOM Queries**: `getBoundingClientRect()` called on every state change
- **Multiple Event Listeners**: Each layer manages its own mouse events
- **Layout Thrashing**: Frequent position recalculations during interactions

### 4. Architectural Complexity
- **Mixed Positioning Strategies**: Absolute, fixed, and relative positioning across layers
- **Tight Coupling**: Layers depend on specific DOM structure and timing
- **Maintenance Burden**: Changes require updates across multiple files

## Proposed Solution: Unified Transform Architecture

### Core Concept
Create a single coordinate system that all layers inherit, eliminating the need for separate positioning calculations and ensuring perfect synchronization.

```
┌─ Viewer Container ──────────────────────────┐
│  ┌─ Unified Transform ──────────────────┐   │
│  │  ┌─ PDF Renderer ───────────────┐    │   │
│  │  │                              │    │   │
│  │  └──────────────────────────────┘    │   │
│  │  ┌─ Selections Overlay ─────────┐    │   │
│  │  │  (inherits transform)        │    │   │
│  │  └──────────────────────────────┘    │   │
│  │  ┌─ Info Overlay ──────────────┐     │   │
│  │  │  (conditionally visible)    │     │   │
│  │  └──────────────────────────────┘    │   │
│  └──────────────────────────────────────┘   │
│  ┌─ UI Controls (Fixed) ──────────────┐     │
│  │  Actions, Navigation, etc.         │     │
│  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

## Refactoring Roadmap

### Phase 1: Unified Transform Foundation
**Goal**: Eliminate selection lag by creating shared coordinate system

#### 1.1 Create UnifiedViewport Component
- [ ] New `UnifiedViewport.tsx` component as transform container
- [ ] Single CSS transform for pan/zoom operations
- [ ] Coordinate system utilities for child components

#### 1.2 Refactor RenderLayer
- [ ] Remove individual pan/zoom transforms
- [ ] Use relative positioning within viewport
- [ ] Simplify mouse event handling

#### 1.3 Update SelectionsLayer
- [ ] Remove `getBoundingClientRect()` dependency
- [ ] Use shared coordinate system from viewport
- [ ] Eliminate position recalculation logic

#### 1.4 Integrate InfoLayer as Hideable Overlay
- [ ] Create toggleable info panel within unified transform
- [ ] Position relative to document content
- [ ] Smooth show/hide animations
- [ ] Responsive positioning based on viewport

**Expected Outcome**: Zero-lag selection positioning during panning

### Phase 2: State Consolidation
**Goal**: Simplify state management and reduce re-renders

#### 2.1 Unified Context Architecture
- [ ] Merge `DocumentViewerContext` and `PDFContext`
- [ ] Create single `ViewerState` with all necessary data
- [ ] Implement state selectors to prevent unnecessary re-renders

#### 2.2 Selection State Integration
- [ ] Move selection logic into main viewer state
- [ ] Eliminate separate `useSelection` hook
- [ ] Implement undo/redo for selections

#### 2.3 Event Handling Optimization
- [ ] Single event listener on viewport container
- [ ] Event delegation for different interaction modes
- [ ] Debounced updates for expensive operations

**Expected Outcome**: 30-50% reduction in re-renders, simplified debugging

### Phase 3: Performance Optimization
**Goal**: Maximize rendering performance and responsiveness

#### 3.1 Viewport Culling
- [ ] Calculate visible area bounds
- [ ] Only render selections within viewport
- [ ] Lazy load page elements outside view

#### 3.2 Transform Optimization
- [ ] Use `transform3d` for hardware acceleration
- [ ] Implement `will-change` hints for animations
- [ ] Optimize CSS for layer composition

#### 3.3 Memory Management
- [ ] Cleanup unused page references
- [ ] Implement selection batching for large documents
- [ ] Add performance monitoring hooks

**Expected Outcome**: Smooth 60fps interactions on large documents

### Phase 4: Enhanced Features
**Goal**: Add advanced functionality leveraging new architecture

#### 4.1 Smooth Transitions
- [ ] Animated pan/zoom operations
- [ ] Easing functions for mode changes
- [ ] Contextual animation timing

#### 4.2 Advanced Selection Features
- [ ] Snap-to-content functionality
- [ ] Multi-selection with keyboard modifiers
- [ ] Selection grouping and manipulation

#### 4.3 Navigation Enhancements
- [ ] Minimap overview for large documents
- [ ] Jump-to-selection functionality
- [ ] History-based navigation

**Expected Outcome**: Professional-grade document interaction experience

## InfoLayer Integration Strategy

### Current InfoLayer Status
- Currently empty (`return null`)
- Placeholder in layer stack
- No functionality implemented

### Proposed InfoLayer Enhancement
```tsx
// InfoLayer as hideable overlay within unified transform
const InfoLayer = ({ document, isVisible, onToggle }) => (
  <div className={`
    absolute top-4 right-4 
    transition-all duration-300 
    ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
  `}>
    <Card className="w-80 backdrop-blur-sm bg-background/90">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Document Info</CardTitle>
          <Button size="sm" variant="ghost" onClick={onToggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Document metadata, statistics, etc. */}
      </CardContent>
    </Card>
  </div>
);
```

### Integration Benefits
1. **Maximizes Working Area**: Overlay design doesn't consume layout space
2. **Context Awareness**: Shows relevant info for current page/selection
3. **Unified Positioning**: Moves with document during pan/zoom
4. **Accessibility**: Keyboard shortcuts for show/hide

## Implementation Priority

### High Priority (Phase 1)
1. `UnifiedViewport` component creation
2. Selection lag elimination
3. InfoLayer overlay implementation

### Medium Priority (Phase 2)  
1. State consolidation
2. Context merger
3. Event handling optimization

### Low Priority (Phases 3-4)
1. Performance optimizations
2. Advanced features
3. Animation enhancements

## Success Metrics

### Performance
- [ ] Zero visible lag during pan operations
- [ ] <16ms render time for viewport updates
- [ ] <100ms response time for mode switches

### Code Quality
- [ ] 50% reduction in component complexity
- [ ] Single source of truth for viewport state
- [ ] 90%+ test coverage for core components

### User Experience
- [ ] Smooth interactions on documents with 100+ pages
- [ ] Responsive UI on low-end devices
- [ ] Intuitive overlay positioning and behavior

## Migration Strategy

### Backward Compatibility
- Maintain existing API contracts during transition
- Feature flags for new architecture components
- Gradual rollout with fallback mechanisms

### Testing Strategy
- Unit tests for coordinate transformations
- Integration tests for layer synchronization
- Performance benchmarks for regression detection
- Visual regression tests for UI consistency

### Rollback Plan
- Git feature branches for each phase
- Component-level feature toggles
- Performance monitoring with automatic rollback triggers

## File Structure Changes

```
document-viewer/
├── REFACTORING_PLAN.md          # This document
├── index.ts                     # Exports
├── DocumentViewer.tsx           # Main entry point (minimal changes)
├── core/                        # New directory
│   ├── UnifiedViewport.tsx      # Phase 1
│   ├── ViewerState.tsx          # Phase 2  
│   └── CoordinateSystem.ts      # Utilities
├── layers/                      # Refactored layers
│   ├── RenderLayer.tsx          # Updated for unified transform
│   ├── SelectionsLayer.tsx      # Simplified positioning
│   ├── InfoLayer.tsx           # New hideable overlay
│   └── ActionsLayer.tsx        # Minimal changes
├── hooks/                       # Consolidated hooks
│   ├── useViewerState.ts        # Replaces multiple hooks
│   └── useCoordinates.ts        # Coordinate utilities
└── types/                       # Type definitions
    └── viewer.ts                # Consolidated types
```

## Notes for Implementation

### CSS Transform Strategy
```css
.unified-viewport {
  transform-origin: center center;
  transition: transform 0.1s ease-out;
  will-change: transform;
}

.unified-viewport.panning {
  transition: none; /* Disable transitions during active panning */
}
```

### Coordinate System Utilities
```typescript
// Convert screen coordinates to document coordinates
const screenToDocument = (screenX: number, screenY: number) => {
  const { pan, zoom } = viewerState;
  return {
    x: (screenX - pan.x) / zoom,
    y: (screenY - pan.y) / zoom
  };
};
```

### Event Handling Pattern
```typescript
// Single event handler with delegation
const handleViewportEvent = (event: MouseEvent) => {
  const { mode } = viewerState;
  
  switch (mode) {
    case 'pan':
      handlePanEvent(event);
      break;
    case 'select':
      handleSelectionEvent(event);
      break;
  }
};
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-08-14  
**Next Review**: After Phase 1 completion
