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
    const ripples = [];
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

    function onPointerDown(event) {
      ripples.push({
        born: performance.now(),
        opacity: 1,
        radius: 0,
        x: event.clientX,
        y: event.clientY,
      });
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
      const radius = 260;
      const columns = [];
      const rows = [];
      const points = [];
      context.lineWidth = 1;
      context.lineCap = "butt";

      for (let x = -gap; x < width + gap * 2; x += gap) {
        columns.push(x);
      }
      for (let y = -gap; y < height + gap * 2; y += gap) {
        rows.push(y);
      }

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        const row = [];
        for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
          const baseX = columns[columnIndex];
          const baseY = rows[rowIndex];
          const edgeX = Math.min(columnIndex / 1.5, (columns.length - 1 - columnIndex) / 1.5, 1);
          const edgeY = Math.min(rowIndex / 1.5, (rows.length - 1 - rowIndex) / 1.5, 1);
          const edgeAnchor = edgeX * edgeX * edgeY * edgeY;
          const cursorDistance = Math.hypot(baseX - field.x, baseY - field.y);
          const cursorInfluence = field.active
            ? Math.max(0, 1 - cursorDistance / radius) * field.strength * edgeAnchor
            : 0;
          const pullX = field.active ? (field.x - baseX) / Math.max(cursorDistance, 1) : 0;
          const pullY = field.active ? (field.y - baseY) / Math.max(cursorDistance, 1) : 0;
          const distanceGate = Math.min(1, cursorDistance / 70);
          const compression = cursorInfluence * cursorInfluence;
          const displacement = compression * distanceGate * 26;
          let rippleX = 0;
          let rippleY = 0;
          let rippleEnergy = 0;

          for (const ripple of ripples) {
            const xDistance = baseX - ripple.x;
            const yDistance = baseY - ripple.y;
            const rippleDistance = Math.hypot(xDistance, yDistance);
            const waveDistance = rippleDistance - ripple.radius;
            if (Math.abs(waveDistance) >= 55) continue;
            const wave = (1 - Math.abs(waveDistance) / 55) * ripple.opacity * edgeAnchor;
            const waveDirection = waveDistance < 0 ? -1 : 1;
            const angle = Math.atan2(yDistance, xDistance);
            const waveStrength = wave * 18;
            rippleX -= Math.cos(angle) * waveStrength * waveDirection;
            rippleY -= Math.sin(angle) * waveStrength * waveDirection;
            rippleEnergy = Math.max(rippleEnergy, wave);
          }

          const energy = Math.min(compression * (3 - 2 * cursorInfluence) + rippleEnergy * 0.72, 1);

          row.push({
            x: baseX + pullX * displacement + rippleX,
            y: baseY + pullY * displacement + rippleY,
            energy,
          });
        }
        points.push(row);
      }

      for (let rowIndex = 0; rowIndex < points.length; rowIndex += 1) {
        for (let columnIndex = 0; columnIndex < points[rowIndex].length; columnIndex += 1) {
          const point = points[rowIndex][columnIndex];
          const right = points[rowIndex][columnIndex + 1];
          const down = points[rowIndex + 1]?.[columnIndex];

          for (const neighbor of [right, down]) {
            if (!neighbor) continue;
            const lineEnergy = Math.min((point.energy + neighbor.energy) * 0.5, 1);
            const alpha = 0.035 + lineEnergy * 0.2;
            context.lineWidth = 0.8 + lineEnergy * 0.55;
            context.strokeStyle = `rgba(130, 230, 160, ${alpha})`;
            context.beginPath();
            context.moveTo(point.x, point.y);
            context.lineTo(neighbor.x, neighbor.y);
            context.stroke();
          }
        }
      }

      for (const row of points) {
        for (const point of row) {
          const radius = 1.1 + point.energy * 2.4;
          context.fillStyle = `rgba(130, 230, 160, ${0.16 + point.energy * 0.48})`;
          context.beginPath();
          context.arc(point.x, point.y, radius, 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    function drawRipples() {
      for (const ripple of ripples) {
        context.beginPath();
        context.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        context.lineWidth = 1.5;
        context.strokeStyle = `rgba(130, 230, 160, ${0.28 * ripple.opacity})`;
        context.stroke();
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
      const fieldSpeed = pointer.active ? 0.08 : 0.06;
      const fieldStrength = pointer.active ? 1 : 0;

      field.x += (fieldTargetX - field.x) * fieldSpeed;
      field.y += (fieldTargetY - field.y) * fieldSpeed;
      field.strength += (fieldStrength - field.strength) * 0.12;
      field.active = field.strength > 0.01;
      lure.x += (targetX - lure.x) * lureSpeed;
      lure.y += (targetY - lure.y) * lureSpeed;
      craft.x += (lure.x - craft.x) * chase;
      craft.y += (lure.y - craft.y) * chase;

      const now = performance.now();
      for (let index = ripples.length - 1; index >= 0; index -= 1) {
        const age = (now - ripples[index].born) / 1000;
        ripples[index].radius = Math.max(0, age * 400);
        ripples[index].opacity = Math.max(0, 1 - age * 1.2);
        if (ripples[index].opacity <= 0) {
          ripples.splice(index, 1);
        }
      }

      context.clearRect(0, 0, width, height);
      drawGlow(craft.x, craft.y, 170, 0.07);
      drawLattice(width, height);
      drawRipples();
      drawCraft(lure.x, lure.y);

      time += 0.016;
      animationFrame = window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerout", onPointerLeave);
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
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
