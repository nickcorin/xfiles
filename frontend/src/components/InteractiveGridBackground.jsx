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
    const field = {
      active: false,
      strength: 0,
      x: pointer.x,
      y: pointer.y,
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

    function seed(x, y) {
      return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1);
    }

    function influence(distance, radius) {
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

    function drawLattice(width, height) {
      const gap = 46;
      const points = [];
      context.lineWidth = 1;

      for (let x = -gap; x < width + gap * 2; x += gap) {
        for (let y = -gap; y < height + gap * 2; y += gap) {
          const random = seed(x, y);
          const baseX = x + (random - 0.5) * 7;
          const baseY = y + (seed(y, x) - 0.5) * 7;
          const cursorDistance = Math.hypot(baseX - field.x, baseY - field.y);
          const craftDistance = Math.hypot(baseX - craft.x, baseY - craft.y);
          const cursorInfluence = field.active ? influence(cursorDistance, 310) * field.strength : 0;
          const craftInfluence = influence(craftDistance, 180) * 0.4;
          const wave = Math.sin(time * 1.4 + random * 8 + cursorDistance * 0.018) * 0.5 + 0.5;
          const pullX = field.active ? (field.x - baseX) / Math.max(cursorDistance, 1) : 0;
          const pullY = field.active ? (field.y - baseY) / Math.max(cursorDistance, 1) : 0;
          const driftX = Math.sin(time * 0.45 + random * 12) * 1.4;
          const driftY = Math.cos(time * 0.38 + random * 10) * 1.4;
          const displacement = cursorInfluence * (10 + random * 12);

          points.push({
            baseX,
            baseY,
            x: baseX + pullX * displacement + driftX,
            y: baseY + pullY * displacement + driftY,
            energy: cursorInfluence * (0.68 + wave * 0.32) + craftInfluence,
            random,
          });
        }
      }

      for (const point of points) {
        const right = points.find(
          (candidate) =>
            Math.abs(candidate.baseY - point.baseY) < gap * 0.45 &&
            candidate.baseX > point.baseX &&
            candidate.baseX - point.baseX < gap * 1.4
        );
        const down = points.find(
          (candidate) =>
            Math.abs(candidate.baseX - point.baseX) < gap * 0.45 &&
            candidate.baseY > point.baseY &&
            candidate.baseY - point.baseY < gap * 1.4
        );
        for (const neighbor of [right, down]) {
          if (!neighbor) continue;
          const alpha = 0.035 + Math.min(point.energy + neighbor.energy, 1) * 0.18;
          context.strokeStyle = `rgba(130, 230, 160, ${alpha})`;
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(neighbor.x, neighbor.y);
          context.stroke();
        }
      }

      for (const point of points) {
        const radius = 1.1 + point.energy * 2.4;
        context.fillStyle = `rgba(130, 230, 160, ${0.16 + point.energy * 0.48})`;
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fill();
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
      const fieldTargetX = pointer.active ? pointer.x : craft.x;
      const fieldTargetY = pointer.active ? pointer.y : craft.y;
      const fieldSpeed = pointer.active ? 0.14 : 0.08;
      const fieldStrength = pointer.active ? 1 : 0;

      field.x += (fieldTargetX - field.x) * fieldSpeed;
      field.y += (fieldTargetY - field.y) * fieldSpeed;
      field.strength += (fieldStrength - field.strength) * 0.12;
      field.active = field.strength > 0.01;
      lure.x += (targetX - lure.x) * lureSpeed;
      lure.y += (targetY - lure.y) * lureSpeed;
      craft.x += (lure.x - craft.x) * chase;
      craft.y += (lure.y - craft.y) * chase;

      context.clearRect(0, 0, width, height);
      if (field.active) {
        drawGlow(field.x, field.y, 300, 0.055 * field.strength);
      }
      drawGlow(craft.x, craft.y, 170, 0.07);
      drawLattice(width, height);
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
