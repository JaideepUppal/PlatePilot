import { FirebaseError } from 'firebase/app';

const DEFAULT_AUTH_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export const mapFirebaseAuthError = (error: unknown): string => {
  if (!(error instanceof FirebaseError)) {
    return DEFAULT_AUTH_ERROR_MESSAGE;
  }

  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again.';
    case 'auth/missing-password':
      return 'Password is required.';
    default:
      return DEFAULT_AUTH_ERROR_MESSAGE;
  }
};
