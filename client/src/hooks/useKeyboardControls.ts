import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

export const useKeyboardControls = () => {
  const { updateControls } = useGameStore();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
          updateControls({ up: true });
          break;
        case 'ArrowDown':
          updateControls({ down: true });
          break;
        case 'ArrowLeft':
          updateControls({ left: true });
          break;
        case 'ArrowRight':
          updateControls({ right: true });
          break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
          updateControls({ up: false });
          break;
        case 'ArrowDown':
          updateControls({ down: false });
          break;
        case 'ArrowLeft':
          updateControls({ left: false });
          break;
        case 'ArrowRight':
          updateControls({ right: false });
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [updateControls]);
};