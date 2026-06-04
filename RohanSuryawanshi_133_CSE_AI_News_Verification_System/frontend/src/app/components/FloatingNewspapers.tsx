import { useEffect, useRef } from 'react';
import { Newspaper } from 'lucide-react';

export function FloatingNewspapers() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newspapers = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 2,
      scale: 0.5 + Math.random() * 0.5,
    }));

    const container = containerRef.current;
    if (!container) return;

    // Create newspaper elements
    newspapers.forEach((paper) => {
      const div = document.createElement('div');
      div.className = 'absolute';
      div.style.left = `${paper.x}%`;
      div.style.top = `${paper.y}%`;
      div.style.transform = `scale(${paper.scale}) rotate(${paper.rotation}deg)`;
      div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`;
      container.appendChild(div);

      // Store animation data
      (div as any).animData = paper;
    });

    let animationFrameId: number;
    let lastTime = Date.now();

    const animate = () => {
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastTime) / 16.67; // Normalize to 60fps
      lastTime = currentTime;

      Array.from(container.children).forEach((element) => {
        const div = element as HTMLElement;
        const data = (div as any).animData;
        if (!data) return;

        // Update position
        data.x += data.speedX * deltaTime;
        data.y += data.speedY * deltaTime;
        data.rotation += data.rotationSpeed * deltaTime;

        // Wrap around edges
        if (data.x > 100) data.x = -5;
        if (data.x < -5) data.x = 100;
        if (data.y > 100) data.y = -5;
        if (data.y < -5) data.y = 100;

        // Apply transform
        div.style.left = `${data.x}%`;
        div.style.top = `${data.y}%`;
        div.style.transform = `scale(${data.scale}) rotate(${data.rotation}deg)`;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-none opacity-10 z-0"
    />
  );
}
