export const theme = {
  colors: {
    // Brand / accents
    blue: '#1677C8',
    blue2: '#29B6FF',
    green: '#0B8F3E',
    green2: '#22C55E',

    // Status
    red: '#DC2626',
    orange: '#F59E0B',
    gray: '#6B7280',

    // Luxury neutrals
    N0: '#FFFFFF',
    N25: '#FBFCFE',
    N50: '#F6F8FB',
    N100: '#EEF2F7',
    N200: '#DEE6F0',
    N700: '#334155',
    N900: '#0F172A',

    // Surfaces (glass / depth)
    bgA: '#FBFCFE',
    bgB: '#FFFFFF',

    // Compatibility tokens (used by your current screens)
    bg: '#FBFCFE',
    card: 'rgba(255,255,255,0.86)',
    surface: 'rgba(255,255,255,0.86)',
    surfaceStrong: 'rgba(255,255,255,0.92)',
    border: 'rgba(15, 23, 42, 0.10)',
    stroke: 'rgba(15, 23, 42, 0.10)',
    stroke2: 'rgba(22,119,200,0.18)',
    strokeStrong: 'rgba(22,119,200,0.22)',

    // Tints
    tintBlue: 'rgba(214,235,255,0.35)',
    tintGreen: 'rgba(236,253,243,0.40)',

    text: '#0F172A',
    textSecondary: '#334155',
    muted: '#64748B',
    textMuted: '#64748B',

    danger: '#DC2626',
    warning: '#F59E0B',
    success: '#0B8F3E',

    skeleton: 'rgba(203,213,225,0.55)',
  },

  radius: {
    xl: 24,
    lg: 20,
    md: 16,
    sm: 12,
    pill: 999,
  },

  shadow: {
    soft: {
      elevation: 6,
      shadowColor: '#0B1220',
      shadowOpacity: 0.10,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    hard: {
      elevation: 10,
      shadowColor: '#0B1220',
      shadowOpacity: 0.14,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
    },
    sheet: {
      elevation: 14,
      shadowColor: '#0B1220',
      shadowOpacity: 0.16,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 18 },
    },
  },

  type: {
    display: { fontSize: 28, lineHeight: 34, fontWeight: '900' },
    h1: { fontSize: 22, lineHeight: 28, fontWeight: '900' },
    h2: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
    h3: { fontSize: 16, lineHeight: 22, fontWeight: '900' },
    body: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  },

  spacing: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
}