import React, { useRef, useState } from "react";

export default function GridItem({
                                   id,
                                   x,
                                   y,
                                   w,
                                   h,
                                   cellWidth,
                                   cellHeight,
                                   onChange
                                 }) {
  const ref = useRef(null);

  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  const [start, setStart] = useState({
    mouseX: 0,
    mouseY: 0,
    x,
    y,
    w,
    h
  });

  // === DRAG START ===
  const onMouseDown = (e) => {
    if (e.target.dataset.handle === "resize") return; // если тянем resize — не начинаем drag
    setDragging(true);
    setStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      x,
      y,
      w,
      h
    });
  };

  // === RESIZE START ===
  const onResizeStart = (e) => {
    e.stopPropagation();
    setResizing(true);
    setStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      x,
      y,
      w,
      h
    });
  };

  // === MOVE ===
  const onMouseMove = (e) => {
    if (!dragging && !resizing) return;

    const dx = e.clientX - start.mouseX;
    const dy = e.clientY - start.mouseY;

    if (dragging) {
      const newX = Math.round(start.x + dx / cellWidth);
      const newY = Math.round(start.y + dy / cellHeight);

      onChange({ x: Math.max(0, newX), y: Math.max(0, newY) });
    }

    if (resizing) {
      const newW = Math.max(1, Math.round(start.w + dx / cellWidth));
      const newH = Math.max(1, Math.round(start.h + dy / cellHeight));

      onChange({ w: newW, h: newH });
    }
  };

  const stopMoving = () => {
    setDragging(false);
    setResizing(false);
  };

  // === PIXELS ===
  const pxLeft = x * cellWidth;
  const pxTop = y * cellHeight;
  const pxWidth = w * cellWidth;
  const pxHeight = h * cellHeight;

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: pxLeft,
        top: pxTop,
        width: pxWidth,
        height: pxHeight,
        background: "#4ba3f7",
        borderRadius: 4,
        boxSizing: "border-box",
        padding: 4,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none"
      }}
    >
      {/* resize handle */}
      <div
        data-handle="resize"
        onMouseDown={onResizeStart}
        style={{
          width: 14,
          height: 14,
          background: "white",
          border: "2px solid #4ba3f7",
          position: "absolute",
          bottom: 0,
          right: 0,
          cursor: "nwse-resize"
        }}
      />

      {dragging || resizing ? (
        <div
          onMouseMove={onMouseMove}
          onMouseUp={stopMoving}
          onMouseLeave={stopMoving}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999
          }}
        />
      ) : null}
    </div>
  );
}