import React from 'react';
import { useGameStore } from '../../stores/gameStore';
import type { LeaderboardPlayer } from '../../stores/gameStore';

export const Leaderboard: React.FC = React.memo(() => {
  const leaderboard = useGameStore((state) => state.leaderboard);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);
  const isPlaying = useGameStore((state) => state.isPlaying);

  
  // Show top 10 players, but always include current player if not in top 10
  const getDisplayedPlayers = (): LeaderboardPlayer[] => {
    const topPlayers = leaderboard.slice(0, 10);
    const currentPlayer = leaderboard.find(player => player.id === currentPlayerId);
    
    if (currentPlayer && !topPlayers.find(p => p.id === currentPlayerId)) {
      // Add current player at the end if not in top 10
      return [...topPlayers, currentPlayer];
    }
    
    return topPlayers;
  };
  
  const displayedPlayers = getDisplayedPlayers();
  const totalPlayers = leaderboard.length;
  
  if (displayedPlayers.length === 0 || !isPlaying) {
    return null;
  }
  
  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <span className="leaderboard-icon">👥</span>
        <span className="leaderboard-title">Top players (in the arena: {totalPlayers})</span>
      </div>
      
      <div className="leaderboard-list">
        {displayedPlayers.map((player, index) => {
          const isCurrentPlayer = player.id === currentPlayerId;
          const displayRank = player.rank;
          
          return (
            <div 
              key={player.id} 
              className={`leaderboard-item ${
                isCurrentPlayer ? 'current-player' : ''
              } ${
                player.isBot ? 'bot-player' : 'human-player'
              }`}
            >
              <span className="player-rank">{displayRank}.</span>
              <span className={`player-name ${
                isCurrentPlayer ? 'current-player-name' : ''
              }`}>
                {player.name}
              </span>
              <div className="player-score">
                <span className="score-icon">👤</span>
                <span className="score-value">{player.score.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

Leaderboard.displayName = 'Leaderboard';