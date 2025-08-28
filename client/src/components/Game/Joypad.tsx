import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';

interface JoypadProps {
  radius?: number;
}

export const Joypad: React.FC<JoypadProps> = React.memo(({ radius = 50 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [innerPosition, setInnerPosition] = useState({ x: 0, y: 0 });
  const outerRadius = radius * 1.3;
  
  // Use selective subscriptions to minimize re-renders
  const updateSnakeAngle = useGameStore((state) => state.updateSnakeAngle);
  const isPlaying = useGameStore((state) => state.isPlaying);

  const handleDown = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    
    // Get the rotated coordinates for the joypad
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Transform coordinates to account for 90-degree rotation
    const relativeX = clientX - centerX;
    const relativeY = clientY - centerY;
    
    // Apply inverse rotation to get correct coordinates
    const x = relativeY + rect.width / 2;
    const y = -relativeX + rect.height / 2;
    
    setPosition({ x, y });
    setInnerPosition({ x, y });
    setIsActive(true);
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isActive || !canvasRef.current) return;
    
    // Get the rotated coordinates for the joypad
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Transform coordinates to account for 90-degree rotation
    const relativeX = clientX - centerX;
    const relativeY = clientY - centerY;
    
    // Apply inverse rotation to get correct coordinates
    const mouseX = relativeY + rect.width / 2;
    const mouseY = -relativeX + rect.height / 2;
    
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

  const handleTouchEnd = useCallback(() => {
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

  // Draw joypad - now completely invisible but still functional
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw outer circle
    // ctx.beginPath();
    // ctx.strokeStyle = 'yellow';
    // ctx.lineWidth = 2;
    // ctx.arc(position.x, position.y, outerRadius, 0, Math.PI * 2);
    // ctx.stroke();

    // // Draw inner circle
    // ctx.beginPath();
    // ctx.fillStyle = 'red';
    // ctx.arc(innerPosition.x, innerPosition.y, radius, 0, Math.PI * 2);
    // ctx.fill();

    // No visual elements drawn - completely invisible joypad
    // All functionality remains intact for background operation
  }, [isActive, position, innerPosition, radius, outerRadius]);

  return (
    <canvas
      ref={canvasRef}
      width={window.innerHeight}
      height={window.innerWidth}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: isPlaying ? 'auto' : 'none',
        zIndex: 100,
        background: 'transparent',
        touchAction: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
});

Joypad.displayName = 'Joypad';