import { Position, Size } from './types.ts';
import { fixBoundsOverlapping } from './utils/layout.ts';

type RoBoxDescription = {
  getBorderRect: (
    unit?: string,
  ) => { x: number; y: number; width: number; height: number } | null;
};

declare let ro: {
  layout: {
    getBoxDescriptions: (element: Element) => RoBoxDescription[];
    forceRelayout: () => void;
  };
};

type Container = {
  el: HTMLElement;
  id: string;
  items: Item[];
  position: Position;
  size: Size;
};

type Item = {
  el: HTMLElement;
  id: string;
  position: Position;
  size: Size;
};

type AreaData = {
  cellSize: Size;
  containerBorderSize: number;
  containersGap: number;
  containerTitleHeight: number;
  itemsGap: number;
};

// A4 at 144 PPI: 297mm total, 25mm top margin, 20mm bottom margin
// Available content height = (297 - 25 - 20)mm * (144 / 25.4) px/mm ≈ 1428px
const PAGE_CONTENT_HEIGHT = 1428;

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

const calculateContainerHeight = (
  items: Item[],
  titleHeight: number,
  containersGap: number,
): number => {
  const maxBottom = Math.max(
    ...items.map((item) => item.position.y + item.size.height),
    1,
  );
  return maxBottom + titleHeight + containersGap;
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
  redrawContainers(containers, areaData);
};
