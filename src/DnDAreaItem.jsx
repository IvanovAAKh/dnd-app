import React, { useRef, useState, useEffect, useCallback } from "react";

const TRANSITION_DURATION_MS = 250;

export default function DnDAreaItem({
  cellSize,
  children,
  disablePointerEvents = false,
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

  const handleStopDragging = useCallback((e) => {
    console.log("stop dragging");
    if (!isDragging) {
      return;
    }
    setIsDragging(false);
  }, [isDragging]);

  const handleDrag = useCallback((e) => {
    console.log("dragging");
    if (!isDragging || !draggingData.current) {
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
  }, [isDragging, cellSize, onChangePosition]);

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
  }, [isDragging, handleDrag, handleStopDragging]);

  return (
    <div
      onMouseDown={handleStartDragging}
      style={{
        backgroundColor: "#deeef5",
        cursor: isDragging ? "grabbing" : "grab",
        position: "absolute",
        top: 0,
        left: 0,
        width: size.width * cellSize,
        height: size.height * cellSize,
        overflow: 'hidden',
        userSelect: 'none',
        pointerEvents: disablePointerEvents ? 'none' : undefined,
        transition: disablePointerEvents ? 'none' : `transform ${TRANSITION_DURATION_MS}ms ease`,
        transform: `translate(${position.x * cellSize}px, ${position.y * cellSize}px)`,
        zIndex: isDragging ? 999 : undefined,
      }}
    >
      {children}
    </div>
  );
}