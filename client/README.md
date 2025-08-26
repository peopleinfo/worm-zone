# Snake Zone Client

This directory contains the client-side application for the Snake Zone game.

## Technologies Used

- React
- Vite
- TypeScript

## Installation

To install the dependencies, navigate to this directory and run:

```bash
npm install
```

## Running the Application

To start the development server, run:

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173` (or another port if 5173 is in use).

## Features

### Connection Status Management

The game includes a robust connection status system that handles server disconnections gracefully:

- **Connection Status Modal**: Automatically appears when the server disconnects during gameplay
- **Auto-reconnection**: Attempts to reconnect automatically with exponential backoff
- **Manual Reconnection**: Players can manually attempt to reconnect
- **Game Pausing**: The game automatically pauses when disconnected to prevent desync
- **Connection Indicator**: Shows real-time connection status in the top-left corner
- **Return to Menu**: Option to return to the main menu if reconnection fails

#### Connection Status Indicators:
- 🟢 **Green**: Connected and playing
- 🟡 **Yellow**: Connected but game paused
- 🔴 **Red**: Disconnected

The system supports up to 5 automatic reconnection attempts before requiring manual intervention.