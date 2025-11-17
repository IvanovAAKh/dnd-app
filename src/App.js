import React, { useState, useCallback, useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import DnDArea from "./DnDArea";
import DnDAreaItem from "./DnDAreaItem";

const COLUMNS_COUNT = 32;

const getItemValidPosition = (newPosition, item, container, columnsCount) => {
  const newPositionX = Math.max(0, Math.min(newPosition.x, (columnsCount - container.position.x - item.size.width)));
  const newPositionY = Math.max(0, newPosition.y);

  return {
    x: newPositionX,
    y: newPositionY,
  };
};

const getContainerValidPosition = (newPosition, container, columnsCount) => {
  const newPositionX = Math.max(0, Math.min(newPosition.x, columnsCount - container.size.width));
  const newPositionY = Math.max(0, newPosition.y);

  return {
    x: newPositionX,
    y: newPositionY,
  };
};

export default function App() {
  const [containers, setContainers] = useState([
    {
      id: 'container_A', position: {x: 0, y: 0}, size: {width: 16, height: 7},
      items: [
        {
          id: 'item_A', position: {x: 1, y: 1}, size: {width: 6, height: 3}
        },
        {
          id: 'item_B', position: {x: 8, y: 3}, size: {width: 8, height: 4},
        }
      ],
    },
    {
      id: 'containerB', position: {x: 19, y: 1}, size: {width: 10, height: 10},
      items: [
        {
          id: 'item_A', position: {x: 4, y: 0}, size: {width: 6, height: 3}
        },
        {
          id: 'item_B', position: {x: 0, y: 6}, size: {width: 8, height: 4},
        }
      ],
    }
  ]);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);
  const cellSize = containerWidth / COLUMNS_COUNT;

  const handleChangeContainerPosition = useCallback((containerIndex, position) => {
    setContainers((containers) => {
      const newContainers = [...containers];
      newContainers[containerIndex] = {
        ...newContainers[containerIndex],
        position: getContainerValidPosition(
          position,
          newContainers[containerIndex],
          COLUMNS_COUNT,
        ),
      };
      return newContainers;
    });
  }, []);

  const handleChangeItemPosition = useCallback((containerIndex, itemIndex, position) => {
    setContainers(prevContainers => prevContainers.map((prevContainer, cIndex) => {
      if (cIndex !== containerIndex) {
        return prevContainer;
      }
      const items = prevContainer.items.map((item, iIndex) => {
        if (iIndex !== itemIndex) {
          return item;
        }
        return {
          ...item,
          position: getItemValidPosition(
            position,
            item,
            prevContainer,
            COLUMNS_COUNT,
          ),
        };
      });
      const itemsRightEdges = items.map(item => item.position.x + item.size.width);
      const itemsBottomEdges = items.map(item => item.position.y + item.size.height);
      return {
        ...prevContainer,
        items,
        size: {
          height: Math.max(...itemsBottomEdges),
          width: Math.max(...itemsRightEdges),
        },
      };
    }));
  }, []);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      setContainerWidth(width);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        display: "flex",
        gap: '16px',
      }}
    >
      <Sidebar />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          height: '100%',
          width: '100%',
        }}
      >
        <div
          ref={containerRef}
          style={{
            display: "flex",
            width: '80%',
            background: "#f7f7f7",
          }}
        >
          <DnDArea
            cellSize={cellSize}
          >
            {containers.map((container, containerIndex) => (
              <DnDAreaItem
                cellSize={cellSize}
                key={container.id}
                onChangePosition={(position) => handleChangeContainerPosition(containerIndex, position)}
                position={container.position}
                size={container.size}
              >
                <DnDArea
                  cellSize={cellSize}
                >
                  {container.items.map((item, itemIndex) => (
                    <DnDAreaItem
                      cellSize={cellSize}
                      id={item.id}
                      key={item.id}
                      onChangePosition={(position) => handleChangeItemPosition(containerIndex, itemIndex, position)}
                      position={item.position}
                      size={item.size}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          fontSize: '24px'
                        }}
                      >
                        {item.id}
                      </div>
                    </DnDAreaItem>
                  ))}
                </DnDArea>
              </DnDAreaItem>
            ))}
          </DnDArea>
        </div>
      </div>
    </div>
  )
}