"use client";

import { useEffect, useRef } from "react";

interface TextStream {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  speed: number;
  opacity: number;
}

export default function BibleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamsRef = useRef<TextStream[]>([]);
  const animationFrameRef = useRef<number>();

  // Configurações personalizáveis
  const config = {
    bgColor: "#050b1d",
    textColor: "#5fa0ff",
    minFontSize: 10,
    maxFontSize: 16,
    minSpeed: 0.5,
    maxSpeed: 2.5,
    numLines: 20,
    scanlineOpacity: 0.03,
    glowIntensity: 0.8,
  };

  // Lista de termos bíblicos e frases
  const bibleTerms = [
    "Deus", "Cristo", "Espírito", "Graça", "Fé", "Luz", "Cruz", "Sangue", 
    "Vida", "Verdade", "Caminho", "Salvação", "Justiça", "Misericórdia", 
    "Propósito", "Eleito", "Promessa"
  ];

  const biblePhrases = [
    "O Senhor é meu pastor",
    "A verdade liberta",
    "No princípio",
    "Há poder no nome de Jesus",
    "Tudo coopera para o bem",
    "Seja feita a Tua vontade",
    "Lâmpada para os meus pés",
    "O justo viverá pela fé"
  ];

  const symbols = ["✝", "†", "✦", "✧", "⟁", "⟡"];

  // Função para obter texto aleatório
  const getRandomText = (): string => {
    const allTexts = [...bibleTerms, ...biblePhrases, ...symbols];
    return allTexts[Math.floor(Math.random() * allTexts.length)];
  };

  // Redimensionar canvas
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    }
  };

  // Inicializar streams de texto
  const initTextStreams = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const streams: TextStream[] = [];
    const lineHeight = rect.height / config.numLines;

    for (let i = 0; i < config.numLines; i++) {
      const y = i * lineHeight + lineHeight / 2;
      const speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
      const fontSize = config.minFontSize + Math.random() * (config.maxFontSize - config.minFontSize);
      
      streams.push({
        x: Math.random() * rect.width,
        y,
        text: getRandomText(),
        fontSize,
        speed,
        opacity: 0.6 + Math.random() * 0.4,
      });
    }

    streamsRef.current = streams;
  };

  // Desenhar fundo com rastro
  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Fundo com opacidade para criar rastro
    ctx.fillStyle = config.bgColor;
    ctx.globalAlpha = 0.1;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;

    // Scanlines sutis
    ctx.strokeStyle = config.textColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = config.scanlineOpacity;
    
    for (let i = 0; i < height; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  // Atualizar e desenhar streams
  const updateStreams = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const streams = streamsRef.current;

    streams.forEach((stream) => {
      // Mover stream
      stream.x += stream.speed;

      // Se saiu da tela, reiniciar
      if (stream.x > width + 200) {
        stream.x = -200;
        stream.text = getRandomText();
        stream.fontSize = config.minFontSize + Math.random() * (config.maxFontSize - config.minFontSize);
        stream.speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
        stream.opacity = 0.6 + Math.random() * 0.4;
      }

      // Desenhar texto com glow
      ctx.save();
      ctx.globalAlpha = stream.opacity;
      ctx.font = `${stream.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      ctx.fillStyle = config.textColor;
      
      // Efeito glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = config.textColor;
      
      ctx.fillText(stream.text, stream.x, stream.y);
      ctx.restore();
    });
  };

  // Loop de animação
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Desenhar fundo
    drawBackground(ctx, width, height);

    // Atualizar e desenhar streams
    updateStreams(ctx, width, height);

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Inicializar
    resizeCanvas();
    initTextStreams();

    // Iniciar animação
    animate();

    // Redimensionar ao mudar tamanho da janela
    const handleResize = () => {
      resizeCanvas();
      initTextStreams();
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

