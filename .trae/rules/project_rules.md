# project brief

- project name: worm zone
- project type: multiplayer game
- project description: this is a multiplayer game, you can play with your friend in same room, and you can play with bot is less than 3 player.
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

## Development

- Dev: for development just use npm run dev it will watch all files change both api and client
- DRY: do not repeat yourself, check code base and avoid duplicate code
- PORT: do not change port both api and client if you want run check existing port mean it working fine it't content already latest or you can kill those port before start new dev can use npx kill-port or other way
