import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

export const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Particle system
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      color: string;
      originalX: number;
      originalY: number;
    }> = [];

    // Create particles
    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      particles.push({
        x,
        y,
        originalX: x,
        originalY: y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        color: Math.random() > 0.5 ? '#3B82F6' : '#60A5FA'
      });
    }

    // Animation loop
    let animationId: number;
    const animate = () => {
      // Semi-transparent clear for trails
      ctx.fillStyle = 'rgba(2, 2, 2, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;

      particles.forEach((particle, i) => {
        // Basic movement
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Mouse interaction (repulsion/attraction)
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 200;

        if (dist < maxDist) {
          const force = (maxDist - dist) / maxDist;
          particle.x -= dx * force * 0.02;
          particle.y -= dy * force * 0.02;
        }

        // Bounce off walls
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Draw particle
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw lines between nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx2 = particle.x - particles[j].x;
          const dy2 = particle.y - particles[j].y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          if (dist2 < 150) {
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.15 * (1 - dist2 / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      {/* Canvas Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 opacity-40 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* High-Tech Scanline Effect */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 3px 100%',
          zIndex: 1
        }}
      />

      {/* Animated Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <motion.div
          className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-gradient-to-br from-accent/20 to-transparent blur-[120px] rounded-full"
          animate={{ 
            scale: [1, 1.2, 1], 
            opacity: [0.2, 0.4, 0.2],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-gradient-to-tl from-accent/10 to-transparent blur-[120px] rounded-full"
          animate={{ 
            scale: [1, 1.1, 1], 
            opacity: [0.1, 0.3, 0.1],
            x: [0, -40, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      {/* Grid Pattern with subtle animation */}
      <motion.div
        className="fixed inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(59, 130, 246, .1) 25%, rgba(59, 130, 246, .1) 26%, transparent 27%, transparent 74%, rgba(59, 130, 246, .1) 75%, rgba(59, 130, 246, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(59, 130, 246, .1) 25%, rgba(59, 130, 246, .1) 26%, transparent 27%, transparent 74%, rgba(59, 130, 246, .1) 75%, rgba(59, 130, 246, .1) 76%, transparent 77%, transparent)',
          backgroundSize: '60px 60px',
          zIndex: 0
        }}
        animate={{ 
          backgroundPosition: ['0px 0px', '60px 60px'] 
        }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: 'linear' 
        }}
      />

      {/* Ambient Radial Gradient */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(2,2,2,0.4)_100%)]" style={{ zIndex: 1 }} />
    </>
  );
};
