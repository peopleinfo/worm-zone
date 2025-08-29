import React from "react";

import { useSettingsStore } from "../../stores/settingsStore";
import { audioService } from "../../services/audioService";
import { useTranslation } from "react-i18next";

export const MusicMuteButton: React.FC<{ isAbsolute?: boolean }> = React.memo(({ isAbsolute = true }) => {
  const { sound, updateSoundSettings } = useSettingsStore();
  const { t } = useTranslation();
  const isMusicMuted = sound.musicMuted;

  const handleToggleMusicMute = async () => {
    const newMusicMutedState = !isMusicMuted;
    
    console.log('🎵 Music mute button clicked, new state:', newMusicMutedState);
    
    try {
      // For iOS, ensure audio context is unlocked on user interaction
      audioService.handleUserInteraction();
      
      // Update settings - only music mute, keep effects mute independent
      updateSoundSettings({ 
        musicMuted: newMusicMutedState
      });

      // Ensure audio service is synced
      audioService.setMusicMuted(newMusicMutedState);

      // If unmuting music, try to play music if it's not already playing
      if (!newMusicMutedState) {
        // Small delay to ensure settings are updated
        setTimeout(() => {
          audioService.ensureMusicIsPlaying();
        }, 100);
      }
      
      console.log('🎵 Music mute toggle completed successfully');
    } catch (error) {
      console.error('🎵 Error toggling music mute:', error);
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
