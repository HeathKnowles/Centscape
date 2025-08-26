# Centscape

## Setup & Run Instructions

### App (React Native / Expo)
1. **Install dependencies:**
   ```powershell
   cd app
   npm install
   ```
2. **Start the app:**
   ```powershell
   npm start
   ```
   - For Android: `npm run android`
   - For iOS: `npm run ios`
   - For Web: `npm run web`

### Server (Node.js / Express)
1. **Install dependencies:**
   ```powershell
   cd server
   npm install
   ```
2. **Build and run:**
   ```powershell
   npm run build
   npm start
   ```
   - For development: `npm run dev`
   - For tests: `npm test`

## Engineering Tradeoffs & Risks

- **Rate Limiting:** The API server uses strict rate limiting (10 requests/min/IP) to prevent abuse, which may block legitimate batch requests.
- **Preview Extraction:** Relies on third-party libraries (`cheerio`, `got`) for HTML parsing and fetching, which may break if upstream APIs change.
- **Persistence:** The app uses `zustand` with `AsyncStorage` for local state; no cloud sync or multi-device support.
- **Schema Migration:** Wishlist store includes migration logic, but future schema changes may require manual intervention.
- **Security:** The server blocks private IPs and enforces protocol checks, but does not sanitize all user input or protect against all attack vectors.
- **Testing:** Server uses Jest for tests, but coverage may be incomplete for edge cases.

## AI Usage Disclosure

This project was assisted by GitHub Copilot and AI-powered code suggestions. Prompts included:
- "Give me a sample react native app for this"
- "Implement an Express API for preview extraction with rate limiting and private IP blocking"

AI-generated code snippets were used for:
- React Native component scaffolding
- Zustand store setup and migration logic
- Express server setup, middleware, and endpoint structure
- HTML parsing and preview extraction logic

## Note
- All AI-generated code was reviewed and adapted for project requirements. No proprietary or sensitive data was used in prompts.
