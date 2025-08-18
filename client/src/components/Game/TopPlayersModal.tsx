import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Trophy } from "lucide-react";
import { useSettingsStore } from "../../stores/settingsStore";
import { useAuthStore } from "../../stores/authStore";

export const TopPlayersModal: React.FC = () => {
  const { t } = useTranslation("game");
  const isTopPlayersModalOpen = useSettingsStore(
    (state) => state.isTopPlayersModalOpen
  );
  const closeTopPlayersModal = useSettingsStore(
    (state) => state.closeTopPlayersModal
  );

  const rank = useAuthStore((state) => state.rank);
  const isLoadingRank = useAuthStore((state) => state.isLoadingRank);
  const getRank = useAuthStore((state) => state.getRank);

  useEffect(() => {
    if (isTopPlayersModalOpen) {
      getRank();
    }
  }, [isTopPlayersModalOpen, getRank]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeTopPlayersModal();
    }
  };

  if (!isTopPlayersModalOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={handleBackdropClick}>
      <div className="settings-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            <Trophy size={20} style={{ marginRight: "8px" }} />
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
            {isLoadingRank ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
              </div>
            ) : (
              <div className="leaderboard-container">
                {/* Table Header */}
                <div className="leaderboard-header">
                  <div className="player-rank">#</div>
                  <div className="player-name">Name</div>
                  <div className="player-score">Score</div>
                </div>

                {/* Table Body */}
                <div className="leaderboard-body">
                  {rank?.topPlayers?.map((player, index) => {
                    const isCurrentUser =
                      rank?.currentUserRank?.id === player.id;
                    return (
                      <div
                        key={player.id}
                        className={`leaderboard-item ${
                          isCurrentUser ? "current-player" : ""
                        }`}
                      >
                        <div className="player-rank">{index + 1}</div>
                        <div
                          className="player-name"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <img
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                            }}
                            src={player.avatarUrl}
                            alt={player.name}
                          />
                          {player.name}
                        </div>
                        <div className="player-score">
                          {player.score.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}

                  {/* Current User Rank (if not in top players) */}
                  {rank?.currentUserRank &&
                    !rank.topPlayers.some(
                      (player) => player.id === rank.currentUserRank?.id
                    ) && (
                      <>
                        <div className="leaderboard-separator">...</div>
                        <div className="leaderboard-item current-player">
                          <div className="player-rank">
                            {rank.currentUserRank.rank}
                          </div>
                          <div className="player-name">
                            {rank.currentUserRank.name}
                          </div>
                          <div className="player-score">
                            {rank.currentUserRank.score.toLocaleString()}
                          </div>
                        </div>
                      </>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
