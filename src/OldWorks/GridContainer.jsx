import React, { useState, useRef, useEffect } from "react";
import GridItem from "./GridItem";
import Sidebar from "./Sidebar";

const TOTAL_COLUMNS = 32;

export default function GridContainer() {
  const containerRef = useRef(null);

  const [cellWidth, setCellWidth] = useState(0);
  const [cellHeight] = useState(30);

  const [items, setItems] = useState([]);

  // Пересчёт ширины клетки
  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      setCellWidth(width / TOTAL_COLUMNS);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Добавление нового элемента из дропа
  const onDrop = (e) => {
    e.preventDefault();

    const tpl = JSON.parse(e.dataTransfer.getData("application/json"));

    const rect = containerRef.current.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const gridX = Math.max(0, Math.round(mouseX / cellWidth));
    const gridY = Math.max(0, Math.round(mouseY / cellHeight));

    const newItem = {
      id: Date.now(),
      x: gridX,
      y: gridY,
      w: tpl.w,
      h: tpl.h
    };

    setItems((prev) => [...prev, newItem]);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const updateItem = (id, data) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...data } : i))
    );
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />

      <div
        ref={containerRef}
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{
          position: "relative",
          flex: 1,
          background: "#f7f7f7",
          border: "1px solid #ccc",
          overflow: "auto"
        }}
      >
        {items.map((item) => (
          <GridItem
            key={item.id}
            {...item}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
            onChange={(data) => updateItem(item.id, data)}
          />
        ))}
      </div>
    </div>
  );
}