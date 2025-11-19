import React, { useRef } from "react";

export default function Sidebar({
  onDragStart,
}) {
  const itemRefs = useRef({});
  const templates = [
    { id: "type1", w: 4, h: 3 },
    { id: "type2", w: 6, h: 4 },
    { id: "type3", w: 8, h: 2 }
  ];

  const handleDragStart = (event, index) => {
    const data = templates[index];
    const ref = itemRefs.current[data.id];
    const rect = ref.getBoundingClientRect();
    onDragStart({
      data,
      mouseOffset: {
        x: Math.abs(event.nativeEvent.offsetX),
        y: Math.abs(event.nativeEvent.offsetY),
      },
      size: {
        height: rect.height,
        width: rect.width,
      },
    });
  };

  return (
    <div
      style={{
        width: 200,
        padding: 10,
        background: "#eee",
        borderRight: "1px solid #ccc",
        display: "flex",
        flexDirection: "column",
        gap: 12
      }}
    >
      <h4>Добавить блок:</h4>

      {templates.map((tpl, index) => (
        <div
          key={tpl.id}
          draggable
          onDragStart={(event) => handleDragStart(event, index)}
          ref={(el) => itemRefs.current[tpl.id] = el}
          style={{
            padding: "10px 12px",
            background: "lightblue",
            border: "1px solid #bbb",
            borderRadius: 6,
            cursor: "grab",
            height: `${tpl.h * 20}px`,
            width: `${tpl.w * 20}px`
          }}
        >
          Блок {tpl.w}×{tpl.h}
        </div>
      ))}
    </div>
  );
}