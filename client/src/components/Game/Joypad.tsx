import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';

interface JoypadProps {
  radius?: number;
}

export const Joypad: React.FC<JoypadProps> = ({ radius = 50 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [innerPosition, setInnerPosition] = useState({ x: 0, y: 0 });
  const outerRadius = radius * 1.3;
  
  const { mySnake, updateSnakeAngle, isPlaying } = useGameStore();

  const centerInner = useCallback((x: number, y: number) => {
    setInnerPosition({ x, y });
  }, []);

  const handleDown = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setPosition({ x, y });
    setInnerPosition({ x, y });
    setIsActive(true);
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isActive || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    const dX = mouseX - position.x;
    const dY = mouseY - position.y;
    const distance = Math.sqrt(dX * dX + dY * dY);
    
    let newInnerX, newInnerY;
    
    if (distance > outerRadius) {
      const angle = Math.atan2(dY, dX);
      newInnerX = position.x + Math.cos(angle) * outerRadius;
      newInnerY = position.y + Math.sin(angle) * outerRadius;
    } else {
      newInnerX = mouseX;
      newInnerY = mouseY;
    }
    
    setInnerPosition({ x: newInnerX, y: newInnerY });
    
    // Calculate angle for snake movement
    const angle = Math.atan2(position.x - newInnerX, position.y - newInnerY) * (180 / Math.PI);
    updateSnakeAngle(angle + 90);
  }, [isActive, position, outerRadius, updateSnakeAngle]);

  const handleUp = useCallback(() => {
    setIsActive(false);
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDown(e.clientX, e.clientY);
  }, [handleDown]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleUp();
  }, [handleUp]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDown(touch.clientX, touch.clientY);
  }, [handleDown]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    handleUp();
  }, [handleUp]);

  // Global mouse events for when mouse leaves the canvas
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isActive) {
        handleMove(e.clientX, e.clientY);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isActive) {
        handleUp();
      }
    };

    if (isActive) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isActive, handleMove, handleUp]);

  // Draw joypad
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isActive) return;

    // Draw outer circle
    ctx.beginPath();
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    ctx.arc(position.x, position.y, outerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw inner circle
    ctx.beginPath();
    ctx.fillStyle = 'red';
    ctx.arc(innerPosition.x, innerPosition.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }, [isActive, position, innerPosition, radius, outerRadius]);

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: isPlaying ? 'auto' : 'none',
        zIndex: 100,
        background: 'transparent'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
};