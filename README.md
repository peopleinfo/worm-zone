# Snake Zone Game

this is a multiplayer game, you can play with your friend in same room, and you can play with bot is less than 3 player.

- ux/ui:
  - support only mobile portrait mode and landscape mode
  - laptop or desktop no need handle it

- game rule:
  - [ ] auto connect to room with display join room and playing in 3,2,1
  - [ ] when die will alert center small modal to show basic score, highest score, and restart button
  - [ ] when restart will reset game and join room again with zero score I mean
  - [ ] you can play with your friend in same room, and you can play with bot is less than 3 player.
  - [ ] you can play with bot is less than 3 player otherwise you can play with other player in same room.

## Tech stack

Tech Stack: server and client
make sure you handle correct way eg. api, sync with zustand and socket.io react and game logic etc and best practice for each tech stack.

- server:
  - Node.js
  - Express
  - Socket.io
- client:
  - React
  - TypeScript
  - Socket.io client react
  - zustand store
  - window.mos is sdk for mini program, we can use it to get user info, login, pay, etc.

## Project Structure

- `client/`: Contains the React/TypeScript client application.
- `server/`: Contains the Node.js/Express server application.

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm

### Installation

1. **Clone the repository:**

   ```bash
   git clone xx
   cd snake-zone
   ```

2. **Install client dependencies:**

   ```bash
   cd client
   npm install

   cd ..
   ```

3. **Install server dependencies:**

   ```bash
   npm install
   ```

### Running the Applications

To run both client and server concurrently, use the `npm run dev` command from the project root:

```bash
npm run dev
```

This command will:

- Start the client development server (usually on `http://localhost:5173`)
- Start the Node.js server (usually on `http://localhost:3000`)

Alternatively, you can run them separately:

**Client:**

```bash
cd client
npm run dev
```

**Server:**

```bash
cd server
npm start
```
