import React from "react";
import { useTranslation } from "react-i18next";
import { X, User, Trophy, Target } from "lucide-react";
import { useSettingsStore } from "../../stores/settingsStore";
import { useAuthStore } from "../../stores/authStore";
import { useGameStore } from "../../stores/gameStore";

export const ProfileModal: React.FC = () => {
  const { t } = useTranslation("common");
  const isProfileModalOpen = useSettingsStore(state => state.isProfileModalOpen);
  const closeProfileModal = useSettingsStore(state => state.closeProfileModal);
  const userInfo = useAuthStore(state => state.userInfo);
  const highestScore = useGameStore(state => state.highestScore);
  const leaderboard = useGameStore(state => state.leaderboard);
  const currentPlayerId = useGameStore(state => state.currentPlayerId);
  
  // Get current user's rank from leaderboard
  const getCurrentUserRank = () => {
    if (!currentPlayerId) return null;
    const currentPlayer = leaderboard.find(player => 
      player.id === currentPlayerId || player.realUserId === currentPlayerId
    );
    return currentPlayer?.rank || null;
  };

  const currentRank = getCurrentUserRank();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeProfileModal();
    }
  };

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
                {userInfo?.firstName ? userInfo.firstName : 'N/A'}
              </div>
            </div>

            {/* Game Statistics */}
            <div className="profile-stats">
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-icon">
                    <Trophy size={20} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">{t("profile.bestScore")}</div>
                    <div className="stat-value">{highestScore}</div>
                  </div>
                </div>

                <div className="stat-item">
                  <div className="stat-icon">
                    <Target size={20} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">{t("profile.rank")}</div>
                    <div className="stat-value">{t("profile.currentRank")} N/A</div>
                  </div>
                </div>

                {currentRank && (
                  <div className="stat-item">
                    <div className="stat-icon">
                      <User size={20} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">{t("profile.currentRank")}</div>
                      <div className="stat-value">#{currentRank}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};