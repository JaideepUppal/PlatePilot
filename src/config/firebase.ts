import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auth, Persistence, getAuth, initializeAuth } from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize app only once
export const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

const createAuth = (): Auth => {
  const authWithReactNativePersistence = firebaseAuth as typeof firebaseAuth & {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
  };

  const getReactNativePersistence = authWithReactNativePersistence.getReactNativePersistence;

  if (typeof getReactNativePersistence === 'function') {
    try {
      return initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // initializeAuth can throw during Fast Refresh if Auth is already initialized.
      return getAuth(firebaseApp);
    }
  }

  // DEV NOTE: `firebase/auth` in this SDK path does not expose React Native persistence helpers.
  // Keeping this fallback avoids reintroducing Metro/runtime crashes from `firebase/auth/react-native`.
  if (__DEV__) {
    console.warn(
      'Firebase Auth persistence fallback: using default in-memory auth. Safe RN persistence can be enabled when `getReactNativePersistence` is available from `firebase/auth`.',
    );
  }

  return getAuth(firebaseApp);
};

export const auth = createAuth();
