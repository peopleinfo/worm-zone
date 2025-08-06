# Snake Zone Game

This repository contains the Snake Zone game, a multiplayer snake game. It includes both client and server components.

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

## MOS SDK Integration

The client application includes automatic login functionality using the MOS SDK. Refer to `client/src/services/README.md` for detailed configuration and usage.
