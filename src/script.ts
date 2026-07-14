import { Position, Size, Container as PureContainer } from './types.ts';
import { fixBoundsOverlapping } from './utils/layout.ts';

type Container = {
  el: HTMLElement;
  id: string;
  items: Item[];
  position: Position;
  size: Size;
  title: string;
};

type Item = {
  el: HTMLElement;
  id: string;
  position: Position;
  size: Size;
};

export type AreaData = {
  cellSize: Size;
  containerBorderSize: number;
  containersGap: number;
  containerTitleHeight: number;
  itemsGap: number;
  zoom: number;
};

// A4 at 144 PPI: 297mm total, 25mm top margin, 20mm bottom margin
// Available content height = (297 - 25 - 20)mm * (144 / 25.4) px/mm ≈ 1428px
export const PAGE_CONTENT_HEIGHT = 400;

const measureElementPosition = (element: Element): Position => {
  return {
    x: +(element.getAttribute('data-pdf-x') || 0),
    y: +(element.getAttribute('data-pdf-y') || 0),
  };
};

const measureElementSize = (element: Element): Size | null => {
  return {
    height: +(element.getAttribute('data-pdf-height') || 0),
    width: +(element.getAttribute('data-pdf-width') || 0),
  };
};

const getAreaEl = (): HTMLElement => {
  const doc = document.getElementById('PDF');
  return doc.querySelector('[data-pdf-area]') as HTMLElement;
};

const getAreaData = (areaEl: HTMLElement): AreaData => {
  const cellSize = {
    height: +(areaEl.getAttribute('data-pdf-cell-height') || 0),
    width: +(areaEl.getAttribute('data-pdf-cell-width') || 0),
  };
  const areaData = {
    cellSize,
    containerBorderSize: +(
      areaEl.getAttribute('data-pdf-container-border-size') || 0
    ),
    containersGap: +(areaEl.getAttribute('data-pdf-containers-gap') || 0),
    containerTitleHeight: +(
      areaEl.getAttribute('data-pdf-container-title-height') || 0
    ),
    itemsGap: +(areaEl.getAttribute('data-pdf-items-gap') || 0),
    zoom: +(areaEl.getAttribute('data-pdf-zoom') || 0),
  };
  return areaData;
};

export const calculateContainerHeight = (
  items: Pick<Item, 'position' | 'size'>[],
  titleHeight: number,
  containersGap: number,
): number => {
  const maxBottom = Math.max(
    ...items.map((item) => item.position.y + item.size.height),
    1,
  );
  return maxBottom + titleHeight + containersGap;
};

