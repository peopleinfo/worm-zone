import React from "react";

import { useSettingsStore } from "../../stores/settingsStore";
import { audioService } from "../../services/audioService";
import { useTranslation } from "react-i18next";

export const EffectsMuteButton: React.FC<{ isAbsolute?: boolean }> = React.memo(({ isAbsolute = true }) => {
  const { sound, updateSoundSettings } = useSettingsStore();
  const { t } = useTranslation();
  const isEffectsMuted = sound.effectsMuted;

  const handleToggleEffectsMute = () => {
    const newEffectsMutedState = !isEffectsMuted;
    
    updateSoundSettings({ 
      effectsMuted: newEffectsMutedState,
      // Update legacy muted property if both music and effects are muted
      muted: newEffectsMutedState && sound.musicMuted
    });

    // Ensure audio service is synced
    audioService.setEffectsMuted(newEffectsMutedState);
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
