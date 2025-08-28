# Quality Settings Feature

## Overview
The snake game now includes configurable quality settings that allow users to adjust the visual quality and performance of the game. This feature provides three quality levels: Low, Medium, and HD.

## Quality Levels

### Low Quality
- **Performance**: Optimized for low-end devices and maximum performance
- **Visual Features**:
  - No image smoothing/anti-aliasing
  - No shadows
  - Simple solid colors (no gradients)
  - Minimal detail level
  - No facial features on snakes
  - No enhanced borders on food

### Medium Quality
- **Performance**: Balanced performance and visual quality
- **Visual Features**:
  - Image smoothing enabled
  - Subtle shadows (2px blur, 1px offset)
  - Gradients on food items
  - Basic facial features on snakes (eyes, ears, mouth)
  - Enhanced line width

### HD Quality (Default)
- **Performance**: High visual quality for capable devices
- **Visual Features**:
  - Full image smoothing with high quality
  - Enhanced shadows (4px blur, 2px offset)
  - Full gradients and enhanced borders on food
  - Complete facial features on snakes
  - Direction indicators for player snakes
  - Maximum detail level

## Implementation Details

### Settings Store
- Added `QualityLevel` type with "low", "medium", "hd" options
- Added `quality` property to settings state (defaults to "hd")
- Added `setQuality` action to update quality settings
- Quality settings are persisted in localStorage

### Quality Utilities
- `qualityUtils.ts` provides quality configuration functions
- `getQualityConfig()` returns quality-specific settings
- `applyQualityToContext()` applies quality settings to canvas context
- `shouldDrawShadow()` and `getShadowConfig()` handle shadow rendering

### Game Components
- **GameEngine**: Applies quality settings to canvas context and subscribes to quality changes
- **Point**: Uses quality settings for shadow rendering
- **Snake**: Conditionally renders facial features based on quality level
- **Food**: Applies gradients and borders based on quality level

### UI Components
- **SettingsModal**: New tabbed interface with Graphics tab
- **QualitySelector**: Radio button-style selector for quality options
- **QualityIndicator**: Small indicator showing current quality in game

## Usage

1. Open the Settings modal (gear icon)
2. Click on the "Graphics" tab
3. Select your preferred quality level:
   - **Low**: For maximum performance
   - **Medium**: For balanced performance and quality
   - **HD**: For best visual quality (default)

## Technical Notes

- Quality changes are applied immediately without requiring a game restart
- Settings are automatically saved and restored on page reload
- The game automatically detects quality changes and updates rendering accordingly
- Quality settings affect both snake and food rendering
- Performance optimizations are automatically applied based on quality level

## Files Modified

- `client/src/stores/settingsStore.ts` - Added quality state management
- `client/src/utils/qualityUtils.ts` - New quality utility functions
- `client/src/components/Settings/SettingsModal.tsx` - Added graphics tab
- `client/src/components/Settings/QualitySelector.tsx` - New quality selector component
- `client/src/components/Game/QualityIndicator.tsx` - New quality indicator
- `client/src/components/Layout/GameLayout.tsx` - Added quality indicator to layout
- `client/src/game/GameEngine.ts` - Quality-aware canvas setup
- `client/src/game/Point.ts` - Quality-aware shadow rendering
- `client/src/game/Snake.ts` - Quality-aware facial features
- `client/src/game/Food.ts` - Quality-aware gradients and borders
- `client/src/index.css` - Added quality selector and indicator styles
- `client/src/i18n/locales/*/common.json` - Added quality translations