export const splitContainersByPages = (
  containers: PureContainer[],
  areaData: AreaData,
): PureContainer[][] => {
  if (containers.length === 0) return [];

  const { containerTitleHeight, containersGap } = areaData;
  const fullPageItemSpace = PAGE_CONTENT_HEIGHT - containerTitleHeight;

  // Sort containers by original Y then X
  const sorted = [...containers].sort((a, b) =>
    a.position.y !== b.position.y ? a.position.y - b.position.y : a.position.x - b.position.x,
  );

  // Pages store containers with page-relative Y positions
  const pages: PureContainer[][] = [];

  // Helpers
  const horizontalOverlap = (a: PureContainer, b: PureContainer): boolean =>
    a.position.x < b.position.x + b.size.width && a.position.x + a.size.width > b.position.x;

  const findYOnPage = (page: PureContainer[], container: PureContainer): number => {
    let y = 0;
    for (const existing of page) {
      if (horizontalOverlap(container, existing)) {
        y = Math.max(y, existing.position.y + existing.size.height);
      }
    }
    return y;
  };

  /**
   * Split a container's items into what stays on current page and what transfers.
   * Returns null if no useful split is possible.
   */
  const splitItems = (
    container: PureContainer,
    availableForItems: number,
    isAtPageTop: boolean,
  ): { stay: typeof container.items; transfer: typeof container.items } | null => {
    const sortedItems = [...container.items].sort((a, b) => a.position.y - b.position.y);

    if (isAtPageTop) {
      // At page top — items at y=0 that are oversized stay (no benefit from moving).
      // Items at y>0 that don't fit should transfer (on next page they start at y=0, more visible).
      // Items that fit entirely always stay.
      const stay = sortedItems.filter(it => {
        if (it.position.y + it.size.height <= availableForItems) return true; // fits entirely
        if (it.position.y === 0) return true; // oversized but at top — no benefit from moving
        return false; // doesn't fit and not at top — transfer
      });
      const transfer = sortedItems.filter(it => {
        if (it.position.y + it.size.height <= availableForItems) return false;
        if (it.position.y === 0) return false;
        return true;
      });

      if (stay.length > 0 && transfer.length > 0) {
        return { stay, transfer };
      }

      // Fallback: items starting beyond available space
      const stayByStart = sortedItems.filter(it => it.position.y < availableForItems);
      const transferByStart = sortedItems.filter(it => it.position.y >= availableForItems);
      if (stayByStart.length > 0 && transferByStart.length > 0) {
        return { stay: stayByStart, transfer: transferByStart };
      }

      return null; // can't split usefully
    }

    // When NOT at page top, use bottom-edge split:
    const fitting = sortedItems.filter(it => it.position.y + it.size.height <= availableForItems);
    const remaining = sortedItems.filter(it => it.position.y + it.size.height > availableForItems);

    if (fitting.length > 0 && remaining.length > 0) {
      return { stay: fitting, transfer: remaining };
    }

    return null;
  };

  /**
   * Place a container (possibly splitting it) starting from minPage.
   */
  const placeContainer = (container: PureContainer, minPage: number): void => {
    // Ensure enough pages exist
    while (pages.length <= minPage) pages.push([]);

    // Try each page from minPage onward
    for (let pageIdx = minPage; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      const y = findYOnPage(page, container);

      // Case 1: fits entirely
      if (y + container.size.height <= PAGE_CONTENT_HEIGHT) {
        page.push({ ...container, position: { x: container.position.x, y } });
        return;
      }

      // Case 2: doesn't fit — try to split
      const availableForItems = PAGE_CONTENT_HEIGHT - y - containerTitleHeight;

      // No room for even header — skip this page
      if (availableForItems <= 0) continue;

      // Check if split is useful: only if next page would give more space
      // OR container genuinely exceeds page from current position
      const isAtPageTop = y === 0;
      const containerExceedsPage = y + container.size.height > PAGE_CONTENT_HEIGHT;
      const nextPageBetter = availableForItems < fullPageItemSpace;

      if (!containerExceedsPage) continue;

      // If at page top and next page won't give more space — place as-is (oversized)
      if (isAtPageTop && !nextPageBetter) {
        // Still try to split items that start below available space
        const split = splitItems(container, availableForItems, true);
        if (split) {
          const partHeight = calculateContainerHeight(split.stay, containerTitleHeight, containersGap);
          page.push({
            ...container,
            items: split.stay,
            position: { x: container.position.x, y },
            size: { ...container.size, height: partHeight },
          });
          // Reposition transferred items
          const adjusted = split.transfer.map(it => ({
            ...it,
            position: { ...it.position, y: it.position.y - availableForItems },
            size: { ...it.size },
          }));
          const repoItems = fixBoundsOverlapping(adjusted, undefined, true);
          const contHeight = calculateContainerHeight(repoItems, containerTitleHeight, containersGap);
          placeContainer(
            { ...container, items: repoItems, position: { x: container.position.x, y: 0 }, size: { ...container.size, height: contHeight } },
            pageIdx + 1,
          );
          return;
        }
        // Truly can't split — place as-is
        page.push({ ...container, position: { x: container.position.x, y } });
        return;
      }

      // Not at page top OR next page gives more space — try split
      const split = splitItems(container, availableForItems, isAtPageTop);
      if (split) {
        const partHeight = calculateContainerHeight(split.stay, containerTitleHeight, containersGap);
        page.push({
          ...container,
          items: split.stay,
          position: { x: container.position.x, y },
          size: { ...container.size, height: partHeight },
        });
        const adjusted = split.transfer.map(it => ({
          ...it,
          position: { ...it.position, y: it.position.y - availableForItems },
          size: { ...it.size },
        }));
        const repoItems = fixBoundsOverlapping(adjusted, undefined, true);
        const contHeight = calculateContainerHeight(repoItems, containerTitleHeight, containersGap);
        placeContainer(
          { ...container, items: repoItems, position: { x: container.position.x, y: 0 }, size: { ...container.size, height: contHeight } },
          pageIdx + 1,
        );
        return;
      }

      // Can't split on this page — continue to next page
      continue;
    }

    // No existing page works — create new page and recurse
    pages.push([]);
    placeContainer(container, pages.length - 1);
  };

  // Track page assignments for ordering (containers must respect original Y-order
  // among those that horizontally overlap)
  const containerLastPage: number[] = [];

  for (let ci = 0; ci < sorted.length; ci++) {
    const container = sorted[ci];

    // Determine minimum page based on earlier containers with horizontal overlap
    // Must be >= the LAST page of any earlier overlapping container (not just the first)
    let minPage = 0;
    for (let prev = 0; prev < ci; prev++) {
      if (horizontalOverlap(container, sorted[prev])) {
        minPage = Math.max(minPage, containerLastPage[prev]);
      }
    }

    placeContainer(container, minPage);

    // Record the LAST page this container appears on (for split containers)
    let lastPage = 0;
    for (let p = pages.length - 1; p >= 0; p--) {
      if (pages[p].some(c => c.id === container.id)) {
        lastPage = p;
        break;
      }
    }
    containerLastPage.push(lastPage);
  }

  // Convert page-relative positions to absolute, filter empty pages
  return pages
    .filter(page => page.length > 0)
    .map((page, pageIdx) => {
      const pageTop = pageIdx * PAGE_CONTENT_HEIGHT;
      return page.map(c => ({ ...c, position: { ...c.position, y: c.position.y + pageTop } }));
    });
};

