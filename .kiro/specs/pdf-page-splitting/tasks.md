# Implementation Plan: PDF Page Splitting

## Overview

Implement the `splitContainersByPages` algorithm in `src/script.ts` that distributes containers across PDF pages of fixed height (1428px). Containers exceeding page boundaries are split with headers duplicated and items redistributed. Items on continuation pages are compacted via `fixBoundsOverlapping` and heights recalculated via `calculateContainerHeight`. Testing uses Jest with `fast-check` for property-based tests.

## Tasks

- [x] 1. Set up test infrastructure and extract pure types
  - [x] 1.1 Install fast-check and create test directory structure
    - Install `fast-check` as a dev dependency
    - Create `src/__tests__/` directory
    - Create placeholder files: `src/__tests__/splitContainersByPages.test.ts` and `src/__tests__/splitContainersByPages.property.ts`
    - _Requirements: N/A (infrastructure)_

  - [x] 1.2 Extract pure Container/Item types and constants for testability
    - In `src/script.ts`, export a pure version of the `Container` and `Item` types (without `el: HTMLElement`) as `PureContainer` and `PureItem`, or reuse the existing types from `src/types.ts`
    - Export `PAGE_CONTENT_HEIGHT` constant from `src/script.ts`
    - Export the `AreaData` type from `src/script.ts`
    - Export `calculateContainerHeight` from `src/script.ts`
    - Ensure `fixBoundsOverlapping` from `src/utils/layout.ts` is already exported (it is)
    - _Requirements: 7.1_

- [x] 2. Implement core splitContainersByPages function
  - [x] 2.1 Implement the main `splitContainersByPages` function signature and empty-input handling
    - Create and export `splitContainersByPages(containers: Container[], areaData: AreaData): Container[][]` in `src/script.ts` (using the pure `Container` type from `src/types.ts`)
    - Handle empty input: return `[]` when containers array is empty
    - Handle single-page case: if all containers fit within PAGE_CONTENT_HEIGHT, return a single-element array with all containers
    - Sort containers by Y position, then X position for processing
    - _Requirements: 1.1, 1.2, 1.3, 7.3_

  - [x] 2.2 Implement page assignment logic for containers that fit entirely on a page
    - Determine page index from container's Y position: `Math.floor(container.position.y / PAGE_CONTENT_HEIGHT)`
    - Check if container bottom edge (`position.y + size.height`) is within the page boundary (`(pageIndex + 1) * PAGE_CONTENT_HEIGHT`)
    - If it fits, assign to `containersByPages[pageIndex]`
    - If container starts beyond current page boundary, assign to appropriate page
    - _Requirements: 1.2, 1.4_

  - [x] 2.3 Implement container splitting logic when container exceeds page boundary
    - Calculate available space: `pageBoundary - container.position.y - containerTitleHeight`
    - Determine fitting items: items where `item.position.y + item.size.height <= availableSpace`
    - Split container into current-page part (with fitting items) and continuation part (with remaining items)
    - Recalculate height of current-page part using `calculateContainerHeight`
    - _Requirements: 2.1, 2.2, 4.1, 4.2, 4.3, 4.4_

  - [x] 2.4 Implement continuation page item repositioning
    - For remaining items on continuation page, adjust Y positions relative to new container content area
    - Call `fixBoundsOverlapping(items, undefined, true)` on continuation items
    - Recalculate continuation container height using `calculateContainerHeight`
    - Set continuation container Y position to top of next page (`nextPageIndex * PAGE_CONTENT_HEIGHT`)
    - Preserve original container id, title, width, and X position in continuation
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4_

  - [x] 2.5 Implement minimum-item-fit rule and oversized item handling
    - When no items fit on current page (all items exceed available space): move entire container to next page
    - Set moved container Y to next page top and re-evaluate splitting
    - Handle oversized items (item height > PAGE_CONTENT_HEIGHT - containerTitleHeight): place on current page without looping
    - Handle containers with zero items crossing boundary: move to next page without splitting
    - _Requirements: 3.1, 3.2, 3.3, 2.5_

  - [x] 2.6 Implement multi-page recursive splitting
    - After creating a continuation part, check if it also exceeds the next page boundary
    - If so, recursively split the continuation across additional pages
    - Ensure termination: each iteration either assigns or advances to next page; oversized escape hatch prevents infinite loops
    - _Requirements: 2.4_

