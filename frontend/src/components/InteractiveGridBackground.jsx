import { useEffect, useRef } from "react";

export function InteractiveGridBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d");
    const pointer = { x: window.innerWidth * 0.62, y: window.innerHeight * 0.36 };
    const craft = { x: pointer.x, y: pointer.y };
    let animationFrame = 0;
    let time = 0;

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function onPointerMove(event) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }

    function drawGrid(width, height) {
      const cell = 42;
      const radius = 160;
      context.lineWidth = 1;

      for (let x = -cell; x < width + cell; x += cell) {
        for (let y = -cell; y < height + cell; y += cell) {
          const centerX = x + cell / 2;
          const centerY = y + cell / 2;
          const distance = Math.hypot(centerX - craft.x, centerY - craft.y);
          const pulse = Math.max(0, 1 - distance / radius);
          const alpha = 0.045 + pulse * 0.18;

          context.strokeStyle = `rgba(130, 230, 160, ${alpha})`;
          context.strokeRect(x, y, cell, cell);
        }
      }
    }

    function drawCraft() {
      const bob = Math.sin(time * 2.1) * 3;
      context.save();
      context.translate(craft.x, craft.y + bob);
      context.rotate(Math.sin(time * 0.9) * 0.08);

      context.shadowColor = "rgba(130, 230, 160, 0.9)";
      context.shadowBlur = 18;
      context.fillStyle = "rgba(130, 230, 160, 0.88)";
      context.beginPath();
      context.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2);
      context.fill();

      context.shadowBlur = 10;
      context.fillStyle = "rgba(238, 246, 232, 0.9)";
      context.globalAlpha = 0.7;
      context.beginPath();
      context.ellipse(0, -5, 9, 5, 0, Math.PI, 0);
      context.fill();

      context.globalAlpha = 0.2;
      context.beginPath();
      context.moveTo(-8, 5);
      context.lineTo(8, 5);
      context.lineTo(20, 64);
      context.lineTo(-20, 64);
      context.closePath();
      context.fillStyle = "rgba(130, 230, 160, 0.32)";
      context.fill();
      context.restore();
    }

    function draw() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const orbitX = width * 0.5 + Math.cos(time * 0.18) * width * 0.22;
      const orbitY = height * 0.42 + Math.sin(time * 0.27) * height * 0.14;
      const targetX = orbitX * 0.78 + pointer.x * 0.22;
      const targetY = orbitY * 0.82 + pointer.y * 0.18;

      craft.x += (targetX - craft.x) * 0.018;
      craft.y += (targetY - craft.y) * 0.018;

      context.clearRect(0, 0, width, height);
      drawGrid(width, height);
      drawCraft();

      time += 0.016;
      animationFrame = window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 opacity-70"
      aria-hidden="true"
    />
  );
}
