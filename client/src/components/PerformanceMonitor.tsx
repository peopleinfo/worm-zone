import React from 'react';

interface PerformanceStats {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  objectCount: {
    foods: number;
    deadPoints: number;
    snakes: number;
  };
}

interface PerformanceMonitorProps {
  stats: PerformanceStats;
  visible?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  stats, 
  visible = false 
}) => {
  if (!visible) return null;

  const getPerformanceColor = (fps: number) => {
    if (fps >= 50) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMemoryColor = (memory: number) => {
    if (memory < 50) return 'text-green-400';
    if (memory < 100) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="space-y-1">
        <div className={`flex justify-between ${getPerformanceColor(stats.fps)}`}>
          <span>FPS:</span>
          <span>{stats.fps.toFixed(1)}</span>
        </div>
        
        <div className={`flex justify-between ${getMemoryColor(stats.memoryUsage)}`}>
          <span>Memory:</span>
          <span>{stats.memoryUsage.toFixed(1)}MB</span>
        </div>
        
        <div className="flex justify-between text-blue-400">
          <span>Render:</span>
          <span>{stats.renderTime.toFixed(1)}ms</span>
        </div>
        
        <div className="border-t border-gray-600 pt-1 mt-2">
          <div className="text-gray-300 text-center mb-1">Objects</div>
          <div className="flex justify-between text-gray-400">
            <span>Foods:</span>
            <span>{stats.objectCount.foods}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Points:</span>
            <span>{stats.objectCount.deadPoints}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Snakes:</span>
            <span>{stats.objectCount.snakes}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;