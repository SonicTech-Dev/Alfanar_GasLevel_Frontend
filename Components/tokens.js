export const tokens = {
  colors: {
    N0: '#FFFFFF',
    N25: '#FBFCFE',
    N50: '#F6F8FB',
    N100: '#EEF2F7',
    N200: '#DEE6F0',
    N300: '#CAD6E5',
    N500: '#7A8AA0',
    N700: '#334155',
    N900: '#0F172A',

    B50: '#EAF4FF',
    B100: '#D6EBFF',
    B400: '#2A86FF',
    B600: '#1677C8',
    B800: '#0B4E8A',

    G50: '#ECFDF3',
    G600: '#0B8F3E',

    A50: '#FFFBEB',
    A600: '#F59E0B',

    R50: '#FEF2F2',
    R600: '#DC2626',

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

  spacing: {
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

  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    pill: 999,
  },

  type: {
    display: { fontSize: 28, lineHeight: 34, fontWeight: '900' },
    h1: { fontSize: 22, lineHeight: 28, fontWeight: '900' },
    h2: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
    h3: { fontSize: 16, lineHeight: 22, fontWeight: '900' },
    body: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  },

  shadow: {
    card: {
      elevation: 6,
      shadowColor: '#0B1220',
      shadowOpacity: 0.10,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    floating: {
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
}