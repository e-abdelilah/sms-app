import type { ColorSchemeName } from 'react-native';

export const SecureSmsColors = {
  light: {
    background: '#F6F7FB',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF1F8',
    text: '#171D33',
    textMuted: '#697188',
    border: '#E2E6F0',
    primary: '#3448D4',
    primaryPressed: '#2739B4',
    primarySoft: '#E8EBFF',
    sentBubble: '#3448D4',
    sentBubbleText: '#FFFFFF',
    receivedBubble: '#EEF1F8',
    success: '#167A46',
    danger: '#B42318',
    nav: '#FFFFFF',
  },
  dark: {
    background: '#101426',
    surface: '#191F35',
    surfaceMuted: '#252C46',
    text: '#F3F5FF',
    textMuted: '#AAB2CA',
    border: '#2C3450',
    primary: '#8EA0FF',
    primaryPressed: '#B0BCFF',
    primarySoft: '#252D56',
    sentBubble: '#7085F5',
    sentBubbleText: '#11162A',
    receivedBubble: '#252C46',
    success: '#66D59B',
    danger: '#FF8A80',
    nav: '#151A2D',
  },
} as const;

export type SecureSmsPalette = (typeof SecureSmsColors)[keyof typeof SecureSmsColors];

export function getSecureSmsColors(colorScheme: ColorSchemeName): SecureSmsPalette {
  return colorScheme === 'dark' ? SecureSmsColors.dark : SecureSmsColors.light;
}
