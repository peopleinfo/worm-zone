import React from "react";

import { useSettingsStore } from "../../stores/settingsStore";
import { audioService } from "../../services/audioService";
import { useTranslation } from "react-i18next";

export const EffectsMuteButton: React.FC<{ isAbsolute?: boolean }> = React.memo(({ isAbsolute = true }) => {
  const { sound, updateSoundSettings } = useSettingsStore();
  const { t } = useTranslation();
  const isEffectsMuted = sound.effectsMuted;

  const handleToggleEffectsMute = async () => {
    const newEffectsMutedState = !isEffectsMuted;
    
    console.log('🎵 Effects mute button clicked, new state:', newEffectsMutedState);
    
    try {
      // For iOS, ensure audio context is unlocked on user interaction
      audioService.handleUserInteraction();
      
      // Update settings - only effects mute, keep music mute independent
      updateSoundSettings({ 
        effectsMuted: newEffectsMutedState
      });

      // Ensure audio service is synced
      audioService.setEffectsMuted(newEffectsMutedState);
      
      console.log('🎵 Effects mute toggle completed successfully');
    } catch (error) {
      console.error('🎵 Error toggling effects mute:', error);
    }
  };

  return (
    <button
      className="circle-button"
      style={isAbsolute ? { position: "absolute", left: 160, top: 20 } : {}}
      onClick={handleToggleEffectsMute}
      aria-label={
        isEffectsMuted ? t("game:audio.unmuteEffects") : t("game:audio.muteEffects")
      }
      title={isEffectsMuted ? t("game:audio.unmuteEffects") : t("game:audio.muteEffects")}
    >
      {isEffectsMuted ? (
        <img src="/icons/mute.png" alt="Mute Effects" />
      ) : (
        <img src="/icons/unmute.png" alt="Unmute Effects" />
      )}
    </button>
  );
});

EffectsMuteButton.displayName = "EffectsMuteButton";
