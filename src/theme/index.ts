const theme = {
  colors: {
    primary: '#3f51b5', // Blue 500
    primaryVariant: '#303f9f', // Blue 700
    secondary: '#f44336', // Red 500
    secondaryVariant: '#d32f2f', // Red 700
    background: '#f5f5f5', // Grey 100
    surface: '#ffffff', // White
    error: '#b00020', // Red A400
    onPrimary: '#ffffff', // White
    onSecondary: '#000000', // Black
    onBackground: '#000000', // Black
    onSurface: '#000000', // Black
    onError: '#ffffff', // White
  },
  typography: {
    h1: {
      fontFamily: 'Roboto',
      fontSize: 96,
      fontWeight: 'bold',
      letterSpacing: -1.5,
      lineHeight: 96,
    },
    h2: {
      fontFamily: 'Roboto',
      fontSize: 60,
      fontWeight: 'bold',
      letterSpacing: -0.5,
      lineHeight: 72,
    },
    h3: {
      fontFamily: 'Roboto',
      fontSize: 48,
      fontWeight: 'bold',
      letterSpacing: 0,
      lineHeight: 56,
    },
    h4: {
      fontFamily: 'Roboto',
      fontSize: 34,
      fontWeight: 'bold',
      letterSpacing: 0.25,
      lineHeight: 48,
    },
    h5: {
      fontFamily: 'Roboto',
      fontSize: 24,
      fontWeight: 'bold',
      letterSpacing: 0,
      lineHeight: 32,
    },
    h6: {
      fontFamily: 'Roboto',
      fontSize: 20,
      fontWeight: 500,
      letterSpacing: 0.15,
      lineHeight: 24,
    },
    subtitle1: {
      fontFamily: 'Roboto',
      fontSize: 16,
      fontWeight: 500,
      letterSpacing: 0.15,
      lineHeight: 24,
    },
    subtitle2: {
      fontFamily: 'Roboto',
      fontSize: 14,
      fontWeight: 500,
      letterSpacing: 0.1,
      lineHeight: 20,
    },
    body1: {
      fontFamily: 'Roboto',
      fontSize: 16,
      fontWeight: 'normal',
      letterSpacing: 0.5,
      lineHeight: 24,
    },
    body2: {
      fontFamily: 'Roboto',
      fontSize: 14,
      fontWeight: 'normal',
      letterSpacing: 0.25,
      lineHeight: 20,
    },
    button: {
      fontFamily: 'Roboto',
      fontSize: 14,
      fontWeight: 'medium',
      letterSpacing: 1.25,
      lineHeight: 16,
    },
    caption: {
      fontFamily: 'Roboto',
      fontSize: 12,
      fontWeight: 'normal',
      letterSpacing: 0.4,
      lineHeight: 16,
    },
    overline: {
      fontFamily: 'Roboto',
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: 1.5,
      lineHeight: 16,
    },
  },
  grid: {
    size: 8,
  },
  shadows: ['none', '0px 2px 4px rgba(0, 0, 0, 0.1)'],
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const

export const lightTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    background: '#f5f5f5',
    surface: '#ffffff',
    onBackground: '#000000',
    onSurface: '#000000',
  },
} as const

export const darkTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    primary: '#9fa8da', // Purple 200
    primaryVariant: '#5c6bc0', // Indigo 700
    secondary: '#ff7043', // Deep Orange 300
    secondaryVariant: '#e64a19', // Deep Orange 900
    background: '#212121', // Grey 900
    surface: '#424242', // Grey 800
    error: '#ef5350', // Red 400
    onPrimary: '#212121', // Grey 900
    onSecondary: '#ffffff', // White
    onBackground: '#ffffff', // White
    onSurface: '#ffffff', // White
    onError: '#ffffff', // White
  },
} as const

export default theme

export type Theme = typeof theme
