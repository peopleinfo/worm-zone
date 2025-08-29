class AudioService {
  private backgroundMusic: HTMLAudioElement | null = null;
  private eatSound: HTMLAudioElement | null = null;
  private gameOverSound: HTMLAudioElement | null = null;
  private isInitialized = false;
  private currentVolume = 0.6; // Default 60%
  private currentEffectsVolume = 0.8; // Default 80%
  private isMusicMuted = true; // Default to muted - user must interact to unmute
  private isEffectsMuted = true; // Default to muted - user must interact to unmute
  private wasPlayingBeforeHidden = false;
  private audioContext: AudioContext | null = null;
  private isAudioContextUnlocked = false;
  private unlockAttempts = 0; // Track unlock attempts for iOS

  constructor() {
    this.initializeAudio();
    this.setupPageVisibilityListener();
    this.setupMediaSession();
    this.setupIOSAudioUnlock();
  }

  private initializeAudio(): void {
    try {
      // Create audio element for background music
      this.backgroundMusic = new Audio('/snake-zone-bg-music.mp3');
      this.backgroundMusic.loop = true;
      this.backgroundMusic.preload = 'auto';
      this.backgroundMusic.volume = this.currentVolume;

      // Create audio elements for sound effects
      this.eatSound = new Audio('/eat.mp3');
      this.eatSound.preload = 'auto';
      this.eatSound.volume = this.currentEffectsVolume;

      this.gameOverSound = new Audio('/game-over.mp3');
      this.gameOverSound.preload = 'auto';
      this.gameOverSound.volume = this.currentEffectsVolume;

      // Add error handling for audio loading
      this.setupAudioErrorHandling(this.backgroundMusic, 'Background Music');
      this.setupAudioErrorHandling(this.eatSound, 'Eat Sound');
      this.setupAudioErrorHandling(this.gameOverSound, 'Game Over Sound');

      this.updateVolume();
      this.isInitialized = true;

      console.log('🎵 Audio service initialized with volume:', this.currentVolume, 'effects:', this.currentEffectsVolume);
    } catch (error) {
      console.error('Failed to initialize audio service:', error);
    }
  }

  private setupAudioErrorHandling(audio: HTMLAudioElement | null, name: string): void {
    if (!audio) return;

    audio.addEventListener('error', (e) => {
      console.error(`🎵 ${name} loading error:`, e);
      console.error(`🎵 ${name} error details:`, audio.error);
    });

    audio.addEventListener('canplaythrough', () => {
      console.log(`🎵 ${name} loaded successfully`);
    });

    audio.addEventListener('play', () => {
      console.log(`🎵 ${name} started playing`);
    });

    audio.addEventListener('pause', () => {
      console.log(`🎵 ${name} paused`);
    });
  }

  public playBackgroundMusic(): void {
    if (!this.backgroundMusic || !this.isInitialized) {
      console.warn('Audio service not initialized');
      return;
    }

    // Sync with current settings before attempting to play
    this.syncWithSettings();

    try {
      // Only play if music is not muted and audio is paused
      if (this.backgroundMusic.paused && !this.isMusicMuted) {
        console.log('🎵 Attempting to play background music');
        this.backgroundMusic.play().then(() => {
          // Set media session metadata when music starts playing
          this.setMediaSessionMetadata();
        }).catch((error) => {
          console.warn('Failed to play background music:', error);
          // Handle autoplay policy - user interaction required
          if (error.name === 'NotAllowedError') {
            console.log('🎵 Autoplay blocked - waiting for user interaction');
          }
        });
      } else if (this.isMusicMuted) {
        console.log('🎵 Background music is muted - not playing');
      } else {
        console.log('🎵 Background music is already playing');
        // Ensure media session is set if already playing
        this.setMediaSessionMetadata();
      }
    } catch (error) {
      console.error('Error playing background music:', error);
    }
  }

  public pauseBackgroundMusic(): void {
    if (!this.backgroundMusic) return;

    try {
      this.backgroundMusic.pause();
      // Clear media session metadata when music is paused
      this.clearMediaSessionMetadata();
    } catch (error) {
      console.error('Error pausing background music:', error);
    }
  }

  public stopBackgroundMusic(): void {
    if (!this.backgroundMusic) return;

    try {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      // Clear media session metadata when music is stopped
      this.clearMediaSessionMetadata();
    } catch (error) {
      console.error('Error stopping background music:', error);
    }
  }

  public setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.updateVolume();
  }

  public setEffectsVolume(volume: number): void {
    this.currentEffectsVolume = Math.max(0, Math.min(1, volume));
    this.updateEffectsVolume();
  }

  public setMusicMuted(muted: boolean): void {
    const wasPlaying = this.isMusicPlaying();
    this.isMusicMuted = muted;
    this.updateVolume();

    // Handle play/pause based on mute state
    if (this.backgroundMusic) {
      if (muted && wasPlaying) {
        // Mute: pause the music
        if (this.backgroundMusic && !this.backgroundMusic.paused) {
          this.pauseBackgroundMusic();
          console.log('🎵 Music paused due to mute');
        }
      } else if (!muted && this.backgroundMusic.paused) {
        // Unmute: resume the music
        if (this.backgroundMusic && this.backgroundMusic.paused && this.isInitialized) {
          this.playBackgroundMusic();
          console.log('🎵 Music resumed after unmute');
        }
      } else if (!muted && !this.backgroundMusic.paused) {
        // If unmuting while music is already playing, ensure media session is set
        this.setMediaSessionMetadata();
      }
    }
  }

  public setEffectsMuted(muted: boolean): void {
    this.isEffectsMuted = muted;
    this.updateEffectsVolume();
    console.log('🎵 Effects mute state updated:', muted);
  }

  public getMusicMuted(): boolean {
    return this.isMusicMuted;
  }

  public getEffectsMuted(): boolean {
    return this.isEffectsMuted;
  }

  private updateVolume(): void {
    if (!this.backgroundMusic) return;

    try {
      // Apply mute state and volume
      const effectiveVolume = this.isMusicMuted ? 0 : this.currentVolume;
      this.backgroundMusic.volume = effectiveVolume;

      console.log('🎵 Volume updated:', {
        volume: this.currentVolume,
        musicMuted: this.isMusicMuted,
        effectiveVolume
      });
    } catch (error) {
      console.error('Error updating volume:', error);
    }
  }

  private updateEffectsVolume(): void {
    try {
      // Apply mute state and effects volume
      const effectiveVolume = this.isEffectsMuted ? 0 : this.currentEffectsVolume;
      
      if (this.eatSound) {
        this.eatSound.volume = effectiveVolume;
      }
      if (this.gameOverSound) {
        this.gameOverSound.volume = effectiveVolume;
      }

      console.log('🎵 Effects volume updated:', {
        effectsVolume: this.currentEffectsVolume,
        effectsMuted: this.isEffectsMuted,
        effectiveVolume
      });
    } catch (error) {
      console.error('Error updating effects volume:', error);
    }
  }

  public syncWithSettings(): void {
    try {
      // Dynamically import the settings store to avoid circular dependency
      import('../stores/settingsStore').then(({ useSettingsStore }) => {
        const settings = useSettingsStore.getState();
        const newVolume = settings.sound.music;
        const newEffectsVolume = settings.sound.effects;
        const newMusicMuted = settings.sound.musicMuted;
        const newEffectsMuted = settings.sound.effectsMuted;

        // Only update if values actually changed
        if (this.currentVolume !== newVolume || 
            this.currentEffectsVolume !== newEffectsVolume || 
            this.isMusicMuted !== newMusicMuted ||
            this.isEffectsMuted !== newEffectsMuted) {
          
          this.currentVolume = newVolume;
          this.currentEffectsVolume = newEffectsVolume;
          this.isMusicMuted = newMusicMuted;
          this.isEffectsMuted = newEffectsMuted;
          
          this.updateVolume();
          this.updateEffectsVolume();
          
          console.log('🎵 Settings synced - Volume:', this.currentVolume, 'Effects:', this.currentEffectsVolume, 'Music Muted:', this.isMusicMuted, 'Effects Muted:', this.isEffectsMuted);

          // If music is playing and we just unmuted, ensure it continues
          if (!this.isMusicMuted && this.backgroundMusic && !this.backgroundMusic.paused) {
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

  public getCurrentEffectsVolume(): number {
    return this.currentEffectsVolume;
  }

  public isMusicPlaying(): boolean {
    return this.backgroundMusic ? !this.backgroundMusic.paused : false;
  }

  public playEatSound(): void {
    if (!this.eatSound || !this.isInitialized || this.isEffectsMuted) {
      return;
    }

    try {
      // Reset to beginning and play
      this.eatSound.currentTime = 0;
      this.eatSound.play().catch((error) => {
        console.warn('Failed to play eat sound:', error);
      });
    } catch (error) {
      console.error('Error playing eat sound:', error);
    }
  }

  public playGameOverSound(): void {
    if (!this.gameOverSound || !this.isInitialized || this.isEffectsMuted) {
      return;
    }

    try {
      // Reset to beginning and play
      this.gameOverSound.currentTime = 0;
      this.gameOverSound.play().catch((error) => {
        console.warn('Failed to play game over sound:', error);
      });
    } catch (error) {
      console.error('Error playing game over sound:', error);
    }
  }

  public ensureMusicIsPlaying(): void {
    // Ensure music is playing if it should be
    if (this.backgroundMusic && this.backgroundMusic.paused && !this.isMusicMuted) {
      console.log('🎵 Ensuring music is playing...');
      this.playBackgroundMusic();
    }
  }

  public handleUserInteraction(): void {
    if (!this.backgroundMusic) {
      console.warn('🎵 Background music not initialized');
      return;
    }

    // Initialize audio context for iOS compatibility
    this.initializeAudioContext();
    this.isAudioContextUnlocked = true;

    // Check if this is the first interaction using the store
    import('../stores/settingsStore').then(({ useSettingsStore }) => {
      const settings = useSettingsStore.getState();
      
      if (settings.isFirstInteraction) {
        // First interaction: Force everything muted regardless of saved settings
        console.log('🎵 First user interaction - forcing everything muted');
        this.isMusicMuted = true;
        this.isEffectsMuted = true;
        this.updateVolume();
        this.updateEffectsVolume();
        // Mark first interaction as complete
        useSettingsStore.getState().setFirstInteractionComplete();
        return;
      } else {
        // Subsequent interactions: Respect user's saved settings
        console.log('🎵 Subsequent user interaction - respecting saved settings');
        this.syncWithSettings();
      }
    }).catch((error) => {
      console.error('Failed to check first interaction state:', error);
    });

    if (this.backgroundMusic.paused) {
      console.log('🎵 User interaction - attempting to unlock audio');

      // Only attempt to play if music is not muted
      if (!this.isMusicMuted) {
        this.backgroundMusic.play().then(() => {
          console.log('🎵 Audio unlocked and playing via user interaction!');
          this.updateVolume();
          console.log('🎵 Audio playing at volume:', this.currentVolume);
        }).catch((error) => {
          console.warn('Failed to unlock audio:', error);
          // Handle autoplay policy - user interaction required
          if (error.name === 'NotAllowedError') {
            console.log('🎵 Autoplay still blocked - may need additional user interaction');
          }
        });
      } else {
        console.log('🎵 Music is muted - not playing on user interaction');
        // Still attempt to unlock the audio context for future use, but keep it paused
        this.backgroundMusic.play().then(() => {
          if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            console.log('🎵 Audio context unlocked but kept paused due to mute setting');
          }
        }).catch((error) => {
          console.warn('Failed to unlock audio context:', error);
        });
      }
    } else if (!this.isMusicMuted) {
      // Audio is already playing, just ensure volume is correct
      this.updateVolume();
      console.log('🎵 Audio already playing, volume updated');
    }
  }

  private initializeAudioContext(): void {
    // Initialize Web Audio API context for iOS compatibility
    if (!this.audioContext && typeof window !== 'undefined' && window.AudioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🎵 Audio context initialized for iOS compatibility');
      } catch (error) {
        console.warn('Failed to initialize audio context:', error);
      }
    }

    // Resume audio context if suspended (iOS requirement)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        console.log('🎵 Audio context resumed successfully');
      }).catch((error) => {
        console.warn('Failed to resume audio context:', error);
      });
    }
  }

  public destroy(): void {
    if (this.backgroundMusic) {
      this.stopBackgroundMusic();
      this.backgroundMusic = null;
    }
    if (this.eatSound) {
      this.eatSound.pause();
      this.eatSound = null;
    }
    if (this.gameOverSound) {
      this.gameOverSound.pause();
      this.gameOverSound = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    // Clear media session metadata when destroying service
    this.clearMediaSessionMetadata();
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

  private setupPageVisibilityListener(): void {
    // Set up Page Visibility API listener to handle when user navigates away or locks screen
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.handleVisibilityChange();
      });

      console.log('🎵 Page Visibility API listener set up');
    }
  }

  private handleVisibilityChange(): void {
    if (typeof document === 'undefined') return;

    if (document.hidden) {
      // Page is hidden (user navigated away, locked screen, minimized app, etc.)
      this.handlePageHidden();
    } else {
      // Page is visible again
      this.handlePageVisible();
    }
  }

  private handlePageHidden(): void {
    console.log('🎵 Page hidden - pausing background music');

    // Remember if music was playing before hiding
    this.wasPlayingBeforeHidden = this.isMusicPlaying();

    // Always pause music when page is hidden to prevent lock screen playback
    if (this.backgroundMusic && !this.backgroundMusic.paused) {
      this.pauseBackgroundMusic();
      console.log('🎵 Music paused due to page visibility change');
    }

    // Clear media session metadata to hide lock screen controls
    this.clearMediaSessionMetadata();
    console.log('🎵 Media session metadata cleared for lock screen');
  }

  private handlePageVisible(): void {
    console.log('🎵 Page visible - checking if music should resume');

    // Only resume if music was playing before and user hasn't muted it
    if (this.wasPlayingBeforeHidden && !this.isMusicMuted && this.backgroundMusic && this.backgroundMusic.paused) {
      console.log('🎵 Resuming music after page became visible');
      this.playBackgroundMusic();
    } else if (this.isMusicMuted) {
      console.log('🎵 Music remains paused - user has muted audio');
    } else if (!this.wasPlayingBeforeHidden) {
      console.log('🎵 Music remains paused - was not playing before page was hidden');
    }

    // Reset the flag
    this.wasPlayingBeforeHidden = false;
  }

  private setupMediaSession(): void {
    // Initialize media session if supported
    if ('mediaSession' in navigator) {
      console.log('🎵 Media Session API supported - setting up handlers');

      // Set up media session action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        if (this.backgroundMusic && this.backgroundMusic.paused && !this.isMusicMuted) {
          this.playBackgroundMusic();
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (this.backgroundMusic && !this.backgroundMusic.paused) {
          this.pauseBackgroundMusic();
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        this.stopBackgroundMusic();
      });
    } else {
      console.log('🎵 Media Session API not supported');
    }
  }

  private setMediaSessionMetadata(): void {
    if ('mediaSession' in navigator) {
      // navigator.mediaSession.metadata = new MediaMetadata({});

      // // Set playback state
      // navigator.mediaSession.playbackState = 'playing';
      // console.log('🎵 Media session metadata set');
    }
  }

  private clearMediaSessionMetadata(): void {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      console.log('🎵 Media session metadata cleared');
    }
  }

  private setupIOSAudioUnlock(): void {
    const unlockAudio = () => {
      if (!this.isAudioContextUnlocked) {
        this.initializeAudioContext();
        this.isAudioContextUnlocked = true;
        this.unlockAttempts++;
        console.log('🎵 iOS Audio context unlocked via user interaction (attempt:', this.unlockAttempts, ')');
        
        // Force unlock all audio elements
        this.forceUnlockAllAudio();
        
        // Check if this is the first interaction using the store
        import('../stores/settingsStore').then(({ useSettingsStore }) => {
          const settings = useSettingsStore.getState();
          
          if (!settings.isFirstInteraction) {
            // First interaction: Set isFirstInteraction to true and unmute everything
            console.log('🎵 First user interaction - unmuting everything and setting settings to true');
            useSettingsStore.getState().setFirstInteractionComplete();
            // The setFirstInteractionComplete method will unmute everything and sync with audioService
          } else {
            // Subsequent interactions: Respect user's saved settings
            console.log('🎵 Subsequent user interaction - respecting saved settings');
            this.syncWithSettings();
          }
        }).catch((error) => {
          console.error('Failed to check first interaction state:', error);
        });
        
        // Remove event listeners after first unlock
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('touchend', unlockAudio);
        document.removeEventListener('click', unlockAudio);
      }
    };

    // Add multiple event listeners for iOS compatibility
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('touchend', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });
  }

  private forceUnlockAllAudio(): void {
    console.log('🎵 Force unlocking all audio elements for iOS...');
    
    if (this.backgroundMusic) {
      this.backgroundMusic.play().then(() => {
        this.backgroundMusic?.pause();
        console.log('🎵 Background music unlocked successfully');
      }).catch((error) => {
        console.warn('Failed to unlock background music:', error);
      });
    }
    if (this.eatSound) {
      this.eatSound.play().then(() => {
        this.eatSound?.pause();
        console.log('🎵 Eat sound unlocked successfully');
      }).catch((error) => {
        console.warn('Failed to unlock eat sound:', error);
      });
    }
    if (this.gameOverSound) {
      this.gameOverSound.play().then(() => {
        this.gameOverSound?.pause();
        console.log('🎵 Game over sound unlocked successfully');
      }).catch((error) => {
        console.warn('Failed to unlock game over sound:', error);
      });
    }
  }
}

// Create singleton instance
export const audioService = new AudioService();

// Export the class for testing purposes
export { AudioService };
