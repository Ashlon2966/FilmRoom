export const ACCENT_PRESETS = {
  ORANGE: { key: 'ORANGE', label: 'Cinema Gold', hex: '#f5a623', hover: '#e09612' },
  BLUE: { key: 'BLUE', label: 'Cyan / Blue', hex: '#38bdf8', hover: '#0284c7' },
  PURPLE: { key: 'PURPLE', label: 'Deep Purple', hex: '#a855f7', hover: '#9333ea' },
  GREEN: { key: 'GREEN', label: 'Set Green', hex: '#4ade80', hover: '#22c55e' },
};

export const darkTheme = {
  mode: 'dark',
  background: '#0c0d0e',          // Darkest backdrop
  surface: '#121417',             // Elevated sections, filter bars, headers
  surfaceLight: '#181b1f',        // Cards & elevated panels
  card: '#181b1f',                // Card background
  cardBorder: '#242830',          // Subtle border
  border: '#242830',              // Generic border token
  text: '#ffffff',                // Pure white headings & body
  textSecondary: '#9ca3af',       // Muted slate gray
  textMuted: '#64748b',           // Footers & subtitles
  primary: '#f5a623',             // FilmRoom Cinema Gold / Amber
  primaryHover: '#e09612',
  accent: '#f5a623',
  success: '#4ade80',             // Status success green
  successBg: '#1e3d29',           // Success pill background
  accentGreen: '#4ade80',         // Backward compatibility
  danger: '#f87171',              // Danger / alert red
  dangerBg: '#b91c1c',            // Danger badge background
  badgeBg: '#181b1f',             // Filter & department chip background
  packageBg: '#121417',           // Gear package box
  packageBorder: '#242830',
  packageText: '#f5a623',
};

export const lightTheme = {
  mode: 'light',
  background: '#f8f9fa',          // Studio daylight backdrop
  surface: '#ffffff',             // White elevated sections
  surfaceLight: '#f1f3f5',        // Soft gray cards
  card: '#ffffff',                // Clean white card background
  cardBorder: '#e2e8f0',          // Slate border
  border: '#e2e8f0',              // Generic border
  text: '#0f172a',                // Dark charcoal headings & body
  textSecondary: '#475569',       // Muted slate
  textMuted: '#94a3b8',           // Light slate subtitles
  primary: '#f5a623',             // FilmRoom Gold / Amber accent
  primaryHover: '#e09612',
  accent: '#f5a623',
  success: '#16a34a',             // Clear success green
  successBg: '#dcfce7',           // Light green pill background
  accentGreen: '#16a34a',
  danger: '#dc2626',              // Clear danger red
  dangerBg: '#fee2e2',            // Light red pill background
  badgeBg: '#f1f5f9',             // Department chip background
  packageBg: '#f8fafc',           // Gear package box
  packageBorder: '#cbd5e1',
  packageText: '#d97706',
};

/**
 * Returns customized theme tokens based on theme mode ('CINEMA_DARK' | 'LIGHT')
 * and chosen accent color preset.
 */
export const getCustomTheme = (themeMode = 'CINEMA_DARK', accentKey = 'ORANGE') => {
  const base = themeMode === 'LIGHT' ? lightTheme : darkTheme;
  const accent = ACCENT_PRESETS[accentKey] || ACCENT_PRESETS.ORANGE;

  return {
    ...base,
    primary: accent.hex,
    primaryHover: accent.hover,
    accent: accent.hex,
    packageText: accent.hex,
  };
};

export default darkTheme;