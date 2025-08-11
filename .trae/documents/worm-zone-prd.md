# Worm Zone - Product Requirements Document

## 1. Product Overview

Worm Zone is a real-time multiplayer snake-style game designed for mobile devices in landscape mode. Players compete in shared rooms with up to 3 participants, with AI bots filling empty slots to ensure engaging gameplay.

The game targets mobile users seeking quick, competitive multiplayer experiences with seamless room-based matchmaking and social gameplay features.

## 2. Core Features

### 2.1 User Roles

| Role   | Registration Method | Core Permissions                        |
| ------ | ------------------- | --------------------------------------- |
| Player | MOS SDK integration | Can join rooms, play games, view scores |
| Guest  | Auto-generated ID   | Limited gameplay, no score persistence  |

### 2.2 Feature Module

Our Worm Zone game consists of the following main pages:

1. **Game Arena**: main game canvas, real-time multiplayer gameplay, score display, joypad controls
2. **Room Lobby**: auto room joining, countdown display (3,2,1), player list with bot indicators
3. **Game Over Modal**: score summary, highest score display, restart functionality
4. **Landing Home**: main entry point with settings icon, language selection, game start
5. **Settings Modal**: orientation lock, sound controls, language selection, user profile access

### 2.3 Page Details

| Page Name       | Module Name      | Feature Description                                                        |
| --------------- | ---------------- | -------------------------------------------------------------------------- |
| Landing Home    | Settings Icon    | Right-side settings gear icon that opens settings modal                   |
| Landing Home    | Game Start       | Main entry point with play button and game branding                       |
| Landing Home    | Language Display | Current language flag indicator in top area                                |
| Game Arena      | Game Canvas      | Render worm movement, food collection, collision detection, real-time sync |
| Game Arena      | Joypad Controls  | Touch-based directional controls optimized for landscape mode              |
| Game Arena      | Score Display    | Real-time score updates, leaderboard during gameplay                       |
| Room Lobby      | Auto Matchmaking | Connect players to available rooms, fill with bots if needed               |
| Room Lobby      | Countdown Timer  | Display 3-2-1 countdown before game starts                                 |
| Room Lobby      | Player Status    | Show connected players, bot indicators, connection status                  |
| Game Over Modal | Score Summary    | Display current score, highest score, session statistics                   |
| Game Over Modal | Modal Close      | Close modal and reset all game state (equivalent to SPA hard reload)      |
| Game Over Modal | Restart Controls | Start new game without page reload, rejoin room with zero score            |
| Settings Modal  | Language Tab     | Flag-based language selection (EN, KH, CN) with react-i18next integration |
| Settings Modal  | Orientation Lock | Force landscape mode, prevent rotation                                     |
| Settings Modal  | Sound Controls   | Audio settings and volume controls                                         |
| Settings Modal  | User Profile     | MOS SDK integration for user info, login status                            |

## 3. Core Process

**Main Game Flow:**

1. User opens app → Auto-orientation to landscape mode
2. Landing home displays with settings icon and current language
3. User can access settings modal for language/preferences or start game
4. System auto-connects to available room
5. Display lobby with player count and 3-2-1 countdown
6. Game starts with synchronized gameplay
7. On death → Show game over modal with scores
8. Modal Close → Complete state reset (equivalent to app restart)
9. Restart → New game with zero score and rejoin room

```mermaid
graph TD
    A[App Launch] --> B[Force Landscape Mode]
    B --> C[Landing Home]
    C --> D{User Action}
    D -->|Settings Icon| E[Settings Modal]
    D -->|Start Game| F[Auto Join Room]
    E --> G{Settings Action}
    G -->|Language Change| H[Update Language]
    G -->|Close Settings| C
    H --> C
    F --> I[Lobby Screen]
    I --> J[Countdown 3-2-1]
    J --> K[Game Arena]
    K --> L{Game Over?}
    L -->|No| K
    L -->|Yes| M[Game Over Modal]
    M --> N{User Action}
    N -->|Close Modal| O[Complete State Reset]
    N -->|Restart Game| P[New Game Start]
    O --> C
    P --> F
```

## 4. User Interface Design

### 4.1 Design Style

