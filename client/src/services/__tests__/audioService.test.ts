import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioService } from '../audioService';

// Mock HTMLAudioElement
const createMockAudioElement = () => ({
  loop: false,
  preload: '',
  volume: 0,
  currentTime: 0,
  paused: true,
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  load: vi.fn(),
});

// Mock Audio constructor
global.Audio = vi.fn(() => createMockAudioElement()) as any;

describe('AudioService', () => {
  let audioService: AudioService;

  beforeEach(() => {
    vi.clearAllMocks();
    audioService = new AudioService();
  });

  afterEach(() => {
    audioService.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with correct audio elements', () => {
      expect(global.Audio).toHaveBeenCalledWith('/snake-zone-bg-music.mp3');
      expect(global.Audio).toHaveBeenCalledWith('/eat.mp3');
      expect(global.Audio).toHaveBeenCalledWith('/game-over.mp3');
    });

    it('should set up background music with correct properties', () => {
      const backgroundMusicMock = (global.Audio as any).mock.results[0].value;
      expect(backgroundMusicMock.loop).toBe(true);
      expect(backgroundMusicMock.preload).toBe('auto');
    });
  });

  describe('Volume Control', () => {
    it('should set music volume correctly', () => {
      audioService.setVolume(0.5);
      const backgroundMusicMock = (global.Audio as any).mock.results[0].value;
      expect(backgroundMusicMock.volume).toBe(0.5);
    });

    it('should set effects volume correctly', () => {
      audioService.setEffectsVolume(0.7);
      // The effects volume should be applied to eat and game over sounds
      const eatSoundMock = (global.Audio as any).mock.results[1].value;
      expect(eatSoundMock.volume).toBe(0.7);
    });

    it('should clamp volume values between 0 and 1', () => {
      audioService.setVolume(1.5);
      const backgroundMusicMock = (global.Audio as any).mock.results[0].value;
      expect(backgroundMusicMock.volume).toBe(1);

      audioService.setVolume(-0.5);
      expect(backgroundMusicMock.volume).toBe(0);
    });
  });

  describe('Mute Control', () => {
    it('should mute music when setMusicMuted(true)', () => {
      audioService.setMusicMuted(true);
      const backgroundMusicMock = (global.Audio as any).mock.results[0].value;
      expect(backgroundMusicMock.volume).toBe(0);
    });

    it('should unmute music when setMusicMuted(false)', () => {
      audioService.setMusicMuted(true);
      audioService.setMusicMuted(false);
      const backgroundMusicMock = (global.Audio as any).mock.results[0].value;
      expect(backgroundMusicMock.volume).toBeGreaterThan(0);
    });

    it('should mute effects when setEffectsMuted(true)', () => {
      // Set initial volume first
      audioService.setVolume(0.5);
      audioService.setEffectsMuted(true);
      // Effects mute should not affect background music volume
      const backgroundMusicMock = (global.Audio as any).mock.results[0].value;
      expect(backgroundMusicMock.volume).toBe(0.5);
    });

    it('should get mute states correctly', () => {
      audioService.setMusicMuted(true);
      audioService.setEffectsMuted(false);
      expect(audioService.getMusicMuted()).toBe(true);
      expect(audioService.getEffectsMuted()).toBe(false);
    });
  });

  describe('Sound Effects', () => {
    it('should play eat sound when playEatSound is called', () => {
      audioService.playEatSound();
      const eatSoundMock = (global.Audio as any).mock.results[1].value;
      expect(eatSoundMock.currentTime).toBe(0);
      expect(eatSoundMock.play).toHaveBeenCalled();
    });

    it('should play game over sound when playGameOverSound is called', () => {
      audioService.playGameOverSound();
      const gameOverSoundMock = (global.Audio as any).mock.results[2].value;
      expect(gameOverSoundMock.currentTime).toBe(0);
      expect(gameOverSoundMock.play).toHaveBeenCalled();
    });

    it('should not play sounds when effects are muted', () => {
      audioService.setEffectsMuted(true);
      audioService.playEatSound();
      const eatSoundMock = (global.Audio as any).mock.results[1].value;
      expect(eatSoundMock.play).not.toHaveBeenCalled();
    });
  });

  describe('Background Music', () => {
    it('should play background music when playBackgroundMusic is called', () => {
      audioService.playBackgroundMusic();
      const backgroundMusicMock = (global.Audio as any).mock.results[0].value;
      expect(backgroundMusicMock.play).toHaveBeenCalled();
    });

    it('should pause background music when pauseBackgroundMusic is called', () => {
      audioService.pauseBackgroundMusic();
      const backgroundMusicMock = (global.Audio as any).mock.results[0].value;
      expect(backgroundMusicMock.pause).toHaveBeenCalled();
    });

    it('should stop background music when stopBackgroundMusic is called', () => {
      audioService.stopBackgroundMusic();
      const backgroundMusicMock = (global.Audio as any).mock.results[0].value;
      expect(backgroundMusicMock.pause).toHaveBeenCalled();
      expect(backgroundMusicMock.currentTime).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should clean up audio elements when destroyed', () => {
      audioService.destroy();
      const backgroundMusicMock = (global.Audio as any).mock.results[0].value;
      expect(backgroundMusicMock.pause).toHaveBeenCalled();
    });
  });
});
