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
    foods,
    deadPoints,
    isPlaying
  } = useGameStore();

  // Mini map dimensions
  const MINI_MAP_WIDTH = 150;
  const MINI_MAP_HEIGHT = 120;
  
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
    // Draw other snakes
    otherSnakes.forEach(snake => {
      if (!snake.isAlive || !snake.points || snake.points.length === 0) return;
      
      ctx.strokeStyle = snake.color || '#FF5722';
      ctx.lineWidth = Math.max(1, snake.points[0]?.radius * scaleX * 0.5 || 1);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      snake.points.forEach((point, index) => {
        const x = point.x * scaleX;
        const y = point.y * scaleY;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // Draw head as a larger dot
      if (snake.points.length > 0) {
        const head = snake.points[0];
        const headX = head.x * scaleX;
        const headY = head.y * scaleY;
        const headRadius = Math.max(1.5, head.radius * scaleX * 0.7);
        
        ctx.fillStyle = snake.color || '#FF5722';
        ctx.beginPath();
        ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Draw my snake (highlight it)
    if (mySnake && mySnake.isAlive && mySnake.points && mySnake.points.length > 0) {
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = Math.max(1.5, mySnake.points[0]?.radius * scaleX * 0.6 || 1.5);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      mySnake.points.forEach((point, index) => {
        const x = point.x * scaleX;
        const y = point.y * scaleY;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // Draw my snake's head with a glow effect
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
  }, [mySnake, otherSnakes, foods, deadPoints, isPlaying]);

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