import React, { useRef, useState, useEffect } from "react";

const TRANSITION_DURATION_MS = 250;

export default function DnDAreaItem({
  cellSize,
  children,
  onChangeSize,
  onChangePosition,
  position,
  size,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const draggingData = useRef(null);

  const handleStartDragging = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("start dragging");
    setIsDragging(true);
    draggingData.current = {
      dragStartX: position.x,
      dragStartY: position.y,
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
  }

  const handleDrag = (e) => {
    console.log("dragging");
    if (!isDragging) {
      return;
    }
    const {
      dragStartX,
      dragStartY,
      dragStartMouseX,
      dragStartMouseY,
    } = draggingData.current;
    const dragMouseDeltaX = e.clientX - dragStartMouseX;
    const dragMouseDeltaY = e.clientY - dragStartMouseY;
    const updatedTransformPosition = {
      x: Math.round(dragMouseDeltaX / cellSize),
      y: Math.round(dragMouseDeltaY / cellSize),
    };
    onChangePosition({
      x: dragStartX + updatedTransformPosition.x,
      y: dragStartY + updatedTransformPosition.y,
    });
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
  }, [isDragging, position]);

  return (
    <div
      onMouseDown={handleStartDragging}
      style={{
        backgroundColor: "white",
        cursor: isDragging ? "grabbing" : "grab",
        position: "absolute",
        top: 0,
        left: 0,
        width: size.width * cellSize,
        height: size.height * cellSize,
        overflow: 'hidden',
        transition: `transform ${TRANSITION_DURATION_MS}ms ease`,
        transform: `translate(${position.x * cellSize}px, ${position.y * cellSize}px)`,
        zIndex: isDragging ? 999 : undefined,
      }}
    >
      {children}
    </div>
  );
}