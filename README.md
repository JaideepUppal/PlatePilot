# PlatePilot

**Your AI-Powered Culinary Decision Engine.**

PlatePilot is a React Native mobile app that helps you decide what to eat, whether you're cooking from what's in your fridge or looking for a restaurant that matches your mood.

---

## Features

**Inventory Mode**
- Camera-based ingredient scanning powered by AI
- Track fridge items with quantity, unit, and expiry dates
- Automatic expiry prioritisation and daily insights
- Recipe suggestions matched to your current inventory
- AI Kitchen Co-Pilot for cooking questions and substitutions

**VibeCheck**
- Type a craving in plain English — *"cheap Indian food"* or *"late night Korean"*
- Finds nearby restaurants filtered by cuisine type, price range, and distance
- Shows ratings, opening hours, live open/closed status, and links to Maps, website, or phone

---

## Tech Stack

- **Mobile** — React Native, Expo, TypeScript
- **Auth & Database** — Firebase Authentication, Firestore
- **Backend** — Firebase Cloud Functions, Express
- **AI** — Groq (vision + assistant)
- **APIs** — Spoonacular (recipes), Google Places New (restaurants)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
npx expo install @expo/vector-icons
```

Copy `functions/.env.example` to `functions/.env` and fill in your API keys.

### 2. Run locally

The backend runs via the Firebase emulator. You'll need two terminals, and your phone and laptop must be on the same Wi-Fi or hotspot.

**Terminal 1 — start the emulator:**
```bash
npm --prefix functions run build
npx firebase emulators:start --only functions
```

**Terminal 2 — start Expo:**
```bash
npx expo start --lan -c
```

Get your machine's local IP address:
```bash
ipconfig getifaddr en0
```

Set it in `functions/.env`:
```env
EXPO_PUBLIC_API_BASE_URL=http://<your-ip>:5001/<your-project-id>/us-central1/api
```

Open Expo Go on your phone and scan the QR code from Terminal 2.

---

## Contributors
[Aisha Kyobe Natebwa](https://github.com/Aisha173) · [Jaideep Uppal](https://github.com/JaideepUppal) · [Ayra Baig](https://github.com/ayrabaig)
