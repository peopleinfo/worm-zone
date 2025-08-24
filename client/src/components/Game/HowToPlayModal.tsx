import React from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="how-to-play-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('game:howToPlay.title')}</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-content">
          <div className="rule-section">
            <div style={{ display: "flex", gap: 4 }}>
              <h3>{t('game:howToPlay.gameObjective')}</h3>
            </div>
            <ul>
              <li>{t('game:howToPlay.rules.playWithFriends')}</li>
              <li>{t('game:howToPlay.rules.controlWorm')}</li>
              <li>{t('game:howToPlay.rules.useControls')}</li>
              <li>{t('game:howToPlay.rules.avoidHitting')}</li>
              <li>{t('game:howToPlay.rules.becomeLongest')}</li>
            </ul>
          </div>
          <div className="rule-section">
            <div style={{ display: "flex", gap: 4 }}>
       
              <h3>{t('game:howToPlay.scoringSystem')}</h3>
            </div>
            <ul>
              <li>{t('game:howToPlay.rules.eatFood')}</li>
              <li>{t('game:howToPlay.rules.largerWorms')}</li>
              <li>{t('game:howToPlay.rules.competeScore')}</li>
              <li>{t('game:howToPlay.rules.bestScoreSaved')}</li>
            </ul>
          </div>
          <div className="rule-section">
            <div style={{ display: "flex", gap: 4 }}>
              <h3>{t('game:howToPlay.deathRestart')}</h3>
            </div>
            <ul>
              <li>{t('game:howToPlay.rules.gameEnds')}</li>
              <li>{t('game:howToPlay.rules.viewScore')}</li>
              <li>{t('game:howToPlay.rules.scoreResets')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
