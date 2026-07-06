import {
  Bounds,
  Size,
  Position,
} from '../types';

const checkOverlap = (a: Bounds, b: Bounds): boolean =>
  a.position.x < b.position.x + b.size.width &&
  a.position.x + a.size.width > b.position.x &&
  a.position.y < b.position.y + b.size.height &&
  a.position.y + a.size.height > b.position.y;

export const fixBoundsOverlapping = <
  T extends Bounds & {
    additionalHeight?: number;
    id: string;
  },
>(
  items: readonly T[],
  fixedItemId?: string,
  magnetToTop = true,
): T[] => {
  if (items.length === 0) {
    return [];
  }

  const result: T[] = items.map((item) => ({
    ...item,
    position: { ...item.position },
    size: { ...item.size },
  }));

  if (magnetToTop) {
    const origY = new Map(result.map((item) => [item.id, item.position.y]));

    const sortedByY = result
      .filter((item) => item.id !== fixedItemId)
      .sort((a, b) => a.position.y - b.position.y);

    for (const item of sortedByY) {
      const itemOrigY = origY.get(item.id) as number;
      let targetY = 0;

      for (const other of result) {
        if (item.id === other.id) {
          continue;
        }

        const horizontalOverlap =
          item.position.x < other.position.x + other.size.width &&
          item.position.x + item.size.width > other.position.x;

        if (!horizontalOverlap) {
          continue;
        }

        const otherOrigY = origY.get(other.id) ?? other.position.y;
        if (otherOrigY < itemOrigY) {
          targetY = Math.max(
            targetY,
            other.position.y +
            other.size.height +
            (other.additionalHeight || 0),
          );
        }
      }

      item.position.y = targetY;
    }
  }

  const pushDown = (pusher: T) => {
    const newY =
      pusher.position.y + pusher.size.height + (pusher.additionalHeight || 0);
    const overlapping = result
      .filter(
        (other) =>
          other.id !== pusher.id &&
          other.id !== fixedItemId &&
          checkOverlap(
            {
              ...pusher,
              size: {
                ...pusher.size,
                height: pusher.size.height + (pusher.additionalHeight || 0),
              },
            },
            {
              ...other,
              size: {
                ...other.size,
                height: other.size.height + (other.additionalHeight || 0),
              },
            },
          ) &&
          other.position.y < newY,
      )
      .sort((a, b) => a.position.y - b.position.y);

    for (let i = 0; i < overlapping.length; i++) {
      const other = overlapping[i];
      let effectiveNewY = newY;
      for (let j = 0; j < i; j++) {
        const prev = overlapping[j];
        const horizOverlap =
          other.position.x < prev.position.x + prev.size.width &&
          other.position.x + other.size.width > prev.position.x;
        if (horizOverlap) {
          effectiveNewY = Math.max(
            effectiveNewY,
            prev.position.y + prev.size.height + (prev.additionalHeight || 0),
          );
        }
      }
      if (other.position.y < effectiveNewY) {
        other.position.y = effectiveNewY;
        pushDown(other);
      }
    }
  };

  if (fixedItemId) {
    const fixedItem = result.find((item) => item.id === fixedItemId);
    if (fixedItem) {
      pushDown(fixedItem);
    }
  } else {
    const sorted = [...result].sort((a, b) => a.position.y - b.position.y);
    for (const item of sorted) {
      pushDown(item);
    }
  }

  return result;
};