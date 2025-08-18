import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Shield } from "lucide-react";

interface UserInfoDeniedModalProps {
  onRetry: () => void;
}

export const UserInfoDeniedModal: React.FC<UserInfoDeniedModalProps> = ({
  onRetry,
}) => {
  const { t } = useTranslation("common");
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      // Reset loading state after a short delay to show feedback
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };

  return (
    <div className="settings-modal-overlay permission-modal-overlay">
      <div className="settings-modal permission-modal enhanced-permission-modal">
        {/* Header with improved visual hierarchy */}
        <div className="modal-header permission-header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Shield className="icon-shield" />
            <h2 className="modal-title permission-title">
              {t("permission.title")}
            </h2>
          </div>
        </div>

        {/* Main content with better spacing */}
        <div className="permission-content">
          <div className="permission-message">
            <p className="permission-description primary-description">
              {t("permission.description")}
            </p>
          </div>
        </div>

        {/* Enhanced action button */}
        <div className="permission-actions">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className={`retry-button enhanced-retry-button ${
              isRetrying ? "retrying" : ""
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`}
            />
            <span>
              {isRetrying ? t("permission.retrying") : t("permission.retry")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
