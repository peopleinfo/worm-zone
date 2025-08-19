import { useGameStore } from "../../stores/gameStore";
import { useAuthStore } from "../../stores/authStore";
import { socketClient } from "../../services/socketClient";
import { useSettingsStore } from "../../stores/settingsStore";
import { audioService } from "../../services/audioService";
import { HelpCircle } from "lucide-react";
import { MuteToggleButton } from "./MuteToggleButton";

// Configuration constants
const MIN_PLAYERS_FOR_BATTLE = 5;

export const ToBattleButton = () => {
  // Use centralized connection state from authStore
  const isConnecting = useAuthStore((state) => state.isConnecting);
  const connectionError = useAuthStore((state) => state.connectionError);
  const setConnecting = useAuthStore((state) => state.setConnecting);
  const setConnectionError = useAuthStore((state) => state.setConnectionError);
  const clearConnectionError = useAuthStore(
    (state) => state.clearConnectionError
  );

  const { closeSettingsModal } = useSettingsStore();
  const startCountdown = useGameStore((state) => state.startCountdown);
  const stopCountdown = useGameStore((state) => state.stopCountdown);
  const isCountingDown = useGameStore((state) => state.isCountingDown);
  const countdownValue = useGameStore((state) => state.countdownValue);
  const isPlaying = useGameStore((state) => state.isPlaying);
  const toggleHowToPlay = useGameStore((state) => state.toggleHowToPlay);

  const handleToBattle = async () => {
    if (isConnecting || isCountingDown) return;

    // Handle audio context initialization on user interaction
    audioService.handleUserInteraction();

    setConnecting(true);
    clearConnectionError();
    closeSettingsModal();

    try {
      // Ensure any existing connection is closed first
      if (socketClient.isSocketConnected()) {
        socketClient.disconnect();
        // Wait a bit for cleanup
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Auto-connect to multiplayer server
      await socketClient.connect();
      // Wait for minimum players (including bots)
      await waitForMinimumPlayers();

      // Start countdown after ensuring minimum players
      await startCountdown();
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Failed to connect to server"
      );
      stopCountdown();
    } finally {
      setConnecting(false);
    }
  };

  const waitForMinimumPlayers = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const timeout = 15000; // 15 second timeout
      
      const checkPlayers = () => {
        const currentPlayerCount = useGameStore.getState().playerCount;
        const elapsed = Date.now() - startTime;
        
        if (currentPlayerCount >= MIN_PLAYERS_FOR_BATTLE) {
          resolve();
        } else if (elapsed > timeout) {
          reject(new Error(`Timeout waiting for minimum players. Current: ${currentPlayerCount}/${MIN_PLAYERS_FOR_BATTLE}`));
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
    if (isConnecting) return "Connecting...";
    if (isCountingDown && countdownValue)
      return `Starting in ${countdownValue}...`;
    // if (isConnected && playerCount < MIN_PLAYERS_FOR_BATTLE) return `Waiting for players (${playerCount}/${MIN_PLAYERS_FOR_BATTLE})`;
    return "To Battle!";
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

      {/* How to Play Link */}
      <button onClick={toggleHowToPlay} className="how-to-play-link">
        <HelpCircle size={18} />
        How to Play
      </button>
      {connectionError && (
        <div className="connection-error">Error: Connection failed</div>
      )}
      {isCountingDown && countdownValue && (
        <div className="countdown-overlay">
          <div className="countdown-number">{countdownValue}</div>
          <div className="countdown-text">Get Ready!</div>
        </div>
      )}
      <MuteToggleButton />
    </div>
  );
};
