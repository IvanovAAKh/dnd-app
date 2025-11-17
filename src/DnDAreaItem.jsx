import React, { useRef, useState, useEffect } from "react";

const TRANSITION_DURATION_MS = 250;

export default function DnDAreaItem({
  cellSize,
  children,
  id,
  onChangeSize,
  onChangePosition,
  position: inputPosition,
  size: inputSize,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const draggingData = useRef(null);
  const [transformPosition, setTransformPosition] = useState({x: 0, y: 0});
  const [position, setPosition] = useState(inputPosition);
  const [size, setSize] = useState(inputSize);

  const handleStartDragging = (e) => {
    e.preventDefault();
    console.log("start dragging");
    setIsDragging(true);
    draggingData.current = {
      dragStartMouseX: e.clientX,
      dragStartMouseY: e.clientY,
    };
  }

  const handleStopDragging = (e) => {
    console.log("stop dragging");
    if (!isDragging) {
      return;
    }
    setIsDragging(false);
    if (transformPosition.x !== 0 || transformPosition.y !== 0) {
      const updatedPosition = {
        x: position.x + transformPosition.x,
        y: position.y + transformPosition.y,
      };
      setTransformPosition({x: 0, y: 0});
      setPosition(updatedPosition);
      onChangePosition(id, updatedPosition);
    }
  }

  const handleDrag = (e) => {
    console.log("dragging");
    if (!isDragging) {
      return;
    }
    const {
      dragStartMouseX,
      dragStartMouseY,
    } = draggingData.current;
    const dragMouseDeltaX = e.clientX - dragStartMouseX;
    const dragMouseDeltaY = e.clientY - dragStartMouseY;
    const updatedTransformPosition = {
      x: Math.round(dragMouseDeltaX / cellSize),
      y: Math.round(dragMouseDeltaY / cellSize),
    };
    if (updatedTransformPosition.x !== transformPosition.x || updatedTransformPosition.y !== transformPosition.y) {
      setTransformPosition(updatedTransformPosition);
    }
  }

  useEffect(() => {
    if (!isDragging) {
      return;
    }
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleStopDragging);
    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleStopDragging);
    };
  }, [isDragging, transformPosition, position]);

  return (
    <div
      onMouseDown={handleStartDragging}
      style={{
        backgroundColor: "lightblue",
        cursor: isDragging ? "grabbing" : "grab",
        position: "absolute",
        top: position.y * cellSize,
        left: position.x * cellSize,
        width: size.width * cellSize,
        height: size.height * cellSize,
        border: "1px solid black",
        overflow: "auto",
        transition: isDragging
          ? `transform ${TRANSITION_DURATION_MS}ms ease`
          : undefined,
        transform: `translate(${transformPosition.x * cellSize}px, ${transformPosition.y * cellSize}px)`,
        zIndex: isDragging ? 999 : undefined,
      }}
    >
      {children}
    </div>
  );
}