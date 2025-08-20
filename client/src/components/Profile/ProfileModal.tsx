import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, User } from "lucide-react";
import { useSettingsStore } from "../../stores/settingsStore";
import { useAuthStore } from "../../stores/authStore";

export const ProfileModal: React.FC = () => {
  const { t } = useTranslation("common");
  const isProfileModalOpen = useSettingsStore(
    (state) => state.isProfileModalOpen
  );
  const closeProfileModal = useSettingsStore(
    (state) => state.closeProfileModal
  );
  const userInfo = useAuthStore((state) => state.userInfo);
  const scores = useAuthStore((state) => state.scores);
  const rank = useAuthStore((state) => state.rank);
  const isLoadingScores = useAuthStore((state) => state.isLoadingScores);
  const isLoadingRank = useAuthStore((state) => state.isLoadingRank);
  const getScores = useAuthStore((state) => state.getScores);
  const getRank = useAuthStore((state) => state.getRank);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeProfileModal();
    }
  };

  useEffect(() => {
    if (isProfileModalOpen) {
      getScores();
      getRank();
    }
  }, [isProfileModalOpen, getScores, getRank]);

  if (!isProfileModalOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={handleBackdropClick}>
      <div className="settings-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <h2 className="modal-title">{t("profile.title")}</h2>
          <button
            className="close-button"
            onClick={closeProfileModal}
            aria-label={t("navigation.close")}
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          <div className="profile-content">
            <div style={{ marginBottom: 10 }}>
              {/* Profile Picture */}
              <div className="profile-picture">
                {userInfo?.headPortrait ? (
                  <img
                    src={userInfo.headPortrait}
                    alt={t("profile.avatar")}
                    className="profile-avatar"
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    <User size={40} />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="profile-info">
                <div className="profile-name">
                  {userInfo?.firstName ? userInfo.firstName : "N/A"}
                </div>
              </div>
            </div>
            {/* Game Statistics */}
            <div className="profile-stats">
              <div className="stats-grid">
                <div className="stat-item">
                  <img
                    src={"/icons/trophy.png"}
                    alt="score"
                    className="stat-icon"
                  />
                  <div className="stat-content">
                    <div className="stat-label">{t("profile.bestScore")}</div>
                    <div className="stat-value">
                      {isLoadingScores ? "Loading..." : scores?.score || 0}
                    </div>
                  </div>
                </div>

                <div className="stat-item">
                  <img
                    src={"/icons/rank-leaderboard.png"}
                    alt="score"
                    className="stat-icon"
                  />
                  <div className="stat-content">
                    <div className="stat-label">Ranking</div>
                    <div className="stat-value">
                      {isLoadingRank
                        ? "Loading..."
                        : rank?.currentUserRank?.rank ?? "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
