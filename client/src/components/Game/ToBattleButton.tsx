import { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { socketClient } from '../../services/socketClient';
import { useSettingsStore } from '../../stores/settingsStore';

// Configuration constants
const MIN_PLAYERS_FOR_BATTLE = 10;

export const ToBattleButton = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { closeSettingsModal } = useSettingsStore();
  const { 
    startCountdown, 
    stopCountdown, 
    isCountingDown, 
    countdownValue,
    playerCount,
    isPlaying 
  } = useGameStore();

  useEffect(() => {
    // Check initial connection status
    setIsConnected(socketClient.isSocketConnected());
  }, []);

  const handleToBattle = async () => {
    if (isConnecting || isCountingDown) return;

    setIsConnecting(true);
    setConnectionError(null);
    closeSettingsModal();

    try {
      // Ensure any existing connection is closed first
      if (socketClient.isSocketConnected()) {
        socketClient.disconnect();
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Auto-connect to multiplayer server
      await socketClient.connect();
      setIsConnected(true);
      
      // Wait for minimum players (including bots)
      await waitForMinimumPlayers();
      
      // Start countdown after ensuring minimum players
      await startCountdown();
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect to server');
      setIsConnected(false);
      stopCountdown();
    } finally {
      setIsConnecting(false);
    }
  };

  const waitForMinimumPlayers = async (): Promise<void> => {
    return new Promise((resolve) => {
      const checkPlayers = () => {
        const currentPlayerCount = useGameStore.getState().playerCount;
        if (currentPlayerCount >= MIN_PLAYERS_FOR_BATTLE) {
          resolve();
        } else {
          // Request server to add bots if needed
          if (socketClient.isSocketConnected()) {
            socketClient.requestMinimumPlayers(MIN_PLAYERS_FOR_BATTLE);
          }
          setTimeout(checkPlayers, 500);
        }
      };
      checkPlayers();
    });
  };

  const getButtonText = () => {
    if (isConnecting) return 'Connecting...';
    if (isCountingDown && countdownValue) return `Starting in ${countdownValue}...`;
    // if (isConnected && playerCount < MIN_PLAYERS_FOR_BATTLE) return `Waiting for players (${playerCount}/${MIN_PLAYERS_FOR_BATTLE})`;
    return 'To Battle!';
  };

  const isButtonDisabled = () => {
    return isConnecting || isCountingDown;
  };

  // Hide the button when the game is playing
  if (isPlaying) {
    return null;
  }

  return (
    <div className="to-battle-container">
      <button 
        onClick={handleToBattle}
        disabled={isButtonDisabled()}
        className="to-battle-btn"
      >
        {getButtonText()}
      </button>
      
      {isCountingDown && countdownValue && (
        <div className="countdown-overlay">
          <div className="countdown-number">{countdownValue}</div>
          <div className="countdown-text">Get Ready!</div>
        </div>
      )}
      
      {connectionError && (
        <div className="connection-error">
          Error: Connection failed
        </div>
      )}
      
      {isConnected && (
        <div className="connection-status">
          ✅ Connected - Players: {playerCount}/{MIN_PLAYERS_FOR_BATTLE} minimum
          {socketClient.getPlayerId() && (
            <span className="player-id"> (ID: {socketClient.getPlayerId()})</span>
          )}
        </div>
      )}
    </div>
  );
};