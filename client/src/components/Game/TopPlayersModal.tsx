import React from "react";
import { useTranslation } from "react-i18next";
import { X, Trophy } from "lucide-react";
import { useSettingsStore } from "../../stores/settingsStore";
import { useGameStore } from "../../stores/gameStore";
import { useAuthStore } from "../../stores/authStore";

// Player interface for userScores-based leaderboard
interface UserScorePlayer {
  id: string;
  name: string;
  score: number;
  rank: number;
  isCurrentPlayer: boolean;
}

export const TopPlayersModal: React.FC = () => {
  const { t } = useTranslation("game");
  const {
    isTopPlayersModalOpen,
    closeTopPlayersModal,
  } = useSettingsStore();
  const userScores = useGameStore((state) => state.userScores);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);
  const getRealUserId = useGameStore((state) => state.getRealUserId);
  const { userInfo, contactInfo } = useAuthStore();

  // Convert userScores object to sorted leaderboard array
  const getUserScoresLeaderboard = (): UserScorePlayer[] => {
    const players: UserScorePlayer[] = [];
    const realUserId = getRealUserId();
    
    // Convert userScores object to array
    Object.entries(userScores).forEach(([userId, score]) => {
      if (score > 0) { // Only include players with scores > 0
        let playerName = 'Anonymous';
        
        // Get player name - prioritize current user's name from auth
        if (userId === realUserId && userInfo?.firstName) {
          playerName = userInfo.firstName;
        } else if (userId === realUserId && contactInfo?.phone) {
          // Fallback to phone number for current user
          playerName = `${contactInfo.dialCode || ''}${contactInfo.phone}`.replace(/^\+/, '');
        } else if (userId === realUserId && contactInfo?.email) {
          // Fallback to email for current user
          playerName = contactInfo.email;
        } else {
          // For other users, use a generic name or the userId
          playerName = `Player ${userId.slice(-4)}`;
        }
        
        players.push({
          id: userId,
          name: playerName,
          score: score,
          rank: 0, // Will be set after sorting
          isCurrentPlayer: userId === currentPlayerId || userId === realUserId
        });
      }
    });
    
    // Sort by score descending and assign ranks
    players.sort((a, b) => b.score - a.score);
    players.forEach((player, index) => {
      player.rank = index + 1;
    });
    
    return players;
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeTopPlayersModal();
    }
  };

  // Get top 5 players for scrollable list
  const getTopPlayers = (): UserScorePlayer[] => {
    const allPlayers = getUserScoresLeaderboard();
    const currentPlayer = allPlayers.find(player => player.isCurrentPlayer);
    
    // If current player is in top 5, show top 5
    if (currentPlayer && currentPlayer.rank <= 5) {
      return allPlayers.slice(0, 5);
    }
    
    // Otherwise show top 5 excluding current player
    return allPlayers.filter(player => !player.isCurrentPlayer).slice(0, 5);
  };

  // Get current player
  const getCurrentPlayer = (): UserScorePlayer | null => {
    const allPlayers = getUserScoresLeaderboard();
    return allPlayers.find(player => player.isCurrentPlayer) || null;
  };

  const topPlayers = getTopPlayers();
  const currentPlayer = getCurrentPlayer();

  if (!isTopPlayersModalOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={handleBackdropClick}>
      <div className="settings-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            <Trophy size={20} style={{ marginRight: '8px' }} />
            {t("leaderboard.topPlayers", "Top Players")}
          </h2>
          <button
            className="close-button"
            onClick={closeTopPlayersModal}
            aria-label={t("navigation.close", "Close")}
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          <div className="top-players-content">
            {/* Top Players List */}
            <div className="top-players-list">
              <div className="players-header">
                <span className="rank-header">#</span>
                <span className="name-header">Player</span>
                <span className="score-header">Score</span>
              </div>
              
              <div className="players-scroll-container">
                {topPlayers.map((player) => (
                  <div 
                    key={player.id} 
                    className={`player-row ${player.id === currentPlayerId ? 'current-player' : ''}`}
                  >
                    <span className="player-rank">#{player.rank}</span>
                    <span className="player-name">
                      {player.name}
                      {player.id === currentPlayerId && (
                        <span className="you-indicator"> ({t("leaderboard.you", "You")})</span>
                      )}
                    </span>
                    <span className="player-score">{Math.round(player.score)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Player (Fixed at Bottom) */}
            {currentPlayer && currentPlayer.rank > 5 && (
              <div className="current-player-section">
                <div className="divider">...</div>
                <div className="player-row current-player">
                  <span className="player-rank">#{currentPlayer.rank}</span>
                  <span className="player-name">
                    {currentPlayer.name}
                    <span className="you-indicator"> ({t("leaderboard.you", "You")})</span>
                  </span>
                  <span className="player-score">{Math.round(currentPlayer.score)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};