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
    const lure = { x: pointer.x, y: pointer.y };
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

    function seed(x, y) {
      return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
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
          const cursorDistance = Math.hypot(centerX - pointer.x, centerY - pointer.y);
          const craftDistance = Math.hypot(centerX - craft.x, centerY - craft.y);
          const cursorPulse = pointer.active ? pulse(cursorDistance, 320) : 0;
          const craftPulse = pulse(craftDistance, 210);
          const randomness = Math.abs(seed(x, y));
          const ripple = pointer.active
            ? Math.sin(time * 2.2 - cursorDistance * 0.035 + randomness * 4)
            : 0;
          const lift = Math.max(0, cursorPulse * (0.24 + ripple * 0.08) + craftPulse * 0.08);
          const directionX = pointer.active ? (centerX - pointer.x) / Math.max(cursorDistance, 1) : 0;
          const directionY = pointer.active ? (centerY - pointer.y) / Math.max(cursorDistance, 1) : 0;
          const offset = cursorPulse * 9;
          const inset = 2 + cursorPulse * 6;

          if (lift > 0.012) {
            context.fillStyle = `rgba(130, 230, 160, ${lift * 0.35})`;
            context.fillRect(
              x + inset + directionX * offset,
              y + inset + directionY * offset,
              cell - inset * 2,
              cell - inset * 2
            );
          }

          context.strokeStyle = `rgba(130, 230, 160, ${0.032 + lift * 0.72})`;
          context.strokeRect(
            x + directionX * offset,
            y + directionY * offset,
            cell,
            cell
          );
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
      const imprecisionX = Math.sin(time * 0.82) * 66 + Math.cos(time * 0.37) * 34;
      const imprecisionY = Math.cos(time * 0.71) * 42 + Math.sin(time * 0.29) * 28;
      const targetX = pointer.active ? pointer.x + imprecisionX : orbitX;
      const targetY = pointer.active ? pointer.y + imprecisionY : orbitY;
      const lureSpeed = pointer.active ? 0.028 : 0.018;
      const chase = pointer.active ? 0.014 : 0.011;

      lure.x += (targetX - lure.x) * lureSpeed;
      lure.y += (targetY - lure.y) * lureSpeed;
      craft.x += (lure.x - craft.x) * chase;
      craft.y += (lure.y - craft.y) * chase;

      context.clearRect(0, 0, width, height);
      if (pointer.active) {
        drawGlow(pointer.x, pointer.y, 300, 0.055);
      }
      drawGlow(craft.x, craft.y, 170, 0.07);
      drawGrid(width, height);
      drawCraft(lure.x, lure.y);

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
