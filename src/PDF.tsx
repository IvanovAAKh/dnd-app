import { useEffect, useRef } from 'react';
import { execute } from './script.ts';

const PDF = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const source = document.querySelector('[data-pdf-area]');
    if (!source || !containerRef.current) return;

    const clone = source.cloneNode(true);

    containerRef.current.innerHTML = ''; // на случай повторного эффекта
    containerRef.current.appendChild(clone);
    execute();
  }, []);

  return <div id="PDF" ref={containerRef} />;
};

export default PDF;