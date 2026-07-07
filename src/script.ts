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
};

// A4 at 144 PPI: 297mm total, 25mm top margin, 20mm bottom margin
// Available content height = (297 - 25 - 20)mm * (144 / 25.4) px/mm ≈ 1428px
export const PAGE_CONTENT_HEIGHT = 1428;

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
  if (containers.length === 0) {
    return [];
  }

  const { containerTitleHeight, containersGap } = areaData;
  const fullPageItemSpace = PAGE_CONTENT_HEIGHT - containerTitleHeight;

  // Sort containers by Y then X (processing order from original layout)
  const sorted = [...containers].sort((a, b) => {
    if (a.position.y !== b.position.y) return a.position.y - b.position.y;
    return a.position.x - b.position.x;
  });

  // Pages store containers with page-relative Y positions (0 = top of page)
  const pages: PureContainer[][] = [[]];

  /**
   * Compute the Y position a container would get on a page after fixBoundsOverlapping.
   */
  const computePositionOnPage = (page: PureContainer[], container: PureContainer): PureContainer[] => {
    const candidate = { ...container, position: { x: container.position.x, y: 0 } };
    return fixBoundsOverlapping([...page, candidate], undefined, true);
  };

  /**
   * Check if a container can be placed on a page. A container "fits" if:
   * - It fits entirely (bottom <= PAGE_CONTENT_HEIGHT), OR
   * - It doesn't horizontally overlap with any existing container on the page
   *   (so it gets y=0 and doesn't push anything down — it's independent/oversized but OK)
   */
  const fitsOnPage = (page: PureContainer[], container: PureContainer): boolean => {
    if (page.length === 0) return true;

    const repositioned = computePositionOnPage(page, container);
    const placed = repositioned[repositioned.length - 1];

    // If it fits within page height — always OK
    if (placed.position.y + placed.size.height <= PAGE_CONTENT_HEIGHT) {
      return true;
    }

    // If it's oversized but positioned at y=0 (no horizontal conflicts with others),
    // it can coexist on this page without pushing anyone down
    if (placed.position.y === 0) {
      return true;
    }

    return false;
  };

  /**
   * Place a container on the earliest page where it fits, or split it.
   */
  const placeContainer = (container: PureContainer): void => {
    // 1. Try to fit entirely on any existing page
    for (let i = 0; i < pages.length; i++) {
      if (fitsOnPage(pages[i], container)) {
        pages[i] = computePositionOnPage(pages[i], container);
        return;
      }
    }

    // 2. Doesn't fit anywhere — try splitting on each page (prefer earliest)
    for (let i = 0; i < pages.length; i++) {
      const repositioned = computePositionOnPage(pages[i], container);
      const placed = repositioned[repositioned.length - 1];
      const containerY = placed.position.y;
      const availableForItems = PAGE_CONTENT_HEIGHT - containerY - containerTitleHeight;

      // Skip if no space for even the header
      if (availableForItems <= 0) continue;

      // Determine which items fit
      const sortedItems = [...container.items].sort((a, b) => a.position.y - b.position.y);
      const fitting = sortedItems.filter(item => item.position.y + item.size.height <= availableForItems);
      const remaining = sortedItems.filter(item => item.position.y + item.size.height > availableForItems);

      // Only split if: there are fitting items AND transferring remaining gives more space
      if (fitting.length > 0 && remaining.length > 0 && availableForItems < fullPageItemSpace) {
        // Split: place fitting items on this page
        const partHeight = calculateContainerHeight(fitting, containerTitleHeight, containersGap);
        const currentPart: PureContainer = {
          ...container,
          items: fitting,
          position: { x: container.position.x, y: containerY },
          size: { ...container.size, height: partHeight },
        };
        pages[i] = [...repositioned.slice(0, -1), currentPart];

        // Create continuation with remaining items repositioned to top
        const adjusted = remaining.map(item => ({
          ...item,
          position: { ...item.position, y: item.position.y - availableForItems },
          size: { ...item.size },
        }));
        const repoItems = fixBoundsOverlapping(adjusted, undefined, true);
        const contHeight = calculateContainerHeight(repoItems, containerTitleHeight, containersGap);
        const continuation: PureContainer = {
          ...container,
          items: repoItems,
          position: { x: container.position.x, y: 0 },
          size: { ...container.size, height: contHeight },
        };

        // Place continuation recursively (it may fit on an existing page or need further splitting)
        placeContainer(continuation);
        return;
      }
    }

    // 3. Can't split usefully — place as-is on a new page (oversized case)
    pages.push([{ ...container, position: { x: container.position.x, y: 0 } }]);
  };

  // Process each container
  for (const container of sorted) {
    placeContainer(container);
  }

  // Convert page-relative positions to absolute and remove empty pages
  return pages
    .filter(page => page.length > 0)
    .map((page, pageIdx) => {
      const pageTop = pageIdx * PAGE_CONTENT_HEIGHT;
      return page.map(c => ({
        ...c,
        position: { ...c.position, y: c.position.y + pageTop },
      }));
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

const px = (value: number) => {
  return `${value}px`;
};

const redrawContainers = (containers: Container[], areaData: AreaData) => {
  containers.forEach((container) => {
    container.el.style.transform = `translate(${px(container.position.x)}, ${px(container.position.y)})`;
    container.el.style.height = px(container.size.height);
    container.el.style.width = px(container.size.width);

    const containerContentEl = container.el.querySelector(
      '[data-pdf-container-content]',
    ) as HTMLElement;
    const containerContentHeight =
      container.size.height - areaData.containersGap;
    containerContentEl.style.height = px(containerContentHeight);
    const containerTileContentEl = containerContentEl.querySelector(
      '[data-pdf-container-tile-content]',
    ) as HTMLElement;
    containerTileContentEl.style.height = px(containerContentHeight);

    container.items.forEach((item) => {
      item.el.style.transform = `translate(${px(item.position.x)}, ${px(item.position.y)})`;
      item.el.style.height = px(item.size.height);
      item.el.style.width = px(item.size.width);
    });
  });
};

export const execute = () => {
  const areaEl = getAreaEl();
  if (!areaEl) {
    return;
  }
  const areaData = getAreaData(areaEl);
  const containers = buildContainers(areaEl, areaData);

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
  const containersByPages = splitContainersByPages(pureContainers, areaData);

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
    redrawContainers(domContainers, areaData);
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
