import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { socketClient } from '../../services/socketClient';

interface MultiplayerConnectionProps {
  onModeChange: (mode: 'single' | 'multiplayer') => void;
}

export const MultiplayerConnection: React.FC<MultiplayerConnectionProps> = ({ onModeChange }) => {
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const { mode, setGameState } = useGameStore();

  useEffect(() => {
    // Check initial connection status
    setIsConnected(socketClient.isSocketConnected());
  }, []);

  const handleConnect = async () => {
    if (isConnected) {
      // Disconnect
      socketClient.disconnect();
      setIsConnected(false);
      setGameState({ mode: 'single' });
      onModeChange('single');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      await socketClient.connect(serverUrl);
      setIsConnected(true);
      setGameState({ mode: 'multiplayer' });
      onModeChange('multiplayer');
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect to server');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleModeSwitch = (newMode: 'single' | 'multiplayer') => {
    if (newMode === 'multiplayer' && !isConnected) {
      handleConnect();
    } else if (newMode === 'single' && isConnected) {
      socketClient.disconnect();
      setIsConnected(false);
      setGameState({ mode: 'single' });
      onModeChange('single');
    } else {
      setGameState({ mode: newMode });
      onModeChange(newMode);
    }
  };

  return (
    <div className="multiplayer-connection">
      <div className="mode-selector">
        <button 
          className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('single')}
          disabled={isConnecting}
        >
          Single Player
        </button>
        <button 
          className={`mode-btn ${mode === 'multiplayer' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('multiplayer')}
          disabled={isConnecting}
        >
          Multiplayer
        </button>
      </div>

      {mode === 'multiplayer' && (
        <div className="connection-controls">
          <div className="server-input">
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="Server URL (e.g., http://localhost:3000)"
              disabled={isConnected || isConnecting}
              className="server-url-input"
            />
          </div>
          
          <button 
            onClick={handleConnect}
            disabled={isConnecting}
            className={`connect-btn ${isConnected ? 'connected' : 'disconnected'}`}
          >
            {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
          </button>
          
          {connectionError && (
            <div className="connection-error">
              Error: {connectionError}
            </div>
          )}
          
          {isConnected && (
            <div className="connection-status">
              ✅ Connected to server
              {socketClient.getPlayerId() && (
                <span className="player-id"> (ID: {socketClient.getPlayerId()})</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};