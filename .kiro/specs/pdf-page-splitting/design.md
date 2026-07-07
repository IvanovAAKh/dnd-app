# Design Document: PDF Page Splitting

## Overview

This feature implements the `splitContainersByPages` algorithm within `src/script.ts`. The algorithm takes a flat list of containers (produced by `buildContainers`) and distributes them across multiple PDF pages of fixed height (`PAGE_CONTENT_HEIGHT = 1428px`). Containers that exceed a page boundary are split: the current page retains items that fit, and a continuation part (with a duplicated header) is placed on the next page. Items on continuation pages are repositioned using `fixBoundsOverlapping(items, undefined, true)` to compact them toward the top, and the container height is recalculated via `calculateContainerHeight`.

The algorithm is purely computational — it operates on data structures (no DOM mutation during splitting) and produces a `containersByPages: Container[][]` array that the rendering layer consumes.

## Architecture

```mermaid
flowchart TD
    A[DOM / HTMLElement tree] -->|getAreaEl, getAreaData| B[AreaData + areaEl]
    B -->|buildContainers| C[Container[] - flat sorted list]
    C -->|splitContainersByPages| D["Container[][] (containersByPages)"]
    D -->|redrawContainers per page| E[Rendered PDF pages]

    subgraph splitContainersByPages
        S1[Iterate containers in Y-order]
        S2{Container fits current page?}
        S3[Assign to current page]
        S4{Any items fit on current page?}
        S5[Move entire container to next page]
        S6[Split: keep fitting items on current page]
        S7[Create continuation with remaining items]
        S8[fixBoundsOverlapping on continuation items]
        S9[calculateContainerHeight on continuation]
        S10{Continuation fits next page?}

        S1 --> S2
        S2 -->|Yes| S3
        S2 -->|No| S4
        S4 -->|No items fit| S5
        S5 --> S10
        S4 -->|At least 1 item fits| S6
        S6 --> S7
        S7 --> S8
        S8 --> S9
        S9 --> S10
        S10 -->|Fits| S3
        S10 -->|Exceeds| S4
    end
```

### Data Flow

1. `execute()` calls `buildContainers(areaEl, areaData)` → produces `Container[]` sorted by Y, then X.
2. `splitContainersByPages(containers, areaData)` iterates the sorted containers, assigning or splitting each into `containersByPages`.
3. For each page in `containersByPages`, `redrawContainers` applies positions/sizes to the DOM.

## Components and Interfaces

### `splitContainersByPages`

```typescript
function splitContainersByPages(
  containers: Container[],
  areaData: AreaData,
): Container[][];
```

**Inputs:**
- `containers` — Array of containers from `buildContainers`, each with absolute Y positions and items with container-relative Y positions.
- `areaData` — Layout config including `containerTitleHeight` and `containersGap`.

**Output:**
- `Container[][]` — Outer array indexed by page number (0-based). Each inner array contains the containers assigned to that page, ordered by Y then X.

**Algorithm (iterative with inner loop for splits):**

```
for each container in containers (sorted by Y, then X):
    pageIndex = determine page from container.position.y
    pageBoundary = (pageIndex + 1) * PAGE_CONTENT_HEIGHT

    if container fits entirely on pageIndex:
        assign container to containersByPages[pageIndex]
    else:
        availableSpace = pageBoundary - container.position.y - containerTitleHeight
        fittingItems = items where (item.y + item.height <= availableSpace)

        if fittingItems is empty:
            // Minimum item fit rule
            if first item cannot fit on ANY page (item too tall):
                place container as-is on current page
            else:
                move container to next page (adjust Y)
                re-evaluate from top of loop for this container
        else:
            // Split
            currentPart = container with fittingItems (keep original Y)
            recalculate currentPart height
            assign currentPart to containersByPages[pageIndex]

            remainingItems = items not in fittingItems
            adjust remainingItems Y positions (subtract split offset)
            repositioned = fixBoundsOverlapping(remainingItems, undefined, true)
            nextPartHeight = calculateContainerHeight(repositioned, titleHeight, gap)
            nextPart = new container at Y = next page top, with repositioned items

            // Recurse: nextPart may itself need splitting
            continue splitting nextPart across subsequent pages
```

