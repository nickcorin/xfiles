import { useEffect, useRef } from "react";

export function InteractiveGridBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d", { alpha: true });
    const pointer = {
      active: false,
      x: window.innerWidth * 0.62,
      y: window.innerHeight * 0.36,
    };
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
      pointer.active = true;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }

    function onPointerLeave(event) {
      if (event.relatedTarget === null) {
        pointer.active = false;
      }
    }

    function pulse(distance, radius) {
      return Math.max(0, 1 - distance / radius) ** 2;
    }

    function drawGlow(x, y, radius, opacity) {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(130, 230, 160, ${opacity})`);
      gradient.addColorStop(0.45, `rgba(130, 230, 160, ${opacity * 0.24})`);
      gradient.addColorStop(1, "rgba(130, 230, 160, 0)");
      context.fillStyle = gradient;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    function drawGrid(width, height) {
      const cell = 42;
      context.lineWidth = 1;

      for (let x = -cell; x < width + cell; x += cell) {
        for (let y = -cell; y < height + cell; y += cell) {
          const centerX = x + cell / 2;
          const centerY = y + cell / 2;
          const cursorPulse = pointer.active
            ? pulse(Math.hypot(centerX - pointer.x, centerY - pointer.y), 230)
            : 0;
          const craftPulse = pulse(Math.hypot(centerX - craft.x, centerY - craft.y), 180);
          const lift = cursorPulse * 0.16 + craftPulse * 0.11;

          if (lift > 0.01) {
            context.fillStyle = `rgba(130, 230, 160, ${lift * 0.28})`;
            context.fillRect(x + 1, y + 1, cell - 2, cell - 2);
          }
          context.strokeStyle = `rgba(130, 230, 160, ${0.035 + lift})`;
          context.strokeRect(x, y, cell, cell);
        }
      }
    }

    function drawCraft(targetX, targetY) {
      const bob = Math.sin(time * 2.1) * 3;
      const angle = Math.atan2(targetY - craft.y, targetX - craft.x) * 0.1;
      context.save();
      context.translate(craft.x, craft.y + bob);
      context.rotate(angle + Math.sin(time * 0.9) * 0.04);

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
      const targetX = pointer.active ? pointer.x : orbitX;
      const targetY = pointer.active ? pointer.y : orbitY;
      const chase = pointer.active ? 0.055 : 0.018;

      craft.x += (targetX - craft.x) * chase;
      craft.y += (targetY - craft.y) * chase;

      context.clearRect(0, 0, width, height);
      if (pointer.active) {
        drawGlow(pointer.x, pointer.y, 260, 0.08);
      }
      drawGlow(craft.x, craft.y, 190, 0.1);
      drawGrid(width, height);
      drawCraft(targetX, targetY);

      time += 0.016;
      animationFrame = window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerout", onPointerLeave);
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerLeave);
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
