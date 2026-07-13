import React, { useState, useCallback, useRef, useEffect } from "react";
import styled from './utils/styled.ts';
import Tile from './components/Tile.tsx';
import {
  Container,
  Item,
  StyledProps,
} from './types';

import inputContainers from './utils/realData.ts';

import PDF from './PDF.tsx';

type StyledRootProps = {
  height: number;
  width: number;
};

type StyledBoxProps = {
  height: number;
  width: number;
  x: number;
  y: number;
};

const MIN_COLUMN_WIDTH = 60;
const ROW_HEIGHT = 16;
const CONTAINERS_GAP = 16;
const CONTAINERS_HALF_GAP = CONTAINERS_GAP / 2;
const CONTAINER_TITLE_HEIGHT = 64;
const NORMALIZED_CONTAINER_TITLE_HEIGHT = CONTAINER_TITLE_HEIGHT / ROW_HEIGHT;
const ITEMS_GAP = 16;
const ITEMS_HALF_GAP = ITEMS_GAP / 2;
const TILE_BORDER_SIZE = 1;

const StyledRoot = styled('div')<StyledProps<StyledRootProps>>`
    position: relative;
    width: ${({ styledProps: { width } }) => width}px;
    height: ${({ styledProps: { height } }) => height}px;
`;

const StyledContainer = styled('div')<StyledProps<StyledBoxProps>>`
    position: absolute;
    transform: ${({ styledProps: { x, y } }) => `translate(${x}px, ${y}px)`};
    width: ${({ styledProps: { width } }) => width}px;
    height: ${({ styledProps: { height } }) => height}px;
    overflow: visible;
`;

const StyledContainerContent = styled('div')<
  StyledProps<{ height: number; width: number }>
>`
    position: relative;
    width: ${({ styledProps: { width } }) => width}px;
    height: ${({ styledProps: { height } }) => height}px;
    margin: ${CONTAINERS_HALF_GAP}px;
`;

const StyledItem = styled('div')<StyledProps<StyledBoxProps>>`
  position: absolute;
  transform: ${({ styledProps: { x, y } }) => `translate(${x}px, ${y}px)`};
  width: ${({ styledProps: { width } }) => width}px;
  overflow: visible;
`;

const StyledItemContent = styled('div')<StyledProps<StyledBoxProps>>`
  background: yellow;
  height: ${({ styledProps: { height } }) => height}px;
  width: ${({ styledProps: { width } }) => width}px;
  margin: ${ITEMS_HALF_GAP}px;
  overflow-x: hidden;
`;

const StyledTileContent = styled('div')<StyledProps<StyledBoxProps>>`
  background: green;
  display: flex;
  flex-direction: column;
  width: ${({ styledProps: { width } }) => width}px;
  height: ${({ styledProps: { height } }) => height}px;
`;

const convertContainersFromInput = (
  metricsInContainers: Container[],
): Container[] =>
  metricsInContainers.map((mc) => ({
    id: mc.id ?? '',
    items: (mc.items || []).map((metric) => ({
      id: metric.id ?? '',
      metric,
      position: { x: metric.position.x, y: metric.position.y },
      size: { height: metric.size.height ?? 1, width: metric.size.width ?? 1 },
    })) as Item[],
    position: { x: mc.position.x, y: mc.position.y },
    size: {
      height:
        (mc.size.height ?? 1) +
        (mc.title ? NORMALIZED_CONTAINER_TITLE_HEIGHT : 0),
      width: mc.size.width ?? 1,
    },
    title: mc.title,
  }));

const App = ()=> {
  const [isRendered, setIsRendered] = useState(false);
  const areaWidth = 900;
  const columnsCount = 12;
  const areaColumnWidth = Math.max(MIN_COLUMN_WIDTH, areaWidth / columnsCount);
  const containers = convertContainersFromInput(inputContainers);

  useEffect(() => {
    setIsRendered(true);
  }, []);

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
    }}>
      <StyledRoot
        data-pdf-area=""
        data-pdf-cell-width={areaColumnWidth}
        data-pdf-cell-height={ROW_HEIGHT}
        data-pdf-columns={columnsCount}
        data-pdf-container-border-size={TILE_BORDER_SIZE}
        data-pdf-container-title-height={CONTAINER_TITLE_HEIGHT}
        data-pdf-containers-gap={CONTAINERS_GAP}
        data-pdf-items-gap={ITEMS_GAP}
        data-pdf-zoom={1}
        styledProps={{ height: 10000, width: areaWidth }}
      >
        {containers.map((container) => {
          const height = container.size.height * ROW_HEIGHT;
          const width = container.size.width * areaColumnWidth - 1;
          const x = container.position.x * areaColumnWidth;
          const y = container.position.y * ROW_HEIGHT;
          const containerContentHeight = height - CONTAINERS_GAP;
          const containerContentWidth = width - CONTAINERS_GAP;
          return (
            <StyledContainer
              key={container.id}
              data-pdf-container={container.id}
              data-pdf-height={height}
              data-pdf-x={x}
              data-pdf-y={y}
              data-pdf-width={width}
              styledProps={{
                height,
                x,
                y,
                width,
              }}
            >
              <StyledContainerContent
                data-pdf-container-content
                styledProps={{
                  height: containerContentHeight,
                  width: containerContentWidth,
                }}
              >
                <Tile>
                  <StyledTileContent
                    data-pdf-container-tile-content
                    styledProps={{
                      height: containerContentHeight,
                      width: containerContentWidth - TILE_BORDER_SIZE * 2,
                    }}
                  >
                    {!!container.title && (
                      <div data-pdf-container-title>
                        <div style={{
                          alignItems: 'flex-start',
                          display: 'flex',
                          flex: '1 1 0%',
                          margin: '16px',
                        }}>
                          {container.title}
                        </div>
                      </div>
                    )}
                    <div>
                      {container.items.map((item) => {
                        const containerColumnWidth = Math.ceil(
                          (containerContentWidth - TILE_BORDER_SIZE * 2) /
                          container.size.width,
                        );
                        const containerRowHeight = Math.ceil(
                          (containerContentHeight - TILE_BORDER_SIZE * 2) /
                          container.size.height
                        )
                        const itemWidth =
                          item.size.width * containerColumnWidth -
                          TILE_BORDER_SIZE * 2;
                        const itemHeight =
                          item.size.height * containerRowHeight -
                          TILE_BORDER_SIZE * 2;
                        const itemX = item.position.x * containerColumnWidth;
                        const itemY = item.position.y * ROW_HEIGHT;
                        const itemContentWidth = itemWidth - ITEMS_GAP;
                        const itemContentHeight = itemHeight - ITEMS_GAP;
                        return (
                          <StyledItem
                            key={item.id}
                            data-pdf-item={item.id}
                            data-pdf-x={itemX}
                            data-pdf-y={itemY}
                            data-pdf-height={itemHeight}
                            data-pdf-width={itemWidth}
                            styledProps={{
                              x: itemX,
                              y: itemY,
                              width: itemWidth,
                            }}
                          >
                            <StyledItemContent
                              data-pdf-item-content
                              styledProps={{
                                height: itemContentHeight,
                                width: itemContentWidth,
                              }}
                            >
                              {item.id}
                            </StyledItemContent>
                          </StyledItem>
                        );
                      })}
                    </div>
                  </StyledTileContent>
                </Tile>
              </StyledContainerContent>
            </StyledContainer>
          );
        })}
      </StyledRoot>
      {isRendered && (
        <PDF />
      )}
    </div>
  );
}

export default App;

