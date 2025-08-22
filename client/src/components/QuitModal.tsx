import { X } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

interface QuitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const QuitModal: React.FC<QuitModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{t("game:quit.button")}</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className="modal-content">
          <p className="quit-description">{t("game:quit.description")}</p>
          <div className="modal-footer">
            <button className="quit-button" onClick={onConfirm}>
              {t("game:quit.confirm")}
            </button> 
          </div>
        </div>
      </div>
    </div>
  );
};
