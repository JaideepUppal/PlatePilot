# PlatePilot

PlatePilot is a mobile app concept for turning ingredient photos into recipe suggestions, then filtering ideas by "vibe" (mood, time, effort). Map-based discovery and nearby ingredient context are planned in future phases.

## Features

### MVP (current + near-term)

- Expo React Native app foundation with typed navigation and theme system
- Auth flow shell (Login, Signup) with UI placeholders for loading, validation, and error handling
- Home shell with two primary entry points: `Inventory Mode` and `VibeCheck`

### Future roadmap

- Ingredient photo capture and recognition pipeline
- Recipe recommendation engine with vibe filters
- Saved preferences, personalization, and onboarding
- Maps integration for nearby store/context experiences

## Tech Stack

- Expo SDK 54
- React Native + TypeScript
- React Navigation (native stack)
- React Native Paper (UI system)
- react-native-safe-area-context

## Architecture (`src/`)

- `app/`: App bootstrap and top-level providers
- `navigation/`: Auth, app, and root navigator composition
- `screens/`: Thin screen-level UI containers
- `components/`: Reusable presentational building blocks
- `theme/`: Shared Paper/navigation theming tokens
- `services/`: API and external integration adapters (planned)
- `store/`: State management and domain state wiring (planned)
- `types/`: Shared TypeScript types and navigation contracts
- `utils/`: Stateless helpers and formatting utilities
- `hooks/`: Reusable custom hooks

## Security

- No API keys or secrets are stored in the mobile app.
- Planned production pattern: mobile client -> backend proxy (Cloud Functions) -> external services.
- Planned data model: Firestore with user-scoped paths such as `users/{uid}/...` to support isolation and access control.

## Getting Started

```bash
npm install
npx expo start --clear --lan
```

## Quality

- Lint: TODO (script not configured yet)
- Format: TODO (script not configured yet)
- Typecheck: TODO (recommended `npx tsc --noEmit` script)
- Tests: TODO (test runner not configured yet)

## Roadmap

- Phase 1: Production foundation skeleton (current)
- Phase 2: Auth wiring and persistent session state
- Phase 3: Inventory capture flow and image input pipeline
- Phase 4: Recipe suggestions + vibe filtering engine
- Phase 5: Cloud Functions proxy, Firestore model, and security hardening
- Phase 6: Maps-based discovery and contextual recommendations
