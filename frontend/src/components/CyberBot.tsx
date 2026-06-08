import React, { useRef, useEffect } from 'react';

export type BotState = 'idle' | 'typing' | 'watching' | 'error' | 'success' | 'password-hidden' | 'password-visible';

interface CyberBotProps {
  state: BotState;
  intensity?: number;
}

// Smooth interpolation function
const lerp = (start: number, end: number, factor: number): number => {
  return start + (end - start) * factor;
};

const CyberBot: React.FC<CyberBotProps> = ({ state, intensity = 0.5 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const stateRef = useRef<BotState>(state);
  const intensityRef = useRef<number>(intensity);

  // Mouse tracking refs
  const mouseRef = useRef({ x: 0, y: 0 });
  const eyeTargetRef = useRef({ x: 0, y: 0 });
  const eyeCurrentRef = useRef({ x: 0, y: 0 });

  // Animation smoothing refs
  const mouthWidthRef = useRef(20);
  const mouthCurveRef = useRef(0);
  const glowIntensityRef = useRef(0.5);

  // Internal face movement refs
  const faceOffsetRef = useRef({ x: 0, y: 0 });
  const faceTargetRef = useRef({ x: 0, y: 0 });

  // Keep refs in sync
  stateRef.current = state;
  intensityRef.current = intensity;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      mouseRef.current = {
        x: Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2))),
        y: Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)))
      };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawBot = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
      const currentState = stateRef.current;
      const currentIntensity = intensityRef.current;
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) / 300;

      // Color based on state
      const glowColor = currentState === 'error' ? 'rgba(239, 68, 68,' :
                        currentState === 'success' ? 'rgba(34, 197, 94,' :
                        currentState === 'password-visible' ? 'rgba(234, 179, 8,' :
                        'rgba(6, 182, 212,';

      const targetGlow = 0.3 + currentIntensity * 0.4;
      glowIntensityRef.current = lerp(glowIntensityRef.current, targetGlow, 0.05);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // Background glow
      const gradient = ctx.createRadialGradient(0, 0, 20, 0, 0, 120);
      gradient.addColorStop(0, glowColor + glowIntensityRef.current + ')');
      gradient.addColorStop(1, glowColor + '0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(-150, -150, 300, 300);

      // OUTER FRAME - Static hexagon head
      ctx.beginPath();
      const breathOffset = Math.sin(t * 1.5) * 1.5;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const r = 70 + breathOffset + Math.sin(t * 2 + i * 0.5) * 1;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const headGrad = ctx.createLinearGradient(-70, -70, 70, 70);
      headGrad.addColorStop(0, '#0f172a');
      headGrad.addColorStop(0.5, '#1e293b');
      headGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = headGrad;
      ctx.fill();
      ctx.strokeStyle = glowColor + '0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Simple circuit lines (minimal)
      ctx.beginPath();
      ctx.moveTo(-25, -25);
      ctx.lineTo(-15, -15);
      ctx.strokeStyle = glowColor + '0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(25, -25);
      ctx.lineTo(15, -15);
      ctx.strokeStyle = glowColor + '0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Antenna
      ctx.beginPath();
      ctx.moveTo(0, -70);
      ctx.lineTo(0, -95);
      ctx.strokeStyle = glowColor + '0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Antenna tip
      ctx.beginPath();
      ctx.arc(0, -95, 4, 0, Math.PI * 2);
      ctx.fillStyle = glowColor + '1)';
      ctx.shadowColor = glowColor + '1)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Status dots
      const dotCount = 5;
      for (let i = 0; i < dotCount; i++) {
        const dotAngle = (Math.PI / (dotCount - 1)) * i - Math.PI / 2;
        const dotR = 82;
        const dotX = Math.cos(dotAngle) * dotR;
        const dotY = Math.sin(dotAngle) * dotR;

        let isActive = false;
        if (currentState === 'typing') {
          isActive = (Math.floor(t * 3) % dotCount) === i;
        } else if (currentState === 'error') {
          isActive = Math.sin(t * 5 + i) > 0;
        } else if (currentState === 'success') {
          isActive = true;
        } else {
          isActive = i === 2;
        }

        ctx.beginPath();
        ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? glowColor + '1)' : glowColor + '0.3)';
        ctx.fill();
      }

      // INNER FACE - Moves with mouse
      let targetFaceX = mouseRef.current.x * 6;
      let targetFaceY = mouseRef.current.y * 6;

      if (currentState === 'password-hidden') {
        targetFaceX = 12;
      }

      if (currentState === 'password-visible') {
        targetFaceX = -8;
      }

      faceTargetRef.current = { x: targetFaceX, y: targetFaceY };
      faceOffsetRef.current.x = lerp(faceOffsetRef.current.x, faceTargetRef.current.x, 0.08);
      faceOffsetRef.current.y = lerp(faceOffsetRef.current.y, faceTargetRef.current.y, 0.08);

      ctx.save();
      ctx.translate(faceOffsetRef.current.x, faceOffsetRef.current.y);

      // Inner face hexagon (subtle)
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const r = 45;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = glowColor + '0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Calculate eye tracking - symmetric movement
      const maxEyeMovement = 6;
      let eyeBaseX = mouseRef.current.x * maxEyeMovement;
      let eyeBaseY = mouseRef.current.y * maxEyeMovement;

      if (currentState === 'password-hidden') {
        eyeBaseX += 5;
      }

      if (currentState === 'password-visible') {
        eyeBaseX -= 6;
      }

      eyeTargetRef.current = { x: eyeBaseX, y: eyeBaseY };
      eyeCurrentRef.current.x = lerp(eyeCurrentRef.current.x, eyeTargetRef.current.x, 0.15);
      eyeCurrentRef.current.y = lerp(eyeCurrentRef.current.y, eyeTargetRef.current.y, 0.15);

      const eyeY = -5 + eyeCurrentRef.current.y;
      const eyeSpacing = 20;

      // Eye size
      let eyeSize = 4;
      if (currentState === 'typing') eyeSize = 4.5;
      else if (currentState === 'error') eyeSize = 3.5;
      else if (currentState === 'success') eyeSize = 5;
      else if (currentState === 'password-hidden') eyeSize = 5;
      else if (currentState === 'password-visible') eyeSize = 4.5;

      // Draw normal eye
      const drawNormalEye = (x: number, y: number, size: number) => {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = glowColor + '1)';
        ctx.shadowColor = glowColor + '1)';
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
      };

      // Draw winking eye
      const drawWinkEye = (x: number, y: number, size: number) => {
        ctx.strokeStyle = glowColor + '1)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.shadowColor = glowColor + '1)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(x - size, y - size * 0.8);
        ctx.lineTo(x + size * 0.5, y);
        ctx.lineTo(x - size, y + size * 0.8);
        ctx.stroke();
        ctx.shadowBlur = 0;
      };

      const leftEyeX = -eyeSpacing + eyeCurrentRef.current.x;
      const rightEyeX = eyeSpacing + eyeCurrentRef.current.x;

      if (currentState === 'password-hidden') {
        drawWinkEye(leftEyeX, eyeY, eyeSize);
        drawNormalEye(rightEyeX, eyeY, eyeSize);
      } else {
        drawNormalEye(leftEyeX, eyeY, eyeSize);
        drawNormalEye(rightEyeX, eyeY, eyeSize);
      }

      // Pupils
      let pupilOffsetX = 0;
      let pupilOffsetY = 0;

      if (currentState === 'typing') {
        pupilOffsetX = Math.sin(t * 12) * 1.5;
        pupilOffsetY = Math.cos(t * 8) * 1;
      } else if (currentState === 'error') {
        pupilOffsetX = Math.sin(t * 20) * 2;
        pupilOffsetY = Math.sin(t * 15) * 1;
      } else if (currentState === 'success') {
        pupilOffsetY = -1.5;
        pupilOffsetX = Math.sin(t * 3) * 0.3;
      } else if (currentState === 'password-hidden') {
        pupilOffsetX = 3;
      } else if (currentState === 'password-visible') {
        pupilOffsetX = -3;
      } else {
        pupilOffsetX = Math.sin(t * 2) * 0.3;
      }

      if (currentState === 'password-hidden') {
        ctx.beginPath();
        ctx.arc(rightEyeX + pupilOffsetX, eyeY + pupilOffsetY, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(leftEyeX + pupilOffsetX, eyeY + pupilOffsetY, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(rightEyeX + pupilOffsetX, eyeY + pupilOffsetY, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
      }

      // Mouth
      const mouthY = 18;
      let targetMouthWidth = 16;
      let targetMouthCurve = 0;

      switch (currentState) {
        case 'idle':
          targetMouthWidth = 14;
          break;
        case 'typing':
          targetMouthWidth = 12 + Math.sin(t * 8) * 1;
          break;
        case 'watching':
          targetMouthWidth = 14;
          break;
        case 'error':
          targetMouthWidth = 20;
          targetMouthCurve = Math.sin(t * 10) * 2;
          break;
        case 'success':
          targetMouthWidth = 14;
          targetMouthCurve = 3;
          break;
        case 'password-hidden':
          targetMouthWidth = 8;
          break;
        case 'password-visible':
          targetMouthWidth = 16;
          targetMouthCurve = 0;
          break;
      }

      mouthWidthRef.current = lerp(mouthWidthRef.current, targetMouthWidth, 0.1);
      mouthCurveRef.current = lerp(mouthCurveRef.current, targetMouthCurve, 0.1);

      const mw = mouthWidthRef.current;
      const mc = mouthCurveRef.current;

      if (currentState === 'password-hidden') {
        ctx.beginPath();
        ctx.arc(0, mouthY + 4, 4, 0, Math.PI * 2);
        ctx.fillStyle = glowColor + '0.8)';
        ctx.fill();
      } else if (currentState === 'error' || currentState === 'password-visible') {
        ctx.beginPath();
        ctx.moveTo(-mw / 2, mouthY + mc);
        for (let i = 0; i <= 10; i++) {
          const x = -mw / 2 + (mw / 10) * i;
          const waveFreq = currentState === 'password-visible' ? 3 : 2;
          const waveSpeed = currentState === 'password-visible' ? 5 : 10;
          const y = mouthY + Math.sin((i / 10) * Math.PI * waveFreq + t * waveSpeed) * 2;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = glowColor + '0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-mw / 2, mouthY);
        ctx.quadraticCurveTo(0, mouthY + mc + 2, mw / 2, mouthY);
        ctx.strokeStyle = glowColor + '0.9)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.restore();

      // Scanning line
      if (currentState === 'typing' || currentState === 'watching') {
        const scanY = -60 + (t * 30) % 100;
        ctx.beginPath();
        ctx.moveTo(-40, scanY);
        ctx.lineTo(40, scanY);
        ctx.strokeStyle = glowColor + '0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    };

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      timeRef.current += 0.016;

      ctx.clearRect(0, 0, w, h);
      drawBot(ctx, w, h, timeRef.current);

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={280}
      style={{
        width: '100%',
        height: '100%',
        filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.3))',
        cursor: 'crosshair',
      }}
    />
  );
};

export default CyberBot;