* **Primary Colors**: Vibrant green (#00FF88) for worms, dark blue (#1a1a2e) for background

* **Secondary Colors**: Orange (#FF6B35) for food, red (#FF0000) for danger/collision

* **Button Style**: Rounded corners with 8px radius, gradient backgrounds

* **Font**: Roboto Bold for scores, Roboto Regular for UI text (16px-24px)

* **Layout Style**: Full-screen landscape with floating UI elements

* **Icons**: Minimalist line icons, gaming-themed emojis (🐍, 🎮, 🏆)

### 4.2 Page Design Overview

| Page Name       | Module Name | UI Elements                                                                    |
| --------------- | ----------- | ------------------------------------------------------------------------------ |
| Landing Home    | Settings Icon | Gear icon positioned top-right, subtle glow effect, tap animation             |
| Landing Home    | Language Flag | Current language flag icon in top area, smooth flag transitions               |
| Landing Home    | Main Layout | Centered game logo, play button, gradient background with game theme          |
| Settings Modal  | Language Tab | Three flag buttons (🇺🇸 EN, 🇰🇭 KH, 🇨🇳 CN), selected state highlighting        |
| Settings Modal  | Modal Design | Centered overlay with blur background, rounded corners, slide-up animation    |
| Settings Modal  | Controls    | Toggle switches, sliders, organized sections with clear labels                |
| Game Arena      | Game Canvas | Full-screen dark background, neon-style worm trails, particle effects for food |
| Game Arena      | Joypad      | Semi-transparent circular pad, bottom-right corner, haptic feedback            |
| Game Arena      | Score HUD   | Top-left floating panel, real-time score updates, mini leaderboard             |
| Room Lobby      | Player List | Card-based layout, player avatars, bot indicators with robot icons             |
| Room Lobby      | Countdown   | Large centered numbers with pulsing animation, countdown sound effects         |
| Game Over Modal | Score Panel | Centered modal with blur background, trophy icons, animated score counting     |

### 4.3 Responsiveness

**Landscape-Only Design**: The entire application is optimized exclusively for landscape orientation on mobile devices. Orientation lock is enforced at the application level to prevent rotation to portrait mode.

## 5. Technical Architecture

### 5.1 Technology Stack

* **Frontend**: React 18 + TypeScript + Vite

* **State Management**: Zustand for game state and UI state

* **Internationalization**: react-i18next for multi-language support

* **Real-time Communication**: Socket.io client

* **Mobile Integration**: MOS SDK for mini-program features

* **Backend**: Node.js + Express + Socket.io server

### 5.2 Development Flow

#### 5.2.1 Environment Setup

```bash
# Development command (watches both client and server)
npm run dev

# Port management (if needed)
npx kill-port 3000 5000
```

#### 5.2.2 Code Organization Principles

**DRY Implementation:**

* Shared types between client/server in `/shared/types`

* Reusable game logic in `/shared/game-engine`

* Common utilities in `/shared/utils`

* Socket event definitions in `/shared/events`

**File Structure:**

```
/client
  /public
    /locales       # i18n translation files
      /en          # English translations
        common.json
        game.json
      /kh          # Khmer translations
        common.json
        game.json
      /cn          # Chinese translations
        common.json
        game.json
  /src
    /components     # Reusable UI components
      /modals       # Modal components (Settings, GameOver)
      /ui           # Basic UI components
    /game          # Game-specific logic
    /hooks         # Custom React hooks
    /stores        # Zustand stores
    /services      # API and socket services
    /utils         # Client utilities
    /i18n          # Internationalization setup
/server
  /src
    /controllers   # Route handlers
    /services      # Business logic
    /socket        # Socket.io handlers
    /utils         # Server utilities
/shared           # Common code between client/server
  /types          # TypeScript definitions
  /game-engine    # Core game logic
  /events         # Socket event definitions
  /utils          # Shared utilities
```

#### 5.2.3 Development Guidelines

1. **Orientation Enforcement**: Implement CSS and JavaScript locks for landscape mode
2. **Socket Synchronization**: Use Zustand middleware for socket state sync
3. **Game State Management**: Centralized game state with predictable updates
4. **Internationalization**: react-i18next setup with JSON translation files
5. **Error Handling**: Graceful degradation for connection issues
6. **Performance**: 60fps gameplay with optimized rendering

#### 5.2.4 Testing Strategy

* **Unit Tests**: Game logic, utilities, and pure functions

* **Integration Tests**: Socket communication and state synchronization

* **Mobile Testing**: Landscape orientation and touch controls

* **Multiplayer Testing**: Room management and real-time sync

### 5.3 Internationalization Setup

#### 5.3.1 Language Support

* **Supported Languages**: English (EN), Khmer (KH), Chinese (CN)
* **Default Language**: English (EN)
* **Language Detection**: Browser language detection with fallback to default
* **Persistence**: Selected language stored in localStorage

#### 5.3.2 Translation Structure

**Translation Files Location**: `/client/public/locales/{language}/`

**File Organization**:
```
/locales
  /en
    common.json     # Common UI elements, buttons, labels
    game.json       # Game-specific terms, scores, messages
  /kh
    common.json     # Khmer translations
    game.json       # Khmer game terms
  /cn
    common.json     # Chinese translations
    game.json       # Chinese game terms
```

**Translation Keys Structure**:
```json
// common.json
{
  "settings": {
    "title": "Settings",
    "language": "Language",
    "sound": "Sound",
    "close": "Close"
  },
  "buttons": {
    "play": "Play",
    "restart": "Restart",
    "close": "Close"
  }
}

// game.json
{
  "score": {
    "current": "Score",
    "highest": "Best Score",
    "rank": "Rank"
  },
  "game": {
    "gameOver": "Game Over",
    "countdown": "Get Ready",
    "waiting": "Waiting for players..."
  }
}
```

#### 5.3.3 Implementation Details

**React-i18next Configuration**:
```typescript
// i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'kh', 'cn'],
    defaultNS: 'common',
    ns: ['common', 'game'],
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json'
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });
```

**Language Switching Component**:
```typescript
// components/LanguageSelector.tsx
const LanguageSelector = () => {
  const { i18n } = useTranslation();
  
  const languages = [
    { code: 'en', flag: '🇺🇸', name: 'English' },
    { code: 'kh', flag: '🇰🇭', name: 'ខ្មែរ' },
    { code: 'cn', flag: '🇨🇳', name: '中文' }
  ];
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
};
```

### 5.4 Deployment

* **Development**: Local development with hot reload and i18n hot reloading

* **Production**: Optimized builds with environment-specific configs and pre-loaded translations

* **Mobile**: MOS SDK integration for mini-program deployment with language detection

## 6. API Documentation

### 6.1 Socket Events

#### Client to Server Events

| Event Name | Parameters | Description |
|------------|------------|-------------|
| `playerMove` | `{ playerId: string, angle: number, x: number, y: number, points: Array }` | Updates player position and movement data |
| `foodEaten` | `{ playerId: string, foodId: number }` | Notifies server when player consumes food |
| `deadPointEaten` | `{ playerId: string, deadPoints: Array }` | Notifies server when player consumes dead points |
| `playerDied` | `{ playerId: string, deadPoints: Array }` | Notifies server when player dies and provides body points |
| `requestMinimumPlayers` | `{ minPlayers: number }` | Requests server to spawn bots to reach minimum player count |

#### Server to Client Events

| Event Name | Data Structure | Description |
|------------|----------------|-------------|
| `gameInit` | `{ playerId: string, gameState: GameState }` | Initial game state sent to new player |
| `playerJoined` | `Player` | Broadcasts new player joining to existing players |
| `playerMoved` | `{ playerId: string, x: number, y: number, angle: number, points: Array }` | Broadcasts player movement to other players |
| `playerDied` | `{ playerId: string, deadPoints: Array }` | Broadcasts player death and resulting dead points |
| `playerRespawned` | `Player` | Broadcasts player respawn after death |
| `playerDisconnected` | `string` | Broadcasts player ID when they disconnect |
| `playerLeft` | `{ playerId: string }` | Broadcasts when player leaves the game |
| `foodRegenerated` | `Food` | Broadcasts food regeneration after consumption |
| `deadPointsRemoved` | `{ deadPoints: Array }` | Broadcasts removal of consumed dead points |
| `scoreUpdate` | `{ playerId: string, score: number }` | Broadcasts score updates |
| `leaderboardUpdate` | `{ leaderboard: Array }` | Broadcasts updated leaderboard |
| `gameStats` | `{ playerCount: number, foodCount: number, leaderboard?: Array }` | Periodic game statistics |

### 6.2 Game State Management

#### Game State Structure
```typescript
interface GameState {
  players: Map<string, Player>;
  foods: Food[];
  deadPoints: DeadPoint[];
  maxFoods: number;
  worldWidth: number;
  worldHeight: number;
}

interface Player {
  id: string;
  socketId: string | null;
  x: number;
  y: number;
  points: Point[];
  angle: number;
  radius: number;
  speed: number;
  color: string;
  score: number;
  alive: boolean;
  isBot?: boolean;
}

interface Food {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface DeadPoint {
  x: number;
  y: number;
  radius: number;
  color: string;
}
```

#### Bot Management
- Maximum 20 bots allowed simultaneously
- Bots spawn automatically when first human player joins
- Bots are removed permanently when they die
- Bot AI includes collision detection, food consumption, and boundary checking

#### Game Mechanics
- World size: 2000x2000 pixels
- Maximum 1000 food items
- Dead points cleanup when exceeding 5000 items
- Human players respawn after 3 seconds, bots are permanently removed
- Score system: 1 point per food, 1 point per dead point consumed

### 6.3 Server Configuration

#### Server Setup
- **Port**: 9000 (configurable via PORT environment variable)
- **CORS**: Enabled for all origins
- **Socket.io**: Real-time communication with automatic reconnection
- **Static Files**: Disabled (client served separately)

#### Update Intervals
- Bot movement updates: 100ms
- Game statistics broadcast: 5000ms
- Leaderboard updates: 1000ms
- Dead points cleanup: 30000ms

#### Performance Optimizations
- Efficient collision detection using distance calculations
- Batch processing of dead points
- Periodic cleanup of game objects
- Optimized leaderboard generation with sorting and filtering

## 7. Game Over Modal State Management

### 7.1 Modal Close Functionality

**Requirement**: When user closes the Game Over modal (via close button, ESC key, or clicking outside), the application should perform a complete state reset equivalent to a hard page reload but within the SPA context.

**Implementation Details**:
- Reset all Zustand store state to initial values (except persistent data like highest score)
- Clear all game objects (snakes, food, dead points)
- Disconnect from current multiplayer room
- Reset socket connection state
- Clear any running timers or intervals
- Reset canvas and UI components to initial state
- Return to initial app state (ready to join new room)

**State Reset Scope**:
```typescript
// Complete state reset includes:
- Game state (isPlaying, isGameOver, score, rank)
- Game objects (mySnake, otherSnakes, foods, deadPoints)
- Room state (currentPlayerId, leaderboard, playerCount)
- UI state (controls, countdown, status)
- Socket state (disconnect and prepare for new connection)
// Preserve only:
- Persistent stats (highestScore)
- User preferences and settings
```

### 7.2 Restart Game Functionality

**Requirement**: When user clicks "Restart" or "Play Again" button, start a new game session without page reload while maintaining the current room context if possible.

**Implementation Details**:
- Reset game-specific state (score, rank, game objects)
- Preserve room connection and player context
- Rejoin the same room or find new room if current is full
- Start new game countdown (3-2-1)
- Initialize fresh game objects and canvas
- Maintain socket connection for seamless transition

**State Reset Scope**:
```typescript
// Restart game reset includes:
- Game state (score: 0, rank: 0, isGameOver: false)
- Game objects (reset snakes, foods, dead points)
- Game status (return to countdown/lobby state)
// Preserve:
- Room connection and player ID
- Socket connection
- Leaderboard context
- User session and preferences
- Highest score and statistics
```

### 7.3 User Interface Requirements

**Modal Controls**:
- **Close Button (×)**: Triggers complete state reset
- **ESC Key**: Triggers complete state reset
- **Click Outside Modal**: Triggers complete state reset
- **Play Again Button**: Triggers restart game functionality
- **Spacebar**: Triggers restart game functionality (existing)

**Visual Feedback**:
- Loading states during state transitions
- Clear distinction between close and restart actions
- Confirmation dialogs for destructive actions (optional)

### 7.4 Technical Implementation

**Zustand Store Actions**:
```typescript
// New store actions required:
resetCompleteState: () => void;  // For modal close
restartGame: () => void;          // For play again
cleanupGameSession: () => void;   // Cleanup utilities
```

**Socket Event Handling**:
- Proper cleanup of socket listeners on complete reset
- Graceful room leaving on modal close
- Room rejoin logic for restart functionality

**Component Lifecycle**:
- Proper cleanup of React components and effects
- Canvas context reset and reinitialization
- Timer and interval cleanup

## 8. Settings Modal Functionality

### 8.1 Settings Modal Requirements

**Trigger**: Settings gear icon positioned in the top-right corner of the Landing Home page

**Modal Behavior**:
- Slide-up animation from bottom of screen
- Blur background overlay
- Modal can be closed by:
  - Close button (×) in modal header
  - Clicking outside modal area
  - ESC key press
  - Swipe down gesture (mobile)

**Modal Sections**:
1. **Language Selection Tab**
   - Three language options with flag icons
   - Current language highlighted with border/background
   - Immediate language switch on selection
   - Smooth transition animations

2. **Sound Controls**
   - Master volume slider
   - Sound effects toggle
   - Background music toggle
   - Haptic feedback toggle (mobile)

3. **Game Settings**
   - Orientation lock toggle
   - Performance mode selection
   - Graphics quality settings

4. **User Profile** (MOS SDK Integration)
   - User avatar and name display
   - Login/logout functionality
   - Account settings access

### 8.2 Language Selection Implementation

**Language Options**:
- 🇺🇸 English (EN) - Default
- 🇰🇭 Khmer (KH) - ភាសាខ្មែរ
- 🇨🇳 Chinese (CN) - 中文

**Selection Behavior**:
- Flag icons with country names
- Selected language shows active state
- Instant UI language update
- Persistent storage in localStorage
- Fallback to browser language detection

**UI Updates on Language Change**:
- All text elements update immediately
- Modal remains open to show changes
- Smooth text transition animations
- No page reload required

### 8.3 Settings State Management

**Zustand Store Integration**:
```typescript
interface SettingsStore {
  // Modal state
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  
  // Language state
  currentLanguage: 'en' | 'kh' | 'cn';
  changeLanguage: (lang: string) => void;
  
  // Audio settings
  masterVolume: number;
  soundEffects: boolean;
  backgroundMusic: boolean;
  hapticFeedback: boolean;
  
  // Game settings
  orientationLock: boolean;
  performanceMode: 'high' | 'medium' | 'low';
  graphicsQuality: 'high' | 'medium' | 'low';
}
```

**Persistence Strategy**:
- Settings stored in localStorage
- Automatic sync with MOS SDK user preferences
- Cloud backup for logged-in users
- Graceful fallback for storage failures

## 9. Implementation Priorities

### Phase 1: Core Infrastructure

* [ ] Landing Home page with settings icon

* [ ] Settings modal component structure

* [ ] Landscape orientation lock implementation

* [ ] Socket.io client/server setup

* [ ] Basic game canvas and rendering

* [ ] Zustand store architecture

### Phase 2: Internationalization & Settings

* [ ] React-i18next setup and configuration

* [ ] Translation files for EN, KH, CN languages

* [ ] Language selector component

* [ ] Settings modal functionality

* [ ] Audio and game settings controls

### Phase 3: Game Mechanics

* [ ] Worm movement and collision detection

* [ ] Food generation and consumption

* [ ] Score calculation and display

* [ ] Game over detection

### Phase 4: Multiplayer Features

* [ ] Room management system

* [ ] Auto-matchmaking with bots

* [ ] Real-time state synchronization

* [ ] Player connection handling

### Phase 5: UI/UX Polish

* [ ] Joypad controls optimization

* [ ] Game over modal with animations

* [ ] Lobby countdown and player display

* [ ] Settings modal animations and transitions

* [ ] Language switching animations

* [ ] MOS SDK profile integration

## 10. Success Metrics

* **Performance**: Maintain 60fps during gameplay

* **Connectivity**: <100ms latency for real-time sync

* **User Experience**: Seamless landscape-only operation with intuitive settings

* **Internationalization**: Support for 3 languages with smooth switching

* **Engagement**: Average session duration >5 minutes

* **Accessibility**: Settings modal accessible via multiple interaction methods

* **Stability**: <1% crash rate during gameplay

