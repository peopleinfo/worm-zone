import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "../../stores/gameStore";
import { useAuthStore } from "../../stores/authStore";

export const GameOverModal = React.memo(() => {
  const { t } = useTranslation();

  // Use selective subscriptions to minimize re-renders
  const isGameOver = useGameStore((state) => state.isGameOver);
  const score = useGameStore((state) => state.finalScore);
  const rank = useGameStore((state) => state.rank);
  const setGameOver = useGameStore((state) => state.setGameState);

  // Auth store for scores and score update data
  const scores = useAuthStore((state) => state.scores);
  const isLoadingScores = useAuthStore((state) => state.isLoadingScores);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const scoreUpdateData = useAuthStore((state) => state.scoreUpdateData);
  const updateScore = useAuthStore((state) => state.updateScore);

  // Update score and refresh scores when game ends
  useEffect(() => {
    if (isGameOver && score > 0 && isLoggedIn) {
      updateScore(score);
    }
  }, [isGameOver, score, isLoggedIn, updateScore]);

  // Get user-specific highest score from auth store or score update data
  const userHighestScore = scoreUpdateData
    ? scoreUpdateData.newScore
    : scores?.score || 0;

  // Check if this is a new record based on score update data
  const isNewRecord = scoreUpdateData ? scoreUpdateData.scoreChange > 0 : false;

  const handleClose = () => {
    setGameOver({ isGameOver: false });
  };

  if (!isGameOver) return null;

  return (
    <div className="settings-modal">
      {/* Modal Header */}
      <div className="modal-header">
        <h2 className="modal-title">{t("game:gameOver.title")}</h2>
        <button className="close-button" onClick={handleClose}>
          <X size={24} />
        </button>
      </div>
      <div className="modal-content">
        <div className="final-stats">
          <div
            className="stat-item"
            style={{ width: "100%", display: "flex", justifyContent: "center" }}
          >
            <img
              src={"/icons/current-rank.png"}
              alt="score"
              className="stat-icon"
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <span className="stat-label">
                {t("game:gameOver.currentScore")}
              </span>
              <span className="stat-value">{score}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <div className="stat-item">
              <img
                src={"/icons/trophy.png"}
                alt="score"
                className="stat-icon"
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  textAlign: "left",
                }}
              >
                <span className="stat-label">
                  {t("game:gameOver.bestScore")}
                </span>
                <div className="stat-value highlight">
                  {isLoadingScores
                    ? t("game:gameOver.loading")
                    : userHighestScore}
                </div>
              </div>
            </div>
            <div className="stat-item">
              <img
                src={"/icons/rank-leaderboard.png"}
                alt="score"
                className="stat-icon"
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  textAlign: "left",
                }}
              >
                <span className="stat-label">{t("game:gameOver.ranking")}</span>
                <div className="stat-value">#{rank}</div>
              </div>
            </div>
          </div>
          {isNewRecord && (
            <div className="new-record" style={{ marginTop: "4px" }}>
              🎉{" "}
              {t("game:gameOver.newRecord", {
                points: scoreUpdateData?.newScore,
              })}{" "}
              🎉
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

GameOverModal.displayName = "GameOverModal";
