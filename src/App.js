import React, { useState, useCallback, useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import DnDArea from "./DnDArea";
import DnDAreaItem from "./DnDAreaItem";

const columnsCount = 32;

export default function App() {
  const [blocks, setBlocks] = useState([
    {id: '1', position: {x: 2, y: 4}, size: {width: 6, height: 3}},
    {id: '2', position: {x: 10, y: 12}, size: {width: 8, height: 4}}
  ]);
  const [containerWidth, setContainerWidth] = useState(0);

  const containerRef = useRef(null);

  const cellSize = containerWidth / columnsCount;

  const handleChangeItemPosition = useCallback((id, position) => {
    setBlocks((prevBlocks) => prevBlocks.map((block) => {
      if (block.id === id) {
        return {...block, position};
      }
      return block;
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
            columnsCount={columnsCount}
          >
            {blocks.map((block) => (
              <DnDAreaItem
                cellSize={cellSize}
                id={block.id}
                key={block.id}
                onChangePosition={handleChangeItemPosition}
                position={block.position}
                size={block.size}
              >
                <div
                  style={{
                    width: '1000px',
                    height: '100%',
                    backgroundColor: 'lightblue',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '24px'
                  }}
                >
                  {block.id}
                </div>
              </DnDAreaItem>
            ))}
          </DnDArea>
        </div>
      </div>
    </div>
  )
}