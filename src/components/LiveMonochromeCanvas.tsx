import { useEffect, useRef } from 'react';
import type { MotionMode, ThemeMode } from '../types/search';

interface LiveMonochromeCanvasProps {
  theme: ThemeMode;
  motionMode: MotionMode;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

interface TouchRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export function LiveMonochromeCanvas({ theme, motionMode }: LiveMonochromeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -1000,
    y: -1000,
    active: false,
  });
  const ripplesRef = useRef<TouchRipple[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const effectiveMode: MotionMode = prefersReduced ? 'off' : motionMode;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particleCount = effectiveMode === 'full' ? 42 : effectiveMode === 'subtle' ? 20 : 0;
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      radius: 1 + Math.random() * 1.4,
      alpha: 0.14 + Math.random() * 0.28,
    }));

    const handlePointerMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (effectiveMode === 'off') return;
      pointerRef.current = { x: e.clientX, y: e.clientY, active: true };
      ripplesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 6,
        maxRadius: effectiveMode === 'full' ? 140 : 85,
        alpha: 0.45,
      });
      if (ripplesRef.current.length > 8) {
        ripplesRef.current.shift();
      }
    };

    const handlePointerLeave = () => {
      pointerRef.current.active = false;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    let rafId = 0;
    let time = 0;

    const drawStaticGrid = () => {
      ctx.clearRect(0, 0, width, height);
      const isDark = theme === 'dark';
      const gridSize = 64;
      const strokeBase = isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.04)';
      ctx.strokeStyle = strokeBase;
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();
    };

    if (effectiveMode === 'off') {
      drawStaticGrid();
    } else {
      const render = () => {
        time += 0.008;
        ctx.clearRect(0, 0, width, height);

        const isDark = theme === 'dark';
        const px = pointerRef.current.x;
        const py = pointerRef.current.y;
        const hasPointer = pointerRef.current.active;

        // 1. Subtle architectural perspective grid with soft drift
        const gridSize = 64;
        const driftX = effectiveMode === 'full' ? Math.sin(time * 0.5) * 12 : 0;
        const driftY = effectiveMode === 'full' ? (time * 10) % gridSize : 0;

        ctx.lineWidth = 1;
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.032)' : 'rgba(0, 0, 0, 0.038)';
        ctx.beginPath();
        for (let x = (driftX % gridSize) - gridSize; x <= width + gridSize; x += gridSize) {
          ctx.moveTo(Math.round(x) + 0.5, 0);
          ctx.lineTo(Math.round(x) + 0.5, height);
        }
        for (let y = driftY - gridSize; y <= height + gridSize; y += gridSize) {
          ctx.moveTo(0, Math.round(y) + 0.5);
          ctx.lineTo(width, Math.round(y) + 0.5);
        }
        ctx.stroke();

        // 2. Cursor / touch radial spotlight illumination
        if (hasPointer) {
          const glowRadius = effectiveMode === 'full' ? 340 : 220;
          const grad = ctx.createRadialGradient(px, py, 0, px, py, glowRadius);
          if (isDark) {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.075)');
            grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.025)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          } else {
            grad.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
            grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.015)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          }
          ctx.fillStyle = grad;
          ctx.fillRect(px - glowRadius, py - glowRadius, glowRadius * 2, glowRadius * 2);
        }

        // 3. Drifting monochrome nodes and proximity constellations
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          let boost = 0;
          if (hasPointer) {
            const dx = p.x - px;
            const dy = p.y - py;
            const dist = Math.hypot(dx, dy);
            if (dist < 180) {
              boost = (1 - dist / 180) * 0.45;
              // Gentle repulsion / attraction shimmer
              p.x += (dx / (dist || 1)) * 0.08;
              p.y += (dy / (dist || 1)) * 0.08;
            }
          }

          ctx.fillStyle = isDark
            ? `rgba(255, 255, 255, ${Math.min(0.75, p.alpha + boost)})`
            : `rgba(0, 0, 0, ${Math.min(0.55, p.alpha * 0.8 + boost)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          if (effectiveMode === 'full') {
            for (let j = i + 1; j < particles.length; j++) {
              const p2 = particles[j];
              const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
              if (dist < 125) {
                const lineAlpha = (1 - dist / 125) * 0.09;
                ctx.strokeStyle = isDark
                  ? `rgba(255, 255, 255, ${lineAlpha})`
                  : `rgba(0, 0, 0, ${lineAlpha * 0.9})`;
                ctx.lineWidth = 0.75;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
              }
            }
          }
        }

        // 4. Touch / click shockwave ripples
        for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
          const r = ripplesRef.current[i];
          r.radius += (r.maxRadius - r.radius) * 0.11 + 1.2;
          r.alpha *= 0.93;

          if (r.alpha <= 0.015 || r.radius >= r.maxRadius) {
            ripplesRef.current.splice(i, 1);
            continue;
          }

          ctx.strokeStyle = isDark
            ? `rgba(255, 255, 255, ${r.alpha})`
            : `rgba(0, 0, 0, ${r.alpha * 0.8})`;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.stroke();

          if (r.radius > 18) {
            ctx.strokeStyle = isDark
              ? `rgba(255, 255, 255, ${r.alpha * 0.45})`
              : `rgba(0, 0, 0, ${r.alpha * 0.35})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius * 0.62, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        rafId = window.requestAnimationFrame(render);
      };

      rafId = window.requestAnimationFrame(render);
    }

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [theme, motionMode]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
