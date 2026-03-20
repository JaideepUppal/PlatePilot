export const platePilotColors = {
  black: '#1E140D',
  orange: '#F47C2C',
  orangeDark: '#D9631A',
  orangeSoft: '#FFF1E7',
  orangeGlow: '#FFD7BD',
  cream: '#FFF9F4',
  creamAlt: '#FEF3EA',
  white: '#FFFFFF',
  text: '#1E140D',
  textSoft: '#6F584B',
  textMuted: '#9A7C6B',
  muted: '#A48473',
  border: '#ECD8C8',
  borderSoft: '#F3D6C2',
  borderSubtle: 'rgba(244,124,44,0.14)',
  placeholder: '#C9A897',
  label: '#B6927D',
  chipBg: '#FFF4EC',
  pillBg: 'rgba(255,255,255,0.92)',
  surfaceGlass: 'rgba(255,255,255,0.92)',
  surfaceGlassStrong: 'rgba(255,255,255,0.94)',
  whiteOverlay: 'rgba(255,255,255,0.22)',
  cardGlow: 'rgba(244,124,44,0.10)',
  shadow: '#D97A36',
  successText: '#8A4415',
  danger: '#D95A2B',
  dangerDark: '#B23A1E',
  dangerSurface: '#FCE8DF',
  dangerText: '#8B2E17',
  scrim: 'rgba(30,20,13,0.28)',
} as const;

export const platePilotTypography = {
  heading: 'BebasNeue_400Regular',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodyBold: 'PlusJakartaSans_700Bold',
  bodyExtraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const platePilotSpacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 32,
  heroTop: 64,
} as const;

export const platePilotRadii = {
  chip: 999,
  button: 16,
  pill: 20,
  card: 24,
  cardLarge: 32,
  sheet: 30,
  input: 16,
  logo: 10,
} as const;

export const platePilotInputTheme = {
  colors: {
    primary: platePilotColors.orange,
    outline: platePilotColors.border,
    background: platePilotColors.white,
    onSurfaceVariant: platePilotColors.placeholder,
  },
} as const;
