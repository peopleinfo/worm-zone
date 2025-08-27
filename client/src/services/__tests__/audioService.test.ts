import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioService } from '../audioService';

// Mock HTMLAudioElement
const mockAudioElement = {
  loop: false,
  preload: '',
  volume: 0,
  currentTime: 0,
  paused: true,
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  load: vi.fn(),
};

// Mock Audio constructor
global.Audio = vi.fn(() => mockAudioElement) as any;

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
      expect(mockAudioElement.loop).toBe(true);
      expect(mockAudioElement.preload).toBe('auto');
    });
  });

  describe('Volume Control', () => {
    it('should set music volume correctly', () => {
      audioService.setVolume(0.5);
      expect(mockAudioElement.volume).toBe(0.5);
    });

    it('should set effects volume correctly', () => {
      audioService.setEffectsVolume(0.7);
      // The effects volume should be applied to eat and game over sounds
      expect(mockAudioElement.volume).toBe(0.7);
    });

    it('should clamp volume values between 0 and 1', () => {
      audioService.setVolume(1.5);
      expect(mockAudioElement.volume).toBe(1);

      audioService.setVolume(-0.5);
      expect(mockAudioElement.volume).toBe(0);
    });
  });

  describe('Mute Control', () => {
    it('should mute all audio when setMuted(true)', () => {
      audioService.setMuted(true);
      expect(mockAudioElement.volume).toBe(0);
    });

    it('should unmute audio when setMuted(false)', () => {
      audioService.setMuted(true);
      audioService.setMuted(false);
      expect(mockAudioElement.volume).toBeGreaterThan(0);
    });
  });

  describe('Sound Effects', () => {
    it('should play eat sound when playEatSound is called', () => {
      audioService.playEatSound();
      expect(mockAudioElement.currentTime).toBe(0);
      expect(mockAudioElement.play).toHaveBeenCalled();
    });

    it('should play game over sound when playGameOverSound is called', () => {
      audioService.playGameOverSound();
      expect(mockAudioElement.currentTime).toBe(0);
      expect(mockAudioElement.play).toHaveBeenCalled();
    });

    it('should not play sounds when muted', () => {
      audioService.setMuted(true);
      audioService.playEatSound();
      expect(mockAudioElement.play).not.toHaveBeenCalled();
    });
  });

  describe('Background Music', () => {
    it('should play background music when playBackgroundMusic is called', () => {
      audioService.playBackgroundMusic();
      expect(mockAudioElement.play).toHaveBeenCalled();
    });

    it('should pause background music when pauseBackgroundMusic is called', () => {
      audioService.pauseBackgroundMusic();
      expect(mockAudioElement.pause).toHaveBeenCalled();
    });

    it('should stop background music when stopBackgroundMusic is called', () => {
      audioService.stopBackgroundMusic();
      expect(mockAudioElement.pause).toHaveBeenCalled();
      expect(mockAudioElement.currentTime).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should clean up audio elements when destroyed', () => {
      audioService.destroy();
      expect(mockAudioElement.pause).toHaveBeenCalled();
    });
  });
});
