import {
  DefaultTheme as NavigationDefaultTheme,
  Theme as NavigationTheme,
} from '@react-navigation/native';
import { MD3LightTheme, MD3Theme } from 'react-native-paper';

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0F766E',
    secondary: '#0EA5E9',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceVariant: '#E2E8F0',
    error: '#B42318',
  },
};

export const navigationTheme: NavigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: paperTheme.colors.primary,
    background: paperTheme.colors.background,
    card: paperTheme.colors.surface,
    text: '#0F172A',
    border: '#E2E8F0',
  },
};
