import React from "react";

export default function Sidebar() {
  const templates = [
    { id: "type1", w: 4, h: 3 },
    { id: "type2", w: 6, h: 4 },
    { id: "type3", w: 8, h: 2 }
  ];

  const onDragStart = (e, tpl) => {
    e.dataTransfer.setData("application/json", JSON.stringify(tpl));
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

      {templates.map((tpl) => (
        <div
          key={tpl.id}
          draggable
          onDragStart={(e) => onDragStart(e, tpl)}
          style={{
            padding: "10px 12px",
            background: "white",
            border: "1px solid #bbb",
            borderRadius: 6,
            cursor: "grab"
          }}
        >
          Блок {tpl.w}×{tpl.h}
        </div>
      ))}
    </div>
  );
}