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
  const [draggableNewItem, setDraggableNewItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const draggingData = useRef(null);
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

  const handeChangeNewItemPosition = (position) => {
    setDraggableNewItem(prev => ({
      ...prev,
      position,
    }));
 }

  const handleNewItemDragStart = (item) => {
    setDraggableNewItem({
      data: item.data,
      size: {
        width: Math.round(item.size.width / cellSize),
        height: Math.round(item.size.height / cellSize),
      },
      position: {
        x: 0,
        y: 0
      },
    });
    draggingData.current = {
      mouseOffset: item.mouseOffset,
    };
    console.log('handleNewItemDragStart', item);
  }

  const handleDragEnterContainer = (event, dropTargetType, containerIndex) => {
    if (!draggableNewItem) {
      return;
    }
    console.log('handleDragEnterContainers', dropTargetType, containerIndex);
    const mouseEnterCellPosition = {
      x: Math.round(Math.abs(event.nativeEvent.offsetX) / cellSize),
      y: Math.round(Math.abs(event.nativeEvent.offsetY) / cellSize),
    };
    const itemTakenCellPosition = {
      x: Math.round(draggingData.current.mouseOffset.x / cellSize),
      y: Math.round(draggingData.current.mouseOffset.y / cellSize),
    }
    const position = {
      x: mouseEnterCellPosition.x - itemTakenCellPosition.x,
      y: mouseEnterCellPosition.y - itemTakenCellPosition.y,
    };
    draggingData.current = {
      ...draggingData.current,
      dragStartX: position.x,
      dragStartY: position.y,
      dragStartMouseX: event.nativeEvent.offsetX,
      dragStartMouseY: event.nativeEvent.offsetY,
    };
    setDraggableNewItem(prev => ({
      ...prev,
      position,
    }));
    setDropTarget({
      index: containerIndex,
      type: dropTargetType,
    });
  }

  const handleDragOverContainer = (event) => {
    if (!draggableNewItem) {
      return;
    }
    const {
      dragStartX,
      dragStartY,
      dragStartMouseX,
      dragStartMouseY,
    } = draggingData.current;
    const dragMouseDeltaX = event.nativeEvent.offsetX - dragStartMouseX;
    const dragMouseDeltaY = event.nativeEvent.offsetY - dragStartMouseY;
    const updatedTransformPosition = {
      x: Math.round(dragMouseDeltaX / cellSize),
      y: Math.round(dragMouseDeltaY / cellSize),
    };
    const foundContainer = containers[dropTarget.index];
    const externalContainer = {
      position: {
        x: 0,
        y: 0,
      },
      size: {
        height: null,
        width: COLUMNS_COUNT,
      },
    };
    const newPosition = getItemValidPosition(
      {
        x: dragStartX + updatedTransformPosition.x,
        y: dragStartY + updatedTransformPosition.y,
      },
      draggableNewItem,
      foundContainer || externalContainer,
      COLUMNS_COUNT,
    );
    if (draggableNewItem.position.x !== newPosition.x
      || draggableNewItem.position.y !== newPosition.y
    ) {
      handeChangeNewItemPosition(newPosition);
      setContainers(prev => prev.map((container, index) => {
        if (index !== dropTarget.index) {
          return container;
        }
        const items = container.items.concat({
          ...draggableNewItem,
          position: newPosition,
        })
        const itemsRightEdges = items.map(item => item.position.x + item.size.width);
        const itemsBottomEdges = items.map(item => item.position.y + item.size.height);
        return {
          ...container,
          size: {
            height: Math.max(...itemsBottomEdges),
            width: Math.max(...itemsRightEdges),
          },
        };
      }));
    }
  }

  const handleDragLeaveContainer = (dropTargetType, containerIndex) => {
    console.log('handleDragLeaveContainer', dropTargetType);
    setDropTarget(prev => (
      prev.type === dropTargetType && prev.index === containerIndex ? null : prev
    ));
    setContainers(prev => prev.map((container, index) => {
      if (index !== containerIndex) {
        return container;
      }
      const itemsRightEdges = container.items.map(item => item.position.x + item.size.width);
      const itemsBottomEdges = container.items.map(item => item.position.y + item.size.height);
      return {
        ...container,
        size: {
          height: Math.max(...itemsBottomEdges),
          width: Math.max(...itemsRightEdges),
        },
      };
    }));
  }

  const handleDropContainer = () => {
    console.log('handleDropContainer');
    setContainers(prevContainers => {
      const foundContainerToDrop = prevContainers[dropTarget.index];
      return foundContainerToDrop
        ? prevContainers.map((container, index) => {
          if (index !== dropTarget.index) {
            return container;
          }
          return {
            ...container,
            items: container.items.concat({
              id: Date.now().toString(),
              position: draggableNewItem.position,
              size: draggableNewItem.size,
            }),
          };
        })
        : prevContainers
          .concat({
            id: 'Container_'.concat(Date.now().toString()),
            position: draggableNewItem.position,
            size: draggableNewItem.size,
            items: [{
              id: Date.now().toString(),
              position: {x: 0, y: 0},
              size: draggableNewItem.size
            }],
          });
    });
    setDraggableNewItem(null);
    setDropTarget(null);
    draggingData.current = null;
  }

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
      <Sidebar
        onDragStart={handleNewItemDragStart}
      />
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
            onDragEnter={(event) => {
              handleDragEnterContainer(event, 'CONTAINERS')
            }}
            onDragLeave={() => handleDragLeaveContainer('CONTAINERS')}
            onDragOver={handleDragOverContainer}
            onDrop={handleDropContainer}
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
                  onDragEnter={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDragEnterContainer(event, 'CONTAINER', containerIndex)
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDragLeaveContainer('CONTAINER', containerIndex);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDragOverContainer(event)
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDropContainer();
                  }}
                  cellSize={cellSize}
                >
                  {container.items.map((item, itemIndex) => (
                    <DnDAreaItem
                      cellSize={cellSize}
                      disablePointerEvents={!!draggableNewItem}
                      key={item.id}
                      onChangePosition={(position) => handleChangeItemPosition(containerIndex, itemIndex, position)}
                      position={item.position}
                      size={item.size}
                    >
                      <div
                        style={{
                          backgroundColor: 'lightgreen',
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
                  {dropTarget?.type === 'CONTAINER'
                  && dropTarget?.index === containerIndex
                  && draggableNewItem
                  && (
                    <DnDAreaItem
                      cellSize={cellSize}
                      disablePointerEvents
                      onChangePosition={() => ({})}
                      position={draggableNewItem.position}
                      size={draggableNewItem.size}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'lightgray',
                        }}
                      />
                    </DnDAreaItem>
                  )}
                </DnDArea>
              </DnDAreaItem>
            ))}
            {dropTarget?.type === 'CONTAINERS' && draggableNewItem && (
              <DnDAreaItem
                cellSize={cellSize}
                disablePointerEvents
                onChangePosition={() => ({})}
                position={draggableNewItem.position}
                size={draggableNewItem.size}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'lightgray',
                  }}
                />
              </DnDAreaItem>
            )}
          </DnDArea>
        </div>
      </div>
    </div>
  )
}