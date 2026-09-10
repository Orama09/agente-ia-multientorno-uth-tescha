"use client";

import { useEffect, useState, useRef } from "react";

export default function SplashScreen() {
  const fullText = "BIENVENIDO";

  const [text, setText] = useState("");
  const [fadeOut, setFadeOut] = useState(false);
  const [visible, setVisible] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ✍️ efecto máquina de escribir
  useEffect(() => {
    let i = 0;

    const typing = setInterval(() => {
      setText(fullText.slice(0, i + 1));
      i++;
      if (i === fullText.length) clearInterval(typing);
    }, 150);

    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 4500);

    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 5500);

    return () => {
      clearInterval(typing);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // 🌐 canvas network
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;

    if (!ctx) return; // 🔥 FIX SEGURO

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const nodes = Array.from({ length: 60 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1,
      vy: (Math.random() - 0.5) * 1,
    }));

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // mover nodos
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      });

      // líneas entre nodos cercanos
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.strokeStyle = `rgba(0,255,120,${1 - dist / 120})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // nodos
      nodes.forEach((n) => {
        ctx.fillStyle = "#00ff88";
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // 🧹 cleanup correcto
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black text-green-400 transition-opacity duration-1000 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* 🌐 CANVAS RED */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
      />

      {/* CONTENIDO */}
      <div className="relative text-center z-10">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-[0.15em] sm:tracking-[0.3em] md:tracking-[0.5em] text-green-400 drop-shadow-[0_0_20px_#00ff88] px-4">
          {text}
          <span className="animate-pulse">|</span>
        </h1>

        <p className="mt-6 text-sm opacity-70 tracking-widest">
          Iniciando sistema TESCHA...
        </p>
      </div>
    </div>
  );
}