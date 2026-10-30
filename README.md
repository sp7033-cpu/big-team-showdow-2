# The Big Team Showdown

A browser-based live multiplayer team quiz for up to 50 participants. Players join using a QR code or room PIN; the host controls all 12 questions. Automatic balanced teams, server-side scoring, live standings, and a final winner screen.

## Run locally

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Run `npm start`.
4. Open http://localhost:3000 in a browser, choose **Create host room**, and open the player join link in another browser/device on the same network (using the computer's LAN IP, not localhost, for other devices).

## Deploy to Render

1. Create a free account at https://render.com/ and connect a GitHub repository containing this folder.
2. Create a **Web Service** with runtime Node, build command `npm install`, and start command `npm start`.
3. Select a service tier that supports the expected usage and avoid sleeping instances during the meeting. Render will give you a public HTTPS URL.
4. Open that URL, create a host room, and share the displayed QR code or link.

Other Node.js hosts with persistent WebSocket support also work. This is a single-process in-memory prototype; **rooms reset on restart**, and it is not designed for multi-instance deployments. Do not use sensitive workplace data. Host credentials are stored in the host browser's session storage, so keep that browser tab/session private.

## Rules

- Maximum 50 players, six automatically balanced teams.
- 12 questions, 18 seconds each (host advances manually after reveal).
- 100 points per correct answer in questions 1–9; question 10 is an opinion poll awarding 100 participation points; 200 points per correct answer in questions 11–12.
- Team leaderboard uses average individual score; highest team average wins.
- The host must click **Lock & reveal answer** and **Next question**.
- Players can reconnect with a browser-local token. Late joins after the host starts are disabled.

## Production improvements

For use at an organisational event, consider persistent storage, a host login, rate limiting, session expiry, accessibility testing, consent and data retention notices, and a 50-client load test. Verify organisational approval before using an external hosting service.