### `splitContainer` (internal helper)

```typescript
function splitContainer(
  container: Container,
  pageIndex: number,
  areaData: AreaData,
): { parts: Array<{ pageIndex: number; container: Container }> };
```

Handles the recursive splitting of a single container across as many pages as needed. Returns an array of `(pageIndex, containerPart)` tuples.

### Existing Functions Used

| Function | Source | Role in splitting |
|----------|--------|-------------------|
| `buildContainers(areaEl, areaData)` | `src/script.ts` | Produces input containers with measured positions/sizes |
| `fixBoundsOverlapping(items, fixedItemId, magnetToTop)` | `src/utils/layout.ts` | Compacts items toward top on continuation pages |
| `calculateContainerHeight(items, titleHeight, gap)` | `src/script.ts` | Recalculates height after split |

## Data Models

### Core Types (existing in `src/types.ts`)

```typescript
type Position = { x: number; y: number };
type Size = { height: number; width: number };
type Bounds = { position: Position; size: Size };

type Item = {
  id: string;
  position: Position;  // Relative to container content area (Y=0 is below header)
  size: Size;
};

type Container = {
  id: string;
  items: Item[];
  position: Position;  // Absolute position on the full-height virtual canvas
  size: Size;
  title: string;
};
```

### Configuration

```typescript
type AreaData = {
  cellSize: Size;
  containerBorderSize: number;
  containersGap: number;
  containerTitleHeight: number;
  itemsGap: number;
};

const PAGE_CONTENT_HEIGHT = 1428; // pixels
```

### Output Structure

```typescript
type ContainersByPages = Container[][];
// containersByPages[pageIndex] = containers on that page
// Each container has items with positions relative to its own content area
// Container.position.y is absolute (pageIndex * PAGE_CONTENT_HEIGHT + offset)
//   OR relative to page top depending on rendering approach
```

### Key Spatial Relationships

- **Page boundary**: `(pageIndex + 1) * PAGE_CONTENT_HEIGHT`
- **Container bottom edge**: `container.position.y + container.size.height`
- **Available space for items on current page**: `pageBoundary - container.position.y - containerTitleHeight`
- **Item fits**: `item.position.y + item.size.height <= availableSpace`
- **Continuation Y**: `nextPageIndex * PAGE_CONTENT_HEIGHT` (top of next page)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Item Conservation

*For any* set of containers, the total number of items across all pages in `containersByPages` SHALL equal the total number of items in the input containers. No items are lost or duplicated during the splitting process.

**Validates: Requirements 2.2, 2.3**

### Property 2: All Items Fit Within Page Bounds

*For any* container on any page in `containersByPages`, every item in that container SHALL satisfy: `item.position.y + item.size.height <= (pageBoundary - container.position.y - containerTitleHeight)`, where `pageBoundary = (pageIndex + 1) * PAGE_CONTENT_HEIGHT`. That is, no item extends beyond the bottom of its assigned page.

**Validates: Requirements 1.2, 2.2, 4.1, 4.2**

### Property 3: Container Identity Preservation

*For any* container that is split across pages, all resulting parts SHALL preserve the original container's `id`, `title`, `width`, and `x` position.

**Validates: Requirements 2.3, 6.2**

### Property 4: Continuation Container Height Consistency

