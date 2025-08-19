class AudioService {
  private backgroundMusic: HTMLAudioElement | null = null;
  private isInitialized = false;
  private currentVolume = 0.6; // Default 60%
  private isMuted = false;


  constructor() {
    this.initializeAudio();
  }

  private initializeAudio(): void {
    try {
      // Create audio element for background music
      this.backgroundMusic = new Audio('/snake-zone-bg-music.mp3');
      this.backgroundMusic.loop = true;
      this.backgroundMusic.preload = 'auto';
      this.backgroundMusic.volume = this.currentVolume;
      
      // Add error handling for audio loading
      this.backgroundMusic.addEventListener('error', (e) => {
        console.error('🎵 Audio loading error:', e);
        console.error('🎵 Audio error details:', this.backgroundMusic?.error);
      });
      
      this.backgroundMusic.addEventListener('canplaythrough', () => {
        console.log('🎵 Audio loaded successfully');
      });
      
      this.backgroundMusic.addEventListener('play', () => {
        console.log('🎵 Audio started playing');
      });
      
      this.backgroundMusic.addEventListener('pause', () => {
        console.log('🎵 Audio paused');
      });
      
      this.updateVolume();
      this.isInitialized = true;
      
      console.log('🎵 Audio service initialized with volume:', this.currentVolume);
    } catch (error) {
      console.error('Failed to initialize audio service:', error);
    }
  }





  public playBackgroundMusic(): void {
    if (!this.backgroundMusic || !this.isInitialized) {
      console.warn('Audio service not initialized');
      return;
    }

    try {
      // Check if audio is already playing
      if (this.backgroundMusic.paused) {
        this.backgroundMusic.play().catch((error) => {
          console.warn('Failed to play background music:', error);
          // Handle autoplay policy - user interaction required
          if (error.name === 'NotAllowedError') {
            console.log('🎵 Autoplay blocked - waiting for user interaction');
          }
        });
      }
    } catch (error) {
      console.error('Error playing background music:', error);
    }
  }

  public pauseBackgroundMusic(): void {
    if (!this.backgroundMusic) return;

    try {
      this.backgroundMusic.pause();
    } catch (error) {
      console.error('Error pausing background music:', error);
    }
  }

  public stopBackgroundMusic(): void {
    if (!this.backgroundMusic) return;

    try {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    } catch (error) {
      console.error('Error stopping background music:', error);
    }
  }

  public setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.updateVolume();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.updateVolume();
  }

  private updateVolume(): void {
    if (!this.backgroundMusic) return;

    try {
      // Apply mute state and volume
      const effectiveVolume = this.isMuted ? 0 : this.currentVolume;
      this.backgroundMusic.volume = effectiveVolume;
      
      console.log('🎵 Volume updated:', {
        volume: this.currentVolume,
        muted: this.isMuted,
        effectiveVolume
      });
    } catch (error) {
      console.error('Error updating volume:', error);
    }
  }

  public syncWithSettings(): void {
    try {
      // Dynamically import the settings store to avoid circular dependency
      import('../stores/settingsStore').then(({ useSettingsStore }) => {
        const settings = useSettingsStore.getState();
        const newVolume = settings.sound.music;
        const newMuted = settings.sound.muted;
        
        // Only update if values actually changed
        if (this.currentVolume !== newVolume || this.isMuted !== newMuted) {
          this.currentVolume = newVolume;
          this.isMuted = newMuted;
          this.updateVolume();
          console.log('🎵 Settings synced - Volume:', this.currentVolume, 'Muted:', this.isMuted);
          
          // If audio is playing and we just unmuted, ensure it continues
          if (!this.isMuted && this.backgroundMusic && !this.backgroundMusic.paused) {
            this.updateVolume();
          }
        }
      }).catch((error) => {
        console.error('Failed to sync with settings store:', error);
      });
    } catch (error) {
      console.error('Error in syncWithSettings:', error);
    }
  }

  public getCurrentVolume(): number {
    return this.currentVolume;
  }

  public isMusicPlaying(): boolean {
    return this.backgroundMusic ? !this.backgroundMusic.paused : false;
  }

  public ensureMusicIsPlaying(): void {
    // Ensure music is playing if it should be
    if (this.backgroundMusic && this.backgroundMusic.paused && !this.isMuted) {
      console.log('🎵 Ensuring music is playing...');
      this.playBackgroundMusic();
    }
  }

  public handleUserInteraction(): void {
    if (this.backgroundMusic && this.backgroundMusic.paused) {
      console.log('🎵 User interaction - attempting to unlock audio');
      
      this.backgroundMusic.play().then(() => {
        console.log('🎵 Audio unlocked via user interaction!');
        if (!this.isMuted) {
          this.updateVolume();
          console.log('🎵 Audio playing at volume:', this.currentVolume);
        }
      }).catch((error) => {
        console.warn('Failed to unlock audio:', error);
      });
    }
  }

  public destroy(): void {
    if (this.backgroundMusic) {
      this.stopBackgroundMusic();
      this.backgroundMusic = null;
    }
    this.isInitialized = false;
  }

  public testAudioFile(): void {
    // Test if the audio file exists and can be loaded
    console.log('🎵 Testing audio file...');
    const testAudio = new Audio('/snake-zone-bg-music.mp3');
    
    testAudio.addEventListener('canplaythrough', () => {
      console.log('✅ Audio file test successful - file exists and can be played');
    });
    
    testAudio.addEventListener('error', (e) => {
      console.error('❌ Audio file test failed:', e);
      console.error('❌ Audio file error details:', testAudio.error);
    });
    
    // Try to load the audio
    testAudio.load();
  }

  public forceSyncSettings(): void {
    // Force immediate sync with settings
    this.syncWithSettings();
  }
}

// Create singleton instance
export const audioService = new AudioService();

// Export the class for testing purposes
export { AudioService };