const hasContainerTitle = (containerEl: HTMLElement): boolean => {
  return !!containerEl.querySelector('[data-pdf-container-title]');
};

const buildContainers = (
  areaEl: HTMLElement,
  areaData: AreaData,
): Container[] => {
  let containers: Container[] = [];
  const containerEls = areaEl.querySelectorAll(
    '[data-pdf-container]',
  ) as never as HTMLElement[];
  containerEls.forEach((containerEl) => {
    const containerId = containerEl.getAttribute('data-pdf-container');
    const itemEls = containerEl.querySelectorAll(
      '[data-pdf-item]',
    ) as never as HTMLElement[];
    let items: Item[] = [];
    itemEls.forEach((itemEl) => {
      const itemSize = measureElementSize(itemEl);
      const itemPosition = measureElementPosition(itemEl);
      const itemId = itemEl.getAttribute('data-pdf-item');
      items.push({
        el: itemEl,
        id: itemId || '',
        position: itemPosition,
        size: itemSize || {
          height: 0,
          width: 0,
        },
      });
    });
    items = fixBoundsOverlapping(items, undefined, false);
    const containerPosition = measureElementPosition(containerEl);
    const measuredContainerSize = measureElementSize(containerEl);
    const hasTitle = hasContainerTitle(containerEl);
    const titleEl = containerEl.querySelector('[data-pdf-container-title]');
    const containerTitle = titleEl?.textContent || '';
    const containerSize = {
      height: calculateContainerHeight(
        items,
        hasTitle ? areaData.containerTitleHeight : 0,
        areaData.containersGap,
      ),
      width: measuredContainerSize?.width || 0,
    };

    containers.push({
      el: containerEl,
      id: containerId || '',
      items,
      position: containerPosition,
      size: containerSize,
      title: containerTitle,
    });
  });

  containers = fixBoundsOverlapping(containers, undefined, true);

  return containers;
};

const zoomContainers = (containers: Container[], zoom: number): Container[] => {
  return containers.map((container) => ({
    ...container,
    items: container.items.map((item) => ({
      ...item,
      position: { x: item.position.x * zoom, y: item.position.y * zoom },
      size: { height: item.size.height * zoom, width: item.size.width * zoom },
    })),
    position: { x: container.position.x * zoom, y: container.position.y * zoom },
    size: { height: container.size.height * zoom, width: container.size.width * zoom },
  }));
};

const zoomAreaData = (areaData: AreaData): AreaData => {
  const { zoom } = areaData;
  return {
    ...areaData,
    containerTitleHeight: areaData.containerTitleHeight * zoom,
    containersGap: areaData.containersGap * zoom,
  };
};

const px = (value: number) => {
  return `${value}px`;
};

const redrawContainers = (containers: Container[], areaData: AreaData) => {
  const { zoom } = areaData;
  containers.forEach((container) => {
    container.el.style.transform = `translate(${px(container.position.x)}, ${px(container.position.y)})`;
    container.el.style.height = px(container.size.height);
    container.el.style.width = px(container.size.width);

    const containerContentEl = container.el.querySelector(
      '[data-pdf-container-content]',
    ) as HTMLElement;
    const containerContentHeight = container.size.height - areaData.containersGap;
    const containerContentWidth = container.size.width - areaData.containersGap;
    containerContentEl.style.height = px(containerContentHeight);
    containerContentEl.style.width = px(containerContentWidth);
    containerContentEl.style.margin = px(areaData.containersGap / 2);

    const containerTileContentEl = containerContentEl.querySelector(
      '[data-pdf-container-tile-content]',
    ) as HTMLElement;
    containerTileContentEl.style.height = px(containerContentHeight);
    containerTileContentEl.style.width = px(containerContentWidth - areaData.containerBorderSize * 2);

    // Apply scale to container title
    const titleEl = container.el.querySelector('[data-pdf-container-title]') as HTMLElement | null;
    if (titleEl) {
      titleEl.style.transform = `scale(${zoom})`;
      titleEl.style.transformOrigin = 'top left';
      titleEl.style.height = px(areaData.containerTitleHeight);
    }

    container.items.forEach((item) => {
      // Item element gets ORIGINAL (un-zoomed) dimensions; scale(zoom) visually reduces it
      const originalWidth = item.size.width / zoom;
      const originalHeight = item.size.height / zoom;
      item.el.style.transform = `translate(${px(item.position.x)}, ${px(item.position.y)}) scale(${zoom})`;
      item.el.style.transformOrigin = 'top left';
      item.el.style.height = px(originalHeight);
      item.el.style.width = px(originalWidth);
    });
  });
};

