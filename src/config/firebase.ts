import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, Persistence, getAuth, initializeAuth } from 'firebase/auth';

const firebaseEnv = {
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
} as const;

type RequiredFirebaseEnvVar = keyof typeof firebaseEnv;

const getRequiredEnvValue = (key: RequiredFirebaseEnvVar): string => {
  const value = firebaseEnv[key];

  if (!value) {
    throw new Error(
      `[Firebase Config] Missing required environment variable "${key}". ` +
        'Add it to your .env file and restart the Expo server.',
    );
  }

  return value;
};

const firebaseConfig = {
  apiKey: getRequiredEnvValue('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getRequiredEnvValue('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getRequiredEnvValue('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getRequiredEnvValue('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getRequiredEnvValue('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getRequiredEnvValue('EXPO_PUBLIC_FIREBASE_APP_ID'),
};

export const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

const asyncStoragePersistence = {
  type: 'LOCAL',
  async _isAvailable(): Promise<boolean> {
    try {
      const testKey = '__firebase_auth_test__';
      await AsyncStorage.setItem(testKey, '1');
      await AsyncStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
  _set(key: string, value: unknown): Promise<void> {
    return AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async _get<T>(key: string): Promise<T | null> {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  },
  _remove(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  },
};

export const auth: Auth = (() => {
  try {
    return initializeAuth(firebaseApp, {
      persistence: asyncStoragePersistence as unknown as Persistence,
    });
  } catch {
    return getAuth(firebaseApp);
  }
})();
