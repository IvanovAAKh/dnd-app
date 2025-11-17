import React, { useState, useRef, useEffect } from "react";

export default function DnDArea({
  cellSize = 32,
  children,
  onDrop: inputOnDrop,
}) {
  return (
    <div
      style={{
        backgroundColor: 'f0f0f0',
        backgroundImage: 'linear-gradient(to right, #d1d1d1 1px, transparent 1px), linear-gradient(to bottom, #d1d1d1 1px, transparent 1px)',
        backgroundSize: `${cellSize}px ${cellSize}px`,
        position: 'relative',
        height: '100%',
        width: '100%'
      }}
    >
      {children}
    </div>
  );
}