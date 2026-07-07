# Requirements Document

## Introduction

This feature implements page-splitting logic for PDF generation in a D&D application. The script runs on a PDF server and must correctly distribute containers (with their items) across multiple pages of fixed height. Containers that exceed the remaining space on a page are split, with their header duplicated and items distributed across consecutive pages. After splitting, items on subsequent pages are repositioned using the `fixBoundsOverlapping` function with `magnetToTop=true`.

## Glossary

- **Page_Splitter**: The logic within `src/script.ts` responsible for distributing containers across pages based on available height.
- **Container**: A data structure representing a visual group with an ID, title, position, size, and a list of items. Obtained from `buildContainers()`.
- **Item**: A data structure within a Container representing an individual visual element with an ID, position, and size.
- **PAGE_CONTENT_HEIGHT**: A constant defining the maximum available content height (in pixels) for a single PDF page.
- **Container_Header**: The title area at the top of a container, with a fixed height defined by `containerTitleHeight` in `AreaData`.
- **containersByPages**: The output array where each element is an array of containers (with their items) that fit on that page.
- **fixBoundsOverlapping**: A function from `src/utils/layout.ts` that resolves vertical overlapping between items, optionally pulling items toward the top.
- **AreaData**: Configuration object containing layout measurements: `cellSize`, `containerBorderSize`, `containersGap`, `containerTitleHeight`, and `itemsGap`.

## Requirements

### Requirement 1: Page Distribution of Containers

**User Story:** As a PDF server, I want to distribute containers across pages by their vertical position and height, so that each page contains only content that fits within the page height limit.

#### Acceptance Criteria

