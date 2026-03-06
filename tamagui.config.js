import { createTamagui } from 'tamagui'
import { createAnimations } from '@tamagui/animations-react-native'
import { tokens as baseTokens } from '@tamagui/config/v3'

const animations = createAnimations({
  bouncy: {
    type: 'spring',
    damping: 12,
    mass: 0.9,
    stiffness: 160,
  },
  lazy: {
    type: 'spring',
    damping: 22,
    stiffness: 120,
  },
  quick: {
    type: 'timing',
    duration: 160,
  },
})

const tokens = {
  ...baseTokens,
  color: {
    ...baseTokens.color,

    // Neutrals (ivory tech)
    N0: '#FFFFFF',
    N25: '#FBFCFE',
    N50: '#F6F8FB',
    N100: '#EEF2F7',
    N200: '#DEE6F0',
    N300: '#CAD6E5',
    N500: '#7A8AA0',
    N700: '#334155',
    N900: '#0F172A',

    // Brand blue scale
    B50: '#EAF4FF',
    B100: '#D6EBFF',
    B400: '#2A86FF',
    B600: '#1677C8',
    B800: '#0B4E8A',

    // Success / Warning / Danger
    G50: '#ECFDF3',
    G600: '#0B8F3E',

    A50: '#FFFBEB',
    A600: '#F59E0B',

    R50: '#FEF2F2',
    R600: '#DC2626',

    // Semantic surfaces/text
    background: '#FBFCFE',
    surface: 'rgba(255,255,255,0.86)',
    surfaceStrong: 'rgba(255,255,255,0.92)',
    surfaceTintBlue: 'rgba(214,235,255,0.35)',
    surfaceTintGreen: 'rgba(236,253,243,0.40)',

    strokeSubtle: 'rgba(15,23,42,0.10)',
    strokeStrong: 'rgba(22,119,200,0.22)',

    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    textOnAccent: '#FFFFFF',
  },
  radius: {
    ...baseTokens.radius,
    0: 0,
    1: 12,
    2: 16,
    3: 20,
    4: 24,
    5: 28,
    6: 32,
    pill: 999,
  },
  space: {
    ...baseTokens.space,
    0: 0,
    1: 6,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
  },
  size: {
    ...baseTokens.size,
  },
  zIndex: {
    ...baseTokens.zIndex,
  },
}

const themes = {
  lightLuxury: {
    background: tokens.color.background,
    color: tokens.color.textPrimary,

    surface: tokens.color.surface,
    surfaceStrong: tokens.color.surfaceStrong,
    surfaceTintBlue: tokens.color.surfaceTintBlue,
    surfaceTintGreen: tokens.color.surfaceTintGreen,

    strokeSubtle: tokens.color.strokeSubtle,
    strokeStrong: tokens.color.strokeStrong,

    brand: tokens.color.B600,
    brandStrong: tokens.color.B800,

    success: tokens.color.G600,
    warning: tokens.color.A600,
    danger: tokens.color.R600,

    textPrimary: tokens.color.textPrimary,
    textSecondary: tokens.color.textSecondary,
    textMuted: tokens.color.textMuted,
    textOnAccent: tokens.color.textOnAccent,
  },
}

export const config = createTamagui({
  animations,
  defaultTheme: 'lightLuxury',
  shouldAddPrefersColorThemes: false,
  themeClassNameOnRoot: false,
  themes,
  tokens,
})

export default config