*For any* continuation container part (on pages after the container's starting page), the container's `size.height` SHALL equal `calculateContainerHeight(items, containerTitleHeight, containersGap)` computed from the part's assigned items.

**Validates: Requirements 5.3, 6.1**

### Property 5: Page Ordering Invariant

*For any* page in `containersByPages`, the containers SHALL be ordered by ascending Y position; if two containers share the same Y position, they SHALL be ordered by ascending X position.

**Validates: Requirements 7.2, 7.4**

### Property 6: No Overlaps on Continuation Pages

*For any* continuation container part, the items within it SHALL have no vertical overlaps — that is, for any two items A and B that share horizontal extent, their vertical extents do not intersect.

**Validates: Requirements 5.1, 5.2**

### Property 7: Single-Page Correctness

*For any* set of containers where every container's `position.y + size.height <= PAGE_CONTENT_HEIGHT`, the output `containersByPages` SHALL have exactly one element containing all input containers (unsplit).

**Validates: Requirements 1.3**

### Property 8: Minimum Item Fit Rule

*For any* container that must be split, if no item fits on the current page alongside the header (every item's `y + height > availableSpace`), and the smallest item CAN fit on a full page (item height ≤ `PAGE_CONTENT_HEIGHT - containerTitleHeight`), then the container SHALL be moved to the next page rather than placed with only a header.

**Validates: Requirements 3.1, 3.2**

## Error Handling

### Invalid Inputs

| Condition | Handling |
|-----------|----------|
| Empty container array | Return `[]` (zero-length `containersByPages`) |
| Container with zero items crossing boundary | Move to next page without splitting (no split needed for empty containers) |
| Item taller than `PAGE_CONTENT_HEIGHT - containerTitleHeight` | Place on current page with header and oversized item; do not loop infinitely |
| Negative positions or sizes | Not expected from `buildContainers`; treat as zero if encountered |

### Termination Guarantee

The algorithm must terminate for all inputs. Termination is guaranteed because:
1. Each iteration either assigns a container/part to a page or moves it to the next page.
2. The "move to next page" case repositions the container to the top of a fresh page, giving maximum available space.
3. If an item is too tall for any page, the oversized-item escape hatch (Requirement 3.3) prevents infinite movement.
4. The number of pages is bounded by `ceil(totalContentHeight / PAGE_CONTENT_HEIGHT)`.

### Edge Cases

- **Container exactly at page boundary**: `container.y + container.height === pageBoundary` → fits on current page (≤ comparison).
- **Item exactly fills remaining space**: `item.y + item.height === availableSpace` → item fits (≤ comparison).
- **Container starts exactly at page top**: `container.y === pageIndex * PAGE_CONTENT_HEIGHT` → assigned to that page.
- **Single item per container**: Split produces one-item parts (or moves if the item doesn't fit).

## Testing Strategy

### Dual Testing Approach

**Unit tests** (example-based):
- Verify empty input returns `[]`
- Verify single container fitting on one page
- Verify two containers on separate pages (no split needed)
- Verify a container split across exactly two pages
- Verify a container split across three pages
- Verify the oversized-item edge case
- Verify the minimum-item-fit rule triggers correctly
- Verify container with zero items is moved (not split)

**Property-based tests** (universal properties):
- Use `fast-check` as the PBT library for JavaScript/TypeScript
- Minimum 100 iterations per property test
- Generate random containers with varying positions, sizes, and item counts
- Test the `splitContainersByPages` function in isolation (pure function, no DOM)

### Property Test Configuration

- Library: `fast-check` (npm package)
- Iterations: minimum 100 per property
- Tag format: **Feature: pdf-page-splitting, Property {number}: {property_text}**

### Test Structure

```
src/
  __tests__/
    splitContainersByPages.test.ts       # Unit tests
    splitContainersByPages.property.ts   # Property-based tests
```

### Generators for PBT

The property tests will use custom `fast-check` arbitraries:
- `arbItem()` — generates an Item with random id, position (y ≥ 0), and size (positive height/width)
- `arbContainer(items?)` — generates a Container with random id, title, position, size, and items
- `arbContainerSet()` — generates an array of containers with positions spanning 0 to N pages

### What Each Property Test Validates

| Property | What it catches |
|----------|----------------|
| 1: Item Conservation | Items accidentally dropped or duplicated during split |
| 2: Items Fit Within Bounds | Off-by-one errors in boundary calculations |
| 3: Identity Preservation | Field mutations during splitting |
| 4: Height Consistency | Incorrect height recalculation after repositioning |
| 5: Page Ordering | Sort bugs in output assembly |
| 6: No Overlaps | fixBoundsOverlapping not called or called incorrectly |
| 7: Single-Page Correctness | Unnecessary splitting of small content |
| 8: Minimum Item Fit | Header-only pages wasting space |