- [x] 3. Checkpoint - Core implementation verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrate splitContainersByPages into execute function
  - [x] 4.1 Wire splitContainersByPages into the execute() flow
    - In `src/script.ts`, after `buildContainers` call, invoke `splitContainersByPages(containers, areaData)`
    - Replace single `redrawContainers(containers, areaData)` call with per-page rendering loop
    - For each page in `containersByPages`, call `redrawContainers` with that page's containers
    - Maintain page ordering: containers within each page sorted by Y, then X
    - _Requirements: 1.1, 7.1, 7.2, 7.4_

- [ ] 5. Write unit tests
  - [ ]* 5.1 Write unit tests for splitContainersByPages
    - Test empty input returns `[]`
    - Test single container fitting on one page returns `[[container]]`
    - Test two containers on separate pages (no split needed)
    - Test container split across exactly two pages
    - Test container split across three pages
    - Test oversized item edge case (item taller than page)
    - Test minimum-item-fit rule triggers correctly (moves to next page)
    - Test container with zero items crossing boundary is moved
    - Test container exactly at page boundary fits (≤ comparison)
    - Test output ordering (Y then X within each page)
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.5, 3.1, 3.2, 3.3, 7.2, 7.3_

- [ ] 6. Write property-based tests
  - [ ]* 6.1 Write property test for Item Conservation
    - **Property 1: Item Conservation**
    - For any set of containers, the total number of items across all pages in the output equals the total number of items in the input. No items lost or duplicated.
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 6.2 Write property test for Items Fit Within Page Bounds
    - **Property 2: All Items Fit Within Page Bounds**
    - For any container on any page, every item satisfies: `item.position.y + item.size.height <= availableSpace` where availableSpace is the remaining page space below the container header.
    - **Validates: Requirements 1.2, 2.2, 4.1, 4.2**

  - [ ]* 6.3 Write property test for Container Identity Preservation
    - **Property 3: Container Identity Preservation**
    - For any split container, all parts preserve the original container's id, title, width, and X position.
    - **Validates: Requirements 2.3, 6.2**

  - [ ]* 6.4 Write property test for Continuation Container Height Consistency
    - **Property 4: Continuation Container Height Consistency**
    - For any continuation container part, `size.height` equals `calculateContainerHeight(items, containerTitleHeight, containersGap)`.
    - **Validates: Requirements 5.3, 6.1**

  - [ ]* 6.5 Write property test for Page Ordering Invariant
    - **Property 5: Page Ordering Invariant**
    - Containers within each page are ordered by ascending Y; ties broken by ascending X.
    - **Validates: Requirements 7.2, 7.4**

  - [ ]* 6.6 Write property test for No Overlaps on Continuation Pages
    - **Property 6: No Overlaps on Continuation Pages**
    - For any continuation container part, items have no vertical overlaps among items sharing horizontal extent.
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 6.7 Write property test for Single-Page Correctness
    - **Property 7: Single-Page Correctness**
    - When all containers fit within PAGE_CONTENT_HEIGHT, output has exactly one page containing all input containers unsplit.
    - **Validates: Requirements 1.3**

  - [ ]* 6.8 Write property test for Minimum Item Fit Rule
    - **Property 8: Minimum Item Fit Rule**
    - When no item fits on current page but smallest item fits on a full page, container is moved to next page (no header-only pages).
    - **Validates: Requirements 3.1, 3.2**

- [ ] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Jest (via react-scripts) as the test runner
- Property tests use `fast-check` library with minimum 100 iterations per property
- All code is TypeScript, targeting `src/script.ts` for implementation and `src/__tests__/` for tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.5"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4"] },
    { "id": 5, "tasks": ["2.6"] },
    { "id": 6, "tasks": ["4.1"] },
    { "id": 7, "tasks": ["5.1", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8"] }
  ]
}
```
