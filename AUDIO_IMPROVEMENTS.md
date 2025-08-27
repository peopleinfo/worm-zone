# Audio System Improvements

## Overview
This document outlines the improvements made to the audio system to fix iOS compatibility issues and implement separate mute controls for music and sound effects.

## Issues Addressed

### 1. iOS Audio Compatibility
- **Problem**: iOS has strict autoplay policies that prevent audio from playing without user interaction
- **Solution**: Added proper iOS audio context initialization and user interaction handling

### 2. Single Mute Control
- **Problem**: Users could only mute both music and sound effects together
- **Solution**: Implemented separate mute controls for music and sound effects

### 3. Audio Context Management
- **Problem**: Audio context wasn't properly initialized on iOS devices
- **Solution**: Added Web Audio API context initialization and resume handling

## Changes Made

### 1. Audio Service (`client/src/services/audioService.ts`)

#### New Properties
- `isMusicMuted`: Separate mute state for background music
- `isEffectsMuted`: Separate mute state for sound effects
- `audioContext`: Web Audio API context for iOS compatibility

#### New Methods
- `setMusicMuted(muted: boolean)`: Control music mute state
- `setEffectsMuted(muted: boolean)`: Control effects mute state
- `getMusicMuted()`: Get current music mute state
- `getEffectsMuted()`: Get current effects mute state
- `initializeAudioContext()`: Initialize Web Audio API context for iOS

#### Updated Methods
- `updateVolume()`: Now applies music mute state only
- `updateEffectsVolume()`: Now applies effects mute state only
- `syncWithSettings()`: Syncs with new separate mute states
- `handleUserInteraction()`: Added iOS audio context initialization

### 2. Settings Store (`client/src/stores/settingsStore.ts`)

#### New Properties
- `musicMuted`: Separate mute state for music
- `effectsMuted`: Separate mute state for effects
- `muted`: Legacy property for backward compatibility

#### Updated Methods
- `updateSoundSettings()`: Now handles separate mute states and syncs with audio service

### 3. New Components

#### MusicMuteButton (`client/src/components/Game/MusicMuteButton.tsx`)
- Dedicated button for controlling music mute state
- Positioned at top-left during gameplay
- Updates both music mute state and legacy muted property

#### EffectsMuteButton (`client/src/components/Game/EffectsMuteButton.tsx`)
- Dedicated button for controlling sound effects mute state
- Positioned next to music mute button
- Only affects sound effects, not background music

### 4. Updated Components

#### SettingsModal (`client/src/components/Settings/SettingsModal.tsx`)
- Added separate mute buttons for music and effects
- Each audio type now has its own mute control
- Better user experience with individual controls

#### GameUI (`client/src/components/Game/GameUI.tsx`)
- Replaced single mute button with separate music and effects mute buttons
- Both buttons are visible during gameplay for easy access

#### App.tsx
- Added iOS audio context initialization
- Added event listeners for user interaction to unlock audio
- Updated sound settings sync to include new mute states

### 5. Translation Updates
Added new translation keys for effects mute controls:
- `game:audio.muteEffects`: "Mute sound effects"
- `game:audio.unmuteEffects`: "Unmute sound effects"

Updated in all language files:
- English (`en/game.json`)
- Chinese (`cn/game.json`)
- Khmer (`kh/game.json`)

### 6. Test Updates (`client/src/services/__tests__/audioService.test.ts`)
- Updated tests to use new method names (`setMusicMuted`, `setEffectsMuted`)
- Added tests for separate mute controls
- Fixed mock audio element handling for proper testing

## iOS Compatibility Features

### 1. Audio Context Initialization
```typescript
private initializeAudioContext(): void {
  if (!this.audioContext && typeof window !== 'undefined' && window.AudioContext) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  if (this.audioContext && this.audioContext.state === 'suspended') {
    this.audioContext.resume();
  }
}
```

### 2. User Interaction Handling
```typescript
// In App.tsx
useEffect(() => {
  const handleUserInteraction = () => {
    audioService.handleUserInteraction();
  };
  
  document.addEventListener('touchstart', handleUserInteraction, { once: true });
  document.addEventListener('click', handleUserInteraction, { once: true });
  document.addEventListener('keydown', handleUserInteraction, { once: true });
}, []);
```

## Usage Examples

### Muting Only Music
```typescript
// Mute only background music
audioService.setMusicMuted(true);
// Sound effects will still play
```

### Muting Only Sound Effects
```typescript
// Mute only sound effects
audioService.setEffectsMuted(true);
// Background music will continue playing
```

### Muting Both
```typescript
// Mute both music and effects
audioService.setMusicMuted(true);
audioService.setEffectsMuted(true);
```

## Backward Compatibility

The system maintains backward compatibility with the existing `muted` property:
- When both `musicMuted` and `effectsMuted` are true, `muted` is set to true
- When either is false, `muted` is set to false
- Legacy code using `setMuted()` will still work but affects both music and effects

## Testing

All audio functionality is covered by comprehensive tests:
- Separate mute controls for music and effects
- iOS audio context initialization
- Volume control and clamping
- Sound effect playback
- Background music control
- Cleanup and destruction

Run tests with:
```bash
npm test -- --run
```

## Benefits

1. **Better iOS Support**: Audio now works properly on iOS devices
2. **Improved User Experience**: Users can control music and effects independently
3. **Flexible Audio Control**: More granular control over audio elements
4. **Backward Compatibility**: Existing code continues to work
5. **Comprehensive Testing**: All functionality is thoroughly tested

## Future Enhancements

1. **Audio Visualization**: Add visual feedback for audio states
2. **Audio Presets**: Save and load audio preference combinations
3. **Advanced iOS Features**: Support for AirPlay and background audio
4. **Audio Analytics**: Track user audio preferences and usage patterns
