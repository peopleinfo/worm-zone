import React, { useEffect, useState } from "react";
import { useGameStore } from "../../stores/gameStore";
import type { LeaderboardPlayer } from "../../stores/gameStore";
import { authService } from "../../services/authService";

export const Leaderboard: React.FC = React.memo(() => {
  const leaderboard = useGameStore((state) => state.leaderboard);
  const fullLeaderboard = useGameStore((state) => state.fullLeaderboard);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);
  const isPlaying = useGameStore((state) => state.isPlaying);
  const [marginTop, setMarginTop] = useState({ statusBarHeight: 0 });

  // Show top 10 players, but always include current player if not in top 10
  const getDisplayedPlayers = (): LeaderboardPlayer[] => {
    const topPlayers = leaderboard.slice(0, 9);
    const currentPlayerInTop = topPlayers.find((p) => p.id === currentPlayerId);

    if (!currentPlayerInTop && currentPlayerId) {
      // Find current player in full leaderboard to get their actual rank
      const currentPlayerInFull = fullLeaderboard.find(
        (player) => player.id === currentPlayerId
      );
      if (currentPlayerInFull) {
        // Add current player at the end with their actual rank from full leaderboard
        return [...topPlayers, currentPlayerInFull];
      }
    }

    return topPlayers;
  };
  const displayedPlayers = getDisplayedPlayers();

  const totalPlayers =
    fullLeaderboard.length > 0 ? fullLeaderboard.length : leaderboard.length;

  useEffect(() => {
    authService.getWindowInfo().then((margin) => {
      setMarginTop(margin);
    });
  }, []);

  if (displayedPlayers.length === 0 || !isPlaying) {
    return null;
  }

  return (
    <div className="leaderboard" style={{ left: marginTop?.statusBarHeight }}>
      <div className="playing-leaderboard-header">
        {/* <span className="playing-leaderboard-icon"></span> */}
        <span className="playing-leaderboard-title">
          Top players (in the arena: {totalPlayers})
        </span>
      </div>

      <div className="leaderboard-list">
        {displayedPlayers.map((player) => {
          const isCurrentPlayer = player.id === currentPlayerId;
          const displayRank = player.rank;

          return (
            <div
              key={player.id}
              className={`leaderboard-item ${
                isCurrentPlayer ? "current-player" : ""
              } ${player.isBot ? "bot-player" : "human-player"}`}
            >
              <span className="player-rank">{displayRank}.</span>
              <span
                className={`player-name ${
                  isCurrentPlayer ? "current-player-name" : ""
                }`}
              >
                {player.name}
              </span>
              <div className="player-score">
                {/* <span className="score-icon">👤</span> */}
                <span className="score-value">
                  {Math.round(player.score).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

Leaderboard.displayName = "Leaderboard";
