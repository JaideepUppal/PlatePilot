import {
  DefaultTheme as NavigationDefaultTheme,
  Theme as NavigationTheme,
} from '@react-navigation/native';
import { configureFonts, MD3LightTheme, MD3Theme } from 'react-native-paper';

import { platePilotColors as C, platePilotTypography as T } from './designSystem';

const paperFonts = configureFonts({
  config: {
    displayLarge: { fontFamily: T.heading, fontWeight: '400' },
    displayMedium: { fontFamily: T.heading, fontWeight: '400' },
    displaySmall: { fontFamily: T.heading, fontWeight: '400' },
    headlineLarge: { fontFamily: T.heading, fontWeight: '400' },
    headlineMedium: { fontFamily: T.heading, fontWeight: '400' },
    headlineSmall: { fontFamily: T.heading, fontWeight: '400' },
    titleLarge: { fontFamily: T.heading, fontWeight: '400' },
    titleMedium: { fontFamily: T.bodyBold, fontWeight: '700' },
    titleSmall: { fontFamily: T.bodyBold, fontWeight: '700' },
    labelLarge: { fontFamily: T.bodyExtraBold, fontWeight: '800' },
    labelMedium: { fontFamily: T.bodyBold, fontWeight: '700' },
    labelSmall: { fontFamily: T.bodyBold, fontWeight: '700' },
    bodyLarge: { fontFamily: T.bodyMedium, fontWeight: '500' },
    bodyMedium: { fontFamily: T.body, fontWeight: '400' },
    bodySmall: { fontFamily: T.body, fontWeight: '400' },
  },
  isV3: true,
});

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  fonts: paperFonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: C.orange,
    onPrimary: C.white,
    primaryContainer: '#FFE4D2',
    onPrimaryContainer: '#7A330B',
    secondary: C.orangeDark,
    onSecondary: C.white,
    secondaryContainer: C.orangeSoft,
    onSecondaryContainer: C.successText,
    tertiary: C.textSoft,
    onTertiary: C.white,
    tertiaryContainer: C.chipBg,
    onTertiaryContainer: C.text,
    background: C.cream,
    onBackground: C.text,
    surface: C.white,
    onSurface: C.text,
    surfaceVariant: C.orangeSoft,
    onSurfaceVariant: C.textSoft,
    outline: C.border,
    outlineVariant: C.borderSoft,
    inverseSurface: C.black,
    inverseOnSurface: C.white,
    inversePrimary: C.orangeGlow,
    error: C.dangerDark,
    onError: C.white,
    errorContainer: C.dangerSurface,
    onErrorContainer: C.dangerText,
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: C.cream,
      level1: C.surfaceGlass,
      level2: '#FFF7F1',
      level3: C.white,
      level4: C.white,
      level5: C.white,
    },
  },
};

export const navigationTheme: NavigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: paperTheme.colors.primary,
    background: paperTheme.colors.background,
    card: C.surfaceGlassStrong,
    text: C.text,
    border: C.border,
    notification: C.orangeDark,
  },
};
