import {
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import { auth } from '../config/firebase';
import { mapFirebaseAuthError } from '../utils/firebaseErrors';

const toUserFriendlyError = (error: unknown): Error => {
  return new Error(mapFirebaseAuthError(error));
};

export const signIn = async (email: string, password: string): Promise<UserCredential> => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw toUserFriendlyError(error);
  }
};

export const signUp = async (email: string, password: string): Promise<UserCredential> => {
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw toUserFriendlyError(error);
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw toUserFriendlyError(error);
  }
};

export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
  return firebaseOnAuthStateChanged(auth, callback);
};
