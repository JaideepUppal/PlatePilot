import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Inventory: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>;
};

export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type SignupScreenProps = NativeStackScreenProps<AuthStackParamList, 'Signup'>;
export type HomeScreenProps = NativeStackScreenProps<AppStackParamList, 'Home'>;
export type InventoryScreenProps = NativeStackScreenProps<AppStackParamList, 'Inventory'>;
