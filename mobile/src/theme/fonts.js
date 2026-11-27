/**
 * Fonts
 * Inter is the default UI font. Custom fonts are separate families per
 * weight, so text styles get the family that matches their fontWeight.
 * This is applied centrally in `themedStyles`, so screens keep writing
 * fontWeight.
 *
 * Inter has 400, 500, 600, 700 and 800: 900 maps to 800.
 */
import { Platform } from 'react-native';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { NotoSerifGujarati_600SemiBold } from '@expo-google-fonts/noto-serif-gujarati/600SemiBold';

export const FONT_ASSETS = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  NotoSerifGujarati_600SemiBold,
};

const FAMILY_BY_WEIGHT = {
  '100': 'Inter_400Regular',
  '200': 'Inter_400Regular',
  '300': 'Inter_400Regular',
  '400': 'Inter_400Regular',
  normal: 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  bold: 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  '900': 'Inter_800ExtraBold',
};

export const fontFamilyFor = (weight) => FAMILY_BY_WEIGHT[String(weight || '400')] || 'Inter_400Regular';

/**
 * Use the Inter family for the requested weight unless the style supplies
 * a font family. Drop fontWeight to avoid fake bold on named font assets.
 */
export const applyFont = (styles) => {
  const result = {};
  Object.keys(styles).forEach((key) => {
    const style = styles[key];
    if (style && typeof style === 'object' && ('fontSize' in style || 'fontWeight' in style)) {
      const { fontWeight, ...rest } = style;
      const fontFamily = rest.fontFamily ?? fontFamilyFor(fontWeight);
      // The shared line height already supplies leading for Inter. Android also
      // adds padding above the first and below the last line by default.
      const useLineHeight = Platform.OS === 'android' && rest.lineHeight && fontFamily.startsWith('Inter_');
      result[key] = {
        ...(useLineHeight ? { includeFontPadding: false } : {}),
        ...rest,
        fontFamily,
      };
    } else {
      result[key] = style;
    }
  });
  return result;
};
