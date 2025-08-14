import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';

interface MiniMapProps {
  className?: string;
}

export const MiniMap: React.FC<MiniMapProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  // Get game state from Zustand store
  const {
    mySnake,
    otherSnakes,
    isPlaying
  } = useGameStore();

  // Mini map dimensions
  const MINI_MAP_WIDTH = 200;  
  const MINI_MAP_HEIGHT = 150;
  
  // World dimensions (from GameEngine)
  const WORLD_WIDTH = 2000;
  const WORLD_HEIGHT = 1500;
  
  // Scale factors
  const scaleX = MINI_MAP_WIDTH / WORLD_WIDTH;
  const scaleY = MINI_MAP_HEIGHT / WORLD_HEIGHT;

  const drawMiniMap = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isPlaying) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, MINI_MAP_WIDTH, MINI_MAP_HEIGHT);
    
    // Draw world boundary
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MINI_MAP_WIDTH, MINI_MAP_HEIGHT);
    // Draw other snakes as white dots
    otherSnakes.forEach(snake => {
      if (!snake.isAlive || !snake.points || snake.points.length === 0) return;
      
      // Draw only head as a white dot
      if (snake.points.length > 0) {
        const head = snake.points[0];
        const headX = head.x * scaleX;
        const headY = head.y * scaleY;
        const headRadius = Math.max(2, head.radius * scaleX * 0.8);
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Draw my snake as a green dot
    if (mySnake && mySnake.isAlive && mySnake.points && mySnake.points.length > 0) {
      // Draw my snake's head as a green dot with glow effect
      if (mySnake.points.length > 0) {
        const head = mySnake.points[0];
        const headX = head.x * scaleX;
        const headY = head.y * scaleY;
        const headRadius = Math.max(2, head.radius * scaleX * 0.8);
        
        // Glow effect
        ctx.shadowColor = '#4CAF50';
        ctx.shadowBlur = 3;
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
    }
  };

  useEffect(() => {
    if (!isPlaying) return;
    
    const animate = () => {
      drawMiniMap();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mySnake, otherSnakes, isPlaying]);

  // Don't render if not playing
  if (!isPlaying) {
    return null;
  }

  return (
    <div className={`mini-map-container ${className}`}>
      <canvas
        ref={canvasRef}
        width={MINI_MAP_WIDTH}
        height={MINI_MAP_HEIGHT}
        className="mini-map-canvas"
      />
    </div>
  );
};

MiniMap.displayName = 'MiniMap';