import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Volume2, VolumeX, Gamepad2, User } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { LanguageSelector } from './LanguageSelector';

export const SettingsModal: React.FC = () => {
  const { t } = useTranslation('common');
  const { 
    isSettingsModalOpen, 
    closeSettingsModal, 
    sound, 
    updateSoundSettings,
    controls,
    updateControlSettings,
    profile,
    updateUserProfile
  } = useSettingsStore();

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSettingsModalOpen) {
        closeSettingsModal();
      }
    };

    if (isSettingsModalOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isSettingsModalOpen, closeSettingsModal]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeSettingsModal();
    }
  };

  // Handle swipe down to close (touch events)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startY = touch.clientY;
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentTouch = moveEvent.touches[0];
      const deltaY = currentTouch.clientY - startY;
      
      // If swiped down more than 100px, close modal
      if (deltaY > 100) {
        closeSettingsModal();
        document.removeEventListener('touchmove', handleTouchMove);
      }
    };
    
    document.addEventListener('touchmove', handleTouchMove, { once: true });
  };

  if (!isSettingsModalOpen) return null;

  return (
    <div 
      className="settings-modal-overlay"
      onClick={handleBackdropClick}
    >
      <div 
        className="settings-modal"
        onTouchStart={handleTouchStart}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h2 className="modal-title">{t('settings.title')}</h2>
          <button 
            className="close-button"
            onClick={closeSettingsModal}
            aria-label={t('navigation.close')}
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          {/* Language Selection */}
          <LanguageSelector />

          {/* Sound Settings */}
          <div className="settings-section">
            <h3 className="section-title">
              <Volume2 size={20} />
              {t('settings.sound')}
            </h3>
            
            <div className="setting-item">
              <label>{t('settings.music')}</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={sound.music}
                  onChange={(e) => updateSoundSettings({ music: parseFloat(e.target.value) })}
                  className="volume-slider"
                />
                <span className="slider-value">{Math.round(sound.music * 100)}%</span>
              </div>
            </div>

            <div className="setting-item">
              <label>{t('settings.effects')}</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={sound.effects}
                  onChange={(e) => updateSoundSettings({ effects: parseFloat(e.target.value) })}
                  className="volume-slider"
                />
                <span className="slider-value">{Math.round(sound.effects * 100)}%</span>
              </div>
            </div>

            <div className="setting-item">
              <button 
                className={`toggle-button ${sound.muted ? 'active' : ''}`}
                onClick={() => updateSoundSettings({ muted: !sound.muted })}
              >
                {sound.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                {sound.muted ? 'Unmute' : 'Mute'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};