1. WHEN the `execute` function is called, THE Page_Splitter SHALL produce a `containersByPages` array where each element represents the containers obtained from `buildContainers()` assigned to one page.
2. WHEN a container's Y position plus its height is less than or equal to the current page's content boundary ((page index + 1) × PAGE_CONTENT_HEIGHT), THE Page_Splitter SHALL assign that container to the current page (zero-based page index).
3. WHEN all containers fit within a single page (every container's Y position plus its height does not exceed PAGE_CONTENT_HEIGHT), THE Page_Splitter SHALL produce a `containersByPages` array with exactly one element containing all containers.
4. WHEN a container's Y position is greater than or equal to (page index + 1) × PAGE_CONTENT_HEIGHT, THE Page_Splitter SHALL assign that container to the next page whose content boundary accommodates the container's Y position.

### Requirement 2: Container Splitting When Exceeding Page Boundary

**User Story:** As a PDF server, I want containers that exceed the current page boundary to be split across pages, so that content is distributed without cutting off items mid-page.

#### Acceptance Criteria

1. WHEN a container's Y position plus its height exceeds the current page's content boundary (defined as (pageIndex + 1) × PAGE_CONTENT_HEIGHT), THE Page_Splitter SHALL split the container into multiple parts across consecutive pages.
2. WHEN a container is split, THE Page_Splitter SHALL retain the Container_Header and only those items whose vertical extent (item Y position relative to container content area plus item height) does not exceed the remaining page space below the Container_Header on the current page, evaluated in ascending order of item Y position.
3. WHEN a container is split, THE Page_Splitter SHALL create a continuation part on the next page that includes the Container_Header and all items that did not fit on the previous page, preserving the container's ID, title, width, and X position.
4. WHEN a container requires more than two pages to display all items, THE Page_Splitter SHALL continue splitting the container across additional pages, each part including its own Container_Header with available item space reduced by the Container_Header height on each continuation page.
5. IF a container contains zero items and exceeds the current page's content boundary, THEN THE Page_Splitter SHALL move the container to the next page without splitting.

### Requirement 3: Minimum Item Fit Rule

**User Story:** As a PDF server, I want to ensure that at least one item fits on the current page alongside the container header, so that pages are not wasted with header-only containers.

#### Acceptance Criteria

1. WHEN a container must be split and no item fits on the current page (i.e., every item's Y position plus its height exceeds the remaining page height minus the Container_Header height), THE Page_Splitter SHALL move the entire container (including all its items unchanged) to the next page.
2. WHEN a container is moved to the next page, THE Page_Splitter SHALL set the container's Y position to the top of the next page's content area and re-evaluate whether the container fits or requires splitting using the same distribution rules from Requirement 2.
3. IF a container contains an item whose height exceeds PAGE_CONTENT_HEIGHT minus the Container_Header height (meaning the item cannot fit on any page alongside the header), THEN THE Page_Splitter SHALL place the container on the current page with the Container_Header and that oversized item, without entering repeated move attempts.

### Requirement 4: Item Fitting Determination

**User Story:** As a PDF server, I want to determine which items fit on the current page by comparing each item's vertical extent against the remaining page space, so that items are not cut off.

#### Acceptance Criteria

1. WHEN evaluating whether an item fits on the current page, THE Page_Splitter SHALL determine that the item fits IF the item's Y position plus the item's height is less than or equal to the available content space on the current page below the Container_Header.
2. THE Page_Splitter SHALL calculate the available content space on the current page as: (page boundary minus the container's Y position on the current page) minus the Container_Header height, where page boundary equals (pageIndex + 1) × PAGE_CONTENT_HEIGHT and Container_Header height equals `containerTitleHeight` from AreaData.
3. THE Page_Splitter SHALL treat item Y positions as relative to the container content area (where Y=0 corresponds to the top edge immediately below the Container_Header).
4. WHEN evaluating items for fitting on the current page, THE Page_Splitter SHALL process items in ascending order of their Y position.

### Requirement 5: Repositioning Items After Split

**User Story:** As a PDF server, I want items moved to the next page to be repositioned using `fixBoundsOverlapping` with `magnetToTop=true`, so that items on the new page are compacted toward the top without overlapping.

#### Acceptance Criteria

1. WHEN a part of a container is moved to the next page, THE Page_Splitter SHALL adjust each item's Y position to be relative to the new container's content area (subtracting the offset of the split boundary) before repositioning.
2. WHEN items in a next-page container part have been adjusted to container-relative positions, THE Page_Splitter SHALL pass all items in that part through the `fixBoundsOverlapping` function with `magnetToTop` set to `true` and `fixedItemId` set to `undefined`.
3. WHEN the `fixBoundsOverlapping` function returns repositioned items, THE Page_Splitter SHALL recalculate the container height for the new page part using the `calculateContainerHeight` function with the repositioned items, `containerTitleHeight`, and `containersGap` from `AreaData`.

### Requirement 6: Container Height Recalculation After Split

**User Story:** As a PDF server, I want split container parts to have their height recalculated based on contained items, so that page layout is accurate.

#### Acceptance Criteria

1. WHEN a container is split and items in a part have been repositioned by `fixBoundsOverlapping`, THE Page_Splitter SHALL recalculate the height of that container part by calling `calculateContainerHeight` with the part's assigned items, the `containerTitleHeight` from AreaData, and the `containersGap` from AreaData.
2. THE Page_Splitter SHALL preserve the original container's width and X position in all split parts.
3. THE Page_Splitter SHALL retain the original Y position for the first part of a split container on the page where the container started.
4. WHEN a container part is placed on a subsequent page (not the page where the container originally started), THE Page_Splitter SHALL set the Y position of that container part to the top of that page's content area (page index × PAGE_CONTENT_HEIGHT).

### Requirement 7: Output Structure

**User Story:** As a PDF rendering engine, I want to receive a structured array of pages with their containers, so that I can render each page independently.

#### Acceptance Criteria

1. THE Page_Splitter SHALL produce `containersByPages` as an array of arrays, where the outer array is indexed by page number (zero-based) and each inner array contains the containers for that page, each container including its id, title, position, size, and items.
2. THE Page_Splitter SHALL order containers within each page by ascending Y position; IF two containers share the same Y position, THEN THE Page_Splitter SHALL order them by ascending X position.
3. WHEN no containers exist, THE Page_Splitter SHALL produce a zero-length `containersByPages` array (`[]`).
4. WHEN a container is split across pages, THE Page_Splitter SHALL place each split part in its respective page's inner array and order it among the other containers on that page by its assigned Y position.
