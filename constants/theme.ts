/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * Palette: Vibrant Coral, Golden Pollen, Yellow Green, Steel Blue, Dusty Grape.
 */

import { Platform } from 'react-native';

/** Steel Blue – primary tint (professional, trusted) */
const tintColorLight = '#1982C4';
const tintColorDark = '#4A9AD4';

/** Palette colors for use across the app */
export const Palette = {
  coral: '#FF595E',
  goldenPollen: '#FFCA3A',
  yellowGreen: '#8AC926',
  steelBlue: '#1982C4',
  dustyGrape: '#6A4C93',
} as const;

export const Colors = {
  light: {
    text: '#1A1A1A',
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F5',
    tint: tintColorLight,
    icon: '#525252',
    tabIconDefault: '#737373',
    tabIconSelected: tintColorLight,
    error: Palette.coral,
    green: Palette.yellowGreen,
    yellow: Palette.goldenPollen,
    ...Palette,
  },
  dark: {
    text: '#F0F0F0',
    background: '#121212',
    backgroundSecondary: '#1E1E1E',
    tint: tintColorDark,
    icon: '#A3A3A3',
    tabIconDefault: '#737373',
    tabIconSelected: tintColorDark,
    error: Palette.coral,
    green: Palette.yellowGreen,
    yellow: Palette.goldenPollen,
    ...Palette,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
