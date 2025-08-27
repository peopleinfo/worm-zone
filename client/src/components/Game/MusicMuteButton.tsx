import React from "react";

import { useSettingsStore } from "../../stores/settingsStore";
import { audioService } from "../../services/audioService";
import { useTranslation } from "react-i18next";

export const MusicMuteButton: React.FC<{ isAbsolute?: boolean }> = React.memo(({ isAbsolute = true }) => {
  const { sound, updateSoundSettings } = useSettingsStore();
  const { t } = useTranslation();
  const isMusicMuted = sound.musicMuted;

  const handleToggleMusicMute = () => {
    const newMusicMutedState = !isMusicMuted;
    
    updateSoundSettings({ 
      musicMuted: newMusicMutedState,
      // Update legacy muted property if both music and effects are muted
      muted: newMusicMutedState && sound.effectsMuted
    });

    // Ensure audio service is synced
    audioService.setMusicMuted(newMusicMutedState);

    // If unmuting music, try to play music if it's not already playing
    if (!newMusicMutedState) {
      audioService.ensureMusicIsPlaying();
    }
  };

  return (
    <button
      className="circle-button"
      style={isAbsolute ? { position: "absolute", left: 100, top: 20 } : {}}
      onClick={handleToggleMusicMute}
      aria-label={
        isMusicMuted ? t("game:audio.unmuteMusic") : t("game:audio.muteMusic")
      }
      title={isMusicMuted ? t("game:audio.unmuteMusic") : t("game:audio.muteMusic")}
    >
      {isMusicMuted ? (
        <img src="/icons/mute.png" alt="Mute Music" />
      ) : (
        <img src="/icons/unmute.png" alt="Unmute Music" />
      )}
    </button>
  );
});

MusicMuteButton.displayName = "MusicMuteButton";
