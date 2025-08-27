import React from "react";

import { useSettingsStore } from "../../stores/settingsStore";
import { audioService } from "../../services/audioService";
import { useTranslation } from "react-i18next";

export const MuteToggleButton: React.FC<{ isAbsolute?: boolean }> = React.memo(({ isAbsolute = true }) => {
  const { sound, updateSoundSettings } = useSettingsStore();
  const { t } = useTranslation();
  
  // Use legacy muted property for backward compatibility
  const isMuted = sound.muted;

  const handleToggleMute = () => {
    const newMutedState = !isMuted;
    
    // Update both music and effects mute states
    updateSoundSettings({ 
      muted: newMutedState,
      musicMuted: newMutedState,
      effectsMuted: newMutedState
    });

    // Ensure audio service is synced
    audioService.setMusicMuted(newMutedState);
    audioService.setEffectsMuted(newMutedState);

    // If unmuting, try to play music if it's not already playing
    if (!newMutedState) {
      audioService.ensureMusicIsPlaying();
    }
  };

  return (
    <button
      className="circle-button"
      style={isAbsolute ? { position: "absolute", left: 100, top: 20 } : {}}
      onClick={handleToggleMute}
      aria-label={
        isMuted ? t("game:audio.unmuteMusic") : t("game:audio.muteMusic")
      }
      title={isMuted ? t("game:audio.unmuteMusic") : t("game:audio.muteMusic")}
    >
      {isMuted ? (
        <img src="/icons/mute.png" alt="Mute" />
      ) : (
        <img src="/icons/unmute.png" alt="Unmute" />
      )}
    </button>
  );
});

MuteToggleButton.displayName = "MuteToggleButton";
