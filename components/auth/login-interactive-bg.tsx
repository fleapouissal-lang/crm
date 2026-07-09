"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
};

export function LoginInteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function particleCount(w: number, h: number) {
      return Math.min(90, Math.floor((w * h) / 14000));
    }

    function initParticles(w: number, h: number) {
      const count = particleCount(w, h);
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6,
        alpha: Math.random() * 0.45 + 0.15,
      }));
    }

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles(w, h);
    }

    function accentRgb() {
      const theme = document.documentElement.getAttribute("data-theme");
      return theme === "dark" ? "230, 181, 103" : "24, 24, 27";
    }

    function draw() {
      if (!ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const rgb = accentRgb();

      ctx.clearRect(0, 0, w, h);

      if (mouse.active) {
        const grd = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 280);
        grd.addColorStop(0, `rgba(${rgb}, 0.14)`);
        grd.addColorStop(0.45, `rgba(${rgb}, 0.05)`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;

        if (!reduceMotion) {
          if (mouse.active) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 160 && dist > 0) {
              const force = (160 - dist) / 160;
              p.vx -= (dx / dist) * force * 0.018;
              p.vy -= (dy / dist) * force * 0.018;
            }
          }

          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.992;
          p.vy *= 0.992;

          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
          p.x = Math.max(0, Math.min(w, p.x));
          p.y = Math.max(0, Math.min(h, p.y));
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${p.alpha})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]!;
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(${rgb}, ${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    const onMove = (e: PointerEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const onLeave = () => {
      mouseRef.current.active = false;
    };

    resize();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    const themeObserver = new MutationObserver(draw);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="login-interactive-bg"
      aria-hidden
    />
  );
}