export const execute = () => {
  const areaEl = getAreaEl();
  if (!areaEl) {
    return;
  }
  const areaData = getAreaData(areaEl);
  const rawContainers = buildContainers(areaEl, areaData);
  const containers = zoomContainers(rawContainers, areaData.zoom);
  const zoomed = zoomAreaData(areaData);

  // Convert DOM-linked containers to pure data for splitting
  const pureContainers: PureContainer[] = containers.map((c) => ({
    id: c.id,
    items: c.items.map((item) => ({
      id: item.id,
      position: item.position,
      size: item.size,
    })),
    position: c.position,
    size: c.size,
    title: c.title,
  }));

  // Split containers across pages
  const containersByPages = splitContainersByPages(pureContainers, zoomed);

  // Build lookup maps from original DOM-linked containers/items by ID
  const containerElMap = new Map<string, HTMLElement>();
  const itemElMap = new Map<string, HTMLElement>();
  containers.forEach((c) => {
    containerElMap.set(c.id, c.el);
    c.items.forEach((item) => {
      itemElMap.set(item.id, item.el);
    });
  });

  // For each page, reconstruct DOM-linked containers and redraw
  // Track which container/item IDs have already been rendered (for split containers,
  // subsequent parts need cloned DOM elements)
  const renderedContainerIds = new Set<string>();

  // Remove all existing containers from areaEl (they'll be placed into page divs)
  containers.forEach((c) => {
    c.el.parentElement?.removeChild(c.el);
  });

  for (let pageIdx = 0; pageIdx < containersByPages.length; pageIdx++) {
    const pageContainers = containersByPages[pageIdx];

    // Create a page wrapper div
    const pageDiv = document.createElement('div');
    pageDiv.style.position = 'relative';
    pageDiv.style.height = px(PAGE_CONTENT_HEIGHT);
    pageDiv.style.width = '100%';
    pageDiv.style.overflow = 'hidden';
    pageDiv.setAttribute('data-pdf-page', String(pageIdx));
    areaEl.appendChild(pageDiv);

    const domContainers: Container[] = pageContainers.map((pc) => {
      let containerEl: HTMLElement;

      if (renderedContainerIds.has(pc.id)) {
        // This is a continuation part — clone the original DOM element
        const originalEl = containerElMap.get(pc.id)!;
        containerEl = originalEl.cloneNode(true) as HTMLElement;
      } else {
        containerEl = containerElMap.get(pc.id)!;
        renderedContainerIds.add(pc.id);
      }

      // Append container to the page div
      pageDiv.appendChild(containerEl);

      // Get all item elements in this container and build a map
      const itemEls = containerEl.querySelectorAll('[data-pdf-item]') as NodeListOf<HTMLElement>;
      const itemElsById = new Map<string, HTMLElement>();
      itemEls.forEach((el) => {
        const itemId = el.getAttribute('data-pdf-item') || '';
        itemElsById.set(itemId, el);
      });

      // Set of item IDs that belong to this part
      const partItemIds = new Set(pc.items.map((item) => item.id));

      // Hide items that don't belong to this part
      itemEls.forEach((el) => {
        const itemId = el.getAttribute('data-pdf-item') || '';
        if (!partItemIds.has(itemId)) {
          el.style.display = 'none';
        } else {
          el.style.display = '';
        }
      });

      // Adjust container position to be relative to page top (subtract page offset)
      const pageRelativeY = pc.position.y - pageIdx * PAGE_CONTENT_HEIGHT;

      const items = pc.items.map((item) => ({
        el: itemElsById.get(item.id)!,
        id: item.id,
        position: item.position,
        size: item.size,
      }));

      return {
        el: containerEl,
        id: pc.id,
        items,
        position: { ...pc.position, y: pageRelativeY },
        size: pc.size,
        title: pc.title,
      };
    });
    redrawContainers(domContainers, zoomed);
  }

  // Draw red page-break lines between pages
  if (containersByPages.length > 1) {
    for (let i = 1; i < containersByPages.length; i++) {
      const line = document.createElement('div');
      line.style.height = '2px';
      line.style.width = '100%';
      line.style.backgroundColor = 'red';
      line.style.pointerEvents = 'none';
      line.style.zIndex = '9999';
      line.setAttribute('data-pdf-page-break-line', String(i));
      // Insert before the i-th page div
      const pageDiv = areaEl.querySelector(`[data-pdf-page="${i}"]`);
      if (pageDiv) {
        areaEl.insertBefore(line, pageDiv);
      }
    }
  }
